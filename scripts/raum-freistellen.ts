/**
 * Stellt EIN Bild bei PhotoRoom frei und legt es als PNG ab.
 *
 *   npx tsx scripts/raum-freistellen.ts <foto.jpg> <ziel.png>
 *
 * Nur zum Ausprobieren gedacht, nicht fuer den Betrieb — der laeuft ueber
 * app/api/studio-eigen/verarbeiten.
 *
 * ACHTUNG, das kostet echtes Geld: PhotoRoom Basic, 0,02 EUR je Bild.
 * Deshalb wird der Posten hier genauso gebucht wie im Betrieb. Ein
 * Testaufruf, der an der Kostenerfassung vorbeilaeuft, macht die
 * Monatsrechnung still falsch — und die Frage "was kostet mich ein
 * Inserat wirklich" ist der einzige Grund, warum es diese Erfassung gibt.
 */

import fs from 'node:fs';
import { logApiCost, imageCostMicros } from '../lib/apiCosts';

const SEGMENT = 'https://sdk.photoroom.com/v1/segment';

const [quelle, ziel] = process.argv.slice(2);
if (!quelle || !ziel) {
  console.error('Aufruf: raum-freistellen.ts <foto.jpg> <ziel.png>');
  process.exit(1);
}

async function main() {
  const key = process.env.PHOTOROOM_API_KEY;
  if (!key) throw new Error('PHOTOROOM_API_KEY fehlt');

  const sandbox = key.startsWith('sandbox_') || process.env.PHOTOROOM_SANDBOX === 'true';
  console.log(sandbox
    ? 'Sandbox-Schluessel — es kommt die Attrappe zurueck, kein echtes Freistellen.'
    : 'Produktiver Schluessel — dieser Aufruf kostet 0,02 EUR.');

  const form = new FormData();
  form.append('image_file', new Blob([fs.readFileSync(quelle)], { type: 'image/jpeg' }), 'auto.jpg');
  // PNG, weil nur PNG einen Alphakanal hat.
  form.append('format', 'png');

  const antwort = await fetch(SEGMENT, { method: 'POST', headers: { 'x-api-key': key }, body: form });
  if (!antwort.ok) {
    throw new Error(`PhotoRoom ${antwort.status}: ${(await antwort.text()).slice(0, 300)}`);
  }

  fs.writeFileSync(ziel, Buffer.from(await antwort.arrayBuffer()));
  console.log('freigestellt →', ziel);

  await logApiCost({
    service: 'photoroom_basic',
    operation: sandbox ? 'probe-sandbox' : 'probe',
    unitsIn: 1,
    costMicros: imageCostMicros('photoroom_basic'),
    meta: { quelle, hinweis: 'Handlauf aus scripts/raum-freistellen.ts' },
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
