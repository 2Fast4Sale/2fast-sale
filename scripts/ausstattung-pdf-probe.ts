/**
 * Liest die Ausstattungserkennung ein PDF — und liest sie es richtig?
 *
 *   npx tsx scripts/ausstattung-pdf-probe.ts
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Der Knopf in Schritt 1 bot von Anfang an PDF an, und jedes PDF
 * scheiterte still: Das Verkleinern im Browser laedt die Datei in ein
 * Image-Element, ein PDF laedt dort nicht, der Fehlerfall gab sie
 * unveraendert weiter, und die Route schickte "application/pdf" als
 * BILDtyp an Anthropic. Der Haendler sah nur "Scan fehlgeschlagen".
 *
 * Gemerkt hat es monatelang niemand, weil es keinen Lauf gab, der ein
 * echtes PDF durchschickt. Den gibt es jetzt.
 *
 * Geprueft wird nicht nur, DASS eine Antwort kommt, sondern ob sie
 * stimmt: Das erzeugte PDF enthaelt absichtlich Zeilen, die NICHT in
 * die Liste duerfen — eine abgewaehlte Sonderausstattung, ein
 * Aufpreisangebot und "1. Hand". Taucht davon etwas auf, ist die Probe
 * durchgefallen, auch wenn alles andere stimmt. Im Inserat waere das
 * eine falsche Zusicherung, fuer die der Haendler haftet.
 *
 * Kostet einen Anthropic-Aufruf, rund zwei Cent.
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeEquipmentList } from '../lib/equipmentDatabase';

const WURZEL = path.resolve(__dirname, '..');
const PDF_DATEI = path.join(WURZEL, 'tools/proben/ausstattungsliste.pdf');

/** Was im PDF steht und in der Liste ankommen MUSS. */
const ERWARTET = ['Sitzheizung', 'Rückfahrkamera', 'Anhängerkupplung', 'Navigationssystem'];
/** Was im PDF steht und NICHT ankommen darf. */
const VERBOTEN = ['Panoramadach', 'Standheizung', 'Head-up', 'Hand'];

function pdfBauen(): Promise<Buffer> {
  return new Promise((fertig) => {
    fs.mkdirSync(path.dirname(PDF_DATEI), { recursive: true });
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stuecke: Buffer[] = [];
    doc.on('data', (s: Buffer) => stuecke.push(s));
    doc.on('end', () => {
      const b = Buffer.concat(stuecke);
      fs.writeFileSync(PDF_DATEI, b);
      fertig(b);
    });

    /* Seite 1 — so sieht eine Bestellbestaetigung aus. */
    doc.fontSize(16).text('Bestellbestätigung — Fahrzeugausstattung');
    doc.moveDown();
    doc.fontSize(11);
    doc.text('Fahrzeug: VW Golf VII 1.4 TSI, Erstzulassung 06/2014');
    doc.text('Vorbesitzer: 1. Hand');
    doc.moveDown();
    doc.text('Serienmäßig und bestellt:');
    doc.text('  - Sitzheizung vorn');
    doc.text('  - Rückfahrvideokamera');
    doc.text('  - Navigationssystem Discover Media');
    doc.moveDown();
    doc.text('Nicht bestellt / entfällt:');
    doc.text('  - Panorama-Schiebedach            entfällt');
    doc.text('  - Standheizung                    nicht bestellt');
    doc.moveDown();
    doc.text('Gegen Aufpreis möglich gewesen:');
    doc.text('  - Head-up Display                 auf Wunsch');

    /* Seite 2 — die Merkmale verteilen sich, genau darum ein Aufruf. */
    doc.addPage();
    doc.fontSize(16).text('Anlage zur Bestellung — Seite 2');
    doc.moveDown();
    doc.fontSize(11);
    doc.text('Weitere bestellte Ausstattung:');
    doc.text('  - Anhängerkupplung, abnehmbar');
    doc.text('  - Leichtmetallfelgen 17 Zoll');

    doc.end();
  });
}

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.error('Kein ANTHROPIC_API_KEY gesetzt.'); process.exit(1); }

  const pdf = await pdfBauen();
  console.log(`PDF gebaut: ${PDF_DATEI} (${(pdf.length / 1024).toFixed(0)} kB, 2 Seiten)\n`);

  /* Dieselbe Anweisung wie in der Route — aus der Datei gelesen, damit
     die Probe nicht eine zweite Fassung pflegt, die auseinanderlaeuft. */
  const quelle = fs.readFileSync(path.join(WURZEL, 'app/api/scan-equipment-doc/route.ts'), 'utf8');
  const treffer = quelle.match(/const ANWEISUNG = `([\s\S]*?)`;/);
  if (!treffer) { console.error('ANWEISUNG nicht in der Route gefunden.'); process.exit(1); }
  const anweisung = treffer[1];

  const anthropic = new Anthropic({ apiKey: key });
  const antwort = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: anweisung },
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
      ],
    }],
  });

  const text = (antwort.content.find(t => t.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
  const roh = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? text.trim();
  const liste: string[] = normalizeEquipmentList(JSON.parse(roh).equipment ?? []);

  console.log('Gelesen:', liste.join(', ') || '(nichts)');
  console.log();

  let fehler = 0;
  for (const soll of ERWARTET) {
    const da = liste.some(e => e.toLowerCase().includes(soll.toLowerCase()));
    console.log(`  ${da ? 'OK  ' : 'FEHLT'} ${soll}`);
    if (!da) fehler++;
  }
  for (const nie of VERBOTEN) {
    const da = liste.some(e => e.toLowerCase().includes(nie.toLowerCase()));
    console.log(`  ${da ? 'FALSCH DRIN' : 'OK  '} ${nie} (darf nicht vorkommen)`);
    if (da) fehler++;
  }

  console.log(`\nVerbrauch: ${antwort.usage.input_tokens} ein, ${antwort.usage.output_tokens} aus`);
  console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
  /* exitCode statt process.exit: pdfkit haelt beim harten Beenden noch
     einen Schreibkanal offen, und node bricht dann mit einer Assertion
     ab — die wuerde den Lauf als kaputt aussehen lassen, obwohl er
     bestanden hat. */
  process.exitCode = fehler === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
