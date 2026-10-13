/**
 * Prueft jeden Wert, den unsere Uebersetzung erzeugt, gegen die
 * Referenzdaten von mobile.de.
 *
 *   npx tsx scripts/mobile-referenzdaten-pruefen.ts
 *
 * ── Warum gerade das ────────────────────────────────────────────────
 *
 * Der erste echte Uebertragungsversuch scheiterte mit
 * "invalid-reference-data-value" — ohne zu sagen, welches Feld gemeint
 * ist. Genau diese Listen sind damit gemeint, und sie sind oeffentlich
 * abrufbar: services.mobile.de/refdata/... braucht keine Anmeldung.
 *
 * Die Schnittstellenbeschreibung (OpenAPI) hilft hier NICHT: Sie fuehrt
 * diese Felder ohne Aufzaehlung, weil die erlaubten Werte eben in den
 * Referenzdaten stehen und sich aendern koennen. Eine Pruefung gegen das
 * Schema sieht deshalb gruen aus und beweist nichts — das war der erste
 * Anlauf dieses Skripts, und er war wertlos.
 *
 * Geholt wird bei jedem Lauf frisch. Eine Kopie im Repo veraltet, und
 * eine veraltete Liste meldet Fehler, die keine sind, oder uebersieht
 * welche.
 */

import {
  mobileKategorie, mobileKraftstoff, mobileGetriebe, mobileFarbe, mobileEuronorm,
  mobilePolsterung, mobileInnenfarbe, mobileAntrieb, mobileTueren, laenderCode,
} from '../lib/mobileUebersetzung';
import {
  KAROSSERIE, KRAFTSTOFFE, GETRIEBE, EURONORM, POLSTERUNG, INNENFARBE, ANTRIEB,
  LAENDERVERSION,
} from '../app/dashboard/listing/step1/useEntwurf';

import { mobileMarkenWertOderNull, mobileModellWertOderNull } from '../lib/carDatabase';

const BASIS = 'https://services.mobile.de/refdata';

/** Schreibweisen, wie der Fahrzeugschein sie liefert. */
const FAHRZEUGE: Array<[string, string]> = [
  ['VOLKSWAGEN,', 'VW GOLF'], ['MERCEDES-BENZ,', 'C 200'], ['BMW,', '318'],
  ['AUDI,', 'A4'], ['SKODA,', 'Octavia'], ['OPEL,', 'Astra'], ['FORD,', 'Focus'],
  ['RENAULT,', 'Clio'], ['Toyota', 'Yaris'], ['Hyundai', 'i30'],
];

/** Farbnamen, wie ein Haendler sie wirklich eintippt. */
const FARBEN_EINGABEN = [
  'Schwarz', 'Tiefschwarz', 'Tiefschwarz Perleffekt', 'Weiß', 'Reflexsilber',
  'Silber', 'Grau', 'Uranograu', 'Indiumgrau Metallic', 'Blau', 'Atlantikblau',
  'Rot', 'Tornadorot', 'Grün', 'Beige', 'Braun', 'Gelb', 'Orange', 'Gold',
];

async function liste(pfad: string): Promise<string[] | null> {
  try {
    const antwort = await fetch(`${BASIS}/${pfad}`, {
      headers: { Accept: 'application/vnd.de.mobile.api+json' },
    });
    if (!antwort.ok) return null;
    const daten = await antwort.json() as { values?: Array<{ name: string }> };
    return (daten.values ?? []).map(v => v.name);
  } catch {
    return null;
  }
}

interface Pruefung {
  feld: string;
  pfad: string;
  eingaben: readonly string[];
  uebersetzen: (w: string) => unknown;
}

const PRUEFUNGEN: Pruefung[] = [
  { feld: 'category',       pfad: 'classes/Car/categories', eingaben: KAROSSERIE,     uebersetzen: mobileKategorie },
  { feld: 'fuel',           pfad: 'fuels',                  eingaben: KRAFTSTOFFE,    uebersetzen: mobileKraftstoff },
  { feld: 'gearbox',        pfad: 'gearboxes',              eingaben: GETRIEBE,       uebersetzen: mobileGetriebe },
  { feld: 'exteriorColor',  pfad: 'colors',                 eingaben: FARBEN_EINGABEN, uebersetzen: mobileFarbe },
  { feld: 'interiorColor',  pfad: 'interiorcolors',        eingaben: INNENFARBE,     uebersetzen: mobileInnenfarbe },
  { feld: 'interiorType',   pfad: 'interiortypes',         eingaben: POLSTERUNG,     uebersetzen: mobilePolsterung },
  { feld: 'emissionClass',  pfad: 'emissionclasses',       eingaben: EURONORM,       uebersetzen: mobileEuronorm },
  { feld: 'driveType',      pfad: 'drivetypes',            eingaben: ANTRIEB,        uebersetzen: mobileAntrieb },
  { feld: 'countryVersion', pfad: 'countryversion',              eingaben: LAENDERVERSION, uebersetzen: laenderCode },
  { feld: 'doors',          pfad: 'doorcounts',                  eingaben: ['2', '3', '4', '5', '6', '7'],
    uebersetzen: (w: string) => mobileTueren(Number(w)) },
];

async function main() {
  const probleme: string[] = [];
  const unpruefbar: string[] = [];

  for (const p of PRUEFUNGEN) {
    const erlaubt = await liste(p.pfad);
    if (!erlaubt) {
      /*
       * Kein Grund zur Entwarnung und kein Grund zur Panik: Nicht jede
       * Liste liegt unter dem Pfad, den ich geraten habe. Das muss
       * dastehen, sonst sieht ein unvollstaendiger Lauf wie ein
       * erfolgreicher aus.
       */
      unpruefbar.push(`${p.feld} (${BASIS}/${p.pfad})`);
      continue;
    }

    const ergebnisse: string[] = [];
    for (const eingabe of p.eingaben) {
      const wert = p.uebersetzen(eingabe);
      if (wert === undefined || wert === null || wert === '') {
        probleme.push(`${p.feld}: "${eingabe}" ergibt keinen Wert`);
        continue;
      }
      const text = String(wert);
      const ok = erlaubt.includes(text);
      ergebnisse.push(`    ${eingabe.padEnd(24)} → ${text.padEnd(26)} ${ok ? 'ok' : 'NICHT in der Liste'}`);
      if (!ok) {
        probleme.push(`${p.feld}: "${eingabe}" wird zu "${text}", das kennt mobile.de nicht`);
      }
    }
    console.log(`\n── ${p.feld} (${erlaubt.length} erlaubte Werte) ──`);
    console.log(ergebnisse.join('\n'));
  }

  /*
   * Marke und Modell zuletzt — daran ist der erste Versuch gescheitert.
   * Geprueft werden Schreibweisen, wie der Fahrzeugschein sie liefert,
   * samt Komma und wiederholter Marke.
   */
  const markenAntwort = await fetch(`${BASIS}/classes/Car/makes`, {
    headers: { Accept: 'application/vnd.de.mobile.api+json' },
  });
  if (markenAntwort.ok) {
    const marken: string[] = ((await markenAntwort.json()).values ?? [])
      .map((v: { name: string }) => v.name);
    console.log(`\n── Marke und Modell (${marken.length} Marken) ──`);
    for (const [eingabeMarke, eingabeModell] of FAHRZEUGE) {
      const marke = mobileMarkenWertOderNull(eingabeMarke);
      if (!marke) { probleme.push(`Marke "${eingabeMarke}" ergibt keinen Wert`); continue; }
      const markeOk = marken.includes(marke);
      const modell = mobileModellWertOderNull(eingabeMarke, eingabeModell);
      let modellOk: boolean | null = null;
      if (markeOk && modell) {
        const r = await fetch(`${BASIS}/classes/Car/makes/${encodeURIComponent(marke)}/models`, {
          headers: { Accept: 'application/vnd.de.mobile.api+json' },
        });
        if (r.ok) {
          const modelle: string[] = ((await r.json()).values ?? []).map((v: { name: string }) => v.name);
          modellOk = modelle.includes(modell);
        }
      }
      console.log(`    ${(eingabeMarke + ' ' + eingabeModell).padEnd(26)} → ${String(marke).padEnd(16)}`
        + `${markeOk ? 'ok' : 'NICHT in der Liste'}   ${String(modell).padEnd(12)} `
        + `${modellOk === null ? '(nicht geprüft)' : modellOk ? 'ok' : 'NICHT in der Liste'}`);
      if (!markeOk) probleme.push(`Marke "${marke}" steht nicht in den Referenzdaten`);
      if (modellOk === false) probleme.push(`Modell "${modell}" (${marke}) steht nicht in den Referenzdaten`);
    }
  } else {
    unpruefbar.push(`Marken (${BASIS}/classes/Car/makes)`);
  }


  console.log('\n═══════════════════════════════════════════════════════════════');
  if (unpruefbar.length) {
    console.log(`Nicht pruefbar, Liste nicht gefunden:\n  ${unpruefbar.join('\n  ')}\n`);
  }
  if (probleme.length === 0) {
    console.log('Alle pruefbaren Werte stehen in den Referenzdaten von mobile.de.');
  } else {
    console.log(`${probleme.length} Werte, die mobile.de ablehnen wuerde:\n`);
    for (const x of probleme) console.log('  • ' + x);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
