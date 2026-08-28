/**
 * Wohin jedes Ausstattungsmerkmal bei den Portalen gehoert.
 *
 * NICHT VON HAND AENDERN — erzeugt von ausstattung-zuordnen.mjs.
 * Stand: 2026-08-28
 *
 * Die beiden Portale loesen dasselbe verschieden:
 *
 *   AutoScout24  eine Liste "Equipment" mit 131 Kennungen
 *   mobile.de    fuer fast jedes Merkmal ein EIGENES FELD im Inserat
 *
 * 109 Merkmale insgesamt.
 * 5 nur bei AutoScout24, 8 nur bei mobile.de.
 * 25 bei keinem von beiden — die koennen nur in die freie
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
  /* ABS */
  { id: 'abs',
    as24: '1', /* ABS */
    mobile: { art: 'schalter', feld: 'abs' }, },
  /* ESP */
  { id: 'esp',
    as24: '42', /* Electronic stability control */
    mobile: { art: 'schalter', feld: 'esp' }, },
  /* Fahrerairbag */
  { id: 'airbag_fahrer',
    as24: '2', /* Driver-side airbag */
    mobile: { art: 'auswahl', feld: 'airbag', wert: 'DRIVER_AIRBAG' }, },
  /* Beifahrerairbag */
  { id: 'airbag_beifahrer',
    as24: '3', /* Passenger-side airbag */
    mobile: { art: 'auswahl', feld: 'airbag', wert: 'DRIVER_AND_PASSENGER_AIRBAG' }, },
  /* Seitenairbags */
  { id: 'airbag_seite',
    as24: '32', /* Side airbag */
    mobile: { art: 'auswahl', feld: 'airbag', wert: 'FRONT_AND_SIDE_AIRBAGS' }, },
  /* Kopfairbags */
  { id: 'airbag_kopf',
    as24: '46', /* Head airbag */
    mobile: { art: 'auswahl', feld: 'airbag', wert: 'FRONT_AND_SIDE_AND_MORE_AIRBAGS' }, },
  /* Knieairbags */
  { id: 'airbag_knie', },
  /* ISOFIX */
  { id: 'isofix',
    as24: '125', /* Isofix */
    mobile: { art: 'schalter', feld: 'isofix' }, },
  /* Reifendruckkontrolle */
  { id: 'reifendruck',
    as24: '150', /* Tire pressure monitoring system */
    mobile: { art: 'schalter', feld: 'tirePressureMonitoring' }, },
  /* Einparkhilfe hinten */
  { id: 'einparkhilfe_h',
    as24: '129', /* Parking assist system sensors rear */
    mobile: { art: 'liste', feld: 'parkingAssistants', wert: 'REAR_SENSORS' }, },
  /* Einparkhilfe vorne */
  { id: 'einparkhilfe_v',
    as24: '128', /* Parking assist system sensors front */
    mobile: { art: 'liste', feld: 'parkingAssistants', wert: 'FRONT_SENSORS' }, },
  /* Einparkhilfe vorne & hinten */
  { id: 'einparkhilfe_360',
    as24: '128', /* Parking assist system sensors front */
    mobile: { art: 'liste', feld: 'parkingAssistants', wert: 'FRONT_AND_REAR_SENSORS' }, },
  /* Rückfahrkamera */
  { id: 'rueckfahrkamera',
    as24: '130', /* Parking assist system camera */
    mobile: { art: 'liste', feld: 'parkingAssistants', wert: 'REAR_VIEW_CAM' }, },
  /* 360°-Kamera */
  { id: 'kamera_360',
    as24: '187', /* 360° camera */
    mobile: { art: 'liste', feld: 'parkingAssistants', wert: 'CAM_360_DEGREES' }, },
  /* Notbremsassistent */
  { id: 'notbremse',
    as24: '148', /* Emergency brake assistant */
    mobile: { art: 'schalter', feld: 'collisionAvoidance' }, },
  /* Spurhalteassistent */
  { id: 'spurhalte',
    as24: '157', /* Lane departure warning system */
    mobile: { art: 'schalter', feld: 'laneDepartureWarning' }, },
  /* Totwinkel-Assistent */
  { id: 'totwinkel',
    as24: '158', /* Blind spot monitor */
    mobile: { art: 'schalter', feld: 'blindSpotMonitor' }, },
  /* Müdigkeitswarner */
  { id: 'muedigkeits',
    as24: '146', /* Driver drowsiness detection */
    mobile: { art: 'schalter', feld: 'fatigueWarningSystem' }, },
  /* Bergabfahrhilfe */
  { id: 'bergab', },
  /* Berganfahrhilfe */
  { id: 'berganfahrhilfe',
    as24: '137', /* Hill Holder */
    mobile: { art: 'schalter', feld: 'hillStartAssist' }, },
  /* Kollisionswarner */
  { id: 'notfallbremse_v',
    as24: '232', /* Distance warning system */
    mobile: { art: 'schalter', feld: 'distanceWarningSystem' }, },
  /* Tempomat */
  { id: 'tempomat',
    as24: '38', /* Cruise control */
    mobile: { art: 'auswahl', feld: 'speedControl', wert: 'CRUISE_CONTROL' }, },
  /* Adaptiver Tempomat (ACC) */
  { id: 'acc',
    as24: '133', /* Adaptive Cruise Control */
    mobile: { art: 'auswahl', feld: 'speedControl', wert: 'ADAPTIVE_CRUISE_CONTROL' }, },
  /* Verkehrszeichenerkennung */
  { id: 'verkehrszeichen',
    as24: '162', /* Traffic sign recognition */
    mobile: { art: 'schalter', feld: 'trafficSignRecognition' }, },
  /* Einparkassistent */
  { id: 'einparkassistent',
    as24: '131', /* Parking assist system self-steering */
    mobile: { art: 'liste', feld: 'parkingAssistants', wert: 'AUTOMATIC_PARKING' }, },
  /* Spurführungsassistent */
  { id: 'spurführung', },
  /* Fernlichtassistent */
  { id: 'fernlicht_auto',
    as24: '189', /* High beam assist */
    mobile: { art: 'schalter', feld: 'highBeamAssist' }, },
  /* Nachtsichtkamera */
  { id: 'nachtsicht',
    as24: '147', /* Night view assist */
    mobile: { art: 'schalter', feld: 'nightVisionAssist' }, },
  /* Head-up Display */
  { id: 'head_up',
    as24: '123', /* Heads-up display */
    mobile: { art: 'schalter', feld: 'headUpDisplay' }, },
  /* Klimaanlage */
  { id: 'klima',
    as24: '5', /* Air conditioning */
    mobile: { art: 'auswahl', feld: 'climatisation', wert: 'MANUAL_CLIMATISATION' }, },
  /* Klimaautomatik */
  { id: 'klima_auto',
    as24: '30', /* Automatic climate control */
    mobile: { art: 'auswahl', feld: 'climatisation', wert: 'AUTOMATIC_CLIMATISATION' }, },
  /* Vierzonen-Klimaautomatik */
  { id: 'klima_4zone',
    as24: '243', /* Automatic climate control, 4 zones */ },
  /* Sitzheizung */
  { id: 'sitzheizung',
    as24: '34', /* Seat heating */
    mobile: { art: 'schalter', feld: 'electricHeatedSeats' }, },
  /* Sitzbelüftung */
  { id: 'sitzlueftung',
    as24: '154', /* Seat ventilation */
    mobile: { art: 'schalter', feld: 'ventilatedSeats' }, },
  /* Lenkradheizung */
  { id: 'lenkradheizung',
    as24: '136', /* Heated steering wheel */
    mobile: { art: 'schalter', feld: 'heatedSteeringWheel' }, },
  /* Sitz-Massage */
  { id: 'sitzmassage',
    as24: '145', /* Massage seats */
    mobile: { art: 'schalter', feld: 'massageSeats' }, },
  /* Elektrisch verstellbare Sitze */
  { id: 'el_sitze',
    as24: '16', /* Electrically adjustable seats */
    mobile: { art: 'schalter', feld: 'electricAdjustableSeats' }, },
  /* Sitz-Memory */
  { id: 'memory_sitze',
    mobile: { art: 'schalter', feld: 'memorySeats' }, },
  /* Panoramadach */
  { id: 'dach_panorama',
    as24: '50', /* Panorama roof */
    mobile: { art: 'schalter', feld: 'panoramicGlassRoof' }, },
  /* Schiebedach */
  { id: 'schiebedach',
    as24: '4', /* Sunroof */
    mobile: { art: 'schalter', feld: 'sunroof' }, },
  /* Standheizung */
  { id: 'standheizung',
    as24: '52', /* Auxiliary heating */
    mobile: { art: 'schalter', feld: 'auxiliaryHeating' }, },
  /* Standklimatisierung */
  { id: 'standkuehlung',
    mobile: { art: 'schalter', feld: 'secondaryAirConditioning' }, },
  /* Elektrische Heckklappe */
  { id: 'el_heckklappe',
    as24: '139', /* Electric tailgate */
    mobile: { art: 'schalter', feld: 'electricTailgate' }, },
  /* Keyless Entry */
  { id: 'keyless',
    as24: '153', /* Keyless central door lock */
    mobile: { art: 'schalter', feld: 'keylessEntry' }, },
  /* Start-Stopp-Automatik */
  { id: 'start_stop',
    as24: '113', /* Start-stop system */
    mobile: { art: 'schalter', feld: 'startStopSystem' }, },
  /* Multifunktionslenkrad */
  { id: 'multilenk',
    as24: '114', /* Multi-function steering wheel */
    mobile: { art: 'schalter', feld: 'multifunctionalWheel' }, },
  /* Sprachsteuerung */
  { id: 'sprachsteuerung',
    as24: '156', /* Voice Control */
    mobile: { art: 'schalter', feld: 'voiceControl' }, },
  /* Elektrisch einstell- und klappbare Außenspiegel */
  { id: 'el_spiegel',
    as24: '121', /* Electrical side mirrors */
    mobile: { art: 'schalter', feld: 'electricExteriorMirrors' }, },
  /* Automatisch abblendende Spiegel */
  { id: 'spiegel_abblend',
    as24: '225', /* Automatically dimming interior mirror */
    mobile: { art: 'schalter', feld: 'dimmingInteriorMirror' }, },
  /* Ambientebeleuchtung */
  { id: 'ambientelicht',
    as24: '219', /* Ambient lighting */
    mobile: { art: 'schalter', feld: 'ambientLighting' }, },
  /* Navigationssystem */
  { id: 'navi',
    as24: '23', /* Navigation system */
    mobile: { art: 'schalter', feld: 'navigationSystem' }, },
  /* Online-Navigation */
  { id: 'navi_online', },
  /* Apple CarPlay */
  { id: 'carplay',
    as24: '221', /* Apple CarPlay */
    mobile: { art: 'schalter', feld: 'carplay' }, },
  /* Android Auto */
  { id: 'android_auto',
    as24: '222', /* Android Auto */
    mobile: { art: 'schalter', feld: 'androidAuto' }, },
  /* Bluetooth */
  { id: 'bluetooth',
    as24: '122', /* Bluetooth */
    mobile: { art: 'schalter', feld: 'bluetooth' }, },
  /* DAB+ Digitalradio */
  { id: 'dab',
    as24: '138', /* Digital radio */
    mobile: { art: 'liste', feld: 'radio', wert: 'DAB_RADIO' }, },
  /* USB-Anschluss */
  { id: 'usb',
    as24: '161', /* USB */
    mobile: { art: 'schalter', feld: 'usb' }, },
  /* WLAN / WiFi Hotspot */
  { id: 'wlan',
    as24: '220', /* WLAN / WiFi hotspot */
    mobile: { art: 'schalter', feld: 'wifiHotspot' }, },
  /* Kabelloses Laden */
  { id: 'kabellos_laden',
    as24: '223', /* Induction charging for smartphones */
    mobile: { art: 'schalter', feld: 'wirelessCharging' }, },
  /* Premium-Soundsystem */
  { id: 'soundsystem',
    as24: '155', /* Sound system */
    mobile: { art: 'schalter', feld: 'soundSystem' }, },
  /* Touchscreen */
  { id: 'touchscreen',
    as24: '159', /* Touch screen */
    mobile: { art: 'schalter', feld: 'touchscreen' }, },
  /* Digitales Cockpit */
  { id: 'digital_cockpit',
    as24: '224', /* Digital cockpit */
    mobile: { art: 'schalter', feld: 'digitalCockpit' }, },
  /* Connected Services / App Connect */
  { id: 'connect', },
  /* Fond-Entertainment-System */
  { id: 'rear_entertainment', },
  /* LED-Scheinwerfer */
  { id: 'led',
    as24: '140', /* LED Headlights */
    mobile: { art: 'auswahl', feld: 'headlightType', wert: 'LED_HEADLIGHTS' }, },
  /* Xenon-Scheinwerfer */
  { id: 'xenon',
    as24: '39', /* Xenon headlights */
    mobile: { art: 'auswahl', feld: 'headlightType', wert: 'XENON_HEADLIGHTS' }, },
  /* Matrix-LED / Laser-Scheinwerfer */
  { id: 'matrix_led',
    as24: '213', /* Laser headlights */ },
  /* LED-Tagfahrlicht */
  { id: 'tagfahrlicht',
    as24: '141', /* LED Daytime Running Lights */
    mobile: { art: 'auswahl', feld: 'daytimeRunningLamps', wert: 'LED_DAYTIME_RUNNING_LIGHTS' }, },
  /* Kurvenlicht / adaptives Licht */
  { id: 'kurven_licht',
    as24: '118', /* Adaptive headlights */ },
  /* LED-Rückleuchten */
  { id: 'led_rueck', },
  /* Lichtsensor */
  { id: 'licht_sensor',
    as24: '126', /* Light sensor */
    mobile: { art: 'schalter', feld: 'lightSensor' }, },
  /* Nebelscheinwerfer */
  { id: 'nebellicht',
    as24: '19', /* Fog lights */
    mobile: { art: 'schalter', feld: 'frontFogLights' }, },
  /* Lederausstattung */
  { id: 'leder',
    mobile: { art: 'auswahl', feld: 'interiorType', wert: 'LEATHER' }, },
  /* Kunstleder / Alcantara */
  { id: 'kunstleder',
    mobile: { art: 'auswahl', feld: 'interiorType', wert: 'PART_LEATHER' }, },
  /* Stoffausstattung */
  { id: 'stoff',
    mobile: { art: 'auswahl', feld: 'interiorType', wert: 'CLOTH' }, },
  /* Sportsitze */
  { id: 'sitze_vorne_sport',
    as24: '117', /* Sport seats */
    mobile: { art: 'schalter', feld: 'sportSeats' }, },
  /* 7 Sitze */
  { id: 'sitze_7', },
  /* 6 Sitze */
  { id: 'sitze_6', },
  /* 5 Sitze */
  { id: 'sitze_5', },
  /* Holzdekor */
  { id: 'holzdekor', },
  /* Aluminiumdekor */
  { id: 'aludekor', },
  /* Dachhimmel schwarz */
  { id: 'dachhimmel_schwarz', },
  /* Veloursfußmatten */
  { id: 'fussmatten', },
  /* 17-Zoll-Leichtmetallfelgen */
  { id: 'alu_17',
    as24: '15', /* Alloy wheels */
    mobile: { art: 'schalter', feld: 'alloyWheels' }, },
  /* 18-Zoll-Leichtmetallfelgen */
  { id: 'alu_18',
    as24: '15', /* Alloy wheels */
    mobile: { art: 'schalter', feld: 'alloyWheels' }, },
  /* 19-Zoll-Leichtmetallfelgen */
  { id: 'alu_19',
    as24: '15', /* Alloy wheels */
    mobile: { art: 'schalter', feld: 'alloyWheels' }, },
  /* 20-Zoll-Leichtmetallfelgen */
  { id: 'alu_20',
    as24: '15', /* Alloy wheels */
    mobile: { art: 'schalter', feld: 'alloyWheels' }, },
  /* 21-Zoll-Leichtmetallfelgen */
  { id: 'alu_21',
    as24: '15', /* Alloy wheels */
    mobile: { art: 'schalter', feld: 'alloyWheels' }, },
  /* Winterräder inklusive */
  { id: 'winterraeder',
    as24: '25', /* Winter tyres */
    mobile: { art: 'schalter', feld: 'winterTires' }, },
  /* Sportfahrwerk */
  { id: 'sportfahrwerk',
    as24: '116', /* Sport suspension */
    mobile: { art: 'schalter', feld: 'performanceHandlingSystem' }, },
  /* Luftfederung */
  { id: 'luftfederung',
    as24: '144', /* Air suspension */
    mobile: { art: 'schalter', feld: 'airSuspension' }, },
  /* Anhängerkupplung */
  { id: 'anhaengerkupplung',
    as24: '20', /* Trailer hitch */
    mobile: { art: 'auswahl', feld: 'trailerCouplingType', wert: 'FIX' }, },
  /* Dachreling */
  { id: 'dachreling',
    as24: '27', /* Roof rack */
    mobile: { art: 'schalter', feld: 'roofRails' }, },
  /* Spoiler */
  { id: 'spoiler',
    as24: '238', /* Spoiler */ },
  /* Metallic-Lackierung */
  { id: 'metallic',
    mobile: { art: 'schalter', feld: 'metallic' }, },
  /* Zweifarbige Lackierung */
  { id: 'zweifarb', },
  /* Notrad / Reifenreparaturset */
  { id: 'tiefformat_reifen',
    as24: '217', /* Emergency tyre repair kit */ },
  /* Allradantrieb */
  { id: 'allrad', },
  /* Hinterradantrieb */
  { id: 'hinterrad', },
  /* Frontantrieb */
  { id: 'frontantrieb', },
  /* Automatikgetriebe */
  { id: 'automatik', },
  /* Schaltgetriebe */
  { id: 'schaltgetriebe', },
  /* Mild-Hybrid */
  { id: 'mild_hybrid', },
  /* Vollhybrid (HEV) */
  { id: 'vollhybrid', },
  /* Plug-in-Hybrid (PHEV) */
  { id: 'plug_in_hybrid', },
  /* Elektroantrieb (BEV) */
  { id: 'elektro', },
  /* Scheckheftgepflegt */
  { id: 'scheckh',
    mobile: { art: 'schalter', feld: 'fullServiceHistory' }, },
  /* Neuwertig / 1. Hand */
  { id: 'neuwertig', },
  /* Herstellergarantie */
  { id: 'garantie',
    mobile: { art: 'schalter', feld: 'warranty' }, },
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
