'use client';

import React from 'react';
import {
  CO2_CLASSES, CO2_CLASS_COLORS, co2Class, drivetrainFromFuel,
  isEnvkvRequired, buildEnvkvText,
  type EnvkvData, type VehicleKind,
} from '../../lib/envkv';

const F = '"DM Sans", -apple-system, sans-serif';

/** Rohdaten aus der vehicles-Tabelle in EnvkvData umwandeln */
export function envkvFromVehicle(v: Record<string, unknown>): EnvkvData {
  const n = (x: unknown): number | null =>
    x === null || x === undefined || x === '' ? null : Number(x);
  return {
    vehicleKind:              (v.vehicle_kind as VehicleKind) || 'gebrauchtwagen',
    consumptionCombined:      n(v.consumption_combined),
    powerConsumptionCombined: n(v.power_consumption_combined),
    co2Combined:              n(v.co2_combined),
    co2CombinedDischarged:    n(v.co2_combined_discharged),
    electricRangeKm:          n(v.electric_range_km),
  };
}

const nf = (v: number, d = 1) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

interface Props {
  vehicle: Record<string, unknown>;
}

export default function EnvkvDisplay({ vehicle }: Props) {
  const data  = envkvFromVehicle(vehicle);
  const fuel  = (vehicle.fuel_type as string) || '';
  const text  = buildEnvkvText(data, fuel);

  // Nur anzeigen, wenn EnVKV-Pflicht besteht UND Werte vorhanden sind
  if (!isEnvkvRequired(data.vehicleKind) || !text) return null;

  const drivetrain = drivetrainFromFuel(fuel);
  const activeClass =
    drivetrain === 'elektro' ? 'A'
    : data.co2Combined != null ? co2Class(data.co2Combined)
    : null;

  const rows: { label: string; value: string }[] = [];
  if (data.consumptionCombined != null)
    rows.push({ label: 'Kraftstoffverbrauch (komb.)', value: `${nf(data.consumptionCombined)} l/100 km` });
  if (data.powerConsumptionCombined != null)
    rows.push({ label: 'Stromverbrauch (komb.)', value: `${nf(data.powerConsumptionCombined)} kWh/100 km` });
  rows.push({
    label: 'CO₂-Emissionen (komb.)',
    value: drivetrain === 'elektro'
      ? '0 g/km'
      : data.co2Combined != null ? `${nf(data.co2Combined, 0)} g/km` : '—',
  });
  if (data.electricRangeKm != null)
    rows.push({ label: 'Elektrische Reichweite', value: `${nf(data.electricRangeKm, 0)} km` });
  if (data.co2CombinedDischarged != null)
    rows.push({
      label: 'CO₂ bei entladener Batterie',
      value: `${nf(data.co2CombinedDischarged, 0)} g/km (Klasse ${co2Class(data.co2CombinedDischarged)})`,
    });

  // Der Hinweistext ist die letzte Zeile des generierten Pflichttextes
  const legalNote = text.split('\n').slice(-1)[0];

  return (
    <div style={{ marginTop: '24px', fontFamily: F }}>
      <div style={{
        fontSize: '13px', fontWeight: '700', color: '#3a5a78',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
      }}>
        Verbrauch & Emissionen
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '20px',
      }}>

        {/* Werte */}
        <div style={{ marginBottom: rows.length ? '18px' : 0 }}>
          {rows.map(({ label, value }, i) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              gap: '16px', padding: '8px 0',
              borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <span style={{ fontSize: '14px', color: '#7a9cbc' }}>{label}</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#f0f8ff', whiteSpace: 'nowrap' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* CO2-Klassen-Skala */}
        {activeClass && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#7a9cbc', marginBottom: '8px', fontWeight: '600' }}>
              CO₂-Klasse
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {CO2_CLASSES.map(c => {
                const on = activeClass === c;
                return (
                  <div key={c} style={{
                    flex: 1, textAlign: 'center', padding: on ? '11px 0' : '8px 0',
                    borderRadius: '6px', background: CO2_CLASS_COLORS[c],
                    color: c === 'C' || c === 'D' ? '#1a1a1a' : '#fff',
                    fontSize: on ? '16px' : '13px', fontWeight: '800',
                    opacity: on ? 1 : 0.28,
                    transform: on ? 'scale(1.05)' : 'none',
                    boxShadow: on ? '0 3px 12px rgba(0,0,0,0.4)' : 'none',
                    transition: 'all 0.18s',
                  }}>
                    {c}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gesetzlicher Hinweistext */}
        <p style={{
          margin: 0, fontSize: '11.5px', lineHeight: 1.65, color: '#5c7a99',
        }}>
          {legalNote}
        </p>
      </div>
    </div>
  );
}
