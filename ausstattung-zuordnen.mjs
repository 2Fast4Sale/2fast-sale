/**
 * Erzeugt lib/ausstattungPortale.ts — wohin jedes Ausstattungsmerkmal
 * bei mobile.de und AutoScout24 gehoert.
 *
 * WARUM ERZEUGT UND NICHT VON HAND:
 *
 * Beim ersten Versuch habe ich die Tabelle von Hand geschrieben. 47 von
 * 109 Merkmal-Kennungen gab es in equipmentDatabase.ts gar nicht, und 44
 * der AutoScout24-Nummern existierten nicht — ich hatte beide Seiten
 * geraten, weil die Namen plausibel klangen.
 *
 * Deshalb steht hier keine einzige Nummer. Die AutoScout24-Kennungen
 * werden ueber den NAMEN aus lib/as24Referenzen.ts nachgeschlagen; steht
 * ein Name nicht in der echten Liste, bricht das Programm ab, statt
 * still etwas Falsches zu schreiben. Die Merkmal-Kennungen kommen aus
 * equipmentDatabase.ts; eine unbekannte bricht ebenfalls ab.
 *
 * Aufruf:  node ausstattung-zuordnen.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const lies = p => readFileSync(new URL(p, import.meta.url), 'utf8');

/* ── Die beiden Wahrheiten einlesen ─────────────────────────────── */

const merkmale = [...lies('./lib/equipmentDatabase.ts')
  .matchAll(/\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g)]
  .map(m => ({ id: m[1], label: m[2] }));

const as24Liste = (() => {
  const t = lies('./lib/as24Referenzen.ts');
  const teil = t.split("'Equipment': [")[1].split('\n  ],')[0];
  return [...teil.matchAll(/\['(\d+)', '([^']+)'\]/g)].map(m => ({ id: m[1], name: m[2] }));
})();

/* ── Zuordnung: unsere Kennung -> AutoScout24-NAME und mobile.de-Feld ─
 *
 * Der AutoScout24-Wert ist bewusst der englische Name, nicht die
 * Nummer. Einen falschen Namen faengt die Pruefung unten; eine falsche
 * Nummer waere unsichtbar.
 *
 * null bedeutet: Das Portal fuehrt dieses Merkmal nicht.
 */
const Z = {
  /* Sicherheit */
  abs:               ['ABS',                                 { art: 'schalter', feld: 'abs' }],
  esp:               ['Electronic stability control',        { art: 'schalter', feld: 'esp' }],
  airbag_fahrer:     ['Driver-side airbag',                  { art: 'auswahl', feld: 'airbag', wert: 'DRIVER_AIRBAG' }],
  airbag_beifahrer:  ['Passenger-side airbag',               { art: 'auswahl', feld: 'airbag', wert: 'DRIVER_AND_PASSENGER_AIRBAG' }],
  airbag_seite:      ['Side airbag',                         { art: 'auswahl', feld: 'airbag', wert: 'FRONT_AND_SIDE_AIRBAGS' }],
  airbag_kopf:       ['Head airbag',                         { art: 'auswahl', feld: 'airbag', wert: 'FRONT_AND_SIDE_AND_MORE_AIRBAGS' }],
  airbag_knie:       [null, null],
  isofix:            ['Isofix',                              { art: 'schalter', feld: 'isofix' }],
  reifendruck:       ['Tire pressure monitoring system',     { art: 'schalter', feld: 'tirePressureMonitoring' }],
  einparkhilfe_h:    ['Parking assist system sensors rear',  { art: 'liste', feld: 'parkingAssistants', wert: 'REAR_SENSORS' }],
  einparkhilfe_v:    ['Parking assist system sensors front', { art: 'liste', feld: 'parkingAssistants', wert: 'FRONT_SENSORS' }],
  einparkhilfe_360:  ['Parking assist system sensors front', { art: 'liste', feld: 'parkingAssistants', wert: 'FRONT_AND_REAR_SENSORS' }],
  rueckfahrkamera:   ['Parking assist system camera',        { art: 'liste', feld: 'parkingAssistants', wert: 'REAR_VIEW_CAM' }],
  kamera_360:        ['360° camera',                         { art: 'liste', feld: 'parkingAssistants', wert: 'CAM_360_DEGREES' }],
  notbremse:         ['Emergency brake assistant',           { art: 'schalter', feld: 'collisionAvoidance' }],
  spurhalte:         ['Lane departure warning system',       { art: 'schalter', feld: 'laneDepartureWarning' }],
  totwinkel:         ['Blind spot monitor',                  { art: 'schalter', feld: 'blindSpotMonitor' }],
  muedigkeits:       ['Driver drowsiness detection',         { art: 'schalter', feld: 'fatigueWarningSystem' }],
  /* Bergabfahrhilfe kennt keines der Portale. "Hill Holder" ist die
     Berganfahrhilfe — ein anderes System. */
  bergab:            [null, null],
  berganfahrhilfe:   ['Hill Holder',                         { art: 'schalter', feld: 'hillStartAssist' }],
  notfallbremse_v:   ['Distance warning system',             { art: 'schalter', feld: 'distanceWarningSystem' }],

  /* Fahrerassistenz */
  tempomat:          ['Cruise control',                      { art: 'auswahl', feld: 'speedControl', wert: 'CRUISE_CONTROL' }],
  acc:               ['Adaptive Cruise Control',             { art: 'auswahl', feld: 'speedControl', wert: 'ADAPTIVE_CRUISE_CONTROL' }],
  verkehrszeichen:   ['Traffic sign recognition',            { art: 'schalter', feld: 'trafficSignRecognition' }],
  einparkassistent:  ['Parking assist system self-steering', { art: 'liste', feld: 'parkingAssistants', wert: 'AUTOMATIC_PARKING' }],
  /* Spurfuehrung waere dasselbe Feld wie Spurhalte — doppelt gefuehrt,
     getrennt nicht uebertragbar. */
  spurführung:       [null, null],
  fernlicht_auto:    ['High beam assist',                    { art: 'schalter', feld: 'highBeamAssist' }],
  nachtsicht:        ['Night view assist',                   { art: 'schalter', feld: 'nightVisionAssist' }],
  head_up:           ['Heads-up display',                    { art: 'schalter', feld: 'headUpDisplay' }],

  /* Komfort */
  klima:             ['Air conditioning',                    { art: 'auswahl', feld: 'climatisation', wert: 'MANUAL_CLIMATISATION' }],
  klima_auto:        ['Automatic climate control',           { art: 'auswahl', feld: 'climatisation', wert: 'AUTOMATIC_CLIMATISATION' }],
  klima_4zone:       ['Automatic climate control, 4 zones',  null],
  sitzheizung:       ['Seat heating',                        { art: 'schalter', feld: 'electricHeatedSeats' }],
  sitzlueftung:      ['Seat ventilation',                    { art: 'schalter', feld: 'ventilatedSeats' }],
  lenkradheizung:    ['Heated steering wheel',               { art: 'schalter', feld: 'heatedSteeringWheel' }],
  sitzmassage:       ['Massage seats',                       { art: 'schalter', feld: 'massageSeats' }],
  el_sitze:          ['Electrically adjustable seats',       { art: 'schalter', feld: 'electricAdjustableSeats' }],
  memory_sitze:      [null,                                  { art: 'schalter', feld: 'memorySeats' }],
  dach_panorama:     ['Panorama roof',                       { art: 'schalter', feld: 'panoramicGlassRoof' }],
  schiebedach:       ['Sunroof',                             { art: 'schalter', feld: 'sunroof' }],
  standheizung:      ['Auxiliary heating',                   { art: 'schalter', feld: 'auxiliaryHeating' }],
  standkuehlung:     [null,                                  { art: 'schalter', feld: 'secondaryAirConditioning' }],
  el_heckklappe:     ['Electric tailgate',                   { art: 'schalter', feld: 'electricTailgate' }],
  keyless:           ['Keyless central door lock',           { art: 'schalter', feld: 'keylessEntry' }],
  start_stop:        ['Start-stop system',                   { art: 'schalter', feld: 'startStopSystem' }],
  multilenk:         ['Multi-function steering wheel',       { art: 'schalter', feld: 'multifunctionalWheel' }],
  sprachsteuerung:   ['Voice Control',                       { art: 'schalter', feld: 'voiceControl' }],
  el_spiegel:        ['Electrical side mirrors',             { art: 'schalter', feld: 'electricExteriorMirrors' }],
  spiegel_abblend:   ['Automatically dimming interior mirror', { art: 'schalter', feld: 'dimmingInteriorMirror' }],
  ambientelicht:     ['Ambient lighting',                    { art: 'schalter', feld: 'ambientLighting' }],

  /* Infotainment */
  navi:              ['Navigation system',                   { art: 'schalter', feld: 'navigationSystem' }],
  navi_online:       [null, null],
  carplay:           ['Apple CarPlay',                       { art: 'schalter', feld: 'carplay' }],
  android_auto:      ['Android Auto',                        { art: 'schalter', feld: 'androidAuto' }],
  bluetooth:         ['Bluetooth',                           { art: 'schalter', feld: 'bluetooth' }],
  dab:               ['Digital radio',                       { art: 'liste', feld: 'radio', wert: 'DAB_RADIO' }],
  usb:               ['USB',                                 { art: 'schalter', feld: 'usb' }],
  wlan:              ['WLAN / WiFi hotspot',                 { art: 'schalter', feld: 'wifiHotspot' }],
  kabellos_laden:    ['Induction charging for smartphones',  { art: 'schalter', feld: 'wirelessCharging' }],
  soundsystem:       ['Sound system',                        { art: 'schalter', feld: 'soundSystem' }],
  touchscreen:       ['Touch screen',                        { art: 'schalter', feld: 'touchscreen' }],
  digital_cockpit:   ['Digital cockpit',                     { art: 'schalter', feld: 'digitalCockpit' }],
  connect:           [null, null],
  rear_entertainment:[null, null],

  /* Licht */
  led:               ['LED Headlights',                      { art: 'auswahl', feld: 'headlightType', wert: 'LED_HEADLIGHTS' }],
  xenon:             ['Xenon headlights',                    { art: 'auswahl', feld: 'headlightType', wert: 'XENON_HEADLIGHTS' }],
  matrix_led:        ['Laser headlights',                    null],
  tagfahrlicht:      ['LED Daytime Running Lights',          { art: 'auswahl', feld: 'daytimeRunningLamps', wert: 'LED_DAYTIME_RUNNING_LIGHTS' }],
  kurven_licht:      ['Adaptive headlights',                 null],
  led_rueck:         [null, null],
  licht_sensor:      ['Light sensor',                        { art: 'schalter', feld: 'lightSensor' }],
  nebellicht:        ['Fog lights',                          { art: 'schalter', feld: 'frontFogLights' }],

  /* Innenausstattung — Polsterung ist bei beiden ein eigenes Feld,
     kein Haekchen. Sie wird uebertragen, nur anders. */
  leder:             [null,                                  { art: 'auswahl', feld: 'interiorType', wert: 'LEATHER' }],
  kunstleder:        [null,                                  { art: 'auswahl', feld: 'interiorType', wert: 'PART_LEATHER' }],
  stoff:             [null,                                  { art: 'auswahl', feld: 'interiorType', wert: 'CLOTH' }],
  sitze_vorne_sport: ['Sport seats',                         { art: 'schalter', feld: 'sportSeats' }],
  /* Sitzzahl ist eine Zahl (`seats`), kein Merkmal. */
  sitze_7:           [null, null],
  sitze_6:           [null, null],
  sitze_5:           [null, null],
  holzdekor:         [null, null],
  aludekor:          [null, null],
  dachhimmel_schwarz:[null, null],
  fussmatten:        [null, null],

  /* Exterieur und Raeder — die Zollgroesse geht bei BEIDEN verloren.
     Wer 20 Zoll verkauft, muss es in die Beschreibung schreiben. */
  alu_17:            ['Alloy wheels',                        { art: 'schalter', feld: 'alloyWheels' }],
  alu_18:            ['Alloy wheels',                        { art: 'schalter', feld: 'alloyWheels' }],
  alu_19:            ['Alloy wheels',                        { art: 'schalter', feld: 'alloyWheels' }],
  alu_20:            ['Alloy wheels',                        { art: 'schalter', feld: 'alloyWheels' }],
  alu_21:            ['Alloy wheels',                        { art: 'schalter', feld: 'alloyWheels' }],
  winterraeder:      ['Winter tyres',                        { art: 'schalter', feld: 'winterTires' }],
  sportfahrwerk:     ['Sport suspension',                    { art: 'schalter', feld: 'performanceHandlingSystem' }],
  luftfederung:      ['Air suspension',                      { art: 'schalter', feld: 'airSuspension' }],
  anhaengerkupplung: ['Trailer hitch',                       { art: 'auswahl', feld: 'trailerCouplingType', wert: 'FIX' }],
  dachreling:        ['Roof rack',                           { art: 'schalter', feld: 'roofRails' }],
  spoiler:           ['Spoiler',                             null],
  metallic:          [null,                                  { art: 'schalter', feld: 'metallic' }],
  zweifarb:          [null, null],
  tiefformat_reifen: ['Emergency tyre repair kit',           null],

  /* Antrieb, Getriebe, Kraftstoff sind eigene Felder, keine Merkmale. */
  allrad:            [null, null],
  hinterrad:         [null, null],
  frontantrieb:      [null, null],
  automatik:         [null, null],
  schaltgetriebe:    [null, null],
  mild_hybrid:       [null, null],
  vollhybrid:        [null, null],
  plug_in_hybrid:    [null, null],
  elektro:           [null, null],

  /* Zustand */
  scheckh:           [null,                                  { art: 'schalter', feld: 'fullServiceHistory' }],
  neuwertig:         [null, null],
  garantie:          [null,                                  { art: 'schalter', feld: 'warranty' }],
};

/* ── Pruefen, bevor irgendetwas geschrieben wird ─────────────────── */

const fehler = [];

const bekannteIds = new Set(merkmale.map(m => m.id));
for (const id of Object.keys(Z)) {
  if (!bekannteIds.has(id)) fehler.push(`Kennung "${id}" gibt es in equipmentDatabase.ts nicht`);
}
for (const m of merkmale) {
  if (!(m.id in Z)) fehler.push(`Merkmal "${m.id}" (${m.label}) hat keine Zuordnung`);
}

const nachName = new Map(as24Liste.map(a => [a.name, a.id]));
for (const [id, [as24Name]] of Object.entries(Z)) {
  if (as24Name && !nachName.has(as24Name)) {
    fehler.push(`AutoScout24 kennt "${as24Name}" nicht (bei ${id})`);
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
  const as24 = as24Name ? `as24: ${q(nachName.get(as24Name))}, /* ${as24Name} */` : '';
  const mobile = mob
    ? `mobile: { art: ${q(mob.art)}, feld: ${q(mob.feld)}${mob.wert ? `, wert: ${q(mob.wert)}` : ''} },`
    : '';
  const teile = [as24, mobile].filter(Boolean);
  return `  /* ${m.label} */\n  { id: ${q(m.id)},${teile.length ? '\n    ' + teile.join('\n    ') : ''} },`;
});

const ohneBeide = merkmale.filter(m => !Z[m.id][0] && !Z[m.id][1]);
const nurAs24 = merkmale.filter(m => Z[m.id][0] && !Z[m.id][1]);
const nurMobile = merkmale.filter(m => !Z[m.id][0] && Z[m.id][1]);

const datei = `/**
 * Wohin jedes Ausstattungsmerkmal bei den Portalen gehoert.
 *
 * NICHT VON HAND AENDERN — erzeugt von ausstattung-zuordnen.mjs.
 * Stand: ${new Date().toISOString().slice(0, 10)}
 *
 * Die beiden Portale loesen dasselbe verschieden:
 *
 *   AutoScout24  eine Liste "Equipment" mit ${as24Liste.length} Kennungen
 *   mobile.de    fuer fast jedes Merkmal ein EIGENES FELD im Inserat
 *
 * ${merkmale.length} Merkmale insgesamt.
 * ${nurAs24.length} nur bei AutoScout24, ${nurMobile.length} nur bei mobile.de.
 * ${ohneBeide.length} bei keinem von beiden — die koennen nur in die freie
 * Beschreibung, und die Oberflaeche sollte das sagen, statt den
 * Haendler ein Haekchen setzen zu lassen, das nirgends ankommt.
 */

export type MobileZiel =
  /** Eigenes Ja/Nein-Feld: { abs: true } */
  | { art: 'schalter'; feld: string }
  /** Ein Wert in einer Liste: parkingAssistants: ['REAR_SENSORS'] */
  | { art: 'liste'; feld: string; wert: string }
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
 * Merkmale, die bei KEINEM Portal ankommen.
 *
 * Nicht dasselbe wie "unwichtig": Dachhimmel, Dekore und die
 * Zollgroesse der Felgen interessieren Kaeufer sehr wohl. Sie gehoeren
 * nur in den Beschreibungstext statt in ein Haekchen.
 */
export function nurBeschreibung(id: string): boolean {
  const z = NACH_ID.get(id);
  return !!z && !z.as24 && !z.mobile;
}
`;

writeFileSync(new URL('./lib/ausstattungPortale.ts', import.meta.url), datei, 'utf8');

console.log(`Geschrieben: lib/ausstattungPortale.ts`);
console.log(`${merkmale.length} Merkmale geprueft, keine erfundene Kennung.\n`);
console.log(`Bei KEINEM Portal (${ohneBeide.length}):`);
ohneBeide.forEach(m => console.log('  ' + m.label));
console.log(`\nNur AutoScout24 (${nurAs24.length}): ` + nurAs24.map(m => m.label).join(', '));
console.log(`Nur mobile.de (${nurMobile.length}): ` + nurMobile.map(m => m.label).join(', '));
process.exit(0);
