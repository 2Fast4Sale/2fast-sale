/**
 * Setzt ein freigestelltes Fahrzeug in einen Hintergrund.
 *
 * Das ist der Teil, den PhotoRoom "AI Backgrounds" und "AI Shadows"
 * nennt und der den Unterschied zwischen Basic (0,02 EUR) und Plus
 * (0,10 EUR) je Bild ausmacht. Hier laeuft er lokal und kostet nichts.
 *
 * Voraussetzung ist ein bereits freigestelltes Bild mit Alphakanal.
 * Das Freistellen selbst passiert nicht hier — dafuer braucht es ein
 * trainiertes Modell, und das ist der einzige Schritt, der weiterhin
 * eingekauft wird.
 *
 * ── Was hier passiert, in dieser Reihenfolge ──
 *
 *   1. Fahrzeug zuschneiden und auf Zielgroesse skalieren
 *   2. Bodenschatten aus der Silhouette erzeugen
 *   3. Spiegelung auf dem Boden
 *   4. Fahrzeug einsetzen
 *   5. Farbe und Helligkeit an den Hintergrund angleichen
 *
 * Schritt 5 ist der, an dem der erste Versuch dieses Projekts
 * gescheitert ist: Ohne Angleichung sieht das Fahrzeug aufgeklebt aus,
 * weil es das Licht seiner alten Umgebung mitbringt. Der Megane-Test
 * hat das gezeigt — im schwarzen Lack spiegelten sich noch die Baeume
 * vom Feldweg, waehrend das Auto angeblich in einer Halle stand.
 *
 * Ehrlich dazu: Diese Angleichung ist eine Rechnung, kein Modell. Sie
 * kann Helligkeit und Farbstich verschieben. Spiegelungen im Lack
 * bekommt sie nicht weg — das kann auch PhotoRoom nicht.
 */

import sharp from 'sharp';

export interface KompositorEinstellungen {
  /** Anteil der Bildbreite, den das Fahrzeug einnimmt. 0,80 = 80 %. */
  breitenanteil: number;
  /** Wie weit ueber der Unterkante das Fahrzeug steht, als Bildanteil. */
  bodenabstand: number;
  /** Waagerechte Lage: 0 = links, 0,5 = Mitte, 1 = rechts. */
  ausrichtung: number;

  /** Deckkraft des Schattens, 0 bis 1. */
  schattenStaerke: number;
  /** Weichheit des Schattens in Pixeln. */
  schattenWeichheit: number;
  /** Wie flach der Schatten liegt. 0,08 = sehr flach, wie bei Sonne im Zenit. */
  schattenHoehe: number;
  /** Seitlicher Versatz des Schattens als Anteil der Fahrzeugbreite. */
  schattenVersatz: number;

  /**
   * Deckkraft des Kontaktschattens, 0 bis 1.
   *
   * Der grosse, weiche Schatten oben gibt dem Fahrzeug Gewicht, aber er
   * nagelt es nicht fest. Im Urus-Test stand der Wagen dadurch einen
   * Fingerbreit ueber dem Boden: Unter den Reifen war fast nichts Dunkles.
   *
   * Dort, wo Gummi den Beton beruehrt, kommt aber gar kein Licht mehr hin.
   * Dieser zweite Schatten ist deshalb schmal, dunkel und kaum
   * weichgezeichnet — er zeichnet nur die Aufstandsflaeche nach.
   */
  kontaktStaerke: number;
  /** Hoehe des Kontaktschattens als Anteil der Fahrzeughoehe. */
  kontaktHoehe: number;

  /**
   * Schraege des Schattens: waagerechter Versatz je Pixel Abstand.
   *
   * 0 laesst den Schatten senkrecht unter dem Fahrzeug haengen. Das war
   * die erste Fassung, und es sah aus wie ein Aufkleber — ein Schatten
   * ohne Lichtrichtung kommt in der Wirklichkeit nicht vor.
   */
  lichtNeigung: number;

  /**
   * Lage des Horizonts, als Anteil der Bildhoehe.
   *
   * Das ist die Zahl, mit der aus einer flachen Rechnung eine
   * raeumliche wird: Auf einer Bodenebene haengen Tiefe und Bildzeile
   * fest zusammen. Ein Punkt in Zeile y liegt in der Entfernung
   * 1 / (y - Horizont); je naeher an der Horizontlinie, desto weiter
   * weg. Damit laesst sich ein Schatten in Bodenkoordinaten zeichnen
   * und richtig verzerrt ins Bild bringen, statt ihn im Bild zu
   * schaetzen.
   *
   * tools/raum_render.py schreibt den Wert neben jedes Hallenbild.
   */
  horizont: number;
  /** Kamerahoehe in Metern. Steht in der .json des Raums. */
  kameraHoehe: number;
  /** Brennweite in Millimetern, Kleinbild. Steht ebenfalls dort. */
  brennweite: number;
  /**
   * Wie viel dunkler die Aufstandsflaeche der Reifen wird, als Faktor.
   * 0,8 bedeutet dort 80 Prozent mehr Deckkraft als daneben.
   */
  kernBoost: number;

  /** Deckkraft der Bodenspiegelung, 0 bis 1. 0 schaltet sie ab. */
  spiegelungStaerke: number;
  /** Wie weit die Spiegelung nach unten reicht, als Anteil der Fahrzeughoehe. */
  spiegelungLaenge: number;

  /**
   * Wie stark Helligkeit und Farbstich an den Hintergrund angeglichen
   * werden, 0 bis 1. 0 laesst das Fahrzeug unveraendert.
   */
  angleichung: number;
}

export const STANDARD: KompositorEinstellungen = {
  /*
   * 0,60 und nicht mehr 0,82.
   *
   * Bei 0,82 fuellte der Urus das Bild bis an beide Raender — der Raum,
   * den wir extra rendern, war kaum noch zu sehen, und der Wagen wirkte
   * hingestellt statt aufgenommen. Mit Boden davor sitzt er sofort
   * richtig.
   */
  breitenanteil:     0.60,
  bodenabstand:      0.16,
  ausrichtung:       0.50,
  /*
   * Gemessen am Originalfoto: Der Boden unter dem Wagen ist auf etwa ein
   * Fuenftel der offenen Flaeche abgedunkelt. Mit "multiply" heisst das
   * eine Deckkraft um 0,8 — hier stand vorher 0,50, und deshalb sah der
   * Schatten aus wie ein grauer Hauch statt wie Schatten.
   */
  schattenStaerke:   0.78,
  schattenWeichheit: 26,
  /*
   * Klein, nicht gross.
   *
   * Im Originalfoto ist der Boden direkt vor dem Vorderrad wieder hell —
   * bei diffusem Licht von oben reicht der Schatten kaum ueber die
   * Aufstandsflaeche hinaus. Hier standen 0,10 und spaeter 0,075, und
   * damit lag ein breites dunkles Band bis weit vor das Fahrzeug. Auf
   * Weiss sah das noch passabel aus, auf dem Betonboden wie ein
   * hingelegtes Brett.
   */
  schattenHoehe:     0.032,
  schattenVersatz:   0.01,
  kontaktStaerke:    0.92,
  kontaktHoehe:      0.022,
  lichtNeigung:      0.28,
  kernBoost:         0.85,
  horizont:          0.45,
  kameraHoehe:       1.55,
  brennweite:        55,
  /*
   * Zurueckhaltend, weil der Standardboden matter Beton ist. Wer einen
   * polierten Boden rendert, hebt den Wert ueber die .json des Raums an
   * — siehe tools/raum_render.py. Bei 0,22 sah der Beton aus wie nass.
   */
  spiegelungStaerke: 0.08,
  spiegelungLaenge:  0.30,
  angleichung:       0.45,
};

export interface Ergebnis {
  bild: Buffer;
  breite: number;
  hoehe: number;
  /** Was der Kompositor gemessen hat — fuer die Einstellungsseite. */
  messwerte: {
    fahrzeugBreite: number;
    fahrzeugHoehe: number;
    /** Mittlere Helligkeit von Fahrzeug und Hintergrund, 0 bis 255. */
    helligkeitFahrzeug: number;
    helligkeitHintergrund: number;
  };
}

/**
 * Behaelt nur das groesste zusammenhaengende Objekt und loescht den Rest.
 *
 * Die Freistellung liefert alles, was das Modell fuer Vordergrund haelt —
 * nicht nur das Fahrzeug. Im Test mit dem Sandbox-Bild kam ein weisser
 * Kreis mit, der frei an der Hallenwand schwebte. Beim Kundenfoto ist das
 * kein Kreis: Da ist es der zweite Wagen daneben, ein Werbeschild oder
 * eine Person. Beides landet sonst im Inserat, fuer das der Haendler
 * 3,50 EUR bezahlt hat.
 *
 * Der zweite Schaden ist unsichtbarer und wiegt schwerer. Der Rahmen um
 * alles Freigestellte bestimmt Groesse und Standlinie des Fahrzeugs.
 * Ein Fremdteil oben im Bild zieht diesen Rahmen nach oben, das Fahrzeug
 * rutscht darin nach unten — und der Schatten landet zweihundert Pixel
 * unter den Raedern. Genau so war es im Test zu sehen.
 *
 * Ein Auto ist immer EIN Stueck. Was nicht daran haengt, gehoert nicht
 * dazu. Mehr Annahme steckt hier nicht drin.
 *
 * Gezaehlt wird ueber eine Flutfuellung mit eigenem Stapel, nicht
 * rekursiv: Ein Fahrzeug auf einem 2000er Bild hat leicht eine Million
 * Pixel, und so viele verschachtelte Aufrufe sprengen den Aufrufstapel.
 */
async function nurGroesstesObjekt(freigestellt: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(freigestellt)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: b, height: h, channels: k } = info;
  const n = b * h;

  // 0 = Hintergrund, sonst die Nummer des Objekts.
  const marke = new Int32Array(n);
  const stapel = new Int32Array(n);
  let naechste = 0;
  let besteMarke = 0;
  let besteGroesse = 0;

  for (let start = 0; start < n; start++) {
    if (marke[start] !== 0 || data[start * k + 3] <= 8) continue;

    naechste++;
    let groesse = 0;
    let oben = 0;
    stapel[oben++] = start;
    marke[start] = naechste;

    while (oben > 0) {
      const p = stapel[--oben];
      groesse++;
      const x = p % b;
      const y = (p - x) / b;

      // Vierer-Nachbarschaft. Diagonale Verbindungen wuerden ueber
      // einzelne Rauschpixel Objekte zusammenkleben, die nichts
      // miteinander zu tun haben.
      if (x > 0)     { const q = p - 1; if (marke[q] === 0 && data[q * k + 3] > 8) { marke[q] = naechste; stapel[oben++] = q; } }
      if (x < b - 1) { const q = p + 1; if (marke[q] === 0 && data[q * k + 3] > 8) { marke[q] = naechste; stapel[oben++] = q; } }
      if (y > 0)     { const q = p - b; if (marke[q] === 0 && data[q * k + 3] > 8) { marke[q] = naechste; stapel[oben++] = q; } }
      if (y < h - 1) { const q = p + b; if (marke[q] === 0 && data[q * k + 3] > 8) { marke[q] = naechste; stapel[oben++] = q; } }
    }

    if (groesse > besteGroesse) { besteGroesse = groesse; besteMarke = naechste; }
  }

  if (besteMarke === 0) throw new Error('Freigestelltes Bild ist vollstaendig leer');
  // Nur ein Objekt gefunden: nichts zu tun, das Bild unveraendert lassen.
  if (naechste === 1) return freigestellt;

  for (let p = 0; p < n; p++) {
    if (marke[p] !== besteMarke) data[p * k + 3] = 0;
  }

  return sharp(data, { raw: { width: b, height: h, channels: k as 4 } })
    .png()
    .toBuffer();
}

/**
 * Schneidet die leeren Raender eines freigestellten Bildes weg.
 *
 * sharp.trim() arbeitet auf der Farbe, nicht auf dem Alphakanal, und
 * traf bei dunklen Fahrzeugen daneben. Deshalb der Umweg ueber die
 * Silhouette: Der Alphakanal wird zu einem Schwarzweissbild, und
 * dessen Rand ist der gesuchte.
 */
async function aufFahrzeugZuschneiden(freigestellt: Buffer): Promise<Buffer> {
  const bild = sharp(freigestellt).ensureAlpha();
  const { width, height } = await bild.metadata();
  if (!width || !height) throw new Error('Freigestelltes Bild ohne Masse');

  const alpha = await sharp(freigestellt).ensureAlpha().extractChannel(3).raw().toBuffer();

  let oben = height, unten = -1, links = width, rechts = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Ab 8 von 255 gilt ein Pixel als zum Fahrzeug gehoerig. Alles
      // darunter ist Rauschen aus der Freistellung.
      if (alpha[y * width + x] > 8) {
        if (y < oben) oben = y;
        if (y > unten) unten = y;
        if (x < links) links = x;
        if (x > rechts) rechts = x;
      }
    }
  }

  if (unten < 0) throw new Error('Freigestelltes Bild ist vollstaendig leer');

  return sharp(freigestellt).ensureAlpha().extract({
    left: links, top: oben,
    width: rechts - links + 1,
    height: unten - oben + 1,
  }).png().toBuffer();
}

/** Mittlere Helligkeit der sichtbaren Pixel, 0 bis 255. */
async function mittlereHelligkeit(bild: Buffer, nurSichtbare = false): Promise<number> {
  if (!nurSichtbare) {
    const s = await sharp(bild).greyscale().stats();
    return s.channels[0].mean;
  }
  const { data, info } = await sharp(bild).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let summe = 0, zahl = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue;
    summe += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    zahl++;
  }
  return zahl ? summe / zahl : 0;
}

/**
 * Der Bodenschatten, in Bodenkoordinaten gerechnet.
 *
 * ── Warum noch eine Fassung ────────────────────────────────────────
 *
 * Die Fassungen davor haben im Bild gerechnet: Unterkante der
 * Silhouette suchen, etwas nach unten versetzen, weichzeichnen. Damit
 * laesst sich vieles einstellen und nichts richtig machen. Jeder Regler
 * hat einen Fehler gegen einen anderen getauscht — dunkler ergab ein
 * Brett, weicher ergab einen schwebenden Wagen.
 *
 * Der Grund ist, dass ein Schatten nicht im Bild liegt, sondern auf dem
 * Boden. Und die Bodenebene ist bekannt: Auf ihr gehoert zu jeder
 * Bildzeile y genau eine Entfernung,
 *
 *     Tiefe(y) = 1 / (y - Horizont)
 *
 * und eine seitliche Massstabszahl (y - Horizont). Mehr braucht es
 * nicht. Der Schatten wird als Flaeche in echten Bodenkoordinaten
 * beschrieben — eine Ellipse unter dem Fahrzeug, zwei dunkle Kerne an
 * den Radaufstandsflaechen — und beim Zeichnen wird fuer jedes Pixel
 * zurueckgerechnet, wo auf dem Boden es liegt.
 *
 * Die Perspektive kommt damit von allein: Der Schatten wird zum
 * Betrachter hin breit und lang und staucht sich nach hinten zusammen,
 * ohne dass irgendwo ein Verzerrungsfaktor eingestellt wird.
 *
 * Der Horizont steht in der .json neben jedem Hallenbild — genau
 * deshalb rendern wir die Raeume selbst.
 */
export interface Bodenkontakt {
  /** Unterste undurchsichtige Zeile je Spalte, -1 wo nichts steht. */
  unten: Int32Array;
  /** Erste und letzte Spalte, in der das Fahrzeug steht. */
  xVon: number;
  xBis: number;
  /** Die beiden Radaufstandspunkte, links und rechts. */
  radA: number;
  radB: number;
}

/**
 * Wo beruehrt das Fahrzeug den Boden?
 *
 * Bewusst exportiert und an EINER Stelle: Das Diagnose-Bild
 * (scripts/schatten-diagnose.ts) zeichnet genau diese Punkte ein. Als es
 * eine eigene Kopie der Erkennung hatte, zeigte es andere Raeder als der
 * Kompositor tatsaechlich benutzte — und man sucht den Fehler dann an der
 * falschen Stelle.
 *
 * `fahrzeug` ist das bereits zugeschnittene und auf Zielgroesse gebrachte
 * Fahrzeug mit Alphakanal.
 */
export async function radaufstand(
  fahrzeug: Buffer,
  fBreite: number,
  fHoehe: number,
): Promise<Bodenkontakt | null> {
  const alpha = await sharp(fahrzeug).ensureAlpha().extractChannel(3).raw().toBuffer();

  const unten = new Int32Array(fBreite).fill(-1);
  for (let x = 0; x < fBreite; x++) {
    for (let y = fHoehe - 1; y >= 0; y--) {
      if (alpha[y * fBreite + x] > 8) { unten[x] = y; break; }
    }
  }

  let xVon = -1, xBis = -1;
  for (let x = 0; x < fBreite; x++) {
    if (unten[x] < 0) continue;
    if (xVon < 0) xVon = x;
    xBis = x;
  }
  if (xVon < 0) return null;

  /*
   * Die beiden Raeder als echte Tiefpunkte suchen.
   *
   * Vorher wurde je Fahrzeughaelfte der tiefste Punkt genommen. Beim Blick
   * von schraeg vorne faellt die Silhouette nach hinten aber gleichmaessig
   * an, also liegt das Maximum der hinteren Haelfte immer direkt an der
   * Trennlinie. Gemessen lagen beide "Raeder" 52 Pixel auseinander, mitten
   * unter dem Fahrzeug — die Standlinie dazwischen war damit sinnlos, und
   * der Schatten lag schief.
   *
   * Ein Rad ist ein Punkt, der in seiner Umgebung tiefer liegt als alles
   * andere. Von diesen Tiefpunkten werden die zwei tiefsten genommen, die
   * weit genug auseinander liegen.
   */
  const umgebung = Math.max(6, Math.round(fBreite * 0.06));
  const abstandMin = Math.round((xBis - xVon) * 0.30);
  const kandidaten: number[] = [];
  for (let x = xVon; x <= xBis; x++) {
    if (unten[x] < 0) continue;
    let tiefster = true;
    for (let i = Math.max(xVon, x - umgebung); i <= Math.min(xBis, x + umgebung); i++) {
      if (unten[i] > unten[x]) { tiefster = false; break; }
    }
    if (tiefster) kandidaten.push(x);
  }
  kandidaten.sort((a, b) => unten[b] - unten[a]);

  let radA = kandidaten[0] ?? -1;
  let radB = -1;
  for (const x of kandidaten) {
    if (Math.abs(x - radA) >= abstandMin) { radB = x; break; }
  }
  if (radA < 0) return null;
  /*
   * Nur ein Tiefpunkt: Das Fahrzeug steht quer zur Kamera (Front- oder
   * Heckansicht). Dann ist eine waagerechte Standlinie richtig, und die
   * bekommt man, indem der zweite Punkt auf derselben Hoehe am anderen
   * Ende angenommen wird.
   */
  if (radB < 0) { radB = radA === xVon ? xBis : xVon; unten[radB] = unten[radA]; }
  if (radA > radB) { const h = radA; radA = radB; radB = h; }

  return { unten, xVon, xBis, radA, radB };
}

async function bodenschattenProjiziert(
  fahrzeug: Buffer,
  fBreite: number,
  fHoehe: number,
  fahrzeugX: number,
  fahrzeugY: number,
  zielBreite: number,
  zielHoehe: number,
  e: KompositorEinstellungen,
): Promise<Buffer | null> {
  if (e.schattenStaerke <= 0) return null;

  const kontakt = await radaufstand(fahrzeug, fBreite, fHoehe);
  if (!kontakt) return null;
  const { unten, xVon, xBis, radA, radB } = kontakt;

  // Alles ab hier in Bildkoordinaten des fertigen Bildes.
  const hY = zielHoehe * e.horizont;
  const radAx = fahrzeugX + radA, radAy = fahrzeugY + unten[radA];
  const radBx = fahrzeugX + radB, radBy = fahrzeugY + unten[radB];

  /*
   * Umrechnung Bild → Boden, in METERN.
   *
   * Der erste Anlauf hat hier zwei verschiedene Groessen in dieselbe
   * Ellipse gesteckt: seitlich einen Winkel (x geteilt durch den
   * Horizontabstand), in der Tiefe einen Kehrwert. Die sind nicht
   * vergleichbar — der Ersatzwert fuer die Tiefe geriet dadurch
   * zweihundertfach zu gross, und heraus kam ein schwarzer Kegel ueber
   * den halben Boden.
   *
   * Mit einer Brennweite in Pixeln wird beides eine Laenge:
   *
   *     Tiefe Z = Kamerahoehe · f / (y - Horizont)
   *     Seite X = (x - Bildmitte) · Kamerahoehe / (y - Horizont)
   *
   * Damit ist ein Auto 2,0 m breit und 5,1 m lang statt 1,31 "Einheiten",
   * und man kann die Zahlen gegen die Wirklichkeit pruefen.
   */
  const kMin = Math.max(4, zielHoehe * 0.01);
  const fPx = (e.brennweite / 36) * zielBreite;   // Kleinbild, 36 mm breit
  const abstand = (y: number) => Math.max(kMin, y - hY);
  const tiefeVon = (y: number) => e.kameraHoehe * fPx / abstand(y);
  const seiteVon = (x: number, y: number) =>
    (x - zielBreite / 2) * e.kameraHoehe / abstand(y);

  /* ── 2. Die Schattenflaeche in Bodenkoordinaten ── */
  const mitteY = (radAy + radBy) / 2;
  /*
   * Der Grundriss des Schattens kommt aus der Silhouette, nicht aus einer
   * Ellipse.
   *
   * Eine Ellipse ist unter jedem Auto dieselbe Form: vorne und hinten
   * gleich rund, seitlich gleich weit. Ein Auto ist das nicht — vorne
   * schiebt sich die Schuerze weit vor, hinten zieht sich der Wagen
   * zusammen, und zwischen den Raedern liegt der Schweller naeher am
   * Boden als die Kotfluegel. Im Bild sah man genau das: einen Kreis,
   * ueber den ein Auto gestellt wurde.
   *
   * Die Unterkante der Silhouette ist bereits der vordere Rand des
   * Schattens — Spalte fuer Spalte, mit allen Ausbuchtungen. Umgerechnet
   * in Bodenkoordinaten ergibt sie eine Kurve, und der Schatten ist die
   * Flaeche zwischen dieser Kurve und derselben Kurve, um die
   * Fahrzeugtiefe nach hinten versetzt.
   */
  const RASTER = 512;
  let uMin = Infinity, uMax = -Infinity;
  const spalten: Array<[number, number]> = [];   // [u, t] je Fahrzeugspalte
  for (let x = xVon; x <= xBis; x++) {
    if (unten[x] < 0) continue;
    const yb = fahrzeugY + unten[x];
    const u = seiteVon(fahrzeugX + x, yb);
    spalten.push([u, tiefeVon(yb)]);
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
  }
  if (spalten.length < 2 || !(uMax > uMin)) return null;

  /*
   * Je Rasterfach der NAECHSTE Punkt — der Schatten beginnt dort, wo das
   * Blech dem Boden am naechsten kommt.
   */
  const nahT = new Float64Array(RASTER).fill(Infinity);
  for (const [u, t] of spalten) {
    const i = Math.min(RASTER - 1, Math.floor((u - uMin) / (uMax - uMin) * RASTER));
    if (t < nahT[i]) nahT[i] = t;
  }
  // Luecken (mehr Faecher als Spalten) linear schliessen.
  let letzter = -1;
  for (let i = 0; i < RASTER; i++) {
    if (!isFinite(nahT[i])) continue;
    if (letzter >= 0 && i - letzter > 1) {
      for (let j = letzter + 1; j < i; j++) {
        const a = (j - letzter) / (i - letzter);
        nahT[j] = nahT[letzter] + (nahT[i] - nahT[letzter]) * a;
      }
    }
    letzter = i;
  }
  for (let i = 0; i < RASTER; i++) if (!isFinite(nahT[i])) nahT[i] = nahT[Math.max(0, letzter)];

  /*
   * Halbe Breite: aus der Fahrzeugbreite an der Standlinie, aber etwas
   * schmaler.
   *
   * Der Schatten darf seitlich kaum unter dem Fahrzeug hervorschauen.
   * Auf die volle Breite gezogen entsteht ein dunkles Kissen, das links
   * und rechts sichtbar uebersteht — im Vergleich mit PhotoRoom war das
   * der auffaelligste Rest.
   */
  const uHalb = 0.92 * Math.abs(
    seiteVon(fahrzeugX + xBis, mitteY) - seiteVon(fahrzeugX + xVon, mitteY),
  ) / 2;

  /*
   * Halbe Tiefe: aus dem Abstand der beiden Radaufstandsflaechen. Beim
   * 3/4-Winkel stehen sie unterschiedlich weit weg, das ergibt die
   * Tiefe des Grundrisses. Steht der Wagen exakt seitlich, sind beide
   * gleich weit weg und der Abstand ist null — dann greift der
   * Ersatzwert: Ein Auto ist etwa 0,4 mal so tief wie lang.
   */
  const tRadA = tiefeVon(radAy), tRadB = tiefeVon(radBy);
  // Beide Werte jetzt in Metern, also vergleichbar. Ein Auto ist etwa
  // 0,38-mal so tief wie lang; das greift, wenn der Wagen genau seitlich
  // steht und beide Raeder gleich weit weg sind.
  // 1,05 statt 1,30: Der Schatten reichte sonst deutlich vor die
  // Stossstange, und davor ist bei diffusem Hallenlicht heller Boden.
  const tHalb = Math.max(Math.abs(tRadA - tRadB) / 2 * 1.05, uHalb * 0.22);

  /*
   * Wie tief der Grundriss nach hinten reicht.
   *
   * Die Silhouettenkante ist die zur Kamera zeigende Flanke; dahinter
   * liegt noch der Rest des Wagens. Aus dem Tiefenunterschied der beiden
   * Raeder (schraege Ansicht) oder ersatzweise aus der Breite.
   */
  const tiefeKoerper = Math.max(tHalb * 1.8, uHalb * 0.45);

  /*
   * Die Aufstandsflaechen der Reifen — eng und tief schwarz.
   *
   * Gemessen an einer Spalte durch das Vorderrad: Bei PhotoRoom geht es
   * vom schwarzen Reifen in acht Zeilen auf Bodenhelligkeit, bei der
   * Fassung davor brauchte es dreissig. Eine Luecke gab es nie — der
   * Kontakt war nur eine Rampe statt einer Kante, und genau das liest
   * das Auge als "schwebt auf einem Kissen".
   *
   * Wo Gummi den Beton beruehrt, kommt gar kein Licht mehr hin. Das ist
   * eine harte Kante, kein Verlauf.
   */
  const uRadA = seiteVon(radAx, radAy), uRadB = seiteVon(radBx, radBy);
  const uKern = uHalb * 0.085, tKern = tHalb * 0.10;

  /* ── 3. Zeichnen ── */
  const maske = Buffer.alloc(zielBreite * zielHoehe, 0);
  const yAb = Math.max(0, Math.floor(hY + kMin));

  for (let y = yAb; y < zielHoehe; y++) {
    const t = tiefeVon(y);
    const k = abstand(y);
    for (let x = 0; x < zielBreite; x++) {
      const u = (x - zielBreite / 2) * e.kameraHoehe / k;

      /*
       * Grundflaeche: eine Ellipse mit FLACHEM Kern und kurzer Kante.
       *
       * Vorher stand hier eine Glocke. Die hat kein Plateau — sie ist
       * nur in der Mitte dunkel und wird nach aussen gleichmaessig
       * heller. Gemessen ergab das einen Uebergang ueber vierzig Pixel,
       * waehrend PhotoRoom in zehn fertig ist. Genau daran sah man den
       * Unterschied: ihrer ist ein Schatten, meiner war ein Hauch.
       *
       * Ein echter Schlagschatten sieht anders aus: unter dem Fahrzeug
       * ueberall gleich dunkel, weil dort ueberall dasselbe Licht fehlt,
       * und am Rand ein kurzer Auslauf. Genau das ist es hier — voll bis
       * `PLATEAU`, dann in einem schmalen Band auf null.
       */
      /*
       * Abstand zum Grundriss, in Metern. Innerhalb negativ, ausserhalb
       * positiv — seitlich ueber die Fahrzeugkante hinaus, in der Tiefe
       * vor der Silhouettenkante oder hinter dem Heck.
       */
      const iRoh = (u - uMin) / (uMax - uMin) * RASTER;
      const i = Math.max(0, Math.min(RASTER - 1, Math.floor(iRoh)));
      const tNah = nahT[i];

      const seitlich = Math.max(uMin - u, u - uMax);
      const tiefRaus = Math.max(tNah - t, t - (tNah + tiefeKoerper));
      const abstandAussen = Math.max(seitlich, tiefRaus);

      /*
       * Zwei Anteile, wie in echten Haendlerfotos unter diffusem
       * Hallenlicht: ein kurzer dunkler Saum direkt am Grundriss und ein
       * breiter, weicher Hof, der ein Stueck ueber die Kontur hinaus
       * auslaeuft. Nur der kurze Saum allein wirkte wie ausgeschnitten.
       */
      const SAUM = Math.max(0.02, uHalb * 0.08);
      const HOF = Math.max(0.08, uHalb * 0.30);
      let form: number;
      if (abstandAussen <= 0) form = 1;
      else {
        const a = Math.max(0, (SAUM - abstandAussen) / SAUM);
        const kern = a * a * (3 - 2 * a);
        const hof = Math.exp(-abstandAussen / HOF);
        form = 0.45 * kern + 0.55 * hof;
      }
      let wert = e.schattenStaerke * form;

      // Zwei dunkle Kerne an den Radaufstandsflaechen. Dort kommt gar
      // kein Licht mehr hin; das erzeugt kein Weichzeichner.
      for (const [ur, tr] of [[uRadA, tRadA], [uRadB, tRadB]]) {
        const a = (u - ur) / uKern, b = (t - tr) / tKern;
        wert += e.schattenStaerke * e.kernBoost * Math.exp(-(a * a + b * b) / 2);
      }

      if (wert <= 0.004) continue;
      maske[y * zielBreite + x] = Math.min(255, Math.round(Math.min(1, wert) * 255));
    }
  }

  const weich = await sharp(maske, { raw: { width: zielBreite, height: zielHoehe, channels: 1 } })
    // Klein halten: Die Form ist schon glatt, der Weichzeichner soll nur
    // die Rasterstufen nehmen.
    // 0,004 der Bildbreite waren bei 1920 Pixeln knapp acht Pixel und
    // haben die Kante am Reifen wieder verschmiert, die oben mit Muehe
    // erzeugt wurde. Halb so viel reicht gegen die Rasterstufen.
    .blur(Math.max(1.5, zielBreite * 0.005))
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const schwarz = await sharp({
    create: { width: zielBreite, height: zielHoehe, channels: 3, background: { r: 0, g: 0, b: 0 } },
  }).raw().toBuffer();

  return sharp(schwarz, { raw: { width: zielBreite, height: zielHoehe, channels: 3 } })
    .joinChannel(weich, { raw: { width: zielBreite, height: zielHoehe, channels: 1 } })
    .png()
    .toBuffer();
}



/**
 * Spiegelt das Fahrzeug am Boden und blendet die Spiegelung aus.
 *
 * Der Verlauf entsteht ueber ein zweites Bild, das von oben nach unten
 * durchsichtig wird und per dest-in auf die Spiegelung gelegt wird.
 * Ohne diesen Verlauf steht ein zweites, kopfstehendes Auto im Bild.
 */
async function spiegelungBauen(
  fahrzeug: Buffer,
  breite: number,
  hoehe: number,
  e: KompositorEinstellungen,
): Promise<{ bild: Buffer; breite: number; hoehe: number } | null> {
  if (e.spiegelungStaerke <= 0 || e.spiegelungLaenge <= 0) return null;

  const spiegelHoehe = Math.max(4, Math.round(hoehe * e.spiegelungLaenge));

  const gespiegelt = await sharp(fahrzeug)
    .ensureAlpha()
    .flip()
    .resize(breite, hoehe, { fit: 'fill' })
    .extract({ left: 0, top: 0, width: breite, height: spiegelHoehe })
    .png()
    .toBuffer();

  /*
   * Verlauf als SVG. Das ist der kuerzeste Weg zu einem weichen
   * Uebergang, den sharp direkt lesen kann — eine Pixelschleife waere
   * hier nur langsamer.
   */
  const verlauf = Buffer.from(
    `<svg width="${breite}" height="${spiegelHoehe}">
       <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="#fff" stop-opacity="${Math.max(0, Math.min(1, e.spiegelungStaerke))}"/>
         <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
       </linearGradient></defs>
       <rect width="${breite}" height="${spiegelHoehe}" fill="url(#v)"/>
     </svg>`,
  );

  const bild = await sharp(gespiegelt)
    .composite([{ input: await sharp(verlauf).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer();

  return { bild, breite, hoehe: spiegelHoehe };
}

/**
 * Gleicht Helligkeit und Farbstich des Fahrzeugs an den Hintergrund an.
 *
 * Bewusst zurueckhaltend. Ein Fahrzeug, das vollstaendig auf die
 * Hintergrundhelligkeit gezogen wird, verliert seine Lackfarbe — ein
 * schwarzer Wagen vor weisser Wand wuerde grau. Deshalb wird nur ein
 * Teil des Unterschieds ausgeglichen, gesteuert ueber `angleichung`.
 */
/** Mittlere Farbe (R, G, B) der sichtbaren, nicht ueberstrahlten Pixel. */
async function mittlereFarbe(bild: Buffer, nurSichtbare: boolean): Promise<[number, number, number]> {
  const { data, info } = await sharp(bild).ensureAlpha().resize(256, 256, { fit: 'inside' })
    .raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (nurSichtbare && data[i + 3] < 128) continue;
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Fast schwarze Reifen und ausgebrannte Glanzlichter tragen keine
    // Information ueber das Licht, nur ueber Lack und Sonne.
    if (l < 18 || l > 245) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return n ? [r / n, g / n, b / n] : [128, 128, 128];
}

async function angleichen(
  fahrzeug: Buffer,
  helligkeitFahrzeug: number,
  helligkeitHintergrund: number,
  e: KompositorEinstellungen,
  hintergrund?: Buffer,
): Promise<Buffer> {
  if (e.angleichung <= 0) return fahrzeug;

  const ziel = helligkeitFahrzeug
    + (helligkeitHintergrund - helligkeitFahrzeug) * e.angleichung * 0.35;
  const faktor = helligkeitFahrzeug > 1 ? ziel / helligkeitFahrzeug : 1;

  // Grenzen, damit die Angleichung das Bild nie zerstoert.
  const sicher = Math.max(0.75, Math.min(1.35, faktor));

  /*
   * Lichtfarbe angleichen, nicht nur Helligkeit.
   *
   * Im ersten Test mit echten Hallenfotos stand ein Urus im kalten
   * Neonlicht einer Lagerhalle, aber mit dem warmen Tageslicht seines
   * Originalfotos. Die Helligkeit stimmte ungefaehr, der Farbstich
   * nicht — und genau das verraet eine Montage auf den ersten Blick.
   *
   * Verglichen wird das Verhaeltnis der Kanaele, nicht ihre Hoehe: Ein
   * gruener Lack bleibt gruen, nur der Grauwert des Lichts wandert. Die
   * Korrektur ist auf plus/minus zwoelf Prozent je Kanal begrenzt, damit
   * aus einem weissen Auto kein blaues wird.
   */
  let gewinn: [number, number, number] = [sicher, sicher, sicher];
  if (hintergrund) {
    const [hr, hg, hb] = await mittlereFarbe(hintergrund, false);
    const [fr, fg, fb] = await mittlereFarbe(fahrzeug, true);
    const hGrau = (hr + hg + hb) / 3, fGrau = (fr + fg + fb) / 3;
    const anteil = Math.min(1, e.angleichung) * 0.6;
    const kanal = (h: number, f: number) => {
      const soll = (h / hGrau) / Math.max(0.01, f / fGrau);
      const weich = 1 + (soll - 1) * anteil;
      return Math.max(0.88, Math.min(1.12, weich)) * sicher;
    };
    gewinn = [kanal(hr, fr), kanal(hg, fg), kanal(hb, fb)];
  }

  const alpha = await sharp(fahrzeug).ensureAlpha().extractChannel(3).toBuffer();
  const farbe = await sharp(fahrzeug).removeAlpha().linear(gewinn, [0, 0, 0]).toBuffer();
  return sharp(farbe).joinChannel(alpha).png().toBuffer();
}

/**
 * Setzt alles zusammen.
 *
 * `freigestellt` ist ein PNG mit Alphakanal, `hintergrund` ein
 * beliebiges Bild. Die Zielgroesse richtet sich nach dem Hintergrund.
 */
export async function komponieren(
  freigestellt: Buffer,
  hintergrund: Buffer,
  einstellungen: Partial<KompositorEinstellungen> = {},
): Promise<Ergebnis> {
  const e = { ...STANDARD, ...einstellungen };

  const hg = sharp(hintergrund);
  const hgDaten = await hg.metadata();
  const zielBreite = hgDaten.width ?? 2000;
  const zielHoehe  = hgDaten.height ?? 1333;

  const bereinigt = await nurGroesstesObjekt(freigestellt);
  const zugeschnitten = await aufFahrzeugZuschneiden(bereinigt);
  const zMeta = await sharp(zugeschnitten).metadata();
  const zBreite = zMeta.width ?? 1;
  const zHoehe  = zMeta.height ?? 1;

  // Fahrzeug auf Zielbreite bringen, Seitenverhaeltnis behalten.
  const fBreite = Math.max(1, Math.round(zielBreite * e.breitenanteil));
  const fHoehe  = Math.max(1, Math.round((fBreite / zBreite) * zHoehe));

  const fahrzeugRoh = await sharp(zugeschnitten)
    .resize(fBreite, fHoehe, { fit: 'fill' })
    .png()
    .toBuffer();

  const helligkeitFahrzeug   = await mittlereHelligkeit(fahrzeugRoh, true);
  const helligkeitHintergrund = await mittlereHelligkeit(hintergrund);

  const fahrzeug = await angleichen(fahrzeugRoh, helligkeitFahrzeug, helligkeitHintergrund, e, hintergrund);

  // Standlinie: Unterkante des Fahrzeugs im Zielbild.
  const bodenY = Math.round(zielHoehe * (1 - e.bodenabstand));
  const fahrzeugY = Math.max(0, bodenY - fHoehe);
  const fahrzeugX = Math.max(0, Math.round((zielBreite - fBreite) * e.ausrichtung));

  const ebenen: sharp.OverlayOptions[] = [];

  /*
   * Schatten zuerst, er liegt unter allem. Zwei Lagen aus derselben
   * Rechnung: ein breiter weicher fuer das Gewicht, ein schmaler harter
   * fuer die Aufstandsflaeche.
   *
   * Beide folgen der Unterkante Spalte fuer Spalte. Die Fassung davor
   * quetschte stattdessen das untere Viertel der Silhouette flach — und
   * weil ein Auto dort ueber die volle Breite ausgefuellt ist, kam ein
   * gleichmaessiger Balken heraus. Unter den Raedern war er genauso hell
   * wie unter dem Schweller; im Bild sah man eine gerade Kante quer durch
   * den Boden laufen, und der Wagen schwebte.
   */
  {
    const s = await bodenschattenProjiziert(
      fahrzeug, fBreite, fHoehe, fahrzeugX, fahrzeugY, zielBreite, zielHoehe, e,
    );
    if (s) ebenen.push({
      input: s,
      left: 0,
      top:  0,
      /*
       * "multiply" statt einfachem Ueberlagern.
       *
       * Ein deckendes Schwarz mit Alpha legt sich als Farbe ueber den
       * Boden und deckt dessen Struktur zu — an der dunkelsten Stelle
       * ist von Beton nichts mehr zu sehen. Multiplizieren dunkelt
       * stattdessen ab, was da ist: Die Koernung bleibt im Schatten
       * sichtbar, so wie in Wirklichkeit auch.
       */
      blend: 'multiply',
    });
  }

  const spiegelung = await spiegelungBauen(fahrzeug, fBreite, fHoehe, e);
  if (spiegelung) {
    ebenen.push({ input: spiegelung.bild, left: fahrzeugX, top: bodenY });
  }

  ebenen.push({ input: fahrzeug, left: fahrzeugX, top: fahrzeugY });

  const bild = await sharp(hintergrund)
    .composite(ebenen)
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toBuffer();

  return {
    bild,
    breite: zielBreite,
    hoehe: zielHoehe,
    messwerte: {
      fahrzeugBreite: fBreite,
      fahrzeugHoehe: fHoehe,
      helligkeitFahrzeug: Math.round(helligkeitFahrzeug),
      helligkeitHintergrund: Math.round(helligkeitHintergrund),
    },
  };
}
