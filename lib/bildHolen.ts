/**
 * Ein Foto als Rohdaten besorgen — egal, in welcher Form es ankommt.
 *
 * Die beiden Export-Routen (mobile.de, AutoScout24) erwarteten die Bilder
 * als Data-URL mit Base64 darin. So kamen sie auch an, solange die Fotos
 * im Sitzungsspeicher des Browsers lagen.
 *
 * Seit Schritt 2 die Fotos in den Speicher hochlaedt und nur noch
 * Adressen weitergibt, stimmt das nicht mehr: Beide Routen haetten jedes
 * Bild als "konnte nicht gelesen werden" gemeldet und das Inserat ohne
 * Fotos angelegt. Ein Inserat ohne Fotos ist bei mobile.de kein Inserat,
 * sondern eine Karteileiche.
 *
 * Deshalb hier an einer Stelle: Data-URL entpacken, http(s)-Adresse
 * laden, alles andere ablehnen.
 */

/** Hoechstgroesse, die wir ueberhaupt annehmen — mobile.de nimmt 2 MB. */
const GRENZE_BYTES = 8 * 1024 * 1024;

export interface GeholtesBild {
  daten: Buffer;
  /** Medientyp, so wie ihn der Speicher oder die Data-URL nennt. */
  typ: string;
}

/**
 * Laedt ein Bild. Gibt null zurueck, wenn daraus keine Bilddaten zu
 * machen sind — der Aufrufer meldet das dann je Bild, statt den ganzen
 * Upload scheitern zu lassen.
 */
export async function bildHolen(quelle: unknown): Promise<GeholtesBild | null> {
  const s = typeof quelle === 'string' ? quelle.trim() : '';
  if (!s) return null;

  if (s.startsWith('data:')) {
    // [^] statt des Punktes mit s-Flag: Base64 kann Zeilenumbrueche
    // enthalten, und das s-Flag verlangt ein neueres Ziel in tsconfig.
    const treffer = s.match(/^data:([^;,]+);base64,([^]*)$/);
    if (!treffer) return null;
    const daten = Buffer.from(treffer[2], 'base64');
    if (daten.length === 0 || daten.length > GRENZE_BYTES) return null;
    return { daten, typ: treffer[1].toLowerCase() };
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      const antwort = await fetch(s);
      if (!antwort.ok) return null;
      const daten = Buffer.from(await antwort.arrayBuffer());
      if (daten.length === 0 || daten.length > GRENZE_BYTES) return null;
      const typ = (antwort.headers.get('content-type') || 'image/jpeg')
        .split(';')[0].trim().toLowerCase();
      if (!typ.startsWith('image/')) return null;
      return { daten, typ };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Bild als JPEG, hoechstens so viele Bytes gross.
 *
 * mobile.de nimmt nur JPG und hoechstens 2 MB. Ein Studio-Bild liegt
 * darueber, und ein PNG mit Transparenz kommt aus dem Freistellen auch
 * vor. Vorher wurden solche Bilder uebersprungen und gemeldet — das
 * Inserat ging dann mit drei von dreissig Fotos raus. Umwandeln ist
 * besser als weglassen.
 */
export async function alsJpeg(bild: GeholtesBild, maxBytes: number): Promise<Buffer | null> {
  if (bild.typ === 'image/jpeg' && bild.daten.length <= maxBytes) return bild.daten;

  const sharp = (await import('sharp')).default;
  /*
   * In Stufen herunter: erst nur umwandeln, dann die Qualitaet senken,
   * dann die Kantenlaenge. In dieser Reihenfolge, weil Qualitaet unter 75
   * sichtbar wird, eine kleinere Kante aber nur bei genauem Hinsehen —
   * und das Foto ist das Produkt.
   */
  const stufen: Array<{ qualitaet: number; kante?: number }> = [
    { qualitaet: 90 }, { qualitaet: 82 }, { qualitaet: 75 },
    { qualitaet: 82, kante: 1600 }, { qualitaet: 75, kante: 1280 },
  ];

  for (const stufe of stufen) {
    try {
      let s = sharp(bild.daten).flatten({ background: '#ffffff' });
      if (stufe.kante) s = s.resize(stufe.kante, stufe.kante, { fit: 'inside', withoutEnlargement: true });
      const raus = await s.jpeg({ quality: stufe.qualitaet, chromaSubsampling: '4:4:4' }).toBuffer();
      if (raus.length <= maxBytes) return raus;
    } catch {
      return null;
    }
  }
  return null;
}
