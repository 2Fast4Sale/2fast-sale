'use client';

/**
 * Schritt 1 — Fahrzeugdaten erfassen.
 *
 * Zweiter Anlauf. Der erste Umbau machte das Formular schöner, aber nicht
 * kürzer: acht Abschnitte, zwölf Felder, achtundzwanzig Knöpfe, 3.722
 * Pixel Höhe — zehn Bildschirme für ein Fahrzeug. Bessere Typografie an
 * derselben Arbeit ist keine Erleichterung.
 *
 * Deshalb ein anderer Aufbau, kein anderer Anstrich:
 *
 * Zwei Zustände statt einer Strecke. Wer die Seite öffnet, sieht eine
 * Sache — den Fahrzeugschein. Das Datenblatt erscheint erst, wenn es
 * etwas anzuzeigen gibt. Vorher acht Abschnitte auf einmal auszubreiten
 * heisst, dem Händler Arbeit zu zeigen, die der Scan ihm gerade abnehmen
 * würde.
 *
 * Zeilen statt Kästen. Ein Fahrzeugdatenblatt ist eine Liste aus
 * Beschriftung und Wert. Genau so sieht es jetzt aus: schmale Zeilen mit
 * Trennlinien, Beschriftung links, Wert rechts. Das ist die Form, die
 * jeder Händler von Fahrzeugschein, Bewertung und Rechnung kennt — und
 * sie braucht ein Viertel der Höhe eines Kastenrasters.
 *
 * Lücken statt Vollständigkeit. Nach dem Scan sind die meisten Zeilen
 * gefüllt. Hervorgehoben wird deshalb, was FEHLT — nicht was da ist. Der
 * Händler soll seine drei Lücken sehen, nicht fünfzehn Felder prüfen.
 *
 * Die Ausstattungsliste ist eingeklappt. Die Fotoerkennung in Schritt 2
 * schreibt gefundene Merkmale ohnehin dazu (step2/page.tsx). Wer sie hier
 * von Hand anklickt, macht Arbeit doppelt. Sie bleibt erreichbar, aber
 * sie drängt sich nicht mehr auf.
 *
 * Die Logik ist unverändert: Scan, Marken-Zerlegung, EnVKV-Prüfung,
 * Credit-Prüfung und Titelvorschlag arbeiten wie zuvor.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Loader2, CheckCircle2, X, AlertCircle, ArrowRight,
  ChevronDown, Search, Plus, RotateCcw, Pencil,
} from 'lucide-react';
import { BRAND_NAMES, getModels, splitBrandModel } from '../../../../lib/carDatabase';
import MarkenZeichen, { hatZeichen } from '../../../components/MarkenZeichen';
import { EQUIPMENT_DB, searchEquipment } from '../../../../lib/equipmentDatabase';
import EnvkvFields from '../../../components/EnvkvFields';
import { validateEnvkv, isEnvkvRequired, type EnvkvData, type VehicleKind } from '../../../../lib/envkv';
import { entwurfId, entwurfNeu } from '../../../../lib/entwurf';

/* ────────────────────────── Gestaltung ────────────────────────── */

/**
 * Drei Handschriften für dieselbe Struktur.
 *
 * Der Aufbau — zwei Zustände, Datenblatt, hervorgehobene Lücken — bleibt
 * in allen dreien gleich. Was sich unterscheidet, ist die Anmutung, und
 * die ist bei diesem Produkt nicht nebensächlich: Es verkauft visuelle
 * Qualität. Ein Werkzeug, das aussieht wie ein Buchhaltungsformular,
 * macht unglaubwürdig, dass am Ende ein Studiofoto herauskommt.
 *
 *   werkstatt — hell, dicht, sachlich. Am nächsten an dem, was Händler
 *               aus ihrer übrigen Software kennen.
 *   studio    — dunkel wie Bildbearbeitungssoftware. Die Fahrzeugdaten
 *               stehen auf schwarzem Grund, wie in Lightroom oder
 *               DaVinci. Passt zu dem, was das Werkzeug tut.
 *   marke     — hell, aber mit Haltung: grosse Zahlen, viel Weissraum,
 *               starke Kontraste. Sieht nach Preisschild aus, nicht nach
 *               Formular.
 */
export type Stil = 'werkstatt' | 'studio' | 'marke';

interface Farbsatz {
  schrift: string; ziffern: string;
  grund: string; blatt: string; linie: string; linieStark: string;
  text: string; gedämpft: string; leise: string;
  akzent: string; akzentHell: string;
  gut: string; luecke: string; lueckeHell: string; fehler: string;
  /** Schriftgrad der Werte im Datenblatt. */
  wertGroesse: number;
  /** Höhe einer Zeile, über die senkrechte Polsterung. */
  zeilenLuft: number;
  /** Schatten der Gruppen — Tiefe oder Flächigkeit. */
  schatten: string;
  eckenGross: number;
}

export const STILE: Record<Stil, Farbsatz> = {
  werkstatt: {
    schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    ziffern: 'ui-monospace, "SF Mono", Menlo, monospace',
    grund: '#f8fafc', blatt: '#ffffff', linie: '#e8edf3', linieStark: '#cbd5e1',
    text: '#0f172a', gedämpft: '#475569',
    // 4,76:1 gegen Weiss — heller wird Text unlesbar.
    leise: '#64748b',
    akzent: '#4338ca', akzentHell: '#eef2ff',
    gut: '#047857', luecke: '#b45309', lueckeHell: '#fffbeb', fehler: '#b91c1c',
    wertGroesse: 14, zeilenLuft: 7, schatten: 'none', eckenGross: 10,
  },

  studio: {
    schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    ziffern: 'ui-monospace, "SF Mono", Menlo, monospace',
    grund: '#0b0f17', blatt: '#151b26', linie: '#242c3a', linieStark: '#39445a',
    text: '#f1f5f9', gedämpft: '#b6c2d4',
    // 5,9:1 gegen #151b26 — auf dunklem Grund muss Grau heller sein als auf hellem.
    leise: '#8b98ad',
    akzent: '#8b93ff', akzentHell: '#1e2340',
    gut: '#4ade80', luecke: '#fbbf24', lueckeHell: '#2a2113', fehler: '#f87171',
    wertGroesse: 14.5, zeilenLuft: 9, schatten: '0 1px 0 rgba(255,255,255,0.03)', eckenGross: 12,
  },

  marke: {
    schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    ziffern: '"Inter", -apple-system, sans-serif',
    grund: '#ffffff', blatt: '#ffffff', linie: '#eceff3', linieStark: '#0f172a',
    text: '#08090c', gedämpft: '#3d4757',
    leise: '#6b7688',
    akzent: '#0f172a', akzentHell: '#f1f3f7',
    gut: '#047857', luecke: '#a16207', lueckeHell: '#fefce8', fehler: '#b91c1c',
    wertGroesse: 17, zeilenLuft: 13, schatten: '0 1px 2px rgba(15,23,42,0.04)', eckenGross: 4,
  },
};

const KRAFTSTOFFE = ['Benzin', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Elektro', 'LPG', 'CNG'];
const GETRIEBE    = ['Automatik', 'Manuell'];
/**
 * Anzeigenamen der Fahrzeugarten.
 *
 * EnvkvFields fuehrt dieselbe Liste, aber intern. Fuer die eingeklappte
 * Ansicht wird sie hier gebraucht — ohne sie kaeme niemand an die
 * Pflichtangaben heran, der sie braucht.
 */
const ART_ANZEIGE: Record<VehicleKind, string> = {
  gebrauchtwagen: 'Gebrauchtwagen',
  neuwagen:       'Neuwagen',
  tageszulassung: 'Tageszulassung',
  vorfuehrwagen:  'Vorführwagen',
  jahreswagen:    'Jahreswagen',
};

const TOP_MARKEN  = ['BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Opel', 'Ford',
                     'Skoda', 'Seat', 'Hyundai', 'Kia', 'Toyota', 'Renault'];

interface FormData {
  brand: string; model: string; vin: string;
  firstRegistration: string; km: string; price: string;
  fuelType: string; gearbox: string; powerKw: string;
  displacementCcm: string; color: string; seats: string;
  equipment: string[]; dealerNotes: string;
  envkv: EnvkvData;
}

const LEER_ENVKV: EnvkvData = {
  /*
   * Bewusst leer, nicht 'gebrauchtwagen'.
   *
   * Eine Vorbelegung waere hier eine erfundene Angabe — und ausgerechnet
   * die eine, die die EnVKV-Pruefung stilllegt. Wer einen Neuwagen
   * einstellt und das Feld nicht anfasst, haette ein Inserat ohne
   * Verbrauchswerte bekommen, das zusaetzlich als Gebrauchtwagen
   * ausgezeichnet ist.
   */
  vehicleKind: '',
  consumptionCombined: null,
  powerConsumptionCombined: null,
  co2Combined: null,
  co2CombinedDischarged: null,
  electricRangeKm: null,
};

/* ────────────────────────── Formular ────────────────────────── */

export default function Formular({ stil = 'werkstatt' }: { stil?: Stil } = {}) {
  /* Alle Farb- und Massangaben kommen aus dem gewaehlten Stil. */
  const T = STILE[stil];

  const router = useRouter();
  const dateiRef  = useRef<HTMLInputElement>(null);
  const markeRef  = useRef<HTMLDivElement>(null);
  const modellRef = useRef<HTMLDivElement>(null);

  useEffect(() => { entwurfNeu(); }, []);

  /*
   * Seitenhintergrund mitziehen.
   *
   * Die Wurzel dieser Komponente ist nur 100vh hoch — dahinter liegt der
   * Grundton aus globals.css. Beim hellen Stil faellt das nicht auf, beim
   * dunklen schon: ueber und unter dem Inhalt bliebe ein heller Streifen,
   * und beim Ueberscrollen leuchtet er auf.
   */
  useEffect(() => {
    const vorher = document.body.style.background;
    document.body.style.background = STILE[stil].grund;
    return () => { document.body.style.background = vorher; };
  }, [stil]);

  const [data, setData] = useState<FormData>({
    brand: '', model: '', vin: '', firstRegistration: '', km: '', price: '',
    fuelType: '', gearbox: '', powerKw: '', displacementCcm: '',
    color: '', seats: '', equipment: [], dealerNotes: '',
    envkv: LEER_ENVKV,
  });

  /** Ist das Datenblatt schon sichtbar? Erst nach Scan oder auf Wunsch. */
  const [blattOffen, setBlattOffen]   = useState(false);
  const [fehler, setFehler]           = useState<Record<string, string>>({});
  const [erkannt, setErkannt]         = useState<Set<string>>(new Set());
  const [scanZustand, setScanZustand] = useState<'ruhe' | 'laeuft' | 'fertig' | 'fehler'>('ruhe');
  const [scanBild, setScanBild]       = useState<string | null>(null);
  const [ueberZone, setUeberZone]     = useState(false);
  const [markeSuche, setMarkeSuche]   = useState('');
  const [markeOffen, setMarkeOffen]   = useState(false);
  const [modellOffen, setModellOffen] = useState(false);
  const [ausstattungOffen, setAusstattungOffen] = useState(false);
  const [envkvOffen, setEnvkvOffen]             = useState(false);
  const [ausstattungSuche, setAusstattungSuche] = useState('');
  const [kategorieOffen, setKategorieOffen]     = useState<string | null>(null);
  const [unterwegs, setUnterwegs]     = useState(false);
  const [schmal, setSchmal]           = useState(false);

  useEffect(() => {
    const prüfen = () => setSchmal(window.innerWidth < 940);
    prüfen();
    window.addEventListener('resize', prüfen);
    return () => window.removeEventListener('resize', prüfen);
  }, []);

  useEffect(() => {
    const zu = (e: MouseEvent) => {
      if (markeRef.current && !markeRef.current.contains(e.target as Node)) setMarkeOffen(false);
      if (modellRef.current && !modellRef.current.contains(e.target as Node)) setModellOffen(false);
    };
    document.addEventListener('mousedown', zu);
    return () => document.removeEventListener('mousedown', zu);
  }, []);

  const setzen = (k: keyof FormData, v: string | string[]) => {
    setData(p => ({ ...p, [k]: v }));
    setFehler(p => ({ ...p, [k]: '' }));
    setErkannt(p => { const n = new Set(p); n.delete(k as string); return n; });
  };

  const PFLICHT = ['brand', 'km', 'price'] as const;
  const offenePflicht = PFLICHT.filter(k => !String(data[k]).trim());
  const pflichtName: Record<string, string> = { brand: 'Marke', km: 'Kilometerstand', price: 'Preis' };

  /*
   * Sind die Verbrauchsangaben vorgeschrieben? Bei Gebrauchtwagen nicht —
   * und das ist der Normalfall. Der Block bleibt dann eingeklappt.
   */
  const envkvPflicht = isEnvkvRequired(data.envkv.vehicleKind);
  const envkvSichtbar = envkvPflicht || envkvOffen;

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
        // Auch bei einem gescheiterten Scan soll er weiterarbeiten können.
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

  /* ── Listen ── */

  const markenGefiltert = useMemo(
    () => BRAND_NAMES.filter(b => b.toLowerCase().includes(markeSuche.toLowerCase())),
    [markeSuche],
  );
  const modelle = useMemo(() => (data.brand ? getModels(data.brand) : []), [data.brand]);
  const ausstattungTreffer = useMemo(
    () => (ausstattungSuche.trim() ? searchEquipment(ausstattungSuche).slice(0, 10) : []),
    [ausstattungSuche],
  );

  /* ── Bausteine des Datenblatts ── */

  /** Eine Zeile: Beschriftung links, Wert rechts. Die Grundform des Blatts. */
  const Zeile = ({ name, pflicht, luecke, markiert, kinder }: {
    name: string; pflicht?: boolean; luecke?: boolean; markiert?: boolean;
    kinder: React.ReactNode;
  }) => (
    <div
      data-luecke={luecke ? 'true' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: schmal ? '1fr' : '150px 1fr',
        gap: schmal ? 5 : 14,
        alignItems: 'center',
        padding: schmal ? `${T.zeilenLuft + 2}px 14px` : `${T.zeilenLuft}px 16px`,
        borderBottom: `1px solid ${T.linie}`,
        // Eine Lücke wird hinterlegt, kein Rahmen: Der Blick soll beim
        // Überfliegen daran hängenbleiben, ohne dass es nach Fehler aussieht.
        background: luecke ? T.lueckeHell : 'transparent',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 12.5, color: luecke ? T.luecke : T.leise,
        fontWeight: luecke ? 600 : 500,
      }}>
        {name}
        {pflicht && <span style={{ color: T.fehler }}>*</span>}
        {markiert && <CheckCircle2 size={11} color={T.gut} style={{ marginLeft: 'auto' }} />}
      </div>
      <div style={{ minWidth: 0 }}>{kinder}</div>
    </div>
  );

  /** Eingabefeld ohne Rahmen — das Blatt trägt die Struktur, nicht der Kasten. */
  const EING: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'transparent', border: 'none', outline: 'none',
    padding: '5px 0', color: T.text, fontSize: T.wertGroesse, fontFamily: T.schrift,
  };
  const ZAHL: React.CSSProperties = { ...EING, fontFamily: T.ziffern, letterSpacing: '-0.01em' };

  /** Gruppe von Zeilen mit Überschrift. */
  const Gruppe = ({ titel, kinder, rechts }: { titel: string; kinder: React.ReactNode; rechts?: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 16px 7px', fontSize: 11, fontWeight: 700,
        color: T.leise, letterSpacing: '0.07em', textTransform: 'uppercase',
      }}>
        {titel}
        {rechts && <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }}>{rechts}</span>}
      </div>
      <div style={{
        background: T.blatt, border: `1px solid ${T.linie}`,
        borderRadius: T.eckenGross, boxShadow: T.schatten, overflow: 'visible',
      }}>{kinder}</div>
    </div>
  );

  /** Reihe kleiner Schaltflächen statt Aufklappmenü. */
  const Wahl = ({ optionen, wert, feld, beiWahl }: {
    optionen: string[]; wert: string; feld?: keyof FormData; beiWahl?: (v: string) => void;
  }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '2px 0' }}>
      {optionen.map(o => {
        const an = wert === o;
        return (
          <button key={o} type="button"
            onClick={() => (beiWahl ? beiWahl(o) : feld && setzen(feld, an ? '' : o))}
            style={{
              padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
              fontFamily: T.schrift, fontSize: 12.5, fontWeight: an ? 600 : 500,
              border: `1px solid ${an ? T.akzent : T.linie}`,
              background: an ? T.akzentHell : T.blatt,
              color: an ? T.akzent : T.gedämpft,
            }}>{o}</button>
        );
      })}
    </div>
  );

  const scanLaeuft = scanZustand === 'laeuft';

  /* ────────────────────────── Darstellung ────────────────────────── */

  return (
    <div style={{ minHeight: '100vh', background: T.grund, fontFamily: T.schrift, color: T.text }}>

      {/* ══ Kopf ══ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 48,
        display: 'flex', alignItems: 'center',
        background: T.blatt, borderBottom: `1px solid ${T.linie}`,
      }}>
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '0 20px', width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>Neues Inserat</span>
          <span style={{ fontSize: 12.5, color: T.leise }}>Schritt 1 von 4 · Fahrzeugdaten</span>
          {blattOffen && offenePflicht.length > 0 && (
            <span style={{
              marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: T.luecke,
              background: T.lueckeHell, padding: '3px 9px', borderRadius: 6,
            }}>
              {offenePflicht.length} {offenePflicht.length === 1 ? 'Lücke' : 'Lücken'}
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 940, margin: '0 auto', padding: blattOffen ? '20px 20px 96px' : '0 20px' }}>

        {/* ══ Zustand A: nur der Fahrzeugschein ══ */}
        {!blattOffen ? (
          <div style={{
            minHeight: 'calc(100vh - 48px)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
              <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>
                Fahrzeugschein fotografieren
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: T.leise, lineHeight: 1.6 }}>
                Zulassungsbescheinigung Teil I. Marke, Modell, Erstzulassung, Leistung,
                Hubraum und Farbe werden ausgelesen — du trägst nur noch den Preis nach.
              </p>
            </div>

            <button
              type="button"
              onClick={() => dateiRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setUeberZone(true); }}
              onDragLeave={() => setUeberZone(false)}
              onDrop={e => {
                e.preventDefault(); setUeberZone(false);
                const f = e.dataTransfer.files?.[0];
                if (f?.type.startsWith('image/')) einlesen(f);
              }}
              disabled={scanLaeuft}
              style={{
                width: '100%', maxWidth: 420, padding: '40px 24px', borderRadius: 14,
                border: `1.5px dashed ${ueberZone ? T.akzent : T.linieStark}`,
                background: ueberZone ? T.akzentHell : T.blatt,
                cursor: scanLaeuft ? 'wait' : 'pointer', fontFamily: T.schrift,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
              {scanLaeuft ? (
                <>
                  <Loader2 size={26} color={T.akzent} style={{ animation: 'drehen .8s linear infinite' }} />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>Wird gelesen…</span>
                  <span style={{ fontSize: 12.5, color: T.leise }}>Dauert ein paar Sekunden</span>
                </>
              ) : (
                <>
                  <Camera size={26} color={T.akzent} />
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>Foto aufnehmen oder auswählen</span>
                  <span style={{ fontSize: 12.5, color: T.leise }}>JPG, PNG, HEIC · oder hierher ziehen</span>
                </>
              )}
            </button>

            <button type="button" onClick={() => setBlattOffen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.schrift,
                fontSize: 13, color: T.leise, textDecoration: 'underline', textUnderlineOffset: 3,
              }}>
              Ohne Schein von Hand eintragen
            </button>
          </div>
        ) : (
          <>
            {/* ══ Zustand B: das Datenblatt ══ */}

            {/* Kopfzeile des Blatts: was der Scan gebracht hat */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
              padding: '10px 14px', borderRadius: 10,
              background: scanZustand === 'fertig' ? T.blatt : T.lueckeHell,
              border: `1px solid ${scanZustand === 'fertig' ? T.linie : '#fde68a'}`,
            }}>
              {scanBild && scanZustand === 'fertig' ? (
                <img src={scanBild} alt="Fahrzeugschein" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 6, border: `1px solid ${T.linie}` }} />
              ) : (
                <AlertCircle size={18} color={T.luecke} style={{ flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                {scanZustand === 'fertig' ? (
                  <>
                    <strong style={{ color: T.gut }}>{erkannt.size} Felder aus dem Schein übernommen.</strong>
                    <span style={{ color: T.leise }}> Hervorgehoben ist, was noch fehlt.</span>
                  </>
                ) : scanZustand === 'fehler' ? (
                  <span style={{ color: T.luecke }}>Der Schein konnte nicht gelesen werden — trag die Daten von Hand ein.</span>
                ) : (
                  <span style={{ color: T.luecke }}>Ohne Schein eingetragen. Ein Foto würde die meisten Zeilen füllen.</span>
                )}
              </div>
              <button type="button" onClick={() => dateiRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  padding: '6px 11px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${T.linieStark}`, background: T.blatt,
                  fontFamily: T.schrift, fontSize: 12.5, fontWeight: 600, color: T.gedämpft,
                }}>
                {scanZustand === 'fertig' ? <><RotateCcw size={12} /> Neu scannen</> : <><Camera size={12} /> Schein scannen</>}
              </button>
            </div>

            {/* ── Fahrzeug ── */}
            <Gruppe titel="Fahrzeug" kinder={
              <>
                <Zeile name="Marke" pflicht luecke={!data.brand} markiert={erkannt.has('brand')} kinder={
                  <div ref={markeRef} style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setMarkeOffen(o => !o)}
                      style={{ ...EING, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                      {data.brand && hatZeichen(data.brand) && <MarkenZeichen marke={data.brand} groesse={16} farbe={T.gedämpft} />}
                      <span style={{ color: data.brand ? T.text : T.leise, flex: 1 }}>{data.brand || 'wählen'}</span>
                      <ChevronDown size={14} color={T.leise} />
                    </button>
                    {markeOffen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: -8, right: -8, zIndex: 30, marginTop: 2,
                        background: T.blatt, border: `1px solid ${T.linieStark}`, borderRadius: 10,
                        boxShadow: '0 14px 34px rgba(15,23,42,0.14)', maxHeight: 330, overflow: 'auto',
                      }}>
                        <div style={{ padding: 7, borderBottom: `1px solid ${T.linie}`, position: 'sticky', top: 0, background: T.blatt }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={13} color={T.leise} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                            <input autoFocus value={markeSuche} onChange={e => setMarkeSuche(e.target.value)}
                              placeholder="Marke suchen…"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px 7px 28px', fontSize: 13,
                                       border: `1px solid ${T.linie}`, borderRadius: 7, outline: 'none', fontFamily: T.schrift }} />
                          </div>
                        </div>
                        {!markeSuche ? (
                          <>
                            {/*
                              Entweder Schnellauswahl oder Liste, nie beides —
                              sonst steht jede häufige Marke zweimal untereinander.
                            */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, padding: 7 }}>
                              {TOP_MARKEN.map(m => (
                                <button key={m} type="button"
                                  onClick={() => { setzen('brand', m); setzen('model', ''); setMarkeOffen(false); }}
                                  style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                    padding: '9px 3px', borderRadius: 8, cursor: 'pointer',
                                    border: `1px solid ${data.brand === m ? T.akzent : T.linie}`,
                                    background: data.brand === m ? T.akzentHell : T.blatt,
                                    fontFamily: T.schrift, fontSize: 11, fontWeight: 600,
                                    color: data.brand === m ? T.akzent : T.gedämpft,
                                  }}>
                                  {/* Kein Kürzel neben dem Namen — "FOR" über "Ford" liest sich wie ein Fehler. */}
                                  {hatZeichen(m) && <MarkenZeichen marke={m} groesse={18} farbe={data.brand === m ? T.akzent : T.gedämpft} />}
                                  {m}
                                </button>
                              ))}
                            </div>
                            <p style={{ margin: 0, padding: '0 12px 9px', fontSize: 11.5, color: T.leise }}>
                              Andere Marke? Oben tippen.
                            </p>
                          </>
                        ) : (
                          <div>
                            {markenGefiltert.slice(0, 60).map(m => (
                              <button key={m} type="button"
                                onClick={() => { setzen('brand', m); setzen('model', ''); setMarkeOffen(false); setMarkeSuche(''); }}
                                style={{
                                  width: '100%', textAlign: 'left', padding: '8px 13px', border: 'none',
                                  background: data.brand === m ? T.akzentHell : 'transparent',
                                  color: data.brand === m ? T.akzent : T.text, cursor: 'pointer',
                                  fontFamily: T.schrift, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7,
                                }}>
                                {hatZeichen(m) && <MarkenZeichen marke={m} groesse={14} farbe={T.leise} />}
                                {m}
                              </button>
                            ))}
                            {markenGefiltert.length === 0 && (
                              <p style={{ padding: '11px 13px', margin: 0, fontSize: 12.5, color: T.leise }}>
                                Keine Marke gefunden.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                } />

                <Zeile name="Modell" markiert={erkannt.has('model')} kinder={
                  <div ref={modellRef} style={{ position: 'relative' }}>
                    <input value={data.model}
                      onChange={e => setzen('model', e.target.value)}
                      onFocus={() => modelle.length > 0 && setModellOffen(true)}
                      placeholder={data.brand ? (modelle[0] ? modelle[0] : 'Modell') : 'erst Marke wählen'}
                      disabled={!data.brand}
                      style={EING} />
                    {modellOffen && modelle.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: -8, right: -8, zIndex: 30, marginTop: 2,
                        background: T.blatt, border: `1px solid ${T.linieStark}`, borderRadius: 10,
                        boxShadow: '0 14px 34px rgba(15,23,42,0.14)', maxHeight: 230, overflow: 'auto',
                      }}>
                        {modelle.filter(m => m.toLowerCase().includes(data.model.toLowerCase())).slice(0, 40).map(m => (
                          <button key={m} type="button" onClick={() => { setzen('model', m); setModellOffen(false); }}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 13px', border: 'none',
                                     background: 'transparent', color: T.text, cursor: 'pointer',
                                     fontFamily: T.schrift, fontSize: 13 }}>{m}</button>
                        ))}
                      </div>
                    )}
                  </div>
                } />

                <Zeile name="Erstzulassung" markiert={erkannt.has('firstRegistration')} kinder={
                  <input value={data.firstRegistration} onChange={e => setzen('firstRegistration', e.target.value)}
                    placeholder="03/2019" style={ZAHL} />
                } />

                <Zeile name="Fahrgestellnummer" markiert={erkannt.has('vin')} kinder={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input value={data.vin}
                      onChange={e => setzen('vin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="WVWZZZ1JZW000001" maxLength={17}
                      style={{ ...ZAHL, letterSpacing: '0.05em' }} />
                    {data.vin.length > 0 && (
                      <span style={{ fontSize: 11, fontFamily: T.ziffern, color: data.vin.length === 17 ? T.gut : T.leise }}>
                        {data.vin.length}/17
                      </span>
                    )}
                  </div>
                } />
              </>
            } />

            {/* ── Eckdaten ── */}
            <Gruppe titel="Eckdaten" kinder={
              <>
                <Zeile name="Kilometerstand" pflicht luecke={!data.km} markiert={erkannt.has('km')} kinder={
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <input inputMode="numeric" value={data.km ? Number(data.km).toLocaleString('de-DE') : ''}
                      onChange={e => setzen('km', e.target.value.replace(/\D/g, ''))}
                      placeholder="84.500" style={ZAHL} />
                    <span style={{ fontSize: 12.5, color: T.leise, flexShrink: 0 }}>km</span>
                  </div>
                } />
                <Zeile name="Preis" pflicht luecke={!data.price} kinder={
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <input inputMode="numeric" value={data.price ? Number(data.price).toLocaleString('de-DE') : ''}
                      onChange={e => setzen('price', e.target.value.replace(/\D/g, ''))}
                      placeholder="18.900" style={{ ...ZAHL, fontWeight: 600 }} />
                    <span style={{ fontSize: 12.5, color: T.leise, flexShrink: 0 }}>€</span>
                  </div>
                } />
              </>
            } />

            {/* ── Technik ── */}
            <Gruppe titel="Technik" kinder={
              <>
                <Zeile name="Kraftstoff" markiert={erkannt.has('fuelType')} kinder={
                  <Wahl optionen={KRAFTSTOFFE} wert={data.fuelType} feld="fuelType" />
                } />
                <Zeile name="Getriebe" kinder={
                  <Wahl optionen={GETRIEBE} wert={data.gearbox} feld="gearbox" />
                } />
                <Zeile name="Leistung" markiert={erkannt.has('powerKw')} kinder={
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <input inputMode="numeric" value={data.powerKw}
                      onChange={e => setzen('powerKw', e.target.value.replace(/\D/g, ''))}
                      placeholder="150" style={ZAHL} />
                    <span style={{ fontSize: 12.5, color: T.leise, flexShrink: 0 }}>PS</span>
                  </div>
                } />
                <Zeile name="Hubraum" markiert={erkannt.has('displacementCcm')} kinder={
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <input inputMode="numeric" value={data.displacementCcm}
                      onChange={e => setzen('displacementCcm', e.target.value.replace(/\D/g, ''))}
                      placeholder="1968" style={ZAHL} />
                    <span style={{ fontSize: 12.5, color: T.leise, flexShrink: 0 }}>ccm</span>
                  </div>
                } />
                <Zeile name="Farbe" markiert={erkannt.has('color')} kinder={
                  <input value={data.color} onChange={e => setzen('color', e.target.value)}
                    placeholder="Tiefschwarz Perleffekt" style={EING} />
                } />
                <Zeile name="Sitzplätze" markiert={erkannt.has('seats')} kinder={
                  <Wahl optionen={['2', '4', '5', '7']} wert={data.seats} feld="seats" />
                } />
              </>
            } />

            {/* ── Verbrauch ── */}
            <Gruppe titel="Verbrauch und Emissionen"
              rechts={
                envkvPflicht
                  ? <span style={{ fontSize: 11.5, color: T.luecke, fontWeight: 600 }}>Pflichtangaben</span>
                  : <span style={{ fontSize: 11.5, color: T.leise, fontWeight: 500 }}>bei Gebrauchtwagen freiwillig</span>
              }
              kinder={
                <div style={{ padding: envkvSichtbar ? 16 : 0 }} data-luecke={fehler.envkv ? 'true' : undefined}>
                {/*
                  Bei Gebrauchtwagen eingeklappt.
                  Dieser Block war mit 530 Pixeln der groesste der Seite —
                  bei einem Gebrauchtwagen, also dem Normalfall, sind die
                  Angaben aber gar nicht vorgeschrieben. Ein Drittel der
                  Seitenhoehe fuer etwas, das die meisten Inserate nicht
                  brauchen.

                  Die Fahrzeugart bleibt trotzdem waehlbar, sonst kaeme
                  niemand an die Pflichtangaben heran, der sie braucht.
                */}
                {!envkvSichtbar ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    padding: '11px 16px',
                  }}>
                    <span style={{ fontSize: 12.5, color: T.leise }}>Fahrzeugart:</span>
                    <Wahl
                      optionen={['Gebrauchtwagen', 'Neuwagen', 'Tageszulassung', 'Vorführwagen', 'Jahreswagen']}
                      wert={ART_ANZEIGE[data.envkv.vehicleKind as VehicleKind] ?? ''}
                      beiWahl={anzeige => {
                        const schluessel = (Object.keys(ART_ANZEIGE) as VehicleKind[])
                          .find(k => ART_ANZEIGE[k] === anzeige);
                        if (!schluessel) return;
                        setData(p => ({ ...p, envkv: { ...p.envkv, vehicleKind: schluessel } }));
                        setFehler(p => ({ ...p, envkv: '' }));
                      }}
                    />
                    <button type="button" onClick={() => setEnvkvOffen(true)}
                      style={{
                        marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: T.schrift, fontSize: 12.5, color: T.leise,
                        textDecoration: 'underline', textUnderlineOffset: 3, padding: 0,
                      }}>
                      Werte freiwillig angeben
                    </button>
                  </div>
                ) : (
                  <>
                  {/*
                    EnvkvFields meldet nur die geänderten Felder, nicht den
                    ganzen Satz — das Ergebnis muss auf den bestehenden Stand
                    gelegt werden, sonst löscht jede Eingabe die anderen Werte.
                  */}
                  <EnvkvFields
                    value={data.envkv}
                    fuelType={data.fuelType}
                    isMobile={schmal}
                    onChange={teil => {
                      setData(p => ({ ...p, envkv: { ...p.envkv, ...teil } }));
                      setFehler(p => ({ ...p, envkv: '' }));
                    }}
                  />
                  {fehler.envkv && (
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: T.fehler, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertCircle size={13} /> {fehler.envkv}
                    </p>
                  )}
                  </>
                )}
                </div>
              }
            />

            {/* ── Ausstattung: eingeklappt ── */}
            <Gruppe
              titel="Ausstattung"
              rechts={
                <span style={{ fontSize: 11.5, color: T.leise, fontWeight: 500 }}>
                  {data.equipment.length > 0 ? `${data.equipment.length} erfasst · ` : ''}
                  wird aus den Fotos ergänzt
                </span>
              }
              kinder={
                <div style={{ padding: '12px 16px' }}>
                  {data.equipment.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {data.equipment.map((e, i) => (
                        <span key={`${e}-${i}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 6px 3px 9px', borderRadius: 6,
                          background: T.grund, border: `1px solid ${T.linie}`,
                          fontSize: 12, color: T.gedämpft,
                        }}>
                          {e}
                          <button type="button" onClick={() => setzen('equipment', data.equipment.filter((_, j) => j !== i))}
                            style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.leise }}>
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T.leise, lineHeight: 1.6 }}>
                    {/*
                      Der Grund fürs Einklappen gehört sichtbar hin: Sonst
                      denkt der Händler, er müsse hier durch — und macht
                      Arbeit, die Schritt 2 ihm gleich abnimmt.
                    */}
                    Beim Hochladen der Fotos wird erkannt, was zu sehen ist — Navi, Sitzheizung,
                    Felgen, Assistenzsysteme. Hier lohnt sich nur, was man <em>nicht</em> sieht:
                    Scheckheft, Vorbesitzer, Standheizung.
                  </p>

                  <div style={{ position: 'relative', marginBottom: ausstattungOffen ? 10 : 0 }}>
                    <Plus size={14} color={T.leise} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      value={ausstattungSuche}
                      onChange={e => setAusstattungSuche(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && ausstattungSuche.trim()) {
                          e.preventDefault();
                          const v = ausstattungSuche.trim();
                          if (!data.equipment.includes(v)) setzen('equipment', [...data.equipment, v]);
                          setAusstattungSuche('');
                        }
                      }}
                      placeholder="Eintippen und Enter — z.B. Scheckheftgepflegt"
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 30px',
                        border: `1px solid ${T.linie}`, borderRadius: 8, outline: 'none',
                        fontSize: 13, fontFamily: T.schrift,
                      }} />
                  </div>

                  {ausstattungTreffer.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                      {ausstattungTreffer.map(eintrag => {
                        const t = eintrag.label;
                        const drin = data.equipment.includes(t);
                        return (
                          <button key={eintrag.id} type="button" disabled={drin}
                            onClick={() => { setzen('equipment', [...data.equipment, t]); setAusstattungSuche(''); }}
                            style={{
                              padding: '4px 9px', borderRadius: 6, cursor: drin ? 'default' : 'pointer',
                              border: `1px solid ${T.linie}`, background: drin ? T.grund : T.blatt,
                              color: drin ? T.leise : T.gedämpft, fontFamily: T.schrift, fontSize: 12,
                            }}>{drin ? '✓ ' : '+ '}{t}</button>
                        );
                      })}
                    </div>
                  )}

                  <button type="button" onClick={() => setAusstattungOffen(o => !o)}
                    style={{
                      marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: T.schrift, fontSize: 12.5, color: T.leise,
                      display: 'flex', alignItems: 'center', gap: 5, padding: 0,
                    }}>
                    <ChevronDown size={13} style={{ transform: ausstattungOffen ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
                    {ausstattungOffen ? 'Liste schliessen' : 'Alle Merkmale durchgehen'}
                  </button>

                  {ausstattungOffen && (
                    <div style={{ marginTop: 10, border: `1px solid ${T.linie}`, borderRadius: 8, overflow: 'hidden' }}>
                      {EQUIPMENT_DB.map(gruppe => {
                        const offen = kategorieOffen === gruppe.label;
                        return (
                          <div key={gruppe.label} style={{ borderBottom: `1px solid ${T.linie}` }}>
                            <button type="button" onClick={() => setKategorieOffen(offen ? null : gruppe.label)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                                padding: '9px 12px', border: 'none', background: offen ? T.grund : T.blatt,
                                cursor: 'pointer', fontFamily: T.schrift, fontSize: 12.5, fontWeight: 600, color: T.gedämpft,
                              }}>
                              <ChevronDown size={12} style={{ transform: offen ? 'none' : 'rotate(-90deg)' }} />
                              {gruppe.label}
                              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: T.leise, fontWeight: 500 }}>{gruppe.items.length}</span>
                            </button>
                            {offen && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '2px 12px 12px' }}>
                                {gruppe.items.map(eintrag => {
                                  const e = eintrag.label;
                                  const drin = data.equipment.includes(e);
                                  return (
                                    <button key={eintrag.id} type="button"
                                      onClick={() => setzen('equipment', drin
                                        ? data.equipment.filter(x => x !== e)
                                        : [...data.equipment, e])}
                                      style={{
                                        padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
                                        border: `1px solid ${drin ? T.akzent : T.linie}`,
                                        background: drin ? T.akzentHell : T.blatt,
                                        color: drin ? T.akzent : T.gedämpft,
                                        fontFamily: T.schrift, fontSize: 12, fontWeight: drin ? 600 : 500,
                                      }}>{e}</button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              }
            />

            {/* ── Notizen ── */}
            <Gruppe titel="Notizen für die Beschreibung"
              rechts={<span style={{ fontSize: 11.5, color: T.leise, fontWeight: 500 }}>freiwillig, macht den Text besser</span>}
              kinder={
                <textarea value={data.dealerNotes} onChange={e => setzen('dealerNotes', e.target.value)} rows={2}
                  placeholder="Zwei Vorbesitzer, Winterreifen auf Alu dabei, kleiner Kratzer hinten rechts."
                  style={{
                    width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
                    padding: 16, fontSize: 13.5, fontFamily: T.schrift, resize: 'vertical',
                    lineHeight: 1.6, background: 'transparent', color: T.text,
                  }} />
              }
            />
          </>
        )}
      </main>

      <input ref={dateiRef} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) einlesen(f); }} />

      {/* ══ Fussleiste ══ */}
      {blattOffen && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
          background: T.blatt, borderTop: `1px solid ${T.linie}`,
          // Auf dem Handy sitzt die Dashboard-Navigation unten fest (56 px).
          // Ohne diesen Abstand liegt der Weiter-Knopf darunter und ist nicht
          // antippbar — der Fehler hat es schon einmal in die Anwendung geschafft.
          paddingBottom: schmal ? 56 : 0,
        }}>
          <div style={{ maxWidth: 940, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
              {offenePflicht.length > 0
                ? <span style={{ color: T.luecke, fontWeight: 600 }}>
                    Fehlt noch: {offenePflicht.map(k => pflichtName[k]).join(', ')}
                  </span>
                : <span style={{ color: T.leise }}>
                    {[data.brand, data.model].filter(Boolean).join(' ')}
                    {data.km && ` · ${Number(data.km).toLocaleString('de-DE')} km`}
                    {data.price && ` · ${Number(data.price).toLocaleString('de-DE')} €`}
                  </span>}
            </div>
            <button type="button" onClick={weiter} disabled={unterwegs}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', borderRadius: 9, border: 'none',
                background: T.akzent, color: '#fff', fontFamily: T.schrift,
                fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap',
                cursor: unterwegs ? 'wait' : 'pointer', opacity: unterwegs ? 0.7 : 1,
              }}>
              {unterwegs && <Loader2 size={14} style={{ animation: 'drehen .8s linear infinite' }} />}
              Weiter zu den Fotos <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes drehen { to { transform: rotate(360deg) } }
        input::placeholder, textarea::placeholder { color: ${T.leise}; opacity: 1 }
      `}</style>
    </div>
  );
}
