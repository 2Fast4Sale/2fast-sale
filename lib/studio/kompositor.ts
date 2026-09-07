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
  breitenanteil:     0.82,
  bodenabstand:      0.10,
  ausrichtung:       0.50,
  schattenStaerke:   0.55,
  schattenWeichheit: 26,
  schattenHoehe:     0.10,
  schattenVersatz:   0.02,
  spiegelungStaerke: 0.22,
  spiegelungLaenge:  0.35,
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
 * Erzeugt den Bodenschatten aus der Silhouette des Fahrzeugs.
 *
 * Kein trainiertes Modell, sondern eine Projektion: Die Silhouette
 * wird flachgedrueckt, weichgezeichnet und unter das Fahrzeug gelegt.
 * Das ergibt einen glaubwuerdigen Kontaktschatten, solange das
 * Fahrzeug von der Seite oder leicht schraeg aufgenommen ist.
 *
 * Bei einer Aufnahme steil von oben stimmt die Projektion nicht — dann
 * liegt der Schatten falsch, und das faellt auf. Genau deshalb ist die
 * gefuehrte Aufnahme kein Beiwerk.
 */
async function schattenBauen(
  fahrzeug: Buffer,
  breite: number,
  hoehe: number,
  e: KompositorEinstellungen,
): Promise<{ bild: Buffer; breite: number; hoehe: number }> {
  const schattenHoehe = Math.max(4, Math.round(hoehe * e.schattenHoehe));

  /*
   * Nur das untere Viertel der Silhouette.
   *
   * Der erste Versuch quetschte die GANZE Silhouette flach. Damit ging
   * auch das Dach in den Schatten ein, und heraus kam ein ueber die
   * volle Laenge gleich dunkler Balken mit harten Enden — im Test
   * deutlich als Fremdkoerper zu sehen.
   *
   * Ein Kontaktschatten entsteht aber dort, wo das Fahrzeug den Boden
   * beruehrt: an den Raedern und am Unterboden. Deshalb zaehlt hier nur
   * der untere Teil.
   */
  const bandHoehe = Math.max(2, Math.round(hoehe * 0.25));
  const band = await sharp(fahrzeug)
    .ensureAlpha()
    .extractChannel(3)
    .extract({ left: 0, top: hoehe - bandHoehe, width: breite, height: bandHoehe })
    .toBuffer();

  /*
   * Seitlicher Auslauf. Ohne ihn endet der Schatten senkrecht an der
   * Fahrzeugkante, was es wie ein aufgeklebtes Rechteck aussehen laesst.
   */
  /*
   * Der Verlauf muss DECKEND sein, ohne Alphakanal.
   *
   * Zuerst stand hier stop-opacity="0" an den Enden. Das war genau
   * falsch herum: Bei blend "multiply" laesst sharp den Untergrund
   * dort, wo die aufgelegte Ebene durchsichtig ist, UNVERAENDERT. Der
   * Schatten lief also nicht aus, sondern blieb an den Enden voll
   * stehen — im Test ein schwarzer Balken mit senkrechten Kanten.
   *
   * Deckendes Schwarz an den Enden multipliziert dagegen auf null.
   */
  const auslauf = Buffer.from(
    `<svg width="${breite}" height="${schattenHoehe}">
       <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
         <stop offset="0%"   stop-color="#000"/>
         <stop offset="22%"  stop-color="#fff"/>
         <stop offset="78%"  stop-color="#fff"/>
         <stop offset="100%" stop-color="#000"/>
       </linearGradient></defs>
       <rect width="${breite}" height="${schattenHoehe}" fill="url(#a)"/>
     </svg>`,
  );

  /*
   * Maske als ROHE Graustufen, ein Kanal. Die Deckkraft wird gleich
   * hier eingerechnet (linear), nicht spaeter ueber eine zweite Ebene.
   */
  const maske = await sharp(band)
    .resize(breite, schattenHoehe, { fit: 'fill' })
    .blur(Math.max(0.3, e.schattenWeichheit))
    .composite([{
      input: await sharp(auslauf).removeAlpha().greyscale().png().toBuffer(),
      blend: 'multiply',
    }])
    .linear(Math.max(0, Math.min(1, e.schattenStaerke)), 0)
    .greyscale()
    .raw()
    .toBuffer();

  /*
   * Die Maske gehoert in den ALPHAKANAL, nicht in die Farbe.
   *
   * Zuerst stand hier ein schwarzes Rechteck, auf das die Maske per
   * blend "dest-in" gelegt wurde. Das konnte nicht funktionieren:
   * dest-in liest die Durchsichtigkeit der aufgelegten Ebene, und eine
   * Graustufenmaske hat gar keine — sie ist ueberall deckend. Also
   * blieb das Rechteck vollstaendig stehen, und im Bild lag ein
   * schwarzer Balken unter dem Fahrzeug.
   *
   * joinChannel haengt die Maske als vierten Kanal an drei schwarze
   * Kanaele. Damit ist der Schatten dort dunkel, wo die Maske hell
   * ist, und sonst durchsichtig.
   */
  const schwarz = await sharp({
    create: { width: breite, height: schattenHoehe, channels: 3, background: { r: 0, g: 0, b: 0 } },
  }).raw().toBuffer();

  const schatten = await sharp(schwarz, {
    raw: { width: breite, height: schattenHoehe, channels: 3 },
  })
    .joinChannel(maske, { raw: { width: breite, height: schattenHoehe, channels: 1 } })
    .png()
    .toBuffer();

  return { bild: schatten, breite, hoehe: schattenHoehe };
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
async function angleichen(
  fahrzeug: Buffer,
  helligkeitFahrzeug: number,
  helligkeitHintergrund: number,
  e: KompositorEinstellungen,
): Promise<Buffer> {
  if (e.angleichung <= 0) return fahrzeug;

  const ziel = helligkeitFahrzeug
    + (helligkeitHintergrund - helligkeitFahrzeug) * e.angleichung * 0.35;
  const faktor = helligkeitFahrzeug > 1 ? ziel / helligkeitFahrzeug : 1;

  // Grenzen, damit die Angleichung das Bild nie zerstoert.
  const sicher = Math.max(0.75, Math.min(1.35, faktor));

  return sharp(fahrzeug).ensureAlpha().linear(sicher, 0).png().toBuffer();
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

  const zugeschnitten = await aufFahrzeugZuschneiden(freigestellt);
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

  const fahrzeug = await angleichen(fahrzeugRoh, helligkeitFahrzeug, helligkeitHintergrund, e);

  // Standlinie: Unterkante des Fahrzeugs im Zielbild.
  const bodenY = Math.round(zielHoehe * (1 - e.bodenabstand));
  const fahrzeugY = Math.max(0, bodenY - fHoehe);
  const fahrzeugX = Math.max(0, Math.round((zielBreite - fBreite) * e.ausrichtung));

  const ebenen: sharp.OverlayOptions[] = [];

  // Schatten zuerst, er liegt unter allem.
  const schatten = await schattenBauen(fahrzeug, fBreite, fHoehe, e);
  ebenen.push({
    input: schatten.bild,
    left: Math.max(0, fahrzeugX + Math.round(fBreite * e.schattenVersatz)),
    top:  Math.max(0, bodenY - Math.round(schatten.hoehe / 2)),
  });

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
