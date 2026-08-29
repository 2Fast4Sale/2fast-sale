/**
 * Erlaubte Werte der mobile.de-Aufzaehlungsfelder.
 *
 * NICHT VON HAND AENDERN — erzeugt von mobile-werte-holen.mjs.
 * Stand: 2026-08-29
 * Quelle: https://services.mobile.de/refdata/...
 *
 * Je Eintrag [Wert, deutsche Bezeichnung]. Gesendet wird der erste;
 * der zweite steht daneben, damit beim Lesen klar ist, worum es geht.
 *
 * Warum als Datei: Diese Woerter sehen vorhersehbar aus. Man schreibt
 * "CLOTH", richtig waere "FABRIC". Auffallen wuerde es erst, wenn
 * mobile.de das fertige Inserat eines echten Kunden ablehnt.
 *
 * 22 Felder, 119 Werte.
 */

export const MOBILE_WERTE: Record<string, [string, string][]> = {
  gearbox: [
    ['MANUAL_GEAR', 'Schaltgetriebe'],
    ['SEMIAUTOMATIC_GEAR', 'Halbautomatik'],
    ['AUTOMATIC_GEAR', 'Automatik'],
  ],
  fuel: [
    ['PETROL', 'Benzin'],
    ['DIESEL', 'Diesel'],
    ['LPG', 'Autogas (LPG)'],
    ['CNG', 'Erdgas (CNG)'],
    ['ELECTRICITY', 'Elektro'],
    ['HYBRID', 'Hybrid (Benzin/Elektro)'],
    ['HYDROGENIUM', 'Wasserstoff'],
    ['ETHANOL', 'Ethanol (FFV, E85 etc.)'],
    ['HYBRID_DIESEL', 'Hybrid (Diesel/Elektro)'],
    ['OTHER', 'Andere'],
  ],
  exteriorColor: [
    ['BLACK', 'Schwarz'],
    ['GREY', 'Grau'],
    ['BEIGE', 'Beige'],
    ['BROWN', 'Braun'],
    ['RED', 'Rot'],
    ['GREEN', 'Grün'],
    ['BLUE', 'Blau'],
    ['PURPLE', 'Violett'],
    ['GOLD', 'Gold'],
    ['WHITE', 'Weiß'],
    ['ORANGE', 'Orange'],
    ['SILVER', 'Silber'],
    ['YELLOW', 'Gelb'],
  ],
  interiorColor: [
    ['BLACK', 'Schwarz'],
    ['GREY', 'Grau'],
    ['BEIGE', 'Beige'],
    ['BROWN', 'Braun'],
    ['RED', 'Rot'],
    ['BLUE', 'Blau'],
    ['OTHER_INTERIOR_COLOR', 'Andere'],
  ],
  interiorType: [
    ['LEATHER', 'Vollleder'],
    ['PARTIAL_LEATHER', 'Teilleder'],
    ['FABRIC', 'Stoff'],
    ['VELOUR', 'Velours'],
    ['ALCANTARA', 'Alcantara'],
    ['IMITATION_LEATHER', 'Kunstleder'],
    ['OTHER_INTERIOR_TYPE', 'Andere'],
  ],
  condition: [
    ['USED', 'Gebrauchtfahrzeug'],
    ['NEW', 'Neufahrzeug'],
  ],
  emissionClass: [
    ['EURO1', 'Euro1'],
    ['EURO2', 'Euro2'],
    ['EURO3', 'Euro3'],
    ['EURO4', 'Euro4'],
    ['EURO5', 'Euro5'],
    ['EURO6', 'Euro6'],
    ['EURO6C', 'Euro6c'],
    ['EURO6D_TEMP', 'Euro6d-TEMP'],
    ['EURO6D', 'Euro6d'],
    ['EURO6E', 'Euro 6e'],
    ['EURO7', 'Euro 7'],
  ],
  emissionSticker: [
    ['EMISSIONSSTICKER_GREEN', '4 (Grün)'],
    ['EMISSIONSSTICKER_YELLOW', '3 (Gelb)'],
    ['EMISSIONSSTICKER_RED', '2 (Rot)'],
    ['EMISSIONSSTICKER_NONE', '1 (Keine)'],
  ],
  doors: [
    ['TWO_OR_THREE', '2/3'],
    ['FOUR_OR_FIVE', '4/5'],
    ['SIX_OR_SEVEN', '6/7'],
  ],
  airbag: [
    ['DRIVER_AIRBAG', 'Fahrer-Airbag'],
    ['FRONT_AIRBAGS', 'Front-Airbags'],
    ['FRONT_AND_SIDE_AIRBAGS', 'Front- und Seiten-Airbags'],
    ['FRONT_AND_SIDE_AND_MORE_AIRBAGS', 'Front-, Seiten- und weitere Airbags'],
  ],
  climatisation: [
    ['NO_CLIMATISATION', 'Keine Klimaanlage oder -automatik'],
    ['MANUAL_CLIMATISATION', 'Klimaanlage'],
    ['AUTOMATIC_CLIMATISATION', 'Klimaautomatik'],
    ['AUTOMATIC_CLIMATISATION_2_ZONES', '2-Zonen-Klimaautomatik'],
    ['AUTOMATIC_CLIMATISATION_3_ZONES', '3-Zonen-Klimaautomatik'],
    ['AUTOMATIC_CLIMATISATION_4_ZONES', '4-Zonen-Klimaautomatik'],
  ],
  parkingAssistants: [
    ['FRONT_SENSORS', 'Vorne'],
    ['REAR_SENSORS', 'Hinten'],
    ['REAR_VIEW_CAM', 'Kamera'],
    ['AUTOMATIC_PARKING', 'Selbstlenkende Systeme'],
    ['CAM_360_DEGREES', '360°-Kamera'],
  ],
  speedControl: [
    ['CRUISE_CONTROL', 'Tempomat'],
    ['ADAPTIVE_CRUISE_CONTROL', 'Abstandstempomat'],
  ],
  radio: [
    ['TUNER', 'Tuner/Radio'],
    ['DAB_RADIO', 'Radio DAB'],
  ],
  headlightType: [
    ['XENON_HEADLIGHTS', 'Xenonscheinwerfer'],
    ['BI_XENON_HEADLIGHTS', 'Bi-Xenon Scheinwerfer'],
    ['LED_HEADLIGHTS', 'LED-Scheinwerfer'],
    ['LASER_HEADLIGHTS', 'Laserlicht'],
  ],
  daytimeRunningLamps: [
    ['DAYTIME_RUNNING_LIGHTS', 'Tagfahrlicht'],
    ['LED_RUNNING_LIGHTS', 'LED-Tagfahrlicht'],
  ],
  bendingLightsType: [
    ['BENDING_LIGHTS', 'Kurvenlicht'],
    ['ADAPTIVE_BENDING_LIGHTS', 'Adaptives Kurvenlicht'],
  ],
  trailerCouplingType: [
    ['TRAILER_COUPLING_PREPARATION', 'Anhängerkupplung-Vorbereitung'],
    ['TRAILER_COUPLING_FIX', 'Anhängerkupplung fest'],
    ['TRAILER_COUPLING_SWIVELING', 'Anhängerkupplung schwenkbar'],
    ['TRAILER_COUPLING_DETACHABLE', 'Anhängerkupplung abnehmbar'],
  ],
  breakdownService: [
    ['SPARE_WHEEL', 'Reserverad'],
    ['EMERGENCY_WHEEL', 'Notrad'],
    ['REPAIR_KIT', 'Pannenkit'],
  ],
  usageType: [
    ['PRE_REGISTRATION', 'Tageszulassung'],
    ['EMPLOYEES_CAR', 'Jahreswagen'],
    ['CLASSIC', 'Oldtimer'],
    ['DEMONSTRATION', 'Vorführfahrzeug'],
  ],
  category: [
    ['Cabrio', 'Cabrio/Roadster'],
    ['EstateCar', 'Kombi'],
    ['Limousine', 'Limousine'],
    ['OffRoad', 'SUV/Geländewagen/Pickup'],
    ['SmallCar', 'Kleinwagen'],
    ['SportsCar', 'Sportwagen/Coupé'],
    ['Van', 'Van/Minibus'],
    ['OtherCar', 'Andere'],
  ],
  vehicleClass: [
    ['AgriculturalVehicle', 'Agrarfahrzeug'],
    ['Bus', 'Bus'],
    ['Car', 'Pkw'],
    ['ConstructionMachine', 'Baumaschine'],
    ['EBike', 'E-Bike'],
    ['ForkliftTruck', 'Stapler'],
    ['Motorbike', 'Motorrad'],
    ['Motorhome', 'Wohnmobil oder -wagen'],
    ['SemiTrailer', 'Auflieger'],
    ['SemiTrailerTruck', 'Sattelzugmaschine (SZM)'],
    ['Trailer', 'Anhänger'],
    ['TruckOver7500', 'Lkw über 7,5 t'],
    ['VanUpTo7500', 'Transporter oder Lkw bis 7,5 t'],
  ],
};

/** Ist der Wert fuer dieses Feld erlaubt? */
export function mobileWertGueltig(feld: string, wert: string): boolean {
  const liste = MOBILE_WERTE[feld];
  return !!liste && liste.some(([w]) => w === wert);
}
