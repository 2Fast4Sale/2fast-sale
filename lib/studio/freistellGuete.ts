/**
 * Beurteilt eine Freistellung, ohne sie anzusehen.
 *
 * ── Warum ──────────────────────────────────────────────────────────
 *
 * Das kostenlose Freistellen im Browser (ormbg) scheitert an manchen
 * Fotos, besonders an dunklen Autos auf dunklem Pflaster. Dann bleibt ein
 * rechteckiges Stueck Originalfoto stehen — Pflaster, Hauswand, Himmel.
 * Im Studiobild sieht man das sofort: ein schwebendes Rechteck, und der
 * Schatten darunter wird zum schwarzen Balken, weil die Unterkante des
 * "Fahrzeugs" quer durch das Bild laeuft.
 *
 * Im Stapeltest ueber 51 Fotos war jedes fuenfte so kaputt. Ein Haendler
 * zahlt fuer das Inserat; ein sichtbar falsches Bild ist schlimmer als
 * eine ehrliche Meldung, dass dieses Foto nicht verarbeitet werden
 * konnte.
 *
 * ── Die drei Zahlen ────────────────────────────────────────────────
 *
 *   deckung     Anteil deckender Pixel am ganzen Foto.
 *   rechteckig  Wie gut die Flaeche ihr umschliessendes Rechteck fuellt.
 *   randVoll    Anteil deckender Pixel auf der Randlinie dieses Rechtecks.
 *
 * randVoll ist die aussagekraeftigste: Ein Auto beruehrt sein Rechteck nur
 * an wenigen Stellen (Dach, Reifen, Stossstange), ein stehengebliebenes
 * Stueck Hintergrund ist rundherum deckend. Gemessen am Stapel: saubere
 * Freistellungen liegen unter 0,45, kaputte deutlich darueber.
 */

import sharp from 'sharp';
import { fahrzeugKastenFinden } from './kennzeichenModell';

/**
 * Schneidet alles weg, was ausserhalb des Fahrzeugs liegt.
 *
 * Die Freistellung laesst bei schwierigen Fotos Teile des Untergrunds
 * stehen — beim schwarzen Golf auf Pflaster ein ganzes Rechteck davon.
 * Das Erkennungsmodell weiss dagegen, wo das Auto ist. Was ausserhalb
 * seines Kastens liegt, kann kein Fahrzeugteil sein und wird
 * durchsichtig gemacht.
 *
 * Der Rand von 4 Prozent ist Absicht: Der Kasten sitzt nicht auf den
 * Pixel genau, und ein abgeschnittener Aussenspiegel waere schlimmer als
 * ein Rest Pflaster.
 */
export async function aufFahrzeugBeschneiden(freigestellt: Buffer): Promise<Buffer> {
  const kasten = await fahrzeugKastenFinden(freigestellt);
  if (!kasten || kasten === 'keins') return freigestellt;

  const { width: B = 0, height: H = 0 } = await sharp(freigestellt).metadata();
  if (!B || !H) return freigestellt;

  const rand = 0.04;
  const x0 = Math.max(0, Math.round((kasten.x0 - rand) * B));
  const y0 = Math.max(0, Math.round((kasten.y0 - rand) * H));
  const x1 = Math.min(B, Math.round((kasten.x1 + rand) * B));
  const y1 = Math.min(H, Math.round((kasten.y1 + rand) * H));
  if (x1 - x0 < 8 || y1 - y0 < 8) return freigestellt;
  // Deckt der Kasten ohnehin fast alles ab, gibt es nichts zu tun.
  if ((x1 - x0) * (y1 - y0) > B * H * 0.92) return freigestellt;

  /*
   * Die Maske ist im Kasten weiss und aussen schwarz; mit "dest-in"
   * bleibt nur der Teil des Bildes stehen, der unter dem Weiss liegt.
   */
  const maske = await sharp({
    create: { width: B, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: await sharp({
        create: { width: x1 - x0, height: y1 - y0, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      }).png().toBuffer(),
      left: x0, top: y0,
    }])
    .png().toBuffer();

  return sharp(freigestellt).ensureAlpha()
    .composite([{ input: maske, blend: 'dest-in' }])
    .png().toBuffer();
}

export interface FreistellGuete {
  deckung: number;
  rechteckig: number;
  randVoll: number;
  /** Nichts davon gut genug fuer ein bezahltes Inserat. */
  brauchbar: boolean;
  /** Warum nicht — in einem Satz fuer die Oberflaeche. */
  grund: string | null;
}

export async function freistellGuete(freigestellt: Buffer): Promise<FreistellGuete> {
  const { data, info } = await sharp(freigestellt).ensureAlpha().extractChannel(3)
    .resize(400, 400, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });

  let deckend = 0, xMin = info.width, xMax = -1, yMin = info.height, yMax = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 128) continue;
      deckend++;
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
    }
  }

  if (xMax < xMin || yMax < yMin) {
    return { deckung: 0, rechteckig: 0, randVoll: 0, brauchbar: false, grund: 'Auf dem Foto wurde kein Fahrzeug gefunden.' };
  }

  const flaeche = info.width * info.height;
  const kasten = Math.max(1, (xMax - xMin + 1) * (yMax - yMin + 1));
  let rand = 0, randDeckend = 0;
  const test = (x: number, y: number) => {
    rand++;
    if (data[y * info.width + x] >= 128) randDeckend++;
  };
  for (let x = xMin; x <= xMax; x++) { test(x, yMin); test(x, yMax); }
  for (let y = yMin; y <= yMax; y++) { test(xMin, y); test(xMax, y); }

  const g: FreistellGuete = {
    deckung: deckend / flaeche,
    rechteckig: deckend / kasten,
    randVoll: rand ? randDeckend / rand : 0,
    brauchbar: true,
    grund: null,
  };

  /*
   * Die Grenzen stammen aus dem Stapel ueber 51 Fotos. Sie sind bewusst
   * grosszuegig: Lieber ein mittelmaessiges Bild durchlassen als ein
   * gutes ablehnen — ausgeschlossen wird nur, was sicher kaputt ist.
   */
  if (g.randVoll > 0.6) {
    g.brauchbar = false;
    g.grund = 'Beim Freistellen blieb ein Stück Hintergrund stehen.';
  } else if (g.deckung < 0.06) {
    g.brauchbar = false;
    g.grund = 'Vom Fahrzeug wurde fast nichts erkannt.';
  } else if (g.rechteckig < 0.3) {
    g.brauchbar = false;
    g.grund = 'Vom Fahrzeug wurden nur Bruchstücke erkannt.';
  }
  return g;
}
