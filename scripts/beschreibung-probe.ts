/**
 * Faengt die Beschreibungspruefung unbelegte Zusicherungen?
 *
 *   npx tsx scripts/beschreibung-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, kein Modellaufruf.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Die Beschreibung ist der teuerste Text, den diese Software schreibt.
 * "Dieses unfallfreie Fahrzeug aus erster Hand" ist eine
 * Eigenschaftszusicherung: Stimmt sie nicht, kann der Kaeufer den Kauf
 * rueckabwickeln und Schadensersatz verlangen — beim Haendler.
 *
 * Und es faellt schlechter auf als alles andere. Eine Ausstattungsliste
 * prueft ein Haendler Zeile fuer Zeile. Einen fluessigen Werbetext
 * liest er einmal durch und nickt.
 *
 * Geprueft wird deshalb in beide Richtungen, und die zweite ist
 * wichtiger als die erste:
 *
 *   1. Unbelegte Behauptungen muessen auffallen.
 *   2. BELEGTE Aussagen muessen durchgehen. Eine Pruefung, die auch
 *      Wahres blockiert, nimmt dem Haendler Argumente weg, die ihm
 *      zustehen — und wird dann abgeschaltet.
 */

import { beschreibungPruefen, REGELN, type Belegt } from '../lib/beschreibungPruefen';

const LEER: Belegt = {};

type Fall = {
  was: string;
  text: string;
  belegt: Belegt;
  /** Erwartete Namen der Verstoesse, leer = Text ist in Ordnung. */
  erwartet: string[];
};

const FAELLE: Fall[] = [
  /* ── Muss auffallen ──────────────────────────────────────────── */
  {
    was: 'unfallfrei ohne Bestaetigung — der teuerste Fall',
    text: 'Dieser gepflegte Golf ist unfallfrei und sofort verfügbar.',
    belegt: LEER, erwartet: ['unfallfrei', 'Zustandsurteil'],
  },
  {
    was: 'Umschreibung zaehlt genauso',
    text: 'Das Fahrzeug hat keine Unfallschäden.',
    belegt: LEER, erwartet: ['unfallfrei'],
  },
  {
    was: 'Scheckheft ohne Eintrag in der Ausstattung',
    text: 'Scheckheftgepflegt und zuverlässig.',
    belegt: LEER, erwartet: ['Scheckheft'],
  },
  {
    was: 'lueckenlose Wartung ist dieselbe Behauptung',
    text: 'Die Wartung erfolgte lückenlos beim Fachbetrieb.',
    belegt: LEER, erwartet: ['Scheckheft'],
  },
  {
    was: '1. Hand ohne Angabe der Vorbesitzer',
    text: 'Ein Fahrzeug aus 1. Hand mit wenig Laufleistung.',
    belegt: LEER, erwartet: ['erste Hand'],
  },
  {
    was: 'TUEV neu ohne HU-Datum',
    text: 'TÜV neu, direkt mitnehmbar.',
    belegt: LEER, erwartet: ['TÜV/HU neu'],
  },
  {
    was: 'Garantie ohne Zusage',
    text: 'Inklusive Garantie für den Antriebsstrang.',
    belegt: LEER, erwartet: ['Garantie'],
  },
  {
    was: 'Zustandsurteil ist NIE belegbar',
    text: 'Technisch einwandfrei und in einem makellosen Zustand.',
    belegt: { unfallfrei: true, garantie: true, vorbesitzer: '1', huBis: '06/2027' },
    erwartet: ['Zustandsurteil'],
  },
  {
    was: 'Rost ist nie belegbar',
    text: 'Die Karosserie ist rostfrei.',
    belegt: { unfallfrei: true }, erwartet: ['Rost'],
  },
  {
    was: 'Maengelfreiheit ist nie belegbar',
    text: 'An diesem Wagen funktioniert alles einwandfrei.',
    belegt: LEER, erwartet: ['Mängelfreiheit'],
  },
  {
    was: 'Versprochene Arbeiten sind nie belegbar',
    text: 'Zahnriemen neu und frisch gewartet.',
    belegt: LEER, erwartet: ['Wartung versprochen'],
  },
  {
    was: 'Mehrere Verstoesse in einem Satz werden alle gemeldet',
    text: 'Unfallfrei, scheckheftgepflegt, aus 1. Hand und im Topzustand.',
    belegt: LEER,
    erwartet: ['unfallfrei', 'Scheckheft', 'erste Hand', 'Zustandsurteil'],
  },

  /* ── Muss durchgehen ─────────────────────────────────────────── */
  {
    was: 'unfallfrei MIT Bestaetigung des Haendlers',
    text: 'Das Fahrzeug ist unfallfrei.',
    belegt: { unfallfrei: true }, erwartet: [],
  },
  {
    was: 'Scheckheft MIT Eintrag in der Ausstattung',
    text: 'Scheckheftgepflegt.',
    belegt: { ausstattung: ['Scheckheftgepflegt', 'Sitzheizung'] }, erwartet: [],
  },
  {
    was: '1. Hand MIT einem Vorbesitzer',
    text: 'Aus 1. Hand.',
    belegt: { vorbesitzer: '1' }, erwartet: [],
  },
  {
    was: 'Zwei Vorbesitzer sind nicht erste Hand',
    text: 'Aus 1. Hand.',
    belegt: { vorbesitzer: '2' }, erwartet: ['erste Hand'],
  },
  {
    was: 'HU MIT Datum',
    text: 'TÜV neu bis 06/2027.',
    belegt: { huBis: '06/2027' }, erwartet: [],
  },
  {
    was: 'Garantie MIT Zusage',
    text: 'Mit Garantie.',
    belegt: { garantie: true }, erwartet: [],
  },
  {
    was: 'Nichtraucher MIT Eintrag',
    text: 'Nichtraucherfahrzeug.',
    belegt: { ausstattung: ['Nichtraucher-Fahrzeug'] }, erwartet: [],
  },
  {
    was: 'Reine Datenwiedergabe geht immer durch',
    text: 'VW Golf VII 2.0 TDI mit 110 kW, Erstzulassung 06/2016, 98.000 km. '
        + 'Ausgestattet mit Sitzheizung, Navigationssystem und Anhängerkupplung. '
        + 'Fünf Sitzplätze, Dieselmotor mit 1.968 ccm.',
    belegt: { ausstattung: ['Sitzheizung', 'Navigationssystem', 'Anhängerkupplung'] },
    erwartet: [],
  },
  {
    was: 'Leerer Text',
    text: '', belegt: LEER, erwartet: [],
  },
];

let fehler = 0;
for (const fall of FAELLE) {
  const ist = beschreibungPruefen(fall.text, fall.belegt).map(v => v.name).sort();
  const soll = [...fall.erwartet].sort();
  const ok = ist.length === soll.length && ist.every((n, i) => n === soll[i]);
  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${fall.was}`);
  if (!ok) {
    console.log(`       Text:     "${fall.text.slice(0, 70)}"`);
    console.log(`       erwartet: ${JSON.stringify(soll)}`);
    console.log(`       bekommen: ${JSON.stringify(ist)}`);
    fehler++;
  }
}

const auffallen = FAELLE.filter(f => f.erwartet.length > 0).length;
console.log(`\n${REGELN.length} Regeln. ${auffallen} Faelle muessen auffallen, `
  + `${FAELLE.length - auffallen} muessen durchgehen.`);
console.log('Der zweite Teil entscheidet, ob die Pruefung eingeschaltet bleibt:');
console.log('Wer dem Haendler auch belegte Argumente wegnimmt, schaltet sie ab.');

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
