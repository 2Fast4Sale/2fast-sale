/**
 * Kennt die Schnittstelle das Feld fuer die Bildgroesse — und unter
 * welchem Namen?
 *
 *   npx tsx scripts/bildgroesse-feldprobe.ts
 *
 * KOSTET NICHTS. Der Trick: Es wird absichtlich ein unmoeglicher Wert
 * geschickt ("ZZ"). Google antwortet dann mit HTTP 400, ohne ein Bild
 * zu berechnen — und die Fehlermeldung verraet, was los ist:
 *
 *   "Unknown name \"imageSize\""   → das Feld gibt es hier nicht.
 *   "Invalid value ... ZZ"         → das Feld gibt es, nur der Wert war falsch.
 *
 * Damit steht fest, welche Schreibweise im Programm stehen muss, bevor
 * ein einziges bezahltes Bild erzeugt wird. Die Unterlagen nennen zwei.
 *
 * Es werden ausserdem keine Bilder mitgeschickt, nur ein Satz Text —
 * die Anfrage ist winzig und faellt nicht in Zeitlimits.
 */

const KEY = process.env.GEMINI_API_KEY;
const MODELL = process.env.GEMINI_BILD_MODELL || 'gemini-3.1-flash-image';

const FAELLE: Array<{ name: string; koerper: unknown }> = [
  {
    name: 'generationConfig.imageConfig.imageSize',
    koerper: {
      contents: [{ parts: [{ text: 'a red cube' }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2', imageSize: 'ZZ' } },
    },
  },
  {
    name: 'generationConfig.imageConfig.image_size',
    koerper: {
      contents: [{ parts: [{ text: 'a red cube' }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:2', image_size: 'ZZ' } },
    },
  },
  {
    name: 'response_format.image_size (oberste Ebene)',
    koerper: {
      contents: [{ parts: [{ text: 'a red cube' }] }],
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '3:2', image_size: 'ZZ' },
    },
  },
];

async function main() {
  if (!KEY) { console.error('Kein GEMINI_API_KEY gesetzt.'); process.exit(1); }
  console.log('Modell:', MODELL, '\n');

  for (const fall of FAELLE) {
    const antwort = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify(fall.koerper),
      },
    ).catch((e) => e as Error);

    if (antwort instanceof Error) { console.log(`${fall.name}\n  Netzfehler: ${antwort.message}\n`); continue; }

    const text = (await antwort.text()).replace(/\s+/g, ' ');
    const bekannt = !/unknown name|cannot find field/i.test(text);
    console.log(fall.name);
    console.log(`  HTTP ${antwort.status} — Feld ${bekannt ? 'BEKANNT' : 'unbekannt'}`);
    console.log(`  ${text.slice(0, 220)}\n`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
