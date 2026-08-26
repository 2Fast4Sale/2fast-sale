/**
 * Holt die Fahrzeug-Referenzdaten von mobile.de und schreibt sie als
 * TypeScript-Datei ins Projekt.
 *
 * Warum einmalig und nicht bei jedem Seitenaufruf: Die Liste ändert sich
 * ein paar Mal im Jahr. Ein Abruf pro Besucher wäre 182 fremde Anfragen
 * für Daten, die sich nie unterscheiden — und die Seite hinge, sobald
 * mobile.de langsam ist. Also einmal holen, ins Projekt legen, fertig.
 *
 * Die /refdata-Endpunkte brauchen keine Anmeldung.
 *
 * Aufruf:  node refdaten-holen.mjs
 */

import { writeFileSync } from 'node:fs';

const BASIS = 'https://services.mobile.de/refdata';
const KOPF = {
  Accept: 'application/vnd.de.mobile.api+json',
  /* Deutsche Anzeigenamen: "Grün" statt "Green". */
  'Accept-Language': 'de',
};

async function hole(pfad) {
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const antwort = await fetch(BASIS + pfad, {
        headers: KOPF,
        signal: AbortSignal.timeout(20_000),
      });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      return await antwort.json();
    } catch (fehler) {
      if (versuch === 3) throw new Error(`${pfad}: ${fehler.message}`);
      await new Promise(r => setTimeout(r, 500 * versuch));
    }
  }
}

/** Läuft eine Liste mit begrenzter Gleichzeitigkeit ab. */
async function nachUndNach(eintraege, gleichzeitig, arbeit) {
  const ergebnis = new Array(eintraege.length);
  let naechster = 0;
  await Promise.all(
    Array.from({ length: gleichzeitig }, async () => {
      while (naechster < eintraege.length) {
        const i = naechster++;
        ergebnis[i] = await arbeit(eintraege[i], i);
      }
    }),
  );
  return ergebnis;
}

/** Für TypeScript-Zeichenketten in einfachen Anführungszeichen. */
const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const marken = (await hole('/classes/Car/makes')).values;
console.log(`${marken.length} Marken gefunden, hole Modelle …`);

let fertig = 0;
const mitModellen = await nachUndNach(marken, 6, async marke => {
  const modelle = (await hole(`/classes/Car/makes/${encodeURIComponent(marke.name)}/models`)).values;
  if (++fertig % 30 === 0) console.log(`  ${fertig}/${marken.length}`);
  return { marke, modelle };
});

const modellZahl = mitModellen.reduce((s, m) => s + m.modelle.length, 0);

/*
 * Sortiert nach Anzeigename, damit die Auswahlliste im Formular ohne
 * weiteres Zutun stimmt. localeCompare mit 'de', damit Umlaute dort
 * landen, wo ein deutscher Leser sie sucht.
 */
mitModellen.sort((a, b) => a.marke.description.localeCompare(b.marke.description, 'de'));

const zeilen = mitModellen.map(({ marke, modelle }) => {
  const geordnet = [...modelle].sort((a, b) => a.description.localeCompare(b.description, 'de'));
  const eintraege = geordnet
    .map(m =>
      /* Nur wo Anzeige und Hochladewert auseinandergehen, beides schreiben. */
      m.name === m.description
        ? `    ${q(m.description)},`
        : `    [${q(m.description)}, ${q(m.name)}],`,
    )
    .join('\n');
  return `  {
    name: ${q(marke.description)},
    wert: ${q(marke.name)},
    modelle: [
${eintraege}
    ],
  },`;
});

const datei = `/**
 * Marken und Modelle, wie mobile.de sie führt.
 *
 * NICHT VON HAND ÄNDERN — erzeugt von refdaten-holen.mjs.
 * Stand: ${new Date().toISOString().slice(0, 10)}
 * Quelle: https://services.mobile.de/refdata/classes/Car/makes
 *
 * Zwei Werte je Eintrag, und das ist der ganze Sinn der Sache:
 *
 *   name — was der Händler liest.        "Alfa Romeo", "Škoda"
 *   wert — was mobile.de hochgeladen     "ALFA ROMEO", "SKODA"
 *          bekommen will.
 *
 * Die Liste war vorher von Hand zusammengetragen. Das sah richtig aus,
 * hätte aber beim Hochladen gerissen: mobile.de lehnt ein Inserat mit
 * "make-model-mismatch" ab, wenn Marke und Modell nicht genau so
 * geschrieben sind wie in dieser Liste. Deshalb kommt sie jetzt von
 * dort, wo sie geprüft wird.
 *
 * Ein Modell steht als blosse Zeichenkette, wenn Anzeige und Hochlade-
 * wert gleich sind — das trifft auf die grosse Mehrheit zu. Nur wo sie
 * auseinandergehen, steht ein Paar [Anzeige, Wert].
 *
 * ${marken.length} Marken, ${modellZahl} Modelle.
 */

export interface MobileMarke {
  /** Anzeigename für den Händler */
  name: string;
  /** Wert, den die Seller-API im Feld \`make\` erwartet */
  wert: string;
  /** Modell als Name, oder [Name, Wert] wenn beide abweichen */
  modelle: (string | [string, string])[];
}

export const MOBILE_MARKEN: MobileMarke[] = [
${zeilen.join('\n')}
];
`;

writeFileSync(new URL('./lib/mobileMarken.ts', import.meta.url), datei, 'utf8');
console.log(`\nGeschrieben: lib/mobileMarken.ts`);
console.log(`${marken.length} Marken, ${modellZahl} Modelle`);
process.exit(0);
