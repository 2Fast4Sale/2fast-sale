/** Stehen unsere Marken-/Modellwerte in den Referenzdaten von mobile.de? */
import { mobileMarkenWertOderNull, mobileModellWertOderNull } from '../lib/carDatabase';

const K = { Accept: 'application/vnd.de.mobile.api+json' };
const FAELLE: Array<[string, string]> = [
  ['VOLKSWAGEN,', 'VW GOLF'], ['MERCEDES-BENZ,', 'C 200'], ['BMW,', '318'],
  ['AUDI,', 'A4'], ['SKODA,', 'Octavia'], ['OPEL,', 'Astra'], ['FORD,', 'Focus'],
  ['RENAULT,', 'Clio'], ['Toyota', 'Yaris'], ['Hyundai', 'i30'],
];

async function main() {
  const r = await fetch('https://services.mobile.de/refdata/classes/Car/makes', { headers: K });
  const marken: string[] = ((await r.json()).values ?? []).map((v: { name: string }) => v.name);
  console.log('Marken in den Referenzdaten:', marken.length);
  const probleme: string[] = [];

  for (const [m, mo] of FAELLE) {
    const marke = mobileMarkenWertOderNull(m);
    if (!marke) { probleme.push(`Marke "${m}" ergibt nichts`); continue; }
    const markeOk = marken.includes(marke);
    let modellOk: boolean | null = null;
    const modell = mobileModellWertOderNull(m, mo);
    if (markeOk && modell) {
      const r2 = await fetch(`https://services.mobile.de/refdata/classes/Car/makes/${encodeURIComponent(marke)}/models`, { headers: K });
      if (r2.ok) {
        const modelle: string[] = ((await r2.json()).values ?? []).map((v: { name: string }) => v.name);
        modellOk = modelle.includes(modell);
      }
    }
    console.log(`  ${(m + ' ' + mo).padEnd(26)} → ${String(marke).padEnd(16)} ${markeOk ? 'ok' : 'NICHT in der Liste'}   ${String(modell).padEnd(12)} ${modellOk === null ? '(nicht geprüft)' : modellOk ? 'ok' : 'NICHT in der Liste'}`);
    if (!markeOk) probleme.push(`Marke "${marke}" steht nicht in den Referenzdaten`);
    if (modellOk === false) probleme.push(`Modell "${modell}" (${marke}) steht nicht in den Referenzdaten`);
  }
  console.log('');
  console.log(probleme.length ? probleme.map(p => '  • ' + p).join('\n') : 'Alle Marken und Modelle stehen in den Referenzdaten.');
}
main();
