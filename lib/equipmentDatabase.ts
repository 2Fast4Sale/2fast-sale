/**
 * Standardisierte Fahrzeug-Ausstattungsdatenbank
 * Bezeichnungen entsprechen mobile.de / AutoScout24 / Hersteller-Standard
 * Kostenlos, lokal — keine API nötig.
 */

export interface EquipmentCategory {
  label: string;
  icon: string;
  items: EquipmentItem[];
}

export interface EquipmentItem {
  id: string;      // Interner Key (eindeutig)
  label: string;   // Standardbezeichnung (wie auf Portalen)
  aliases: string[]; // Alternative Bezeichnungen zum Normalisieren
}

export const EQUIPMENT_DB: EquipmentCategory[] = [
  {
    label: 'Sicherheit',
    icon: '🛡️',
    items: [
      { id: 'abs',              label: 'ABS',                                    aliases: ['antiblockiersystem', 'anti-lock', 'abs (antiblockiersystem)'] },
      { id: 'esp',              label: 'ESP',                                    aliases: ['elektronisches stabilitätsprogramm', 'stability control', 'esc', 'vsc', 'dsc', 'esp (elektronisches stabilitätsprogramm)'] },
      { id: 'airbag_fahrer',    label: 'Fahrerairbag',                           aliases: ['fahrer-airbag', 'driver airbag'] },
      { id: 'airbag_beifahrer', label: 'Beifahrerairbag',                        aliases: ['beifahrer-airbag', 'passenger airbag'] },
      { id: 'airbag_seite',     label: 'Seitenairbags',                          aliases: ['seiten-airbag', 'side airbag', 'seitenairbag'] },
      { id: 'airbag_kopf',      label: 'Kopfairbags',                            aliases: ['kopf-airbag', 'curtain airbag', 'vorhangairbag', 'head airbag', 'window airbag'] },
      { id: 'airbag_knie',      label: 'Knieairbags',                            aliases: ['knie-airbag', 'knee airbag'] },
      { id: 'isofix',           label: 'ISOFIX',                                 aliases: ['iso-fix', 'kindersitz-befestigung'] },
      { id: 'reifendruck',      label: 'Reifendruckkontrolle',                   aliases: ['rdks', 'rdcs', 'tpms', 'reifendruck-kontrollsystem', 'tyre pressure'] },
      { id: 'einparkhilfe_h',   label: 'Einparkhilfe hinten',                    aliases: ['pdc hinten', 'parktronic hinten', 'parking sensor rear', 'rear pdc'] },
      { id: 'einparkhilfe_v',   label: 'Einparkhilfe vorne',                     aliases: ['pdc vorne', 'parktronic vorne', 'parking sensor front', 'front pdc'] },
      { id: 'einparkhilfe_360', label: 'Einparkhilfe vorne & hinten',            aliases: ['pdc vorne und hinten', 'allround pdc', '360 pdc'] },
      { id: 'rueckfahrkamera',  label: 'Rückfahrkamera',                         aliases: ['rückfahrvideokamera', 'backup camera', 'rear camera', 'einparkkamera hinten'] },
      { id: 'kamera_360',       label: '360°-Kamera',                            aliases: ['surround view', 'bird eye view', 'umgebungskamera', '360 grad kamera'] },
      { id: 'notbremse',        label: 'Notbremsassistent',                      aliases: ['automatische notbremsung', 'aeb', 'pre-safe', 'pre-crash', 'autonomous emergency braking', 'city notbremse'] },
      { id: 'spurhalte',        label: 'Spurhalteassistent',                     aliases: ['lane assist', 'lane keeping', 'spurhalte-assistent', 'lka', 'lane departure warning'] },
      { id: 'totwinkel',        label: 'Totwinkel-Assistent',                    aliases: ['blind spot', 'side assist', 'totwinkelwarner', 'spurwechselassistent'] },
      { id: 'muedigkeits',      label: 'Müdigkeitswarner',                       aliases: ['attention assist', 'driver alert', 'drowsiness detection', 'fahrermüdigkeit'] },
      { id: 'bergab',           label: 'Bergabfahrhilfe',                        aliases: ['hill descent control', 'hdc', 'bergabfahrt-assistent', 'hill start assist'] },
      { id: 'berganfahrhilfe',  label: 'Berganfahrhilfe',                        aliases: ['hill hold', 'hill start control', 'berganfahr-assistent'] },
      { id: 'notfallbremse_v',  label: 'Kollisionswarner',                       aliases: ['forward collision warning', 'frontkollisionswarner', 'pre-collision', 'forward alert'] },
    ],
  },
  {
    label: 'Fahrerassistenz',
    icon: '🤖',
    items: [
      { id: 'tempomat',         label: 'Tempomat',                               aliases: ['cruise control', 'geschwindigkeitsregler', 'fahrgeschwindigkeitsregler'] },
      { id: 'acc',              label: 'Adaptiver Tempomat (ACC)',                aliases: ['adaptive cruise control', 'abstandstempomat', 'distronic', 'radar-tempomat', 'abstandsregler'] },
      { id: 'verkehrszeichen',  label: 'Verkehrszeichenerkennung',                aliases: ['traffic sign recognition', 'speed sign recognition', 'strassenschilderkennung'] },
      { id: 'einparkassistent', label: 'Einparkassistent',                       aliases: ['park assist', 'active parking', 'automatisch einparken', 'parkpilot', 'einpark-assistent'] },
      { id: 'spurführung',      label: 'Spurführungsassistent',                  aliases: ['lane centering', 'lenkassistent', 'steering assist', 'active lane keep'] },
      { id: 'fernlicht_auto',   label: 'Fernlichtassistent',                     aliases: ['automatic high beam', 'high beam assist', 'fernlicht-assistent', 'auto-fernlicht'] },
      { id: 'nachtsicht',       label: 'Nachtsichtkamera',                       aliases: ['night vision', 'nacht-vision', 'nightview'] },
      { id: 'head_up',          label: 'Head-up Display',                        aliases: ['head up display', 'hud', 'windschutzscheibenanzeige', 'head-up-display'] },
    ],
  },
  {
    label: 'Komfort',
    icon: '✨',
    items: [
      { id: 'klima',            label: 'Klimaanlage',                            aliases: ['klimaautomatik manuell', 'air conditioning', 'ac', 'a/c'] },
      { id: 'klima_auto',       label: 'Klimaautomatik',                         aliases: ['automatic climate control', 'dual zone', 'climatronic', 'airmatic', '2-zonen-klimaautomatik', 'einzonen-klimaautomatik', 'dreizonen klimaautomatik'] },
      { id: 'klima_4zone',      label: 'Vierzonen-Klimaautomatik',               aliases: ['4-zone climate', '4-zonen-klimaautomatik', 'quad zone'] },
      { id: 'sitzheizung',      label: 'Sitzheizung',                            aliases: ['heated seats', 'beheizbare sitze', 'seat heating', 'sitze beheizt'] },
      { id: 'sitzlueftung',     label: 'Sitzbelüftung',                          aliases: ['ventilated seats', 'belüftete sitze', 'seat ventilation', 'sitzkühlung'] },
      { id: 'lenkradheizung',   label: 'Lenkradheizung',                         aliases: ['heated steering wheel', 'beheizbares lenkrad', 'lenkrad heizung'] },
      { id: 'sitzmassage',      label: 'Sitz-Massage',                           aliases: ['massage seats', 'massagefunktion', 'seat massage'] },
      { id: 'el_sitze',         label: 'Elektrisch verstellbare Sitze',          aliases: ['electric seats', 'elektrisch verstellbare sitze', 'power seats', 'memory sitze'] },
      { id: 'memory_sitze',     label: 'Sitz-Memory',                            aliases: ['seat memory', 'memory funktion sitze', 'fahrerprofil'] },
      { id: 'dach_panorama',    label: 'Panoramadach',                           aliases: ['panorama sunroof', 'panorama-dach', 'glasdach', 'panoramadach schiebedach', 'panoramic roof'] },
      { id: 'schiebedach',      label: 'Schiebedach',                            aliases: ['sunroof', 'glasdach elektrisch', 'öffnungsfähiges schiebe-/ausstelldach'] },
      { id: 'standheizung',     label: 'Standheizung',                           aliases: ['parking heater', 'webasto', 'standheizung elektrisch'] },
      { id: 'standkuehlung',    label: 'Standklimatisierung',                    aliases: ['parking cooling', 'stand-klimatisierung'] },
      { id: 'el_heckklappe',    label: 'Elektrische Heckklappe',                 aliases: ['power tailgate', 'elektrisch heckklappe', 'hands free tailgate', 'easy open', 'power liftgate'] },
      { id: 'keyless',          label: 'Keyless Entry',                          aliases: ['schlüsselloses öffnen', 'comfort access', 'kessy', 'passive entry', 'keyless go', 'keyless start'] },
      { id: 'start_stop',       label: 'Start-Stopp-Automatik',                  aliases: ['start stop system', 'auto start stop', 'eco start stop', 'start/stop-automatik'] },
      { id: 'multilenk',        label: 'Multifunktionslenkrad',                  aliases: ['multifunctional steering wheel', 'lenkrad mit bedienelementen', 'bedienelemente am lenkrad'] },
      { id: 'sprachsteuerung',  label: 'Sprachsteuerung',                        aliases: ['voice control', 'voice command', 'sprachbedienung'] },
      { id: 'el_spiegel',       label: 'Elektrisch einstell- und klappbare Außenspiegel', aliases: ['electric mirrors', 'elektrische spiegel', 'el. spiegel', 'auto dimming mirror'] },
      { id: 'spiegel_abblend',  label: 'Automatisch abblendende Spiegel',        aliases: ['auto dimming', 'selbstabblendend', 'innen/außenspiegel abblendend'] },
      { id: 'ambientelicht',    label: 'Ambientebeleuchtung',                    aliases: ['ambient light', 'innenbeleuchtung', 'ambiente-beleuchtung', 'interior lighting'] },
    ],
  },
  {
    label: 'Infotainment & Navigation',
    icon: '📱',
    items: [
      { id: 'navi',             label: 'Navigationssystem',                      aliases: ['navigation', 'navi', 'gps', 'sat nav', 'festeingebautes navigationssystem'] },
      { id: 'navi_online',      label: 'Online-Navigation',                      aliases: ['online navi', 'connected navigation', 'live traffic', 'echtzeit-navigation'] },
      { id: 'carplay',          label: 'Apple CarPlay',                          aliases: ['carplay', 'apple car play', 'ios integration'] },
      { id: 'android_auto',     label: 'Android Auto',                           aliases: ['android auto', 'android integration'] },
      { id: 'bluetooth',        label: 'Bluetooth',                              aliases: ['bluetooth freisprechanlage', 'bluetooth audio', 'hands free bluetooth'] },
      { id: 'dab',              label: 'DAB+ Digitalradio',                      aliases: ['digital radio', 'dab radio', 'dab+', 'digitalradio'] },
      { id: 'usb',              label: 'USB-Anschluss',                          aliases: ['usb port', 'usb anschluss', 'usb connection', 'usb-c'] },
      { id: 'wlan',             label: 'WLAN / WiFi Hotspot',                    aliases: ['wifi hotspot', 'wlan hotspot', 'internet', 'wireless lan', 'lte hotspot'] },
      { id: 'kabellos_laden',   label: 'Kabelloses Laden',                       aliases: ['wireless charging', 'qi charging', 'induktives laden', 'inductive charging'] },
      { id: 'soundsystem',      label: 'Premium-Soundsystem',                    aliases: ['bose', 'harman kardon', 'jbl', 'burmester', 'bang olufsen', 'meridian', 'dynaudio', 'premium sound', 'surround sound', 'high end sound'] },
      { id: 'touchscreen',      label: 'Touchscreen',                            aliases: ['touch display', 'touchscreen navi', 'infotainment touchscreen'] },
      { id: 'digital_cockpit',  label: 'Digitales Cockpit',                      aliases: ['digital instrument cluster', 'virtual cockpit', 'digitales kombiinstrument', 'TFT display', 'full digital display'] },
      { id: 'connect',          label: 'Connected Services / App Connect',       aliases: ['connected car', 'onstar', 'bmw connected', 'mercedes me', 'myskoda', 'remote app', 'smartphone integration'] },
      { id: 'rear_entertainment',label: 'Fond-Entertainment-System',             aliases: ['rear screen', 'rear entertainment', 'fond bildschirm', 'backseat entertainment'] },
    ],
  },
  {
    label: 'Licht',
    icon: '💡',
    items: [
      { id: 'led',              label: 'LED-Scheinwerfer',                       aliases: ['led headlights', 'led licht', 'led front', 'led scheinwerfer'] },
      { id: 'xenon',            label: 'Xenon-Scheinwerfer',                     aliases: ['xenon', 'bi-xenon', 'hid', 'xenon headlights', 'halogen xenon'] },
      { id: 'matrix_led',       label: 'Matrix-LED / Laser-Scheinwerfer',        aliases: ['matrix led', 'laserlight', 'laser', 'iq light', 'digital light', 'adaptive matrix beam'] },
      { id: 'tagfahrlicht',     label: 'LED-Tagfahrlicht',                       aliases: ['drl', 'daytime running lights', 'tagfahrleuchten', 'led drl'] },
      { id: 'kurven_licht',     label: 'Kurvenlicht / adaptives Licht',          aliases: ['cornering light', 'adaptive headlights', 'aflicht', 'swivelling headlights', 'dynamic light'] },
      { id: 'led_rueck',        label: 'LED-Rückleuchten',                       aliases: ['led tail lights', 'led rear lights', 'led heck'] },
      { id: 'licht_sensor',     label: 'Lichtsensor',                            aliases: ['automatic lights', 'light sensor', 'automatisches licht', 'regensensor und lichtsensor'] },
      { id: 'nebellicht',       label: 'Nebelscheinwerfer',                      aliases: ['fog lights', 'nebelleuchten', 'fog lamp'] },
    ],
  },
  {
    label: 'Innenausstattung',
    icon: '🪑',
    items: [
      { id: 'leder',            label: 'Lederausstattung',                       aliases: ['leather interior', 'ledersitze', 'vollleder', 'teilleder', 'nappa leder', 'leder sitze'] },
      { id: 'kunstleder',       label: 'Kunstleder / Alcantara',                 aliases: ['alcantara', 'kunstleder', 'mikrofaser', 'sensatec', 'artico', 'leatherette'] },
      { id: 'stoff',            label: 'Stoffausstattung',                       aliases: ['fabric', 'stoff sitze', 'textile', 'velours'] },
      { id: 'sitze_vorne_sport', label: 'Sportsitze',                            aliases: ['sport seats', 'recaro', 'sportsitz', 'sport-sitze', 'schalensitze'] },
      { id: 'sitze_7',          label: '7 Sitze',                                aliases: ['7-sitzer', '7 sitzplätze', 'third row', 'sieben sitze', '7 seats'] },
      { id: 'sitze_6',          label: '6 Sitze',                                aliases: ['6-sitzer', '6 sitzplätze', 'sechs sitze'] },
      { id: 'sitze_5',          label: '5 Sitze',                                aliases: ['5-sitzer', '5 sitzplätze', '5 seats', 'fünf sitze'] },
      { id: 'holzdekor',        label: 'Holzdekor',                              aliases: ['wood trim', 'holzeinlagen', 'edelholz', 'walnut trim'] },
      { id: 'aludekor',         label: 'Aluminiumdekor',                         aliases: ['aluminium trim', 'alu dekor', 'brushed aluminium', 'carbon dekor'] },
      { id: 'dachhimmel_schwarz', label: 'Dachhimmel schwarz',                   aliases: ['black headliner', 'schwarzer dachhimmel', 'dark headliner'] },
      { id: 'fussmatten',       label: 'Veloursfußmatten',                       aliases: ['floor mats', 'fußmatten', 'velour mats'] },
    ],
  },
  {
    label: 'Exterieur & Räder',
    icon: '🚗',
    items: [
      { id: 'alu_17',           label: '17-Zoll-Leichtmetallfelgen',             aliases: ['17 zoll alufelgen', '17" alloy wheels', '17 alu'] },
      { id: 'alu_18',           label: '18-Zoll-Leichtmetallfelgen',             aliases: ['18 zoll alufelgen', '18" alloy wheels', '18 alu'] },
      { id: 'alu_19',           label: '19-Zoll-Leichtmetallfelgen',             aliases: ['19 zoll alufelgen', '19" alloy wheels', '19 alu'] },
      { id: 'alu_20',           label: '20-Zoll-Leichtmetallfelgen',             aliases: ['20 zoll alufelgen', '20" alloy wheels', '20 alu'] },
      { id: 'alu_21',           label: '21-Zoll-Leichtmetallfelgen',             aliases: ['21 zoll alufelgen', '21" alloy wheels', '21 alu'] },
      { id: 'winterraeder',     label: 'Winterräder inklusive',                  aliases: ['winter wheels', 'winter reifen', 'winterreifen vorhanden', 'complete winter wheels'] },
      { id: 'sportfahrwerk',    label: 'Sportfahrwerk',                          aliases: ['sport suspension', 'tiefergelegt', 'sport chassis', 'lowered'] },
      { id: 'luftfederung',     label: 'Luftfederung',                           aliases: ['air suspension', 'airmatic', 'pneumatik', 'adaptives fahrwerk', 'adaptive chassis'] },
      { id: 'anhaengerkupplung', label: 'Anhängerkupplung',                      aliases: ['tow bar', 'anhängevorrichtung', 'ahk', 'towing hitch', 'trailer hitch', 'abnehmbare ahk'] },
      { id: 'dachreling',       label: 'Dachreling',                             aliases: ['roof rails', 'dachträgervorbereitung', 'aluminium dachträger'] },
      { id: 'spoiler',          label: 'Spoiler',                                aliases: ['rear spoiler', 'heckspoiler', 'front spoiler'] },
      { id: 'metallic',         label: 'Metallic-Lackierung',                    aliases: ['metallic paint', 'metallic farbe', 'metallic lackierung'] },
      { id: 'zweifarb',         label: 'Zweifarbige Lackierung',                 aliases: ['bicolor', 'two tone', 'kontrast dach', 'dach in kontrastfarbe'] },
      { id: 'tiefformat_reifen', label: 'Notrad / Reifenreparaturset',           aliases: ['spare wheel', 'notrad', 'runflat', 'run-flat reifen', 'repair kit'] },
    ],
  },
  {
    label: 'Antrieb & Technik',
    icon: '⚙️',
    items: [
      { id: 'allrad',           label: 'Allradantrieb',                          aliases: ['4wd', 'awd', '4x4', 'quattro', 'xdrive', '4motion', 'syncro', 'all wheel drive', 'allrad-antrieb', 'permanentallrad'] },
      { id: 'hinterrad',        label: 'Hinterradantrieb',                       aliases: ['rear wheel drive', 'rwd', 'hinterrad-antrieb'] },
      { id: 'frontantrieb',     label: 'Frontantrieb',                           aliases: ['front wheel drive', 'fwd', 'frontrad'] },
      { id: 'automatik',        label: 'Automatikgetriebe',                      aliases: ['automatic transmission', 'dsg', 'tiptronic', 'automat', 'automatic', 'pdk', 's tronic', '7-gang-dsg', '8-gang-automatik'] },
      { id: 'schaltgetriebe',   label: 'Schaltgetriebe',                         aliases: ['manual transmission', 'manual gearbox', 'handschalter', '6-gang', '5-gang', 'manuell'] },
      { id: 'mild_hybrid',      label: 'Mild-Hybrid',                            aliases: ['mhev', '48v', '48 volt', 'mild hybrid system', 'riemen-starter-generator'] },
      { id: 'vollhybrid',       label: 'Vollhybrid (HEV)',                       aliases: ['full hybrid', 'hev', 'self-charging hybrid', 'hybrid antrieb'] },
      { id: 'plug_in_hybrid',   label: 'Plug-in-Hybrid (PHEV)',                  aliases: ['phev', 'plug in hybrid', 'ladekabel', 'extern aufladbar', 'ehybrid'] },
      { id: 'elektro',          label: 'Elektroantrieb (BEV)',                   aliases: ['electric', 'bev', 'elektro motor', 'vollelektrisch', 'ev'] },
      { id: 'scheckh',          label: 'Scheckheftgepflegt',                     aliases: ['service history', 'wartungsbuch', 'full service history', 'shp', 'gepflegte servicehistorie'] },
      { id: 'neuwertig',        label: 'Neuwertig / 1. Hand',                    aliases: ['1 hand', 'erstbesitzer', 'one owner', 'first owner', 'ersthand'] },
      { id: 'garantie',         label: 'Herstellergarantie',                     aliases: ['manufacturer warranty', 'garantie vorhanden', 'fabriksgarantie', 'restgarantie'] },
    ],
  },
];

/** Alle Ausstattungsitems als flache Liste */
export const ALL_EQUIPMENT: EquipmentItem[] = EQUIPMENT_DB.flatMap(cat => cat.items);

/**
 * Normalisiert einen Ausstattungsnamen auf den Standardterm.
 * Gibt den Standardlabel zurück, oder den Original-String falls kein Match.
 */
export function normalizeEquipment(raw: string): string {
  const q = raw.toLowerCase().trim();
  for (const item of ALL_EQUIPMENT) {
    if (item.label.toLowerCase() === q) return item.label;
    if (item.aliases.some(a => a.toLowerCase() === q || q.includes(a.toLowerCase()) || a.toLowerCase().includes(q))) {
      return item.label;
    }
  }
  return raw; // Kein Match → Original behalten
}

/**
 * Normalisiert eine Liste von Ausstattungen und entfernt Duplikate.
 */
export function normalizeEquipmentList(rawList: string[]): string[] {
  const normalized = rawList.map(normalizeEquipment);
  return [...new Set(normalized)];
}

/**
 * Suche in der Datenbank
 */
export function searchEquipment(query: string): EquipmentItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_EQUIPMENT;
  return ALL_EQUIPMENT.filter(
    item =>
      item.label.toLowerCase().includes(q) ||
      item.aliases.some(a => a.toLowerCase().includes(q))
  );
}
