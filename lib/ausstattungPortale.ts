/**
 * Wohin jedes Ausstattungsmerkmal bei den Portalen gehoert.
 *
 * NICHT VON HAND AENDERN — erzeugt von ausstattung-zuordnen.mjs.
 * Stand: 2026-08-29
 *
 * Die beiden Portale loesen dasselbe verschieden:
 *
 *   AutoScout24  eine Liste "Equipment" mit 131 Kennungen
 *   mobile.de    fuer fast jedes Merkmal ein EIGENES FELD im Inserat,
 *                manches in Aufzaehlungen (parkingAssistants, radio)
 *
 * 133 Merkmale insgesamt:
 *   96 gehen an beide Portale
 *   1 nur an AutoScout24
 *   11 nur an mobile.de
 *   25 an keines — die koennen nur in die freie Beschreibung
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
    mobile: { art: 'auswahl', feld: 'airbag', wert: 'FRONT_AIRBAGS' }, },
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
    mobile: { art: 'liste', feld: 'parkingAssistants', werte: ['REAR_SENSORS'] }, },
  /* Einparkhilfe vorne */
  { id: 'einparkhilfe_v',
    as24: '128', /* Parking assist system sensors front */
    mobile: { art: 'liste', feld: 'parkingAssistants', werte: ['FRONT_SENSORS'] }, },
  /* Einparkhilfe vorne & hinten */
  { id: 'einparkhilfe_360',
    as24: '128', /* Parking assist system sensors front */
    mobile: { art: 'liste', feld: 'parkingAssistants', werte: ['FRONT_SENSORS', 'REAR_SENSORS'] }, },
  /* Rückfahrkamera */
  { id: 'rueckfahrkamera',
    as24: '130', /* Parking assist system camera */
    mobile: { art: 'liste', feld: 'parkingAssistants', werte: ['REAR_VIEW_CAM'] }, },
  /* 360°-Kamera */
  { id: 'kamera_360',
    as24: '187', /* 360° camera */
    mobile: { art: 'liste', feld: 'parkingAssistants', werte: ['CAM_360_DEGREES'] }, },
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
  /* ISOFIX Beifahrersitz */
  { id: 'isofix_beifahrer',
    mobile: { art: 'schalter', feld: 'passengerSeatIsofixPoint' }, },
  /* Traktionskontrolle */
  { id: 'traktionskontrolle',
    as24: '31', /* Traction control */
    mobile: { art: 'schalter', feld: 'tractionControlSystem' }, },
  /* Elektr. Wegfahrsperre */
  { id: 'wegfahrsperre',
    as24: '26', /* Immobilizer */
    mobile: { art: 'schalter', feld: 'immobilizer' }, },
  /* Notrufsystem */
  { id: 'notrufsystem',
    as24: '149', /* Emergency system */
    mobile: { art: 'schalter', feld: 'emergencyCallSystem' }, },
  /* Gepäckraumabtrennung */
  { id: 'gepaeckraumabtrennung',
    as24: '226', /* Cargo barrier */
    mobile: { art: 'schalter', feld: 'cargoBarrier' }, },
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
    mobile: { art: 'liste', feld: 'parkingAssistants', werte: ['AUTOMATIC_PARKING'] }, },
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
  /* Geschwindigkeitsbegrenzer */
  { id: 'tempo_limiter',
    as24: '227', /* Speed limit control system */
    mobile: { art: 'schalter', feld: 'speedLimiter' }, },
  /* Regensensor */
  { id: 'regensensor',
    as24: '127', /* Rain sensor */
    mobile: { art: 'schalter', feld: 'automaticRainSensor' }, },
  /* Schaltwippen */
  { id: 'schaltwippen',
    as24: '151', /* Shift paddles */
    mobile: { art: 'schalter', feld: 'paddleShifters' }, },
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
    as24: '243', /* Automatic climate control, 4 zones */
    mobile: { art: 'auswahl', feld: 'climatisation', wert: 'AUTOMATIC_CLIMATISATION_4_ZONES' }, },
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
  /* Armlehne */
  { id: 'armlehne',
    as24: '134', /* Armrest */
    mobile: { art: 'schalter', feld: 'armRest' }, },
  /* Lordosenstütze */
  { id: 'lordosenstuetze',
    as24: '143', /* Lumbar support */
    mobile: { art: 'schalter', feld: 'lumbarSupport' }, },
  /* Lederlenkrad */
  { id: 'lederlenkrad',
    as24: '142', /* Leather steering wheel */
    mobile: { art: 'schalter', feld: 'leatherSteeringWheel' }, },
  /* Elektr. Fensterheber */
  { id: 'el_fensterheber',
    as24: '13', /* Power windows */
    mobile: { art: 'schalter', feld: 'electricWindows' }, },
  /* Außenspiegel elektr. anklappbar */
  { id: 'spiegel_anklappbar',
    mobile: { art: 'schalter', feld: 'foldingExteriorMirrors' }, },
  /* Servolenkung */
  { id: 'servolenkung',
    as24: '12', /* Power steering */
    mobile: { art: 'schalter', feld: 'powerAssistedSteering' }, },
  /* Freisprecheinrichtung */
  { id: 'freisprech',
    as24: '124', /* Hands-free equipment */
    mobile: { art: 'schalter', feld: 'handsFreePhoneSystem' }, },
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
    mobile: { art: 'liste', feld: 'radio', werte: ['DAB_RADIO'] }, },
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
  /* Bordcomputer */
  { id: 'bordcomputer',
    as24: '41', /* On-board computer */
    mobile: { art: 'schalter', feld: 'onBoardComputer' }, },
  /* Tuner/Radio */
  { id: 'tuner_radio',
    as24: '10', /* Radio */
    mobile: { art: 'liste', feld: 'radio', werte: ['TUNER'] }, },
  /* Musikstreaming integriert */
  { id: 'musikstreaming',
    as24: '228', /* Integrated music streaming */
    mobile: { art: 'schalter', feld: 'integratedMusicStreaming' }, },
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
    as24: '213', /* Laser headlights */
    mobile: { art: 'auswahl', feld: 'headlightType', wert: 'LASER_HEADLIGHTS' }, },
  /* LED-Tagfahrlicht */
  { id: 'tagfahrlicht',
    as24: '141', /* LED Daytime Running Lights */
    mobile: { art: 'auswahl', feld: 'daytimeRunningLamps', wert: 'LED_RUNNING_LIGHTS' }, },
  /* Kurvenlicht / adaptives Licht */
  { id: 'kurven_licht',
    as24: '118', /* Adaptive headlights */
    mobile: { art: 'auswahl', feld: 'bendingLightsType', wert: 'ADAPTIVE_BENDING_LIGHTS' }, },
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
  /* Blendfreies Fernlicht */
  { id: 'blendfrei_fernlicht',
    as24: '214', /* Glare-free high beam headlights */
    mobile: { art: 'schalter', feld: 'glareFreeHighBeam' }, },
  /* Scheinwerferreinigung */
  { id: 'scheinwerferreinigung',
    as24: '190', /* Headlight washer system */
    mobile: { art: 'schalter', feld: 'headlightWasherSystem' }, },
  /* Lederausstattung */
  { id: 'leder',
    mobile: { art: 'auswahl', feld: 'interiorType', wert: 'LEATHER' }, },
  /* Kunstleder / Alcantara */
  { id: 'kunstleder',
    mobile: { art: 'auswahl', feld: 'interiorType', wert: 'IMITATION_LEATHER' }, },
  /* Stoffausstattung */
  { id: 'stoff',
    mobile: { art: 'auswahl', feld: 'interiorType', wert: 'FABRIC' }, },
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
    mobile: { art: 'auswahl', feld: 'trailerCouplingType', wert: 'TRAILER_COUPLING_FIX' }, },
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
    as24: '217', /* Emergency tyre repair kit */
    mobile: { art: 'auswahl', feld: 'breakdownService', wert: 'REPAIR_KIT' }, },
  /* Abgedunkelte Scheiben */
  { id: 'scheiben_abgedunkelt',
    as24: '54', /* Tinted windows */
    mobile: { art: 'schalter', feld: 'tintedWindows' }, },
  /* Sommerreifen */
  { id: 'sommerreifen',
    as24: '210', /* Summer tyres */
    mobile: { art: 'schalter', feld: 'summerTires' }, },
  /* Sportpaket */
  { id: 'sportpaket',
    as24: '112', /* Sport package */
    mobile: { art: 'schalter', feld: 'sportPackage' }, },
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
  /* Nichtraucher-Fahrzeug */
  { id: 'nichtraucher',
    mobile: { art: 'schalter', feld: 'nonSmokerVehicle' }, },
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
