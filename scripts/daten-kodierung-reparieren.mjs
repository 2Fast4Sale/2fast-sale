import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/*
 * Dieselbe Windows-1252-Rueckabbildung wie bei den Quelldateien: Zeichen
 * zurueck in Bytes, Bytes als UTF-8 lesen. Nur wo das ohne Ersatzzeichen
 * aufgeht — korrekt kodierte Stellen bleiben unangetastet.
 */
const CP1252 = { 0x80:0x20AC,0x82:0x201A,0x83:0x0192,0x84:0x201E,0x85:0x2026,0x86:0x2020,
  0x87:0x2021,0x88:0x02C6,0x89:0x2030,0x8A:0x0160,0x8B:0x2039,0x8C:0x0152,0x8E:0x017D,
  0x91:0x2018,0x92:0x2019,0x93:0x201C,0x94:0x201D,0x95:0x2022,0x96:0x2013,0x97:0x2014,
  0x98:0x02DC,0x99:0x2122,0x9A:0x0161,0x9B:0x203A,0x9C:0x0153,0x9E:0x017E,0x9F:0x0178 };
const ZURUECK = new Map();
for (let b = 0; b < 256; b++) ZURUECK.set(CP1252[b] ?? b, b);
const kandidat = cp => ZURUECK.has(cp) && cp >= 0x80;

function heilen(text) {
  if (typeof text !== 'string' || !/[\u00C3\u00E2\u00C2]/.test(text)) return text;
  let aus = '', i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i);
    if (!kandidat(cp)) { aus += text[i]; i++; continue; }
    let j = i; const bytes = [];
    while (j < text.length && kandidat(text.codePointAt(j))) { bytes.push(ZURUECK.get(text.codePointAt(j))); j++; }
    const versuch = Buffer.from(bytes).toString('utf8');
    aus += versuch.includes('\uFFFD') ? text.slice(i, j) : versuch;
    i = j;
  }
  return aus;
}

const schreiben = process.argv[2] === '--schreiben';
const { data } = await sb.from('vehicles')
  .select('id,brand,title,description,equipment,color,dealer_notes');

let geaendert = 0;
for (const v of data) {
  const neu = {};
  for (const f of ['brand', 'title', 'description', 'color', 'dealer_notes']) {
    const h = heilen(v[f]);
    if (h !== v[f]) neu[f] = h;
  }
  if (Array.isArray(v.equipment)) {
    const eq = v.equipment.map(heilen);
    if (JSON.stringify(eq) !== JSON.stringify(v.equipment)) neu.equipment = eq;
  }
  if (Object.keys(neu).length === 0) continue;

  geaendert++;
  console.log(`\n${v.id.slice(0, 8)} — ${Object.keys(neu).join(', ')}`);
  for (const [f, wert] of Object.entries(neu)) {
    if (f === 'equipment') {
      const vorher = v.equipment.filter(e => /[\u00C3\u00E2\u00C2]/.test(e));
      vorher.forEach((e, i) => console.log(`   ${e}  ->  ${heilen(e)}`));
    } else {
      const alt = String(v[f]).slice(0, 60), nn = String(wert).slice(0, 60);
      console.log(`   ${f}: ${alt}\n        -> ${nn}`);
    }
  }
  if (schreiben) {
    const { error } = await sb.from('vehicles').update(neu).eq('id', v.id);
    if (error) console.log('   FEHLER beim Schreiben:', error.message);
  }
}
console.log(`\n${geaendert} Fahrzeuge ` + (schreiben ? 'korrigiert' : 'betroffen (Probelauf)'));
