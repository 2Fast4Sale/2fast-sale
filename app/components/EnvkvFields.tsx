'use client';

import React from 'react';
import { Leaf, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  VEHICLE_KIND_LABELS, CO2_CLASSES, CO2_CLASS_COLORS,
  co2Class, drivetrainFromFuel, isEnvkvRequired, validateEnvkv,
  type VehicleKind, type EnvkvData,
} from '../../lib/envkv';

const F    = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const CARD = '#ffffff';
const BORD = '#e2e8f0';
const TH   = '#0f172a';
const TS   = '#64748b';

const KIND_ORDER: VehicleKind[] = [
  'gebrauchtwagen', 'neuwagen', 'tageszulassung', 'vorfuehrwagen', 'jahreswagen',
];

interface Props {
  value: EnvkvData;
  fuelType: string;
  isMobile?: boolean;
  onChange: (patch: Partial<EnvkvData>) => void;
}

export default function EnvkvFields({ value, fuelType, isMobile = false, onChange }: Props) {
  const required   = isEnvkvRequired(value.vehicleKind);
  const drivetrain = drivetrainFromFuel(fuelType);
  const validation = validateEnvkv(value, fuelType);

  // Bei reinen E-Fahrzeugen ist die CO2-Klasse immer A
  const activeClass =
    drivetrain === 'elektro' ? 'A'
    : value.co2Combined != null ? co2Class(value.co2Combined)
    : null;

  const num = (raw: string): number | null => {
    const cleaned = raw.replace(',', '.').trim();
    if (cleaned === '') return null;
    const n = Number(cleaned);
    return Number.isNaN(n) ? null : n;
  };

  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? '' : String(v).replace('.', ',');

  const field = (
    label: string,
    unit: string,
    key: keyof EnvkvData,
    placeholder: string,
  ) => (
    <div>
      <label style={{
        fontSize: '12px', fontWeight: '600', color: TS, textTransform: 'uppercase',
        letterSpacing: '0.06em', display: 'block', marginBottom: '8px',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          inputMode="decimal"
          value={fmt(value[key] as number | null)}
          placeholder={placeholder}
          onChange={e => onChange({ [key]: num(e.target.value) } as Partial<EnvkvData>)}
          style={{
            width: '100%', padding: '11px 52px 11px 13px', borderRadius: '8px',
            border: `1px solid ${BORD}`, background: '#fff', color: TH,
            fontSize: '14px', fontFamily: F, outline: 'none', boxSizing: 'border-box',
          }}
        />
        <span style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '12px', color: '#94a3b8', pointerEvents: 'none', fontWeight: '600',
        }}>
          {unit}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORD}`, borderRadius: '14px',
      padding: isMobile ? '18px' : '24px', fontFamily: F,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>

      {/* Kopf */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Leaf size={16} style={{ color: '#10b981' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: TH }}>
            Verbrauch & Emissionen
          </div>
          <div style={{ fontSize: '12px', color: TS }}>
            Pflichtangaben nach Pkw-EnVKV
          </div>
        </div>
        {required && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
            background: validation.complete ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color:      validation.complete ? '#059669' : '#d97706',
            border: `1px solid ${validation.complete ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            whiteSpace: 'nowrap',
          }}>
            {validation.complete
              ? <><CheckCircle2 size={11} /> Vollständig</>
              : <><AlertCircle size={11} /> Pflicht</>}
          </div>
        )}
      </div>

      {/* Fahrzeugart */}
      <label style={{
        fontSize: '12px', fontWeight: '600', color: TS, textTransform: 'uppercase',
        letterSpacing: '0.06em', display: 'block', marginBottom: '8px',
      }}>
        Fahrzeugart
      </label>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '8px', marginBottom: required ? '20px' : '0',
      }}>
        {KIND_ORDER.map(kind => {
          const active = value.vehicleKind === kind;
          const pflicht = isEnvkvRequired(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onChange({ vehicleKind: kind })}
              style={{
                padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${active ? '#6366f1' : BORD}`,
                background: active ? 'rgba(99,102,241,0.08)' : '#fff',
                color: active ? '#6366f1' : '#475569',
                fontSize: '12.5px', fontWeight: active ? '700' : '500',
                fontFamily: F, transition: 'all 0.14s', position: 'relative',
                lineHeight: 1.3,
              }}
            >
              {VEHICLE_KIND_LABELS[kind]}
              {pflicht && (
                <span
                  title="EnVKV-pflichtig"
                  style={{
                    position: 'absolute', top: '5px', right: '6px',
                    width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Hinweis wenn keine Pflicht */}
      {!required && value.vehicleKind && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '9px', marginTop: '14px',
          padding: '12px 14px', background: '#f8fafc', border: `1px solid ${BORD}`,
          borderRadius: '10px',
        }}>
          <Info size={14} style={{ color: '#64748b', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
            Für <strong>{VEHICLE_KIND_LABELS[value.vehicleKind as VehicleKind]}</strong> sind
            keine EnVKV-Angaben vorgeschrieben. Du kannst Verbrauchswerte freiwillig ergänzen —
            dann müssen sie korrekt sein.
          </p>
        </div>
      )}

      {/*
        Eingabefelder immer zeigen, nicht nur bei EnVKV-Pflicht.
        Auch bei Gebrauchtwagen wollen Händler Verbrauchswerte angeben — sie
        sind auf den Portalen ein Standardfeld. Vorher stand hier der Hinweis
        "kannst du freiwillig ergänzen", ohne dass es dafür ein Feld gab.
        Pflicht bleibt die Angabe nur bei Neuwagen, Tageszulassung und
        Vorführwagen; die Prüfung hängt an isEnvkvRequired, nicht hieran.
      */}
      {value.vehicleKind && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '14px', marginBottom: '18px', marginTop: required ? 0 : '16px',
          }}>
            {drivetrain !== 'elektro' &&
              field('Kraftstoffverbrauch komb.', 'l/100km', 'consumptionCombined', 'z.B. 5,4')}

            {drivetrain !== 'verbrenner' &&
              field('Stromverbrauch komb.', 'kWh/100km', 'powerConsumptionCombined', 'z.B. 17,2')}

            {drivetrain !== 'elektro' &&
              field('CO₂-Emissionen komb.', 'g/km', 'co2Combined', 'z.B. 142')}

            {drivetrain !== 'verbrenner' &&
              field('Elektrische Reichweite', 'km', 'electricRangeKm', 'z.B. 480')}

            {drivetrain === 'plugin_hybrid' &&
              field('CO₂ entladene Batterie', 'g/km', 'co2CombinedDischarged', 'z.B. 178')}
          </div>

          {/* CO2-Klassen-Skala */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '12px', fontWeight: '600', color: TS, textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: '9px',
            }}>
              CO₂-Klasse {activeClass && <span style={{ color: '#0f172a' }}>— {activeClass}</span>}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {CO2_CLASSES.map(c => {
                const on = activeClass === c;
                return (
                  <div
                    key={c}
                    style={{
                      flex: 1, textAlign: 'center', padding: on ? '11px 0' : '8px 0',
                      borderRadius: '6px', background: CO2_CLASS_COLORS[c],
                      color: c === 'D' || c === 'C' ? '#1a1a1a' : '#fff',
                      fontSize: on ? '15px' : '13px', fontWeight: '800',
                      opacity: activeClass ? (on ? 1 : 0.3) : 0.65,
                      transform: on ? 'scale(1.04)' : 'none',
                      transition: 'all 0.18s', boxShadow: on ? '0 3px 10px rgba(0,0,0,0.18)' : 'none',
                    }}
                  >
                    {c}
                  </div>
                );
              })}
            </div>
            {!activeClass && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '7px' }}>
                Wird automatisch aus den CO₂-Emissionen berechnet.
              </div>
            )}
          </div>

          {/* Fehlende Pflichtfelder */}
          {!validation.complete && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '9px',
              padding: '12px 14px', background: '#fffbeb',
              border: '1px solid #fde68a', borderRadius: '10px',
            }}>
              <AlertCircle size={14} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12.5px', color: '#78350f', lineHeight: 1.6 }}>
                <strong>Noch offen:</strong> {validation.missing.join(', ')}.
                <br />
                Fahrzeugart{' '}
                <strong>{VEHICLE_KIND_LABELS[value.vehicleKind as VehicleKind]}</strong>
                {' '}— ohne diese Angaben ist das Inserat abmahnfähig.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
