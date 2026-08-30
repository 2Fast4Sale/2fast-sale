/**
 * Holt die erlaubten Werte der mobile.de-Aufzaehlungsfelder.
 *
 * Getriebe, Airbags, Polsterung, Einparkhilfen — jedes dieser Felder
 * nimmt nur bestimmte Woerter an. Sie sehen so vorhersehbar aus, dass
 * man sie hinschreibt statt nachzusehen, und dann steht "CLOTH" im
 * Code, wo "FABRIC" hingehoert.
 *
 * Genau das ist passiert: In der ersten Fassung der Portal-Zuordnung
 * waren sieben von fuenfzehn Werten falsch. Keiner davon faellt auf,
 * bevor mobile.de das fertige Inserat ablehnt — beim ersten echten
 * Kunden also.
 *
 * Deshalb liegen die Werte jetzt als Datei im Projekt, und
 * ausstattung-zuordnen.mjs prueft dagegen.
 *
 * Aufruf:  node mobile-werte-holen.mjs
 */

import { writeFileSync } from 'node:fs';

const BASIS = 'https://services.mobile.de/refdata';
const KOPF = {
  Accept: 'application/vnd.de.mobile.api+json',
  'Accept-Language': 'de',
};

/** Feldname im Inserat -> Pfad der Referenzliste. */
const FELDER = {
  gearbox:             'gearboxes',
  fuel:                'fuels',
  exteriorColor:       'colors',
  interiorColor:       'interiorcolors',
  interiorType:        'interiortypes',
  condition:           'conditions',
  emissionClass:       'emissionclasses',
  emissionSticker:     'emissionstickers',
  doors:               'doorcounts',
  airbag:              'airbags',
  climatisation:       'climatisations',
  parkingAssistants:   'parkingassistants',
  speedControl:        'speedcontrols',
  radio:               'radiotypes',
  headlightType:       'headlighttypes',
  daytimeRunningLamps: 'daytimerunninglamps',
  bendingLightsType:   'bendinglightstypes',
  trailerCouplingType: 'trailercouplingtypes',
  breakdownService:    'breakdownservices',
  usageType:           'usagetypes',
  driveType:           'drivetypes',
  countryVersion:      'countryversion',
  category:            'classes/Car/categories',
  vehicleClass:        'classes',
};

async function hole(pfad) {
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const a = await fetch(BASIS + pfad, { headers: KOPF, signal: AbortSignal.timeout(20_000) });
      if (!a.ok) throw new Error(`HTTP ${a.status}`);
      return await a.json();
    } catch (f) {
      if (versuch === 3) throw new Error(`${pfad}: ${f.message}`);
      await new Promise(r => setTimeout(r, 500 * versuch));
    }
  }
}

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const werte = {};
for (const [feld, pfad] of Object.entries(FELDER)) {
  const v = (await hole('/' + pfad)).values;
  werte[feld] = v.map(x => [x.name, x.description]);
  console.log(`  ${feld.padEnd(22)} ${v.length}`);
}

const zeilen = Object.entries(werte).map(([feld, liste]) =>
  `  ${feld}: [\n` + liste.map(([n, d]) => `    [${q(n)}, ${q(d)}],`).join('\n') + `\n  ],`);

const datei = `/**
 * Erlaubte Werte der mobile.de-Aufzaehlungsfelder.
 *
 * NICHT VON HAND AENDERN — erzeugt von mobile-werte-holen.mjs.
 * Stand: ${new Date().toISOString().slice(0, 10)}
 * Quelle: https://services.mobile.de/refdata/...
 *
 * Je Eintrag [Wert, deutsche Bezeichnung]. Gesendet wird der erste;
 * der zweite steht daneben, damit beim Lesen klar ist, worum es geht.
 *
 * Warum als Datei: Diese Woerter sehen vorhersehbar aus. Man schreibt
 * "CLOTH", richtig waere "FABRIC". Auffallen wuerde es erst, wenn
 * mobile.de das fertige Inserat eines echten Kunden ablehnt.
 *
 * ${Object.keys(werte).length} Felder, ${Object.values(werte).reduce((s, l) => s + l.length, 0)} Werte.
 */

export const MOBILE_WERTE: Record<string, [string, string][]> = {
${zeilen.join('\n')}
};

/** Ist der Wert fuer dieses Feld erlaubt? */
export function mobileWertGueltig(feld: string, wert: string): boolean {
  const liste = MOBILE_WERTE[feld];
  return !!liste && liste.some(([w]) => w === wert);
}
`;

writeFileSync(new URL('./lib/mobileWerte.ts', import.meta.url), datei, 'utf8');
console.log(`\nGeschrieben: lib/mobileWerte.ts`);
console.log(`${Object.keys(werte).length} Felder, ${Object.values(werte).reduce((s, l) => s + l.length, 0)} Werte`);
process.exit(0);
