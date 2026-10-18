import fs from 'node:fs';
import sharp from 'sharp';
import { freistellenU2Net } from './lib/studio/freistellenU2Net';
import { komponieren, STANDARD, radaufstand } from './lib/studio/kompositor';
import { raum, raumBild } from './lib/studio/raeume';
(async () => {
  const halle = raum('galerie_hell') ?? raum('galerie_dunkel')!;
  for (const d of ['00.jpg', '888.jpg', '8988.jpg']) {
    const foto = await sharp(`tools/proben/eingang/${d}`).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    const frei = await freistellenU2Net(foto);
    const e = await komponieren(frei, raumBild(halle), { ...STANDARD, horizont: halle.horizont, kameraHoehe: halle.kameraHoehe, brennweite: halle.brennweite });
    const k = await radaufstand(e.fahrzeugEbene.bild, e.messwerte.fahrzeugBreite, e.messwerte.fahrzeugHoehe);
    fs.writeFileSync(`tools/proben/fix_${d}`, e.bild);
    console.log(`${d.padEnd(10)} Raeder ${k ? `${k.radA}/${k.radB} Abstand ${Math.abs(k.radB - k.radA)} Hoehen ${k.unten[k.radA]}/${k.unten[k.radB]}` : 'KEINE'} Breite ${e.messwerte.fahrzeugBreite}`);
  }
})();
