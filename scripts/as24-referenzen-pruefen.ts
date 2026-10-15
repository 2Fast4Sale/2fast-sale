/**
 * Vergleicht unsere Kopie der AutoScout24-Referenzdaten mit der Quelle.
 *
 *   npx tsx scripts/as24-referenzen-pruefen.ts
 *
 * lib/as24Referenzen.ts ist eine ABSCHRIFT. Abschriften veralten: Ein
 * Merkmal, das AutoScout24 umbenennt oder dessen Kennung sich aendert,
 * faellt bei uns still auf eine falsche Zahl — und das Inserat bekommt
 * eine Ausstattung, die es nicht hat. Die Listen sind oeffentlich
 * abrufbar, also laesst sich das vor jedem Testlauf pruefen.
 */

import { AS24_REFERENZEN } from '../lib/as24Referenzen';

const BASIS = 'https://listing-creation.api.autoscout24.com/references?referenceType=';

async function live(typ: string): Promise<Map<string, string> | null> {
  try {
    const a = await fetch(BASIS + encodeURIComponent(typ));
    if (!a.ok) return null;
    const d = await a.json() as { references?: Array<{ id: string | number; name: string }> };
    const liste = d.references ?? [];
    return new Map(liste.map(r => [String(r.id), r.name]));
  } catch { return null; }
}

async function main() {
  const probleme: string[] = [];
  const unpruefbar: string[] = [];

  for (const [typ, eintraege] of Object.entries(AS24_REFERENZEN)) {
    const quelle = await live(typ);
    if (!quelle) { unpruefbar.push(typ); continue; }

    let abweichungen = 0;
    for (const [id, name] of eintraege as Array<[string, string]>) {
      const echt = quelle.get(String(id));
      if (echt === undefined) {
        probleme.push(`${typ}: Kennung ${id} ("${name}") gibt es dort nicht mehr`);
        abweichungen++;
      } else if (echt !== name) {
        probleme.push(`${typ}: Kennung ${id} heisst dort "${echt}", bei uns "${name}"`);
        abweichungen++;
      }
    }
    const fehlen = [...quelle.keys()].filter(
      id => !(eintraege as Array<[string, string]>).some(([i]) => String(i) === id),
    );
    console.log(`${typ.padEnd(26)} ${String(eintraege.length).padStart(4)} bei uns, `
      + `${String(quelle.size).padStart(4)} dort — ${abweichungen} falsch, ${fehlen.length} fehlen uns`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (unpruefbar.length) console.log(`Nicht abrufbar: ${unpruefbar.join(', ')}\n`);
  if (probleme.length === 0) {
    console.log('Keine falschen Kennungen. (Fehlende sind nur ungenutzte Moeglichkeiten.)');
  } else {
    console.log(`${probleme.length} falsche Kennungen:\n`);
    for (const p of probleme.slice(0, 40)) console.log('  • ' + p);
    if (probleme.length > 40) console.log(`  … und ${probleme.length - 40} weitere`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
