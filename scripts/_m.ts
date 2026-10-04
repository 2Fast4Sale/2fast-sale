import fs from 'fs'; import sharp from 'sharp';
import { komponieren } from '../lib/studio/kompositor';
import { studioVerfeinernMitGemini, letzterGrund, GENUTZTES_MODELL } from '../lib/studio/geminiStudio';
sharp.concurrency(1);
(async () => {
  for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  const raum = 'public/backgrounds/raum/waben_hell.jpg';
  const m = JSON.parse(fs.readFileSync(raum.replace('.jpg', '.json'), 'utf8'));
  const r = await komponieren(fs.readFileSync('tools/proben/golf_frei.png'), fs.readFileSync(raum), {
    horizont: m.horizont, kameraHoehe: m.kameraHoehe, brennweite: m.brennweite, wandlinie: m.wandlinie,
  });
  const f = await studioVerfeinernMitGemini(r.bild, 'ViBa Automobile');
  console.log('Modell', GENUTZTES_MODELL);
  console.log(f ? `verfeinert ${f.aehnlich.toFixed(3)} · ${f.geaendert.toFixed(1)}% geaendert` : 'nicht: ' + letzterGrund);
})();
