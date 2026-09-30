/**
 * Welche Spalten ein Fahrzeug hat — an einer Stelle.
 *
 * Grund: Schritt 4 schickt beim Speichern einen Korb voller Felder, in
 * dem auch zwei stecken, die KEINE Spalten sind: studio_images (dient nur
 * der Abrechnung der Zusatzbilder) und draft_id (verbindet die Kosten aus
 * den Schritten 1 bis 3 mit dem Fahrzeug). Die POST-Route hat immer nur
 * ihre Liste uebernommen und alles andere weggelassen — die PATCH-Route
 * schrieb den Korb 1:1 in die Tabelle. Beim zweiten Speichern desselben
 * Inserats (erst "Entwurf", dann "Aktiv") kam deshalb verlaesslich
 * "Could not find the 'draft_id' column of 'vehicles'".
 *
 * Zweiter Grund: Ohne Liste landet jedes Feld in der Tabelle, das jemand
 * mitschickt — auch user_id. Damit haette ein Haendler sein Fahrzeug in
 * ein fremdes Konto schieben koennen.
 */

/** Spalten aus der ersten Fassung — die gibt es immer. */
export const BASIS_SPALTEN = [
  'brand', 'vin', 'first_registration', 'displacement_ccm', 'power_kw',
  'fuel_type', 'color', 'seats', 'gross_weight_kg', 'km', 'price',
  'dealer_notes', 'description', 'equipment', 'status', 'background_id',
] as const;

/** Migration 004. */
export const NEUE_SPALTEN = ['title', 'year', 'gearbox_type'] as const;

/** Pflichtfelder von mobile.de, Migrationen 022 und 023. */
export const MOBILE_SPALTEN = [
  'body_type', 'vat_type', 'damaged', 'metallic', 'warranty',
  'hu_until', 'previous_owners', 'interior_type', 'interior_color',
  'doors', 'emission_class', 'drive_type',
] as const;

/** Pkw-EnVKV, Migration 012. */
export const ENVKV_SPALTEN = [
  'vehicle_kind', 'consumption_combined', 'power_consumption_combined',
  'co2_combined', 'co2_combined_discharged', 'electric_range_km',
] as const;

export const ALLE_FAHRZEUG_SPALTEN: readonly string[] = [
  ...BASIS_SPALTEN, ...NEUE_SPALTEN, ...MOBILE_SPALTEN, ...ENVKV_SPALTEN,
];

/**
 * Aus einem Korb vom Browser die erlaubten Felder herausziehen.
 *
 * Leere Zeichenketten fliegen raus (sonst ueberschreibt ein leeres
 * Formularfeld einen vorhandenen Wert), `false` bleibt drin — es ist eine
 * Angabe, keine Luecke ("unfallfrei").
 */
export function fahrzeugFelder(
  korb: Record<string, unknown>,
  spalten: readonly string[] = ALLE_FAHRZEUG_SPALTEN,
): Record<string, unknown> {
  const raus: Record<string, unknown> = {};
  for (const schluessel of spalten) {
    const wert = korb[schluessel];
    if (schluessel === 'equipment') {
      if (Array.isArray(wert)) raus.equipment = wert;
      continue;
    }
    if (typeof wert === 'boolean') { raus[schluessel] = wert; continue; }
    if (wert !== undefined && wert !== null && wert !== '') raus[schluessel] = wert;
  }
  return raus;
}
