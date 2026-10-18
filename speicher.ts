import sharp from 'sharp';
import { freistellenBiRefNet, birefnetEinstellungen } from './lib/studio/freistellenBiRefNet';
import { freistellGuete } from './lib/studio/freistellGuete';
(async () => {
  let spitze = 0;
  const messer = setInterval(() => { spitze = Math.max(spitze, process.memoryUsage().rss); }, 200);
  console.log('Kante', birefnetEinstellungen.kante);
  for (const d of ['images.jpg', 'golf.jpg', 'urus.jpg']) {
    const foto = await sharp(`tools/proben/eingang/${d}`).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    const t = Date.now();
    const frei = await freistellenBiRefNet(foto);
    const g = await freistellGuete(frei);
    console.log(`${d.padEnd(12)} ${((Date.now() - t) / 1000).toFixed(1).padStart(5)} s  recht ${g.rechteckig.toFixed(3)}  ${g.brauchbar ? 'ok' : 'KAPUTT'}`);
  }
  clearInterval(messer);
  console.log('Speicherspitze:', (spitze / 1024 / 1024).toFixed(0), 'MB');
})();
