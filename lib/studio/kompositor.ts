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
  /**
   * Kante zwischen Boden und Wand als Anteil der Bildhoehe. Kein
   * Aufstandspunkt des Fahrzeugs darf darueber liegen, sonst steht ein
   * Rad in der Wand.
   */
  wandlinie?: number;
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
  /**
   * Das eingesetzte Fahrzeug als eigene Ebene, genau so, wie es im Bild
   * liegt. Damit laesst sich das Original nach einer KI-Bearbeitung
   * pixelgenau wieder obenauf legen — siehe geminiSchatten.ts.
   */
  fahrzeugEbene: { bild: Buffer; left: number; top: number };
  /**
   * Wo das Fahrzeug im uebergebenen freigestellten Bild lag, in dessen
   * Bildpunkten. Zusammen mit fahrzeugEbene laesst sich damit jede Stelle
   * des freigestellten Bildes im Ergebnis wiederfinden.
   */
  quellRahmen: { links: number; oben: number; breite: number; hoehe: number };
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
/**
 * Entfernt Reste des alten Bodens, die die Freistellung stehen laesst.
 *
 * Das kostenlose Freistellen im Browser (ormbg) laesst unter dem Fahrzeug
 * oft den Schatten des Originalbodens halb stehen: dunkelgraue,
 * halbdurchsichtige Schlieren unter der Stossstange und zwischen den
 * Raedern. Im Live-Test am Urus sah der Wagen dadurch aus, als stuende er
 * auf einem schmutzigen Fleck. Ausserdem verfaelschen sie die
 * Raderkennung, denn sie liegen tiefer als die Reifen.
 *
 * Erkennbar sind sie an drei Dingen zugleich: halbdurchsichtig, dunkel
 * und farblos. Das echte Fahrzeug ist an solchen Stellen voll deckend —
 * auch ein schwarzer Reifen. Nur seine Kante verliert ein, zwei Pixel
 * Weichheit, und das sieht man nicht.
 */
async function bodenresteEntfernen(freigestellt: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(freigestellt).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let entfernt = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a >= 235) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const hell = 0.299 * r + 0.587 * g + 0.114 * b;
    const saettigung = max ? (max - min) / max : 0;
    if (hell < 110 && saettigung < 0.25) { data[i + 3] = 0; entfernt++; }
  }
  if (entfernt === 0) return freigestellt;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

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
/**
 * Schneidet auf das Fahrzeug zu und sagt dazu, WO es im Ausgangsbild lag.
 *
 * Der Rahmen wird gebraucht, um spaeter eine Stelle aus dem
 * freigestellten Bild — etwa das Haendlerschild — im fertigen Studiobild
 * wiederzufinden, ohne sie dort noch einmal suchen zu muessen.
 */
async function aufFahrzeugZuschneiden(freigestellt: Buffer): Promise<{ bild: Buffer; rahmen: { links: number; oben: number; breite: number; hoehe: number } }> {
  const quelle = sharp(freigestellt).ensureAlpha();
  const { width, height } = await quelle.metadata();
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

  const rahmen = {
    links, oben,
    breite: rechts - links + 1,
    hoehe: unten - oben + 1,
  };
  const ausschnitt = await sharp(freigestellt).ensureAlpha().extract({
    left: links, top: oben, width: rahmen.breite, height: rahmen.hoehe,
  }).png().toBuffer();
  return { bild: ausschnitt, rahmen };
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
  const breiteFahrzeug = xBis - xVon;
  const abstandMin = Math.round(breiteFahrzeug * 0.30);

  /*
   * Die aeussersten Spalten scheiden aus.
   *
   * Steht das Fahrzeug bis an den Bildrand oder laesst die Freistellung
   * dort einen Rest stehen, ist die unterste Zeile genau am Rand — und
   * die Radsuche nimmt x = 0 fuer ein Rad. Gemessen an einer Heckansicht
   * aus dem Stapel: "Raeder" bei 0 und 772, also fast die ganze
   * Fahrzeugbreite, und daraus eine schiefe Standlinie quer durch das
   * Bild. Im Studiobild lag darunter ein dunkler Kasten und der Wagen
   * schwebte.
   *
   * Ein echtes Rad liegt nie ganz aussen: Davor sitzt immer noch
   * Stossstange oder Kotfluegel.
   */
  const rand = Math.max(2, Math.round(breiteFahrzeug * 0.05));
  const vonInnen = xVon + rand, bisInnen = xBis - rand;

  const kandidaten: number[] = [];
  for (let x = vonInnen; x <= bisInnen; x++) {
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
  /*
   * Der Radstand ist im Bild nie breiter als das Fahrzeug selbst. Mehr
   * als 85 Prozent heisst: einer der beiden Punkte ist kein Rad.
   */
  const abstandMax = Math.round(breiteFahrzeug * 0.85);
  for (const x of kandidaten) {
    const d = Math.abs(x - radA);
    if (d >= abstandMin && d <= abstandMax) { radB = x; break; }
  }
  if (radA < 0) return null;
  /*
   * Nur ein Tiefpunkt: Das Fahrzeug steht quer zur Kamera (Front- oder
   * Heckansicht). Dann ist eine waagerechte Standlinie richtig, und die
   * bekommt man, indem der zweite Punkt auf derselben Hoehe am anderen
   * Ende angenommen wird.
   */
  if (radB < 0) {
    /*
     * Nur ein Tiefpunkt gefunden: Das Fahrzeug steht quer zur Kamera
     * (Front- oder Heckansicht), beide Raeder liegen fast gleich hoch.
     *
     * Der Ersatzpunkt darf NICHT an den Bildrand: Dort landete sonst der
     * dunkle Reifenkern des Schattens, sichtbar neben dem Auto. Er
     * kommt deshalb um denselben Abstand nach innen, den auch die
     * Kandidatensuche einhaelt.
     */
    radB = radA < (xVon + xBis) / 2 ? bisInnen : vonInnen;
    /*
     * Hoehe am Ersatzpunkt: die echte Unterkante dort, nicht die Hoehe
     * des gefundenen Rades. Bei schraeg hinten sitzt das verdeckte Rad
     * hinter dem Stossstangenende; eine waagerechte Linie in Radhoehe lag
     * dort weit unter dem Auto. Am schwarzen Golf ergab das einen
     * dunklen Balken links neben dem Wagen.
     */
    if (unten[radB] < 0) unten[radB] = unten[radA];
  }
  if (radA > radB) { const h = radA; radA = radB; radB = h; }

  /*
   * Letzte Sicherung: eine zu steile Standlinie gibt es nicht.
   *
   * Zwischen zwei Radaufstandspunkten liegen im Foto selten mehr als
   * 20 Grad. Ist die Linie steiler, stimmt einer der Punkte nicht —
   * dann lieber waagerecht durch den tieferen der beiden, das sieht
   * schlimmstenfalls langweilig aus statt falsch.
   */
  const steigung = Math.abs(unten[radB] - unten[radA]) / Math.max(1, Math.abs(radB - radA));
  if (steigung > 0.36) {
    const tiefer = unten[radA] >= unten[radB] ? unten[radA] : unten[radB];
    unten[radA] = tiefer;
    unten[radB] = tiefer;
  }

  return { unten, xVon, xBis, radA, radB };
}

/**
 * Bodenschatten im Bildraum, entlang der Standlinie.
 *
 * ── Warum nicht mehr ueber Bodenkoordinaten ────────────────────────
 *
 * Die Fassung davor rechnete die Unterkante der Silhouette auf den Boden
 * um. Das stimmt nur dort, wo das Fahrzeug den Boden beruehrt — an den
 * Raedern. Stossstangen und Schweller haengen aber frei in der Luft; auf
 * den Boden projiziert landeten sie weit HINTER dem Auto. Am Golf ergab
 * das zwei lange dunkle Streifen seitlich neben dem Wagen und fast
 * nichts darunter. Im ersten Live-Test war genau das zu sehen.
 *
 * ── Wie es jetzt geht ──────────────────────────────────────────────
 *
 * Wie bei Haendlerfotos unter diffusem Hallenlicht (BMW, Hyundai als
 * Vorlage): Dunkel ist es unter dem GANZEN Wagen, und der Schatten
 * laeuft nur ein kurzes Stueck ueber das Fahrzeug hinaus aus.
 *
 * Grundlage ist die Standlinie — die Gerade durch die beiden
 * Radaufstandspunkte. Je Spalte liegt der Schatten von dieser Linie ein
 * Stueck nach oben (das ist der Boden unter dem Wagen, zum Teil hinter
 * ihm versteckt) und laeuft nach unten kurz aus. Seitlich endet er kurz
 * hinter den Enden des Fahrzeugs. Unter den Reifen kommt ein dunkler
 * Kern dazu: Wo Gummi den Boden beruehrt, kommt kein Licht hin.
 */
async function bodenschattenBild(
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

  // Standlinie im fertigen Bild.
  const ax = fahrzeugX + radA, ay = fahrzeugY + unten[radA];
  const bx = fahrzeugX + radB, by = fahrzeugY + unten[radB];
  const steigung = bx !== ax ? (by - ay) / (bx - ax) : 0;
  const standY = (x: number) => ay + (x - ax) * steigung;

  /*
   * Seitlich nur bis knapp hinter die Raeder, nicht bis zu den Enden des
   * Fahrzeugs. Vor dem Vorderrad haengt die Stossstange in der Luft; der
   * Boden darunter liegt VOR dem Auto und ist bei Licht von oben hell. Bis
   * zu den Enden gezogen lag dort ein dunkles Band, und der Wagen schien
   * darueber zu schweben — am Golf und am Urus gleichermassen.
   */
  const radLinks = Math.min(ax, bx), radRechts = Math.max(ax, bx);
  const links = fahrzeugX + xVon, rechts = fahrzeugX + xBis;
  const laenge = rechts - links;
  /*
   * Unter den Ueberhaengen (vor dem Vorderrad, hinter dem Hinterrad) nur
   * abgeschwaecht. Ganz weg war falsch — dann fehlte vorn jeder Schatten,
   * und die Front schien zu schweben. Voll wie zwischen den Raedern war
   * auch falsch: Das gab ein dunkles Band vor der Stossstange. Dazwischen:
   * vom Rad zum Fahrzeugende von voll auf 55 Prozent.
   */
  const ueberhang = (x: number) => {
    if (x >= radLinks && x <= radRechts) return 1;
    const weg = x < radLinks ? (radLinks - x) / Math.max(1, radLinks - links)
                             : (x - radRechts) / Math.max(1, rechts - radRechts);
    return 1 - 0.45 * Math.min(1, weg);
  };

  // Masse in Pixeln, alle aus der Fahrzeuggroesse — damit es bei jeder
  // Bildbreite gleich aussieht.
  const tiefeOben = fHoehe * 0.14;     // Boden unter dem Wagen, nach hinten
  const auslaufUnten = fHoehe * 0.020; // kurze Kante nach vorn
  const auslaufSeite = laenge * 0.030; // ueber die Enden hinaus
  const hofUnten = fHoehe * 0.030;     // weicher Hof nach vorn, kurz

  /*
   * Tiefster Karosseriepunkt zwischen einer Spalte und dem naechsten Rad.
   *
   * Ohne das zeichnete die Seite im Live-Test einen dunklen Block an die
   * WAND links neben dem Golf: Die aeusserste Spalte der Freistellung
   * enthielt nur noch die Ecke der Heckleuchte, deren Unterkante weit
   * oben liegt — und genau dort landete der Schatten. Vom Rad nach aussen
   * gelaufen und immer den tiefsten Punkt behalten, kann die Linie nur
   * absinken oder gleich bleiben, nie nach oben springen.
   */
  /*
   * Erst hinter dem Reifen anfangen. Der Reifen ist immer der tiefste
   * Punkt; von ihm aus gezaehlt lag der Schatten unter der Stossstange auf
   * Radhoehe statt knapp unter der Karosserie — beim Urus war vorn dann
   * wieder kein Schatten zu sehen.
   */
  const reifen = Math.round(fBreite * 0.07);
  const tiefsterNachAussen = new Int32Array(fBreite).fill(-1);
  {
    let tief = -1;
    for (let c = Math.min(fBreite - 1, radA - reifen); c >= 0; c--) {
      if (unten[c] > tief) tief = unten[c];
      tiefsterNachAussen[c] = tief;
    }
    tief = -1;
    for (let c = Math.max(0, radB + reifen); c < fBreite; c++) {
      if (unten[c] > tief) tief = unten[c];
      tiefsterNachAussen[c] = tief;
    }
  }

  const maske = Buffer.alloc(zielBreite * zielHoehe, 0);
  const glatt = (a: number) => a * a * (3 - 2 * a);

  const xStart = Math.max(0, Math.floor(links - auslaufSeite * 3));
  const xEnde = Math.min(zielBreite - 1, Math.ceil(rechts + auslaufSeite * 3));

  for (let x = xStart; x <= xEnde; x++) {
    // Seitlich: voll zwischen den Enden, danach weich auf null.
    let seite = 1;
    if (x < links) seite = Math.max(0, 1 - (links - x) / (auslaufSeite * 3));
    else if (x > rechts) seite = Math.max(0, 1 - (x - rechts) / (auslaufSeite * 3));
    if (seite <= 0) continue;
    seite = glatt(seite);

    /*
     * Zwischen den Raedern: die Standlinie. Davor und dahinter NICHT deren
     * Verlaengerung — die faellt beim Blick von schraeg vorn vor dem
     * Vorderrad weiter ab und lag am Golf 190 Pixel unter der Stossstange,
     * also als Balken vor dem Auto. Unter einem Ueberhang liegt der
     * Schatten knapp unter der Karosserie.
     */
    let s = standY(x);
    if (x < radLinks || x > radRechts) {
      /*
       * Im seitlichen Auslauf hinter dem Fahrzeugende gibt es keine
       * Karosserie mehr — dort gilt die Hoehe der letzten Spalte. Ohne das
       * griff wieder die verlaengerte Radlinie, und neben dem Auto lagen
       * einzelne dunkle Flecken auf dem Boden.
       */
      const spalte = Math.max(xVon, Math.min(xBis, x - fahrzeugX));
      const tief = tiefsterNachAussen[spalte];
      // Im Reifenbereich selbst (tief < 0) gilt die Standlinie.
      if (tief >= 0) s = Math.min(s, fahrzeugY + tief + fHoehe * 0.035);
    }
    const yVon = Math.max(0, Math.floor(s - tiefeOben));
    const yBis = Math.min(zielHoehe - 1, Math.ceil(s + auslaufUnten + hofUnten * 3));

    for (let y = yVon; y <= yBis; y++) {
      let wert: number;
      if (y <= s) {
        // Unter dem Wagen: gleichmaessig dunkel, nach hinten leicht heller.
        const a = (s - y) / tiefeOben;
        wert = 1 - 0.35 * glatt(Math.min(1, a));
      } else {
        // Vor der Standlinie: kurze Kante, dann weicher Hof.
        const d = y - s;
        const kante = d < auslaufUnten ? glatt(1 - d / auslaufUnten) : 0;
        const hof = Math.exp(-d / hofUnten);
        wert = 0.65 * kante + 0.35 * hof;
      }
      wert *= seite * ueberhang(x) * e.schattenStaerke;

      // Reifenkerne: eng und tief.
      for (const [rx, ry] of [[ax, ay], [bx, by]]) {
        const u = (x - rx) / (fBreite * 0.045);
        const v = (y - ry) / (fHoehe * 0.030);
        wert += e.schattenStaerke * e.kernBoost * Math.exp(-(u * u + v * v) / 2);
      }

      if (wert <= 0.004) continue;
      const i = y * zielBreite + x;
      maske[i] = Math.max(maske[i], Math.min(255, Math.round(Math.min(1, wert) * 255)));
    }
  }

  const weich = await sharp(maske, { raw: { width: zielBreite, height: zielHoehe, channels: 1 } })
    .blur(Math.max(1.5, zielBreite * 0.004))
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

  const bereinigt = await nurGroesstesObjekt(await bodenresteEntfernen(freigestellt));
  const { bild: zugeschnitten, rahmen: quellRahmen } = await aufFahrzeugZuschneiden(bereinigt);
  const zMeta = await sharp(zugeschnitten).metadata();
  const zBreite = zMeta.width ?? 1;
  const zHoehe  = zMeta.height ?? 1;

  // Fahrzeug auf Zielbreite bringen, Seitenverhaeltnis behalten.
  /*
   * Die Breite gibt `breitenanteil` vor — aber nur, solange das Fahrzeug
   * damit ins Bild passt.
   *
   * Bei einem HOCHFORMAT-Foto (Haendler fotografiert hochkant) ist das
   * freigestellte Fahrzeug hoeher als breit. Auf 60 % der Bildbreite
   * gezogen wurde es hoeher als das ganze Zielbild, und das Einsetzen
   * brach ab: "Image to composite must have same dimensions or smaller".
   * Im Stapeltest ueber 51 Fotos sind daran drei Bilder gescheitert —
   * im Betrieb haette der Haendler unter dem Foto "Fehler" gelesen.
   *
   * Mehr als bis zur Standlinie darf das Fahrzeug nie reichen; darueber
   * liegt der Raum. 0,95 laesst einen Rest Luft nach oben.
   */
  /*
   * Kein Rad in der Wand.
   *
   * Von schraeg oben fotografiert steht das hintere Rad im Bild viel
   * hoeher als das vordere. Am schwarzen Golf lag das Vorderrad ueber
   * der Kante zwischen Boden und Wand — der Wagen stand schief im Raum
   * und schien zu schweben.
   *
   * Massgeblich ist der hoechste Punkt der Unterkante (ohne die
   * aeussersten Spalten). Er muss unter der Wandlinie bleiben: erst wird
   * der Wagen nach unten geschoben, bis hoechstens 10 Prozent Rand, dann
   * wenn noetig verkleinert — nie unter 70 Prozent, sonst wirkt er
   * verloren.
   */
  let bodenabstand = e.bodenabstand;
  let wandFaktor = 1;
  if (typeof e.wandlinie === 'number') {
    const aZ = await sharp(zugeschnitten).ensureAlpha().extractChannel(3).raw().toBuffer();
    const rand = Math.round(zBreite * 0.08);
    let hoechster = zHoehe;
    for (let x = rand; x < zBreite - rand; x++) {
      for (let y = zHoehe - 1; y >= 0; y--) {
        if (aZ[y * zBreite + x] > 8) { if (y < hoechster) hoechster = y; break; }
      }
    }
    const anteilUnter = 1 - hoechster / zHoehe;
    if (anteilUnter > 0.02) {
      const wandY = zielHoehe * (e.wandlinie + 0.03);
      const hoeheGeplant = Math.min(
        zielHoehe * (1 - bodenabstand) * 0.95,
        (zielBreite * e.breitenanteil / zBreite) * zHoehe,
      );
      const noetig = (zielHoehe * (1 - bodenabstand) - hoeheGeplant * anteilUnter) < wandY;
      if (noetig) {
        bodenabstand = Math.max(0.10, Math.min(bodenabstand,
          1 - (wandY + hoeheGeplant * anteilUnter) / zielHoehe));
        const platz = zielHoehe * (1 - bodenabstand) - wandY;
        wandFaktor = Math.max(0.7, Math.min(1, platz / (hoeheGeplant * anteilUnter)));
      }
    }
  }

  const bodenLinie = zielHoehe * (1 - bodenabstand);
  /*
   * Zwei Grenzen fuer die Groesse, nicht nur eine.
   *
   * Bisher zaehlte allein die Breite. Ein Kombi von der Seite ist im
   * Bild rund 2,7-mal so breit wie hoch — da passt das. Ein SUV von
   * schraeg vorn ist aber nur etwa 1,5-mal so breit wie hoch: Auf
   * dieselbe Breite gezogen stiess sein Dach fast an die Decke, und der
   * Wagen wirkte groesser als die Halle. Am Audi Q7 war genau das zu
   * sehen.
   *
   * Deshalb zusaetzlich eine Hoehengrenze. Ein Auto ist etwa halb so
   * hoch wie eine Halle; mehr als die Haelfte der Bildhoehe darf es
   * deshalb nie einnehmen.
   */
  const maxHoehe = Math.max(1, Math.min(bodenLinie * 0.95, zielHoehe * 0.5));
  let fBreite = Math.max(1, Math.round(zielBreite * e.breitenanteil * wandFaktor));
  let fHoehe  = Math.max(1, Math.round((fBreite / zBreite) * zHoehe));
  if (fHoehe > maxHoehe) {
    const faktor = maxHoehe / fHoehe;
    fBreite = Math.max(1, Math.round(fBreite * faktor));
    fHoehe  = Math.max(1, Math.round(fHoehe * faktor));
  }

  const fahrzeugRoh = await sharp(zugeschnitten)
    .resize(fBreite, fHoehe, { fit: 'fill' })
    .png()
    .toBuffer();

  const helligkeitFahrzeug   = await mittlereHelligkeit(fahrzeugRoh, true);
  const helligkeitHintergrund = await mittlereHelligkeit(hintergrund);

  const fahrzeug = await angleichen(fahrzeugRoh, helligkeitFahrzeug, helligkeitHintergrund, e, hintergrund);

  // Standlinie: Unterkante des Fahrzeugs im Zielbild.
  const bodenY = Math.round(zielHoehe * (1 - bodenabstand));
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
    const s = await bodenschattenBild(
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
    quellRahmen,
    breite: zielBreite,
    hoehe: zielHoehe,
    messwerte: {
      fahrzeugBreite: fBreite,
      fahrzeugHoehe: fHoehe,
      helligkeitFahrzeug: Math.round(helligkeitFahrzeug),
      helligkeitHintergrund: Math.round(helligkeitHintergrund),
    },
    fahrzeugEbene: { bild: fahrzeug, left: fahrzeugX, top: fahrzeugY },
  };
}
