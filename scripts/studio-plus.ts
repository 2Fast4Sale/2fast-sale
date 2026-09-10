/**
 * Ein Bild durch PhotoRoom Plus schicken — das Beste, was zu kaufen ist.
 *
 *   npx tsx scripts/studio-plus.ts <foto.jpg> <raum.jpg> <ziel.jpg>
 *
 * Freistellen, Hintergrund und KI-Schatten in einem Aufruf. Kostet
 * 0,10 EUR je Bild, also 1,20 EUR je Inserat gegen 0,24 EUR beim
 * eigenen Weg.
 *
 * Als Hintergrund geht bewusst UNSER gerenderter Raum mit — sonst
 * vergliche man zwei Sachen gleichzeitig und wuesste hinterher nicht,
 * woran der Unterschied liegt. So ist der Raum identisch und der
 * einzige Unterschied ist der Schatten.
 *
 * Der Posten wird gebucht wie im Betrieb. Ein Testaufruf an der
 * Kostenerfassung vorbei macht die Monatsrechnung still falsch.
 */

import fs from 'node:fs';
import { logApiCost, imageCostMicros } from '../lib/apiCosts';

const [foto, raum, ziel] = process.argv.slice(2);
if (!foto || !raum || !ziel) {
  console.error('Aufruf: studio-plus.ts <foto.jpg> <raum.jpg> <ziel.jpg>');
  process.exit(1);
}

async function main() {
  const roherKey = process.env.PHOTOROOM_API_KEY;
  if (!roherKey) throw new Error('PHOTOROOM_API_KEY fehlt');

  const sandbox = roherKey.startsWith('sandbox_') || process.env.PHOTOROOM_SANDBOX === 'true';
  console.log(sandbox
    ? 'Sandbox — es kommt die Attrappe zurueck.'
    : 'Produktiv — dieser Aufruf kostet 0,10 EUR (PhotoRoom Plus).');

  const form = new FormData();
  form.append('imageFile', new Blob([fs.readFileSync(foto)], { type: 'image/jpeg' }), 'auto.jpg');
  form.append('background.imageFile', new Blob([fs.readFileSync(raum)], { type: 'image/jpeg' }), 'raum.jpg');
  form.append('background.scaling', 'fill');

  /*
   * Gueltig sind nur ai.soft, ai.hard, ai.floating und
   * ai.auto-with-overrides; alles andere quittiert die API mit 400.
   * ai.floating waere hier falsch — das laesst das Fahrzeug schweben.
   */
  form.append('shadow.mode', 'ai.soft');

  form.append('outputSize', '1920x1280');
  form.append('paddingTop', '0.12');
  form.append('paddingRight', '0.10');
  form.append('paddingBottom', '0.08');
  form.append('paddingLeft', '0.10');
  form.append('verticalAlignment', 'bottom');
  form.append('horizontalAlignment', 'center');

  const start = Date.now();
  const antwort = await fetch('https://image-api.photoroom.com/v2/edit', {
    method: 'POST',
    headers: { 'x-api-key': roherKey },
    body: form,
  });

  if (!antwort.ok) {
    const text = await antwort.text();
    throw new Error(`PhotoRoom ${antwort.status}: ${text.slice(0, 500)}`);
  }

  fs.writeFileSync(ziel, Buffer.from(await antwort.arrayBuffer()));
  console.log(`fertig in ${Date.now() - start} ms →`, ziel);

  await logApiCost({
    service: 'photoroom',
    operation: sandbox ? 'plus-probe-sandbox' : 'plus-probe',
    unitsIn: 1,
    costMicros: imageCostMicros('photoroom'),
    meta: { quelle: foto, raum, hinweis: 'Handlauf aus scripts/studio-plus.ts' },
  });
}

main().catch((e) => { console.error(String(e)); process.exit(1); });
