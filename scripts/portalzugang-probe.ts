/**
 * Landet ein Inserat immer im richtigen Portalkonto?
 *
 *   npx tsx scripts/portalzugang-probe.ts
 *
 * KOSTET NICHTS — reine Rechnung, keine Datenbank, kein Portal.
 *
 * ── Warum es diese Probe gibt ──────────────────────────────────────
 *
 * Das ist der teuerste Fehler, den dieses Projekt machen kann: Stellt
 * ein Haendler sein Fahrzeug versehentlich in ein fremdes Portalkonto,
 * steht ein echtes Auto unter falschem Namen oeffentlich im Netz. Es
 * faellt niemandem auf, bis ein Kaeufer anruft — beim Falschen. Das
 * ist nicht nur ein Bug, das ist das Ende der Geschaeftsbeziehung.
 *
 * Seit es den Weg als Transfer-Dienstleister gibt (eigene Anmeldung,
 * fremde Kundennummer), hat die Entscheidung drei Zustaende statt zwei.
 * Genau dort passieren solche Verwechslungen. Deshalb ist jeder Fall
 * hier aufgeschrieben, auch die, die nichts tun duerfen.
 */

import { zugangWaehlen, type Zugang, type Portal } from '../lib/portalZugang';

const MEIN: Zugang = {
  portal: 'mobile',
  benutzer: 'meine-api-kennung',
  geheim: 'mein-geheimnis',
  kontoNummer: '111111',
  testmodus: false,
  quelle: 'umgebung',
};

const MEIN_SANDBOX: Zugang = { ...MEIN, testmodus: true };

type Fall = {
  was: string;
  reihe: { benutzer: string | null; kontoNummer: string | null; testmodus: boolean | null } | null;
  eigenesGeheim: string | null;
  traeger: Zugang | null;
  transferAn: boolean;
  /** Erwartete Quelle, oder null fuer "kein Zugang". */
  quelle: Zugang['quelle'] | null;
  /** Erwartete Kundennummer, wenn ein Zugang herauskommt. */
  kontoNummer?: string;
};

const FAELLE: Fall[] = [
  {
    was: 'Haendler mit eigenen Zugangsdaten: sein Konto, seine Anmeldung',
    reihe: { benutzer: 'haendler-api', kontoNummer: '999999', testmodus: false },
    eigenesGeheim: 'sein-geheimnis',
    traeger: MEIN, transferAn: true,
    quelle: 'haendler', kontoNummer: '999999',
  },
  {
    was: 'Eigene Zugangsdaten schlagen den Transfer-Weg',
    reihe: { benutzer: 'haendler-api', kontoNummer: '999999', testmodus: false },
    eigenesGeheim: 'sein-geheimnis',
    traeger: MEIN, transferAn: true,
    quelle: 'haendler',
  },
  {
    was: 'Transfer eingeschaltet: meine Anmeldung, SEINE Kundennummer',
    reihe: { benutzer: null, kontoNummer: '999999', testmodus: false },
    eigenesGeheim: null,
    traeger: MEIN, transferAn: true,
    quelle: 'transfer', kontoNummer: '999999',
  },
  {
    was: 'DER WICHTIGSTE FALL: Transfer aus, nur Kundennummer da — kein Zugang',
    reihe: { benutzer: null, kontoNummer: '999999', testmodus: false },
    eigenesGeheim: null,
    traeger: MEIN, transferAn: false,
    quelle: null,
  },
  {
    was: 'Transfer an, aber ich habe selbst keine Anmeldung — kein Zugang',
    reihe: { benutzer: null, kontoNummer: '999999', testmodus: false },
    eigenesGeheim: null,
    traeger: null, transferAn: true,
    quelle: null,
  },
  {
    was: 'Kein Eintrag, meine Anmeldung nur Sandbox: zum Testen erlaubt',
    reihe: null, eigenesGeheim: null,
    traeger: MEIN_SANDBOX, transferAn: false,
    quelle: 'umgebung', kontoNummer: '111111',
  },
  {
    was: 'DER ZWEITWICHTIGSTE: kein Eintrag, meine Anmeldung PRODUKTIV — kein Zugang',
    reihe: null, eigenesGeheim: null,
    traeger: MEIN, transferAn: false,
    quelle: null,
  },
  {
    was: 'Kein Eintrag, produktiv, Transfer an — trotzdem kein Zugang',
    reihe: null, eigenesGeheim: null,
    traeger: MEIN, transferAn: true,
    quelle: null,
  },
  {
    was: 'Eintrag ohne Kundennummer zaehlt wie kein Eintrag',
    reihe: { benutzer: 'haendler-api', kontoNummer: null, testmodus: false },
    eigenesGeheim: 'sein-geheimnis',
    traeger: MEIN_SANDBOX, transferAn: false,
    quelle: 'umgebung',
  },
  {
    was: 'Testmodus des Haendlers wird uebernommen, nicht meiner',
    reihe: { benutzer: null, kontoNummer: '999999', testmodus: true },
    eigenesGeheim: null,
    traeger: MEIN, transferAn: true,
    quelle: 'transfer', kontoNummer: '999999',
  },
];

let fehler = 0;
for (const fall of FAELLE) {
  const ist = zugangWaehlen(
    'mobile' as Portal, fall.reihe, fall.eigenesGeheim, fall.traeger, fall.transferAn,
  );
  const quelleOk = (ist?.quelle ?? null) === fall.quelle;
  const kontoOk = !fall.kontoNummer || ist?.kontoNummer === fall.kontoNummer;
  /* Es darf NIE eine Anmeldung ohne Geheimnis herauskommen — damit
     laeuft der Aufruf ins Leere und der Haendler sieht nur "Fehler". */
  const vollstaendig = !ist || Boolean(ist.geheim && ist.kontoNummer);
  const ok = quelleOk && kontoOk && vollstaendig;

  console.log(`${ok ? 'OK   ' : 'FEHLER'} ${fall.was}`);
  if (!ok) {
    console.log(`       erwartet: Quelle ${fall.quelle}${fall.kontoNummer ? ', Konto ' + fall.kontoNummer : ''}`);
    console.log(`       bekommen: ${ist ? `Quelle ${ist.quelle}, Konto ${ist.kontoNummer}` : 'kein Zugang'}`);
    fehler++;
  }
}

/*
 * Die Probe, die alle Faelle zusammen abdeckt: In keinem Fall darf ein
 * Haendler mit eigener Kundennummer in MEINEM Konto landen.
 */
console.log('\n── Querprobe ──────────────────────────────────────────');
let verwechselt = 0;
for (const reihe of [
  { benutzer: null, kontoNummer: '999999', testmodus: false },
  { benutzer: 'x', kontoNummer: '999999', testmodus: true },
]) {
  for (const geheim of [null, 'sein-geheimnis']) {
    for (const traeger of [null, MEIN, MEIN_SANDBOX]) {
      for (const transferAn of [false, true]) {
        const z = zugangWaehlen('mobile', reihe, geheim, traeger, transferAn);
        if (z && z.kontoNummer === MEIN.kontoNummer) {
          console.log(`FEHLER Verwechslung: ${JSON.stringify({ geheim: Boolean(geheim), traeger: traeger?.testmodus, transferAn })}`);
          verwechselt++;
        }
      }
    }
  }
}
console.log(`${verwechselt === 0 ? 'OK   ' : 'FEHLER'} 24 Kombinationen: nie mein Konto bei fremder Kundennummer`);
fehler += verwechselt;

console.log(fehler === 0 ? '\nBestanden.' : `\nDurchgefallen: ${fehler} Abweichung(en).`);
process.exitCode = fehler === 0 ? 0 : 1;

export {};
