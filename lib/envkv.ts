/**
 * PKW-EnVKV — Energieverbrauchskennzeichnung
 *
 * Rechtsgrundlage: Pkw-Energieverbrauchskennzeichnungsverordnung (Pkw-EnVKV)
 * in der seit 01.05.2024 geltenden Fassung.
 *
 * WICHTIG — Geltungsbereich:
 * Die Verordnung gilt nur fuer NEUE Personenkraftwagen (Klasse M1), also
 * Fahrzeuge, die noch nicht zum Zweck des Weiterverkaufs oder der Auslieferung
 * verkauft wurden. In der Praxis betrifft das:
 *   - Neuwagen
 *   - Tageszulassungen
 *   - Vorfuehrwagen
 * Reine Gebrauchtwagen fallen NICHT darunter. Werden dort dennoch
 * Verbrauchswerte angegeben, muessen diese korrekt sein.
 *
 * HINWEIS: Die CO2-Klassen-Schwellen stammen aus Anlage 2 der Pkw-EnVKV.
 * Vor dem Live-Gang bitte gegen die amtliche Fassung pruefen — die Verordnung
 * wurde in der Vergangenheit mehrfach angepasst.
 */

export type Co2Class = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

/** Fahrzeugart — entscheidet ob EnVKV-Pflicht besteht */
export type VehicleKind =
  | 'neuwagen'
  | 'tageszulassung'
  | 'vorfuehrwagen'
  | 'jahreswagen'
  | 'gebrauchtwagen';

export const VEHICLE_KIND_LABELS: Record<VehicleKind, string> = {
  neuwagen:       'Neuwagen',
  tageszulassung: 'Tageszulassung',
  vorfuehrwagen:  'Vorführwagen',
  jahreswagen:    'Jahreswagen',
  gebrauchtwagen: 'Gebrauchtwagen',
};

/** Fahrzeugarten, fuer die die EnVKV-Angaben verpflichtend sind */
const ENVKV_PFLICHT: VehicleKind[] = ['neuwagen', 'tageszulassung', 'vorfuehrwagen'];

export function isEnvkvRequired(kind: VehicleKind | '' | null | undefined): boolean {
  if (!kind) return false;
  return ENVKV_PFLICHT.includes(kind as VehicleKind);
}

/**
 * CO2-Klasse nach Anlage 2 Pkw-EnVKV, ermittelt aus den kombinierten
 * CO2-Emissionen (WLTP) in g/km.
 */
export function co2Class(co2CombinedGPerKm: number): Co2Class {
  const v = co2CombinedGPerKm;
  if (v <= 0)   return 'A';
  if (v <= 45)  return 'B';
  if (v <= 95)  return 'C';
  if (v <= 125) return 'D';
  if (v <= 155) return 'E';
  if (v <= 195) return 'F';
  return 'G';
}

/** Ampelfarben der CO2-Klassen fuer die Label-Darstellung */
export const CO2_CLASS_COLORS: Record<Co2Class, string> = {
  A: '#009a3d',
  B: '#52a72b',
  C: '#c8d200',
  D: '#ffed00',
  E: '#fbba00',
  F: '#eb6909',
  G: '#e30613',
};

export const CO2_CLASSES: Co2Class[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Antriebsart bestimmt, welche Felder angegeben werden muessen */
export type Drivetrain = 'verbrenner' | 'elektro' | 'plugin_hybrid';

export function drivetrainFromFuel(fuelType: string): Drivetrain {
  const f = (fuelType || '').toLowerCase();
  if (f.includes('plug')) return 'plugin_hybrid';
  if (f.includes('elektro')) return 'elektro';
  return 'verbrenner';
}

export interface EnvkvData {
  vehicleKind: VehicleKind | '';
  /** Kraftstoffverbrauch kombiniert in l/100 km (WLTP) */
  consumptionCombined?: number | null;
  /** Stromverbrauch kombiniert in kWh/100 km (WLTP) */
  powerConsumptionCombined?: number | null;
  /** CO2-Emissionen kombiniert in g/km (WLTP) */
  co2Combined?: number | null;
  /** Nur Plug-in-Hybrid: CO2 kombiniert bei entladener Batterie in g/km */
  co2CombinedDischarged?: number | null;
  /** Nur Elektro / Plug-in: elektrische Reichweite in km */
  electricRangeKm?: number | null;
}

export interface EnvkvValidation {
  required: boolean;
  complete: boolean;
  /** Fehlende Pflichtfelder als lesbare Labels */
  missing: string[];
}

/**
 * Prueft, ob alle fuer die Fahrzeugart und Antriebsart erforderlichen
 * EnVKV-Angaben vorhanden sind.
 */
export function validateEnvkv(data: EnvkvData, fuelType: string): EnvkvValidation {
  const required = isEnvkvRequired(data.vehicleKind);
  if (!required) return { required: false, complete: true, missing: [] };

  const drivetrain = drivetrainFromFuel(fuelType);
  const missing: string[] = [];

  const has = (v: number | null | undefined) => v !== null && v !== undefined && !Number.isNaN(v);

  if (drivetrain === 'elektro') {
    if (!has(data.powerConsumptionCombined)) missing.push('Stromverbrauch kombiniert');
    if (!has(data.electricRangeKm))          missing.push('Elektrische Reichweite');
    // CO2 ist bei reinen E-Fahrzeugen 0 — wird automatisch gesetzt
  } else if (drivetrain === 'plugin_hybrid') {
    if (!has(data.consumptionCombined))      missing.push('Kraftstoffverbrauch kombiniert');
    if (!has(data.powerConsumptionCombined)) missing.push('Stromverbrauch kombiniert');
    if (!has(data.co2Combined))              missing.push('CO₂-Emissionen kombiniert');
    if (!has(data.co2CombinedDischarged))    missing.push('CO₂ bei entladener Batterie');
    if (!has(data.electricRangeKm))          missing.push('Elektrische Reichweite');
  } else {
    if (!has(data.consumptionCombined)) missing.push('Kraftstoffverbrauch kombiniert');
    if (!has(data.co2Combined))         missing.push('CO₂-Emissionen kombiniert');
  }

  return { required: true, complete: missing.length === 0, missing };
}

const nf = (v: number, digits = 1) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Erzeugt den Pflichttext-Block fuer das Inserat.
 * Gibt null zurueck, wenn keine EnVKV-Pflicht besteht.
 */
export function buildEnvkvText(data: EnvkvData, fuelType: string): string | null {
  if (!isEnvkvRequired(data.vehicleKind)) return null;

  const drivetrain = drivetrainFromFuel(fuelType);
  const lines: string[] = [];

  if (drivetrain === 'elektro') {
    if (data.powerConsumptionCombined != null)
      lines.push(`Stromverbrauch (kombiniert): ${nf(data.powerConsumptionCombined)} kWh/100 km`);
    lines.push('CO₂-Emissionen (kombiniert): 0 g/km');
    if (data.electricRangeKm != null)
      lines.push(`Elektrische Reichweite: ${nf(data.electricRangeKm, 0)} km`);
    lines.push('CO₂-Klasse: A');
  } else if (drivetrain === 'plugin_hybrid') {
    if (data.consumptionCombined != null)
      lines.push(`Kraftstoffverbrauch (kombiniert, gewichtet): ${nf(data.consumptionCombined)} l/100 km`);
    if (data.powerConsumptionCombined != null)
      lines.push(`Stromverbrauch (kombiniert, gewichtet): ${nf(data.powerConsumptionCombined)} kWh/100 km`);
    if (data.co2Combined != null)
      lines.push(`CO₂-Emissionen (kombiniert, gewichtet): ${nf(data.co2Combined, 0)} g/km`);
    if (data.electricRangeKm != null)
      lines.push(`Elektrische Reichweite: ${nf(data.electricRangeKm, 0)} km`);
    if (data.co2Combined != null)
      lines.push(`CO₂-Klasse: ${co2Class(data.co2Combined)}`);
    if (data.co2CombinedDischarged != null)
      lines.push(
        `Bei entladener Batterie — CO₂-Emissionen: ${nf(data.co2CombinedDischarged, 0)} g/km, ` +
        `CO₂-Klasse: ${co2Class(data.co2CombinedDischarged)}`
      );
  } else {
    if (data.consumptionCombined != null)
      lines.push(`Kraftstoffverbrauch (kombiniert): ${nf(data.consumptionCombined)} l/100 km`);
    if (data.co2Combined != null) {
      lines.push(`CO₂-Emissionen (kombiniert): ${nf(data.co2Combined, 0)} g/km`);
      lines.push(`CO₂-Klasse: ${co2Class(data.co2Combined)}`);
    }
  }

  // Ohne konkrete Messwerte darf gar nichts ausgegeben werden — der Hinweistext
  // wuerde sonst Werte behaupten, die nicht vorliegen. Bei Elektro zaehlen die
  // fest gesetzten Zeilen (CO2 0 g/km, Klasse A) nicht als Messwert.
  const hasMeasured =
    data.consumptionCombined != null ||
    data.powerConsumptionCombined != null ||
    data.co2Combined != null ||
    data.co2CombinedDischarged != null ||
    data.electricRangeKm != null;
  if (!hasMeasured) return null;

  lines.push(
    'Die angegebenen Werte wurden nach dem vorgeschriebenen Messverfahren (WLTP) ermittelt. ' +
    'Weitere Informationen zum offiziellen Kraftstoffverbrauch und zu den offiziellen ' +
    'spezifischen CO₂-Emissionen neuer Personenkraftwagen können dem „Leitfaden über den ' +
    'Kraftstoffverbrauch, die CO₂-Emissionen und den Stromverbrauch neuer Personenkraftwagen" ' +
    'entnommen werden, der an allen Verkaufsstellen und bei der Deutschen Automobil Treuhand GmbH ' +
    'unentgeltlich erhältlich ist.'
  );

  return lines.join('\n');
}
