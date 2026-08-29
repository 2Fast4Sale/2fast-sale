/**
 * Erzeugt lib/ausstattungPortale.ts — wohin jedes Ausstattungsmerkmal
 * bei mobile.de und AutoScout24 gehoert.
 *
 * WARUM ERZEUGT UND NICHT VON HAND:
 *
 * Zwei Anlaeufe, zwei Fehlerarten, beide von derselben Sorte.
 *
 * Beim ersten Mal war die Tabelle handgeschrieben. 47 von 109
 * Merkmal-Kennungen gab es in equipmentDatabase.ts gar nicht, und 44
 * der AutoScout24-Nummern existierten nicht — geraten, weil die Namen
 * plausibel klangen.
 *
 * Beim zweiten Mal waren die Kennungen richtig, aber sieben der
 * mobile.de-Aufzaehlungswerte falsch: "CLOTH" statt "FABRIC",
 * "PART_LEATHER" statt "PARTIAL_LEATHER",
 * "AUTOMATIC_CLIMATISATION_4_ZONED" statt "..._4_ZONES". Solche Woerter
 * sehen so vorhersehbar aus, dass man sie hinschreibt, statt
 * nachzusehen. Auffallen wuerde es erst, wenn mobile.de das fertige
 * Inserat eines echten Kunden ablehnt.
 *
 * Deshalb steht hier keine einzige Nummer und kein einziger
 * ungeprueften Wert:
 *
 *   AutoScout24  ueber den englischen NAMEN aus lib/as24Referenzen.ts
 *   mobile.de    Aufzaehlungswerte gegen lib/mobileWerte.ts
 *   Merkmale     gegen lib/equipmentDatabase.ts
 *
 * Stimmt eines nicht, bricht das Programm ab und schreibt nichts.
 *
 * GRENZE: Die Ja/Nein-Felder von mobile.de (`abs`, `sunroof`, …) lassen
 * sich nicht pruefen — es gibt keine Referenzliste dafuer, sie stehen
 * nur im Schema der Dokumentation. Sie sind von Hand uebertragen.
 *
 * Aufruf:  node ausstattung-zuordnen.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const lies = p => readFileSync(new URL(p, import.meta.url), 'utf8');

/* ── Die drei Wahrheiten einlesen ───────────────────────────────── */

const merkmale = [...lies('./lib/equipmentDatabase.ts')
  .matchAll(/\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g)]
  .map(m => ({ id: m[1], label: m[2] }));

const as24Liste = (() => {
  const t = lies('./lib/as24Referenzen.ts');
  const teil = t.split("'Equipment': [")[1].split('\n  ],')[0];
  return [...teil.matchAll(/\['(\d+)', '([^']+)'\]/g)].map(m => ({ id: m[1], name: m[2] }));
})();

const mobileWerte = (() => {
  const t = lies('./lib/mobileWerte.ts');
  const raw = t.split('MOBILE_WERTE: Record<string, [string, string][]> = {')[1].split('\n};')[0];
  const map = {};
  for (const block of raw.split(/\n  (?=\w+: \[)/)) {
    const feld = (block.match(/^\s*(\w+): \[/) || [])[1];
    if (!feld) continue;
    map[feld] = [...block.matchAll(/\['([^']+)', '[^']*'\]/g)].map(m => m[1]);
  }
  return map;
})();

/* ── Zuordnung ──────────────────────────────────────────────────────
 *
 * [AutoScout24-Name oder null, mobile.de-Ziel oder null]
 *
 * Der AutoScout24-Wert ist bewusst der englische Name, nicht die
 * Nummer. Einen falschen Namen faengt die Pruefung; eine falsche
 * Nummer waere unsichtbar.
 */
const S = feld => ({ art: 'schalter', feld });
const L = (feld, ...werte) => ({ art: 'liste', feld, werte });
const A = (feld, wert) => ({ art: 'auswahl', feld, wert });

const Z = {
  /* ── Sicherheit ──────────────────────────────────────────────── */
  abs:               ['ABS',                                 S('abs')],
  esp:               ['Electronic stability control',        S('esp')],
  airbag_fahrer:     ['Driver-side airbag',                  A('airbag', 'DRIVER_AIRBAG')],
  airbag_beifahrer:  ['Passenger-side airbag',               A('airbag', 'FRONT_AIRBAGS')],
  airbag_seite:      ['Side airbag',                         A('airbag', 'FRONT_AND_SIDE_AIRBAGS')],
  airbag_kopf:       ['Head airbag',                         A('airbag', 'FRONT_AND_SIDE_AND_MORE_AIRBAGS')],
  /* Knieairbag: kennt keines der beiden Portale. */
  airbag_knie:       [null, null],
  isofix:            ['Isofix',                              S('isofix')],
  /* AutoScout24 fuehrt nur "Isofix" ohne Unterscheidung. */
  isofix_beifahrer:  [null,                                  S('passengerSeatIsofixPoint')],
  reifendruck:       ['Tire pressure monitoring system',     S('tirePressureMonitoring')],
  traktionskontrolle:['Traction control',                    S('tractionControlSystem')],
  wegfahrsperre:     ['Immobilizer',                         S('immobilizer')],
  notrufsystem:      ['Emergency system',                    S('emergencyCallSystem')],
  gepaeckraumabtrennung: ['Cargo barrier',                   S('cargoBarrier')],
  einparkhilfe_h:    ['Parking assist system sensors rear',  L('parkingAssistants', 'REAR_SENSORS')],
  einparkhilfe_v:    ['Parking assist system sensors front', L('parkingAssistants', 'FRONT_SENSORS')],
  /* "Vorne & hinten" ist bei mobile.de kein eigener Wert, sondern
     beide Werte in derselben Liste. */
  einparkhilfe_360:  ['Parking assist system sensors front', L('parkingAssistants', 'FRONT_SENSORS', 'REAR_SENSORS')],
  rueckfahrkamera:   ['Parking assist system camera',        L('parkingAssistants', 'REAR_VIEW_CAM')],
  kamera_360:        ['360° camera',                         L('parkingAssistants', 'CAM_360_DEGREES')],
  notbremse:         ['Emergency brake assistant',           S('collisionAvoidance')],
  spurhalte:         ['Lane departure warning system',       S('laneDepartureWarning')],
  totwinkel:         ['Blind spot monitor',                  S('blindSpotMonitor')],
  muedigkeits:       ['Driver drowsiness detection',         S('fatigueWarningSystem')],
  /* Bergabfahrhilfe kennt keines der Portale. "Hill Holder" ist die
     Berganfahrhilfe — ein anderes System. */
  bergab:            [null, null],
  berganfahrhilfe:   ['Hill Holder',                         S('hillStartAssist')],
  notfallbremse_v:   ['Distance warning system',             S('distanceWarningSystem')],

  /* ── Fahrerassistenz ─────────────────────────────────────────── */
  tempomat:          ['Cruise control',                      A('speedControl', 'CRUISE_CONTROL')],
  acc:               ['Adaptive Cruise Control',             A('speedControl', 'ADAPTIVE_CRUISE_CONTROL')],
  tempo_limiter:     ['Speed limit control system',          S('speedLimiter')],
  regensensor:       ['Rain sensor',                         S('automaticRainSensor')],
  schaltwippen:      ['Shift paddles',                       S('paddleShifters')],
  verkehrszeichen:   ['Traffic sign recognition',            S('trafficSignRecognition')],
  einparkassistent:  ['Parking assist system self-steering', L('parkingAssistants', 'AUTOMATIC_PARKING')],
  /* Spurfuehrung waere dasselbe Feld wie Spurhalte. */
  spurführung:       [null, null],
  fernlicht_auto:    ['High beam assist',                    S('highBeamAssist')],
  nachtsicht:        ['Night view assist',                   S('nightVisionAssist')],
  head_up:           ['Heads-up display',                    S('headUpDisplay')],

  /* ── Komfort ─────────────────────────────────────────────────── */
  klima:             ['Air conditioning',                    A('climatisation', 'MANUAL_CLIMATISATION')],
  klima_auto:        ['Automatic climate control',           A('climatisation', 'AUTOMATIC_CLIMATISATION')],
  klima_4zone:       ['Automatic climate control, 4 zones',  A('climatisation', 'AUTOMATIC_CLIMATISATION_4_ZONES')],
  sitzheizung:       ['Seat heating',                        S('electricHeatedSeats')],
  sitzlueftung:      ['Seat ventilation',                    S('ventilatedSeats')],
  lenkradheizung:    ['Heated steering wheel',               S('heatedSteeringWheel')],
  sitzmassage:       ['Massage seats',                       S('massageSeats')],
  el_sitze:          ['Electrically adjustable seats',       S('electricAdjustableSeats')],
  memory_sitze:      [null,                                  S('memorySeats')],
  lordosenstuetze:   ['Lumbar support',                      S('lumbarSupport')],
  armlehne:          ['Armrest',                             S('armRest')],
  lederlenkrad:      ['Leather steering wheel',              S('leatherSteeringWheel')],
  el_fensterheber:   ['Power windows',                       S('electricWindows')],
  servolenkung:      ['Power steering',                      S('powerAssistedSteering')],
  freisprech:        ['Hands-free equipment',                S('handsFreePhoneSystem')],
  dach_panorama:     ['Panorama roof',                       S('panoramicGlassRoof')],
  schiebedach:       ['Sunroof',                             S('sunroof')],
  standheizung:      ['Auxiliary heating',                   S('auxiliaryHeating')],
  standkuehlung:     [null,                                  S('secondaryAirConditioning')],
  el_heckklappe:     ['Electric tailgate',                   S('electricTailgate')],
  keyless:           ['Keyless central door lock',           S('keylessEntry')],
  start_stop:        ['Start-stop system',                   S('startStopSystem')],
  multilenk:         ['Multi-function steering wheel',       S('multifunctionalWheel')],
  sprachsteuerung:   ['Voice Control',                       S('voiceControl')],
  el_spiegel:        ['Electrical side mirrors',             S('electricExteriorMirrors')],
  /* AutoScout24 unterscheidet nicht zwischen verstellbar und
     anklappbar — dort gibt es nur "Electrical side mirrors". */
  spiegel_anklappbar:[null,                                  S('foldingExteriorMirrors')],
  spiegel_abblend:   ['Automatically dimming interior mirror', S('dimmingInteriorMirror')],
  ambientelicht:     ['Ambient lighting',                    S('ambientLighting')],

  /* ── Infotainment ────────────────────────────────────────────── */
  navi:              ['Navigation system',                   S('navigationSystem')],
  navi_online:       [null, null],
  carplay:           ['Apple CarPlay',                       S('carplay')],
  android_auto:      ['Android Auto',                        S('androidAuto')],
  bluetooth:         ['Bluetooth',                           S('bluetooth')],
  dab:               ['Digital radio',                       L('radio', 'DAB_RADIO')],
  tuner_radio:       ['Radio',                               L('radio', 'TUNER')],
  usb:               ['USB',                                 S('usb')],
  wlan:              ['WLAN / WiFi hotspot',                 S('wifiHotspot')],
  kabellos_laden:    ['Induction charging for smartphones',  S('wirelessCharging')],
  soundsystem:       ['Sound system',                        S('soundSystem')],
  musikstreaming:    ['Integrated music streaming',          S('integratedMusicStreaming')],
  bordcomputer:      ['On-board computer',                   S('onBoardComputer')],
  touchscreen:       ['Touch screen',                        S('touchscreen')],
  digital_cockpit:   ['Digital cockpit',                     S('digitalCockpit')],
  connect:           [null, null],
  rear_entertainment:[null, null],

  /* ── Licht ───────────────────────────────────────────────────── */
  led:               ['LED Headlights',                      A('headlightType', 'LED_HEADLIGHTS')],
  xenon:             ['Xenon headlights',                    A('headlightType', 'XENON_HEADLIGHTS')],
  matrix_led:        ['Laser headlights',                    A('headlightType', 'LASER_HEADLIGHTS')],
  tagfahrlicht:      ['LED Daytime Running Lights',          A('daytimeRunningLamps', 'LED_RUNNING_LIGHTS')],
  kurven_licht:      ['Adaptive headlights',                 A('bendingLightsType', 'ADAPTIVE_BENDING_LIGHTS')],
  blendfrei_fernlicht: ['Glare-free high beam headlights',   S('glareFreeHighBeam')],
  scheinwerferreinigung: ['Headlight washer system',         S('headlightWasherSystem')],
  led_rueck:         [null, null],
  licht_sensor:      ['Light sensor',                        S('lightSensor')],
  nebellicht:        ['Fog lights',                          S('frontFogLights')],

  /* ── Innenausstattung ────────────────────────────────────────── */
  leder:             [null,                                  A('interiorType', 'LEATHER')],
  kunstleder:        [null,                                  A('interiorType', 'IMITATION_LEATHER')],
  stoff:             [null,                                  A('interiorType', 'FABRIC')],
  sitze_vorne_sport: ['Sport seats',                         S('sportSeats')],
  /* Sitzzahl ist eine Zahl (`seats`), kein Merkmal. */
  sitze_7:           [null, null],
  sitze_6:           [null, null],
  sitze_5:           [null, null],
  holzdekor:         [null, null],
  aludekor:          [null, null],
  dachhimmel_schwarz:[null, null],
  fussmatten:        [null, null],

  /* ── Exterieur und Raeder ────────────────────────────────────── */
  /* Die Zollgroesse geht bei BEIDEN verloren — es gibt nur
     "Leichtmetallfelgen" ohne Groesse. */
  alu_17:            ['Alloy wheels',                        S('alloyWheels')],
  alu_18:            ['Alloy wheels',                        S('alloyWheels')],
  alu_19:            ['Alloy wheels',                        S('alloyWheels')],
  alu_20:            ['Alloy wheels',                        S('alloyWheels')],
  alu_21:            ['Alloy wheels',                        S('alloyWheels')],
  winterraeder:      ['Winter tyres',                        S('winterTires')],
  sommerreifen:      ['Summer tyres',                        S('summerTires')],
  sportfahrwerk:     ['Sport suspension',                    S('performanceHandlingSystem')],
  sportpaket:        ['Sport package',                       S('sportPackage')],
  luftfederung:      ['Air suspension',                      S('airSuspension')],
  anhaengerkupplung: ['Trailer hitch',                       A('trailerCouplingType', 'TRAILER_COUPLING_FIX')],
  dachreling:        ['Roof rack',                           S('roofRails')],
  scheiben_abgedunkelt: ['Tinted windows',                   S('tintedWindows')],
  spoiler:           ['Spoiler',                             null],
  metallic:          [null,                                  S('metallic')],
  zweifarb:          [null, null],
  tiefformat_reifen: ['Emergency tyre repair kit',           A('breakdownService', 'REPAIR_KIT')],

  /* ── Antrieb ─────────────────────────────────────────────────── */
  /* Antriebsart, Getriebe und Kraftstoff sind eigene Felder. */
  allrad:            [null, null],
  hinterrad:         [null, null],
  frontantrieb:      [null, null],
  automatik:         [null, null],
  schaltgetriebe:    [null, null],
  mild_hybrid:       [null, null],
  vollhybrid:        [null, null],
  plug_in_hybrid:    [null, null],
  elektro:           [null, null],

  /* ── Zustand ─────────────────────────────────────────────────── */
  scheckh:           [null,                                  S('fullServiceHistory')],
  nichtraucher:      [null,                                  S('nonSmokerVehicle')],
  neuwertig:         [null, null],
  garantie:          [null,                                  S('warranty')],
};

/* ── Pruefen, bevor irgendetwas geschrieben wird ─────────────────── */

const fehler = [];
const bekannt = new Set(merkmale.map(m => m.id));

for (const id of Object.keys(Z)) {
  if (!bekannt.has(id)) fehler.push(`Kennung "${id}" gibt es in equipmentDatabase.ts nicht`);
}
for (const m of merkmale) {
  if (!(m.id in Z)) fehler.push(`Merkmal "${m.id}" (${m.label}) hat keine Zuordnung`);
}

const nachName = new Map(as24Liste.map(a => [a.name, a.id]));
for (const [id, [as24Name, mob]] of Object.entries(Z)) {
  if (as24Name && !nachName.has(as24Name)) {
    fehler.push(`AutoScout24 kennt "${as24Name}" nicht (bei ${id})`);
  }
  if (mob && mob.art !== 'schalter') {
    const werte = mob.art === 'liste' ? mob.werte : [mob.wert];
    const erlaubt = mobileWerte[mob.feld];
    if (!erlaubt) fehler.push(`mobile.de: kein Feld "${mob.feld}" in mobileWerte.ts (bei ${id})`);
    else for (const w of werte) {
      if (!erlaubt.includes(w)) fehler.push(`mobile.de: "${w}" ist kein gueltiger Wert fuer ${mob.feld} (bei ${id})`);
    }
  }
}

if (fehler.length) {
  console.error(`\n${fehler.length} Fehler — es wird nichts geschrieben:\n`);
  fehler.forEach(f => console.error('  ' + f));
  process.exit(1);
}

/* ── Datei schreiben ────────────────────────────────────────────── */

const q = s => `'${String(s).replace(/'/g, "\\'")}'`;

const zeilen = merkmale.map(m => {
  const [as24Name, mob] = Z[m.id];
  const teile = [];
  if (as24Name) teile.push(`as24: ${q(nachName.get(as24Name))}, /* ${as24Name} */`);
  if (mob) {
    const inner = mob.art === 'liste'
      ? `art: 'liste', feld: ${q(mob.feld)}, werte: [${mob.werte.map(q).join(', ')}]`
      : mob.art === 'auswahl'
        ? `art: 'auswahl', feld: ${q(mob.feld)}, wert: ${q(mob.wert)}`
        : `art: 'schalter', feld: ${q(mob.feld)}`;
    teile.push(`mobile: { ${inner} },`);
  }
  return `  /* ${m.label} */\n  { id: ${q(m.id)},${teile.length ? '\n    ' + teile.join('\n    ') : ''} },`;
});

const ohneBeide = merkmale.filter(m => !Z[m.id][0] && !Z[m.id][1]);
const nurAs24 = merkmale.filter(m => Z[m.id][0] && !Z[m.id][1]);
const nurMobile = merkmale.filter(m => !Z[m.id][0] && Z[m.id][1]);
const beide = merkmale.filter(m => Z[m.id][0] && Z[m.id][1]);

const datei = `/**
 * Wohin jedes Ausstattungsmerkmal bei den Portalen gehoert.
 *
 * NICHT VON HAND AENDERN — erzeugt von ausstattung-zuordnen.mjs.
 * Stand: ${new Date().toISOString().slice(0, 10)}
 *
 * Die beiden Portale loesen dasselbe verschieden:
 *
 *   AutoScout24  eine Liste "Equipment" mit ${as24Liste.length} Kennungen
 *   mobile.de    fuer fast jedes Merkmal ein EIGENES FELD im Inserat,
 *                manches in Aufzaehlungen (parkingAssistants, radio)
 *
 * ${merkmale.length} Merkmale insgesamt:
 *   ${beide.length} gehen an beide Portale
 *   ${nurAs24.length} nur an AutoScout24
 *   ${nurMobile.length} nur an mobile.de
 *   ${ohneBeide.length} an keines — die koennen nur in die freie Beschreibung
 *
 * Alle Kennungen und Aufzaehlungswerte sind gegen die echten Listen
 * geprueft (as24Referenzen.ts, mobileWerte.ts, equipmentDatabase.ts).
 * Der Erzeuger bricht ab, sobald einer nicht existiert.
 */

export type MobileZiel =
  /** Eigenes Ja/Nein-Feld: { abs: true } */
  | { art: 'schalter'; feld: string }
  /** Werte in einer Liste: parkingAssistants: ['FRONT_SENSORS', 'REAR_SENSORS'] */
  | { art: 'liste'; feld: string; werte: string[] }
  /** Ein Wert in einer Auswahl: climatisation: 'AUTOMATIC_CLIMATISATION' */
  | { art: 'auswahl'; feld: string; wert: string };

export interface PortalZiel {
  /** id aus equipmentDatabase.ts */
  id: string;
  /** Kennung aus AS24_REFERENZEN['Equipment'] */
  as24?: string;
  mobile?: MobileZiel;
}

export const PORTAL_ZIELE: PortalZiel[] = [
${zeilen.join('\n')}
];

const NACH_ID = new Map(PORTAL_ZIELE.map(z => [z.id, z]));

export function portalZiel(id: string): PortalZiel | undefined {
  return NACH_ID.get(id);
}

/**
 * Merkmale, die bei KEINEM Portal als Haekchen ankommen.
 *
 * Nicht dasselbe wie "unwichtig": Sitzzahl, Antriebsart und Getriebe
 * stehen in eigenen Feldern des Inserats. Dachhimmel, Dekore und die
 * Zollgroesse der Felgen gehoeren dagegen wirklich nur in den
 * Beschreibungstext.
 */
export function nurBeschreibung(id: string): boolean {
  const z = NACH_ID.get(id);
  return !!z && !z.as24 && !z.mobile;
}
`;

writeFileSync(new URL('./lib/ausstattungPortale.ts', import.meta.url), datei, 'utf8');

console.log(`Geschrieben: lib/ausstattungPortale.ts`);
console.log(`${merkmale.length} Merkmale geprueft — keine erfundene Kennung, kein erfundener Wert.\n`);
console.log(`An beide Portale: ${beide.length}`);
console.log(`Nur AutoScout24 (${nurAs24.length}): ${nurAs24.map(m => m.label).join(', ')}`);
console.log(`Nur mobile.de (${nurMobile.length}): ${nurMobile.map(m => m.label).join(', ')}`);
console.log(`\nAn keines (${ohneBeide.length}):`);
ohneBeide.forEach(m => console.log('  ' + m.label));
process.exit(0);
