/**
 * Gibt es eine Datenbank, die zu einer FIN die Ausstattung liefert —
 * kostenlos und ohne Vertrag?
 *
 *   npx tsx scripts/vin-datenbank-probe.ts
 *
 * KOSTET NICHTS — die vPIC-Schnittstelle der US-Behoerde NHTSA ist
 * offen und braucht keinen Schluessel. Sie ist die einzige
 * FIN-Datenbank, die ohne Vertrag erreichbar ist.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Die Frage "woher kommen die Ausstattungen" kam immer wieder, und
 * die Antwort war immer eine Vermutung. Diese Probe beantwortet sie
 * mit Zahlen: Sie fragt vier deutsche FIN-Muster ab und zaehlt, wie
 * viele der Felder, die in einem Inserat gebraucht werden,
 * zurueckkommen.
 *
 * Ergebnis am 08.11.2026: KEINES. vPIC liefert Marke, Werk, Hubraum,
 * Zylinder, Karosserie, Tueren — und als einzige ausstattungsnahen
 * Felder Airbags und Gurtstraffer, weil die USA die vorschreiben.
 * Sitzheizung, Navi, Anhaengerkupplung, Felgen, Leder: kein einziges
 * Feld. Fuer ein deutsches Inserat ist diese Datenbank wertlos.
 *
 * Daraus folgt: Ausstattung je FIN gibt es in Deutschland nur bei
 * DAT, Schwacke/Audatex und deren Haendlern. Alle drei verlangen
 * einen Vertrag mit einem angemeldeten Gewerbe. Solange der nicht
 * steht, bleiben die Unterlagen aus der Fahrzeugmappe die einzige
 * Quelle — die liest Schritt 1 inzwischen (scan-equipment-doc).
 *
 * Laeuft die Probe irgendwann anders aus, weil vPIC erweitert wurde,
 * faellt das hier auf, statt in einem Inserat.
 */

/** Was ein Inserat braucht und was nur Beiwerk ist. */
const GEBRAUCHT = [
  'Sitzheizung', 'Navigation', 'Anhängerkupplung', 'Klimaanlage',
  'Einparkhilfe', 'Rückfahrkamera', 'Leder', 'Felgen', 'Schiebedach',
  'Tempomat', 'Xenon', 'LED',
];

/* Vier Muster, die die vier groessten deutschen Hersteller abdecken.
   Keine echten Fahrzeuge — vPIC entschluesselt die Stellen aus den
   Herstellermeldungen, eine Zulassung braucht es dafuer nicht. */
const FINS = [
  { was: 'VW Golf',        fin: 'WVWZZZ1KZAW123456' },
  { was: 'Audi A4',        fin: 'WAUZZZ8K9BA123456' },
  { was: 'BMW 320i',       fin: 'WBA3B1C53DF123456' },
  { was: 'Mercedes E-Klasse', fin: 'WDD2040471A123456' },
];

type Feld = { Variable: string; Value: string | null };

async function abfragen(fin: string): Promise<Feld[]> {
  const antwort = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${fin}?format=json`,
    { signal: AbortSignal.timeout(30000) },
  );
  if (!antwort.ok) throw new Error(`vPIC antwortete mit ${antwort.status}`);
  const daten = await antwort.json();
  return (daten.Results as Feld[]).filter(
    f => f.Value && f.Value !== 'Not Applicable' && f.Value !== '0',
  );
}

async function main() {
  let ausstattungGefunden = 0;

  for (const fall of FINS) {
    const felder = await abfragen(fall.fin);
    const namen = felder.map(f => f.Variable).join(' | ');
    const treffer = GEBRAUCHT.filter(b =>
      namen.toLowerCase().includes(b.toLowerCase()));

    console.log(`${fall.was.padEnd(20)} ${felder.length} Felder, davon Ausstattung: ${treffer.length}`);
    if (treffer.length) console.log(`   ${treffer.join(', ')}`);
    ausstattungGefunden += treffer.length;
  }

  console.log();
  if (ausstattungGefunden === 0) {
    console.log('Wie erwartet: keine Ausstattung. Die Unterlagen bleiben die Quelle.');
  } else {
    console.log(`ACHTUNG: ${ausstattungGefunden} Ausstattungsfeld(er) aufgetaucht.`);
    console.log('vPIC wurde erweitert — lohnt einen zweiten Blick.');
  }
  process.exitCode = 0;
}

main().catch(e => { console.error(e); process.exit(1); });

/* Macht die Datei zu einem Modul. Ohne das liegt `main` im globalen
   Namensraum und kollidiert mit dem `main` anderer Proben — tsc meldet
   dann "Duplicate function implementation" in einer fremden Datei. */
export {};
