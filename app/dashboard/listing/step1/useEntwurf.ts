'use client';

/**
 * Die Logik hinter Schritt 1 — ohne jede Darstellung.
 *
 * Herausgezogen, weil es inzwischen mehrere Oberflächen für dieselbe
 * Aufgabe gibt und die Logik nicht mit ihnen vervielfältigt werden darf.
 * Der Scan, die Marken-Zerlegung, die EnVKV-Prüfung und die
 * Credit-Prüfung sind über Wochen entstanden und enthalten eine Reihe
 * teuer gelernter Feinheiten; sie ein zweites Mal abzutippen hiesse,
 * genau diese Feinheiten zu verlieren.
 *
 * Was hier steht, ist unverändert aus der bisherigen Fassung übernommen.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND_NAMES, getModels, splitBrandModel } from '../../../../lib/carDatabase';
import { searchEquipment } from '../../../../lib/equipmentDatabase';
import { validateEnvkv, isEnvkvRequired, type EnvkvData } from '../../../../lib/envkv';
import { entwurfId, entwurfNeu } from '../../../../lib/entwurf';

export interface FormData {
  brand: string; model: string; vin: string;
  firstRegistration: string; km: string; price: string;
  fuelType: string; gearbox: string; powerKw: string;
  displacementCcm: string; color: string; seats: string;
  equipment: string[]; dealerNotes: string;
  envkv: EnvkvData;
}

export const LEER_ENVKV: EnvkvData = {
  vehicleKind: 'gebrauchtwagen',
  consumptionCombined: null,
  powerConsumptionCombined: null,
  co2Combined: null,
  co2CombinedDischarged: null,
  electricRangeKm: null,
};

export const KRAFTSTOFFE = ['Benzin', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Elektro', 'LPG', 'CNG'];
export const GETRIEBE    = ['Automatik', 'Manuell'];
export const TOP_MARKEN  = ['BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Opel', 'Ford',
                            'Skoda', 'Seat', 'Hyundai', 'Kia', 'Toyota', 'Renault'];

export const PFLICHT_NAME: Record<string, string> = {
  brand: 'Marke', km: 'Kilometerstand', price: 'Preis',
};

export function useEntwurf() {
  const router = useRouter();
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => { entwurfNeu(); }, []);

  const [data, setData] = useState<FormData>({
    brand: '', model: '', vin: '', firstRegistration: '', km: '', price: '',
    fuelType: '', gearbox: '', powerKw: '', displacementCcm: '',
    color: '', seats: '', equipment: [], dealerNotes: '',
    envkv: LEER_ENVKV,
  });

  const [blattOffen, setBlattOffen]   = useState(false);
  const [fehler, setFehler]           = useState<Record<string, string>>({});
  const [erkannt, setErkannt]         = useState<Set<string>>(new Set());
  const [scanZustand, setScanZustand] = useState<'ruhe' | 'laeuft' | 'fertig' | 'fehler'>('ruhe');
  const [scanBild, setScanBild]       = useState<string | null>(null);
  const [unterwegs, setUnterwegs]     = useState(false);
  const [schmal, setSchmal]           = useState(false);

  useEffect(() => {
    const prüfen = () => setSchmal(window.innerWidth < 940);
    prüfen();
    window.addEventListener('resize', prüfen);
    return () => window.removeEventListener('resize', prüfen);
  }, []);

  const setzen = (k: keyof FormData, v: string | string[]) => {
    setData(p => ({ ...p, [k]: v }));
    setFehler(p => ({ ...p, [k]: '' }));
    // Von Hand geändert heisst: nicht mehr „erkannt".
    setErkannt(p => { const n = new Set(p); n.delete(k as string); return n; });
  };

  const PFLICHT = ['brand', 'km', 'price'] as const;
  const offenePflicht = PFLICHT.filter(k => !String(data[k]).trim());

  /*
   * Sind die Verbrauchsangaben vorgeschrieben? Bei Gebrauchtwagen nicht —
   * und das ist der Normalfall.
   */
  const envkvPflicht = isEnvkvRequired(data.envkv.vehicleKind);

  /* ── Fahrzeugschein einlesen ── */

  const verkleinern = (b64: string, max = 1200): Promise<string> =>
    new Promise(fertig => {
      const bild = new Image();
      bild.src = b64;
      bild.onload = () => {
        const faktor = Math.min(1, max / Math.max(bild.width, bild.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bild.width * faktor);
        c.height = Math.round(bild.height * faktor);
        c.getContext('2d')?.drawImage(bild, 0, 0, c.width, c.height);
        fertig(c.toDataURL('image/jpeg', 0.85));
      };
      bild.onerror = () => fertig(b64);
    });

  const einlesen = async (datei: File) => {
    const leser = new FileReader();
    leser.onload = async ev => {
      const klein = await verkleinern(ev.target?.result as string);
      setScanBild(klein);
      setScanZustand('laeuft');
      try {
        const antwort = await fetch('/api/scan-doc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: klein, draftId: entwurfId() }),
        });
        const d = await antwort.json();
        if (!antwort.ok) throw new Error(d.error || 'Scan fehlgeschlagen');

        /*
         * scan-doc liefert Marke, Modell und Variante in EINEM String
         * ("Volkswagen Golf 2.0 TDI"). Ohne Zerlegung landet alles im
         * Markenfeld und das Modell bleibt leer.
         */
        const zerlegt = d.brand ? splitBrandModel(String(d.brand)) : null;
        const neu = new Set<string>();

        setData(p => {
          const nimm = (feld: string, wert: string, alt: string): string => {
            if (!wert) return alt;
            neu.add(feld);
            return wert;
          };
          return {
            ...p,
            brand: nimm('brand', zerlegt?.brand ?? '', p.brand),
            model: nimm('model', zerlegt?.model ?? '', p.model),
            vin:   nimm('vin', d.vin ?? '', p.vin),
            firstRegistration: nimm('firstRegistration', d.firstRegistration ?? '', p.firstRegistration),
            km:    nimm('km', d.km != null ? String(d.km) : '', p.km),
            fuelType: nimm('fuelType', d.fuelType ?? '', p.fuelType),
            // scan-doc liefert powerPs (bereits aus kW umgerechnet, ×1,3596)
            powerKw: nimm('powerKw', (d.powerPs ?? d.powerKw) != null ? String(d.powerPs ?? d.powerKw) : '', p.powerKw),
            displacementCcm: nimm('displacementCcm', d.displacementCcm != null ? String(d.displacementCcm) : '', p.displacementCcm),
            color: nimm('color', d.color ?? '', p.color),
            seats: nimm('seats', d.seats != null ? String(d.seats) : '', p.seats),
            equipment: Array.isArray(d.equipment)
              ? [...new Set([...p.equipment, ...d.equipment])] : p.equipment,
          };
        });

        setErkannt(neu);
        setScanZustand('fertig');
        setBlattOffen(true);
      } catch {
        setScanZustand('fehler');
        // Auch bei gescheitertem Scan soll er weiterarbeiten können.
        setBlattOffen(true);
      }
    };
    leser.readAsDataURL(datei);
  };

  /* ── Weiter ── */

  const weiter = async () => {
    const e: Record<string, string> = {};
    if (!data.brand.trim()) e.brand = 'fehlt';
    if (!data.km.trim())    e.km    = 'fehlt';
    if (!data.price.trim()) e.price = 'fehlt';

    const envkv = validateEnvkv(data.envkv, data.fuelType);
    if (!envkv.complete) e.envkv = `EnVKV-Pflichtangaben fehlen: ${envkv.missing.join(', ')}`;

    setFehler(e);
    if (Object.keys(e).length > 0) {
      setBlattOffen(true);
      requestAnimationFrame(() =>
        document.querySelector('[data-luecke="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setUnterwegs(true);

    /*
     * Nur prüfen, NICHT abbuchen — verbraucht wird der Credit beim
     * Anlegen in /api/vehicles. Hier geht es darum, früh zu informieren
     * statt vier Schritte ausfüllen zu lassen und dann abzuweisen.
     */
    const credit = await fetch('/api/credits/check');
    if (!credit.ok) {
      setUnterwegs(false);
      router.push('/dashboard/pricing?reason=no_credits');
      return;
    }

    const teile: string[] = [];
    const markeModell = [data.brand, data.model].filter(Boolean).join(' ');
    if (markeModell) teile.push(markeModell);
    const jahr = data.firstRegistration.match(/(\d{4})/)?.[1];
    if (jahr) teile.push(jahr);
    const kombi = [data.powerKw ? `${data.powerKw} PS` : '', data.fuelType].filter(Boolean).join(' ');
    if (kombi) teile.push(kombi);
    if (data.equipment.length) teile.push(data.equipment.slice(0, 2).join(', '));

    let titelVorschlag = teile.join(' · ');
    try {
      const res = await fetch('/api/generate-title', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: data.brand, model: data.model, year: jahr || '',
          fuel: data.fuelType, gearbox: data.gearbox, color: data.color,
          power: data.powerKw, equipment: data.equipment, draftId: entwurfId(),
        }),
      });
      if (res.ok) {
        const { title } = await res.json();
        if (title) titelVorschlag = title;
      }
    } catch { /* Rückfall auf den zusammengesetzten Titel */ }

    sessionStorage.setItem('listing_step1', JSON.stringify({ ...data, suggestedTitle: titelVorschlag }));
    const p = new URLSearchParams({
      brand: markeModell, km: data.km, price: data.price,
      year: data.firstRegistration, fuel: data.fuelType,
      gearbox: data.gearbox, color: data.color, power: data.powerKw,
    });
    router.push(`/dashboard/listing/step2?${p.toString()}`);
  };

  /* ── Abgeleitetes ── */

  const modelle = useMemo(() => (data.brand ? getModels(data.brand) : []), [data.brand]);
  const markenSuchen = (begriff: string) =>
    BRAND_NAMES.filter(b => b.toLowerCase().includes(begriff.toLowerCase()));
  const ausstattungSuchen = (begriff: string) =>
    begriff.trim() ? searchEquipment(begriff).slice(0, 10) : [];

  /** Der Titel, wie er entsteht — für Oberflächen, die ihn zeigen wollen. */
  const titelBisher = useMemo(() => {
    const teile: string[] = [];
    const mm = [data.brand, data.model].filter(Boolean).join(' ');
    if (mm) teile.push(mm);
    const jahr = data.firstRegistration.match(/(\d{4})/)?.[1];
    if (jahr) teile.push(jahr);
    if (data.powerKw) teile.push(`${data.powerKw} PS`);
    if (data.fuelType) teile.push(data.fuelType);
    return teile;
  }, [data.brand, data.model, data.firstRegistration, data.powerKw, data.fuelType]);

  return {
    data, setData, setzen,
    fehler, setFehler, erkannt,
    blattOffen, setBlattOffen,
    scanZustand, scanBild, einlesen, dateiRef,
    weiter, unterwegs,
    schmal, offenePflicht, envkvPflicht,
    modelle, markenSuchen, ausstattungSuchen, titelBisher,
  };
}
