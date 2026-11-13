/**
 * Ein Vorher/Nachher-Beispiel für die Händlervorführung anlegen.
 *
 *   npx tsx scripts/beispiel-anlegen.ts <vorher.jpg> <nachher.jpg> "BMW 320d, 2017"
 *
 * Schreibt beide Bilder nach public/beispiele/ und trägt sie in
 * public/beispiele/liste.json ein. Danach ist /beispiele auf dem Handy
 * fertig. Kostet nichts — nur Rechnen, kein Modellaufruf.
 *
 * ── Warum es das gibt ──────────────────────────────────────────────
 *
 * Es gibt bisher nichts, was man einem Händler zeigen kann. Die Seite
 * steht hinter dem Bauzaun, /vorschau/step1 ist in der Produktion
 * abgeschaltet, und in public/ liegt kein einziges Beispielbild.
 *
 * Damit fehlt genau das, was als Einziges verkauft: der Unterschied
 * zwischen einem Handyfoto auf dem Hof und einem Studiobild. Über
 * Ausstattungslisten, Portalanbindung und Preise kann man reden,
 * nachdem jemand die zwei Bilder gesehen hat — nicht davor.
 *
 * Und das Ganze braucht kein Gewerbe, keinen Portalvertrag und keine
 * Datenlizenz. Es ist das Einzige auf der Liste, das heute geht.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ORDNER = path.resolve(__dirname, '..', 'public', 'beispiele');
const LISTE = path.join(ORDNER, 'liste.json');

/*
 * 1400 Punkte lange Kante: Auf einem Handy ist mehr nicht zu sehen,
 * und der Haendler soll die Seite auf dem Hof mit schlechtem Netz
 * aufbekommen. Ein 4-MB-Bild, das nicht laedt, verkauft nichts.
 */
const KANTE = 1400;
const GUETE = 86;

type Eintrag = { id: string; titel: string; vorher: string; nachher: string };

function kennung(titel: string): string {
  return titel.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'beispiel';
}

async function schreiben(quelle: string, ziel: string): Promise<number> {
  const bild = sharp(quelle).rotate();          // EXIF-Drehung anwenden
  const b = await bild.resize(KANTE, KANTE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: GUETE, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(ziel, b);
  return b.length;
}

async function main() {
  const [vorher, nachher, ...titelTeile] = process.argv.slice(2);
  const titel = titelTeile.join(' ').trim();

  if (!vorher || !nachher || !titel) {
    console.error('Aufruf: beispiel-anlegen.ts <vorher.jpg> <nachher.jpg> "Titel"');
    console.error('Beispiel: npx tsx scripts/beispiel-anlegen.ts hof.jpg studio.jpg "BMW 320d, 2017"');
    process.exitCode = 1;
    return;
  }
  for (const f of [vorher, nachher]) {
    if (!fs.existsSync(f)) { console.error(`Gibt es nicht: ${f}`); process.exitCode = 1; return; }
  }

  fs.mkdirSync(ORDNER, { recursive: true });
  const id = kennung(titel);

  const aVorher  = `${id}-vorher.jpg`;
  const aNachher = `${id}-nachher.jpg`;
  const groesseV = await schreiben(vorher,  path.join(ORDNER, aVorher));
  const groesseN = await schreiben(nachher, path.join(ORDNER, aNachher));

  let liste: Eintrag[] = [];
  if (fs.existsSync(LISTE)) {
    try { liste = JSON.parse(fs.readFileSync(LISTE, 'utf8')); } catch { liste = []; }
    if (!Array.isArray(liste)) liste = [];
  }
  /* Derselbe Titel ueberschreibt den alten Eintrag, statt ihn zu
     verdoppeln — beim Nachlegen eines besseren Bildes der Normalfall. */
  liste = liste.filter(e => e.id !== id);
  liste.unshift({ id, titel, vorher: aVorher, nachher: aNachher });
  fs.writeFileSync(LISTE, JSON.stringify(liste, null, 2) + '\n');

  console.log(`Angelegt: ${titel}`);
  console.log(`  vorher  ${aVorher}  (${(groesseV / 1024).toFixed(0)} kB)`);
  console.log(`  nachher ${aNachher} (${(groesseN / 1024).toFixed(0)} kB)`);
  console.log(`\n${liste.length} Beispiel(e) in der Liste.`);
  console.log('Zu sehen unter /beispiele — auf dem Handy, ohne Anmeldung.');
  if (liste.length < 3) {
    console.log(`\nNoch ${3 - liste.length} anlegen: Ein einzelnes Bild ist ein Zufall,`);
    console.log('drei sind ein Verfahren. Verschiedene Farben und Fahrzeugklassen.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

export {};
