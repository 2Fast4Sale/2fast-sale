'use client';

/**
 * Schritt 1 — Fahrzeugdaten erfassen.
 *
 * Neu aufgebaut. Die vorherige Fassung war über Monate gewachsen und
 * hatte sich dabei drei Eigenschaften angewöhnt, die ein Werkzeug für
 * den täglichen Gebrauch nicht haben darf:
 *
 * Zu viel Farbe. Jede Marke hatte ihr eigenes Blau oder Rot, jeder
 * Kraftstoff eine eigene Farbe, dazu Verläufe auf Knöpfen und Karten.
 * Wer damit zwanzig Fahrzeuge am Tag einträgt, sieht irgendwann nur noch
 * Farbe und nicht mehr die Felder. Jetzt gibt es einen Akzent, sonst
 * Grautöne — Farbe bedeutet dann etwas: erkannt, fehlt, Pflichtangabe.
 *
 * Keine Rangfolge. Der Fahrzeugschein-Scan füllt das halbe Formular, war
 * aber eine schmale Leiste zwischen anderen Kästen. Jetzt steht er oben
 * und allein: Es ist der Weg, den ein Händler nehmen soll.
 *
 * Eine Vorschaukarte, die keine war. Rechts stand ein Nachbau eines
 * Inserats mit grauem Kasten statt Foto. Sie zeigte nichts, was das
 * Formular nicht auch zeigt, und nahm die halbe Breite. An ihrer Stelle
 * steht jetzt eine Leiste, die sagt, was noch fehlt — die einzige Frage,
 * die beim Ausfüllen wirklich aufkommt.
 *
 * Die Logik ist unverändert: Scan, Marken-Zerlegung, EnVKV-Prüfung,
 * Credit-Prüfung und Titelvorschlag arbeiten wie zuvor.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Loader2, CheckCircle2, X, AlertCircle, ArrowRight,
  ChevronDown, Search, Plus, RotateCcw,
} from 'lucide-react';
import { BRAND_NAMES, getModels, splitBrandModel } from '../../../../lib/carDatabase';
import MarkenZeichen, { hatZeichen } from '../../../components/MarkenZeichen';
import { EQUIPMENT_DB, searchEquipment } from '../../../../lib/equipmentDatabase';
import EnvkvFields from '../../../components/EnvkvFields';
import { validateEnvkv, type EnvkvData } from '../../../../lib/envkv';
import { entwurfId, entwurfNeu } from '../../../../lib/entwurf';

/* ────────────────────────── Gestaltung ────────────────────────── */

const T = {
  schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  grund:   '#f1f5f9',
  karte:   '#ffffff',
  rand:    '#e2e8f0',
  randStark: '#cbd5e1',
  text:    '#0f172a',
  gedämpft:'#475569',
  /*
   * 4,76:1 gegen Weiss. Vorher #94a3b8 mit 2,56:1 — das lag deutlich
   * unter der Lesbarkeitsgrenze und trug ausgerechnet die Hinweise, die
   * etwas erklaeren ("Pflicht bei Neuwagen…"). Fuer dekorative Flaechen
   * waere es gegangen, fuer Text nicht.
   */
  leise:   '#64748b',
  akzent:  '#4f46e5',
  akzentHell: '#eef2ff',
  // 5,48:1. #059669 kam auf 3,77 und reichte fuer 11px nicht.
  gut:     '#047857',
  gutHell: '#ecfdf5',
  fehler:  '#dc2626',
  fehlerHell: '#fef2f2',
} as const;

const KRAFTSTOFFE = ['Benzin', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Elektro', 'LPG', 'CNG'];
const GETRIEBE    = ['Automatik', 'Manuell'];

/**
 * Marken für die Schnellauswahl.
 *
 * Ohne Markenfarben. Vorher hatte jede Kachel den Hausfarbton des
 * Herstellers — zwölf gesättigte Farben nebeneinander, die um
 * Aufmerksamkeit konkurrieren, obwohl es nur eine Auswahl ist.
 */
const TOP_MARKEN = [
  'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Opel', 'Ford',
  'Skoda', 'Seat', 'Hyundai', 'Kia', 'Toyota', 'Renault',
];

interface FormData {
  brand: string; model: string; vin: string;
  firstRegistration: string; km: string; price: string;
  fuelType: string; gearbox: string; powerKw: string;
  displacementCcm: string; color: string; seats: string;
  equipment: string[]; dealerNotes: string;
  envkv: EnvkvData;
}

const LEER_ENVKV: EnvkvData = {
  vehicleKind: 'gebrauchtwagen',
  consumptionCombined: null,
  powerConsumptionCombined: null,
  co2Combined: null,
  co2CombinedDischarged: null,
  electricRangeKm: null,
};

/* ────────────────────────── Bausteine ────────────────────────── */

/** Abschnitt mit Nummer und Titel. */
function Abschnitt({ nummer, titel, hinweis, kinder, aktion }: {
  nummer: number; titel: string; hinweis?: string;
  kinder: React.ReactNode; aktion?: React.ReactNode;
}) {
  return (
    <section style={{
      background: T.karte, border: `1px solid ${T.rand}`,
      borderRadius: 14, marginBottom: 14, overflow: 'hidden',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: `1px solid ${T.rand}`,
      }}>
        <span style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          background: T.grund, color: T.gedämpft,
          fontSize: 12, fontWeight: 700, lineHeight: '24px', textAlign: 'center',
        }}>{nummer}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>{titel}</h2>
          {hinweis && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: T.leise }}>{hinweis}</p>}
        </div>
        {aktion}
      </header>
      <div style={{ padding: 20 }}>{kinder}</div>
    </section>
  );
}

/** Beschriftetes Eingabefeld. */
function Feld({ label, pflicht, fehler, erkannt, einheit, hinweis, kinder }: {
  label: string; pflicht?: boolean; fehler?: string; erkannt?: boolean;
  einheit?: string; hinweis?: string; kinder: React.ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        fontSize: 12.5, fontWeight: 600, color: T.gedämpft,
      }}>
        {label}
        {pflicht && <span style={{ color: T.fehler }}>*</span>}
        {einheit && <span style={{ color: T.leise, fontWeight: 500 }}>({einheit})</span>}
        {/*
          Ein erkanntes Feld wird markiert, nicht eingefärbt. Der Händler
          soll auf einen Blick sehen, was der Scan geliefert hat — und was
          er selbst nachtragen muss.
        */}
        {erkannt && (
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700, color: T.gut,
          }}>
            <CheckCircle2 size={11} /> erkannt
          </span>
        )}
      </label>
      {kinder}
      {hinweis && !fehler && <p style={{ margin: '5px 0 0', fontSize: 12, color: T.leise }}>{hinweis}</p>}
      {fehler && (
        <p style={{ margin: '5px 0 0', fontSize: 12, color: T.fehler, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={12} /> {fehler}
        </p>
      )}
    </div>
  );
}

/** Auswahl aus wenigen Möglichkeiten — ersetzt ein Aufklappmenü. */
function Wahl({ optionen, wert, aufWahl, spalten }: {
  optionen: string[]; wert: string; aufWahl: (v: string) => void; spalten?: number;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: spalten ? `repeat(${spalten}, 1fr)` : 'repeat(auto-fit, minmax(92px, 1fr))',
      gap: 6,
    }}>
      {optionen.map(o => {
        const gewählt = wert === o;
        return (
          <button
            key={o} type="button" onClick={() => aufWahl(gewählt ? '' : o)}
            style={{
              padding: '9px 8px', borderRadius: 9, cursor: 'pointer',
              fontFamily: T.schrift, fontSize: 13, fontWeight: gewählt ? 700 : 500,
              border: `1px solid ${gewählt ? T.akzent : T.rand}`,
              background: gewählt ? T.akzentHell : T.karte,
              color: gewählt ? T.akzent : T.gedämpft,
              transition: 'border-color .12s, background .12s',
            }}
          >{o}</button>
        );
      })}
    </div>
  );
}

/* ────────────────────────── Formular ────────────────────────── */

export default function Formular() {
  const router = useRouter();
  const dateiRef  = useRef<HTMLInputElement>(null);
  const markeRef  = useRef<HTMLDivElement>(null);
  const modellRef = useRef<HTMLDivElement>(null);

  /*
   * Neuen Entwurf beginnen. Die Nummer verbindet die Kosten aus den
   * Schritten 1 bis 3 mit dem Fahrzeug, das erst in Schritt 4 entsteht.
   */
  useEffect(() => { entwurfNeu(); }, []);

  const [data, setData] = useState<FormData>({
    brand: '', model: '', vin: '', firstRegistration: '', km: '', price: '',
    fuelType: '', gearbox: '', powerKw: '', displacementCcm: '',
    color: '', seats: '', equipment: [], dealerNotes: '',
    envkv: LEER_ENVKV,
  });

  const [fehler, setFehler]           = useState<Record<string, string>>({});
  const [erkannt, setErkannt]         = useState<Set<string>>(new Set());
  const [scanZustand, setScanZustand] = useState<'ruhe' | 'laeuft' | 'fertig' | 'fehler'>('ruhe');
  const [scanBild, setScanBild]       = useState<string | null>(null);
  const [ueberZone, setUeberZone]     = useState(false);
  const [markeSuche, setMarkeSuche]   = useState('');
  const [markeOffen, setMarkeOffen]   = useState(false);
  const [modellOffen, setModellOffen] = useState(false);
  const [ausstattungSuche, setAusstattungSuche] = useState('');
  const [kategorieOffen, setKategorieOffen]     = useState<string | null>(null);
  const [unterwegs, setUnterwegs]     = useState(false);
  const [schmal, setSchmal]           = useState(false);

  useEffect(() => {
    const prüfen = () => setSchmal(window.innerWidth < 1000);
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
    // Von Hand geändert heisst: nicht mehr „erkannt".
    setErkannt(p => { const n = new Set(p); n.delete(k as string); return n; });
  };

  /* ── Vollständigkeit ── */
  const PFLICHT = ['brand', 'km', 'price'] as const;
  const OPTIONAL = ['model', 'firstRegistration', 'fuelType', 'gearbox',
                    'powerKw', 'displacementCcm', 'color', 'seats'] as const;

  const offenePflicht = PFLICHT.filter(k => !String(data[k]).trim());
  const gefuellt = [...PFLICHT, ...OPTIONAL].filter(k => String(data[k]).trim()).length;
  const anteil = Math.round((gefuellt / (PFLICHT.length + OPTIONAL.length)) * 100);

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
         * ("Volkswagen Golf 2.0 TDI"). Das Formular hat dafür zwei Felder
         * mit Auswahllisten — ohne Zerlegung landete alles im Markenfeld.
         */
        const zerlegt = d.brand ? splitBrandModel(String(d.brand)) : null;
        const neu = new Set<string>();

        setData(p => {
          const übernehmen = <W,>(feld: string, wert: W, alt: W): W => {
            if (wert === null || wert === undefined || wert === '') return alt;
            neu.add(feld);
            return wert;
          };
          return {
            ...p,
            brand:  übernehmen('brand', zerlegt?.brand ?? '', p.brand),
            model:  übernehmen('model', zerlegt?.model ?? '', p.model),
            vin:    übernehmen('vin', d.vin ?? '', p.vin),
            firstRegistration: übernehmen('firstRegistration', d.firstRegistration ?? '', p.firstRegistration),
            km:     übernehmen('km', d.km != null ? String(d.km) : '', p.km),
            fuelType: übernehmen('fuelType', d.fuelType ?? '', p.fuelType),
            // scan-doc liefert powerPs (bereits aus kW umgerechnet, ×1,3596)
            powerKw: übernehmen('powerKw', (d.powerPs ?? d.powerKw) != null ? String(d.powerPs ?? d.powerKw) : '', p.powerKw),
            displacementCcm: übernehmen('displacementCcm', d.displacementCcm != null ? String(d.displacementCcm) : '', p.displacementCcm),
            color:  übernehmen('color', d.color ?? '', p.color),
            seats:  übernehmen('seats', d.seats != null ? String(d.seats) : '', p.seats),
            equipment: Array.isArray(d.equipment)
              ? [...new Set([...p.equipment, ...d.equipment])] : p.equipment,
          };
        });

        setErkannt(neu);
        setScanZustand('fertig');
      } catch { setScanZustand('fehler'); }
    };
    leser.readAsDataURL(datei);
  };

  /* ── Weiter ── */

  const weiter = async () => {
    const e: Record<string, string> = {};
    if (!data.brand.trim()) e.brand = 'Bitte Marke wählen';
    if (!data.km.trim())    e.km    = 'Pflichtfeld';
    if (!data.price.trim()) e.price = 'Pflichtfeld';

    // Pkw-EnVKV: bei Neuwagen, Tageszulassung und Vorführwagen sind die
    // Verbrauchsangaben gesetzlich vorgeschrieben.
    const envkv = validateEnvkv(data.envkv, data.fuelType);
    if (!envkv.complete) e.envkv = `EnVKV-Pflichtangaben fehlen: ${envkv.missing.join(', ')}`;

    setFehler(e);
    if (Object.keys(e).length > 0) {
      document.querySelector('[data-fehler]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setUnterwegs(true);

    /*
     * Nur prüfen, NICHT abbuchen — verbraucht wird der Credit beim
     * tatsächlichen Anlegen in /api/vehicles. Hier geht es allein darum,
     * früh zu informieren statt vier Schritte ausfüllen zu lassen und
     * dann abzuweisen.
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
    () => (ausstattungSuche.trim() ? searchEquipment(ausstattungSuche).slice(0, 12) : []),
    [ausstattungSuche],
  );

  /* ── Feldgestaltung ── */

  const EING = (hatFehler = false): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: T.karte,
    border: `1px solid ${hatFehler ? T.fehler : T.rand}`,
    borderRadius: 9, padding: '10px 13px',
    color: T.text, fontSize: 14, fontFamily: T.schrift,
    outline: 'none', transition: 'border-color .12s',
  });

  const zeile = (spalten: string): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: schmal ? '1fr' : spalten,
    gap: 14,
  });

  /* ────────────────────────── Darstellung ────────────────────────── */

  return (
    <div style={{ minHeight: '100vh', background: T.grund, fontFamily: T.schrift, color: T.text }}>

      {/* ══ Kopfleiste ══ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${T.rand}`,
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>Neues Inserat</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.leise }}>
              {['Fahrzeug', 'Fotos', 'Text', 'Fertig'].map((s, i) => (
                <span key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: i === 0 ? T.akzent : T.leise,
                  fontWeight: i === 0 ? 700 : 500,
                }}>
                  {i > 0 && <span style={{ color: T.rand }}>›</span>}
                  {s}
                </span>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: T.leise, fontVariantNumeric: 'tabular-nums' }}>
              {anteil}% ausgefüllt
            </span>
          </div>
          {/* Fortschritt als Linie, nicht als Kasten — sie soll informieren, nicht drängen. */}
          <div style={{ height: 2, background: T.rand, borderRadius: 2, marginBottom: -1 }}>
            <div style={{ width: `${anteil}%`, height: '100%', background: T.akzent, borderRadius: 2, transition: 'width .3s' }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 20px 120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 280px', gap: 20, alignItems: 'start' }}>

          <main>
            {/* ══ 1 · Fahrzeugschein ══ */}
            <Abschnitt
              nummer={1}
              titel="Fahrzeugschein"
              hinweis="Foto machen — die Felder darunter füllen sich von selbst."
              aktion={scanZustand === 'fertig' ? (
                <button type="button" onClick={() => { setScanBild(null); setScanZustand('ruhe'); setErkannt(new Set()); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.schrift, fontSize: 12.5, color: T.leise, fontWeight: 600 }}>
                  <RotateCcw size={12} /> Neu
                </button>
              ) : undefined}
              kinder={
                scanZustand === 'fertig' && scanBild ? (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <img src={scanBild} alt="Fahrzeugschein" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.rand}` }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: T.gut }}>
                        <CheckCircle2 size={14} /> {erkannt.size} Felder übernommen
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, color: T.leise }}>
                        Bitte kurz prüfen — bei schlecht lesbaren Scheinen liegt der Scan auch mal daneben.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
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
                      disabled={scanZustand === 'laeuft'}
                      style={{
                        width: '100%', padding: '28px 20px', borderRadius: 12,
                        border: `1.5px dashed ${ueberZone ? T.akzent : T.randStark}`,
                        background: ueberZone ? T.akzentHell : T.grund,
                        cursor: scanZustand === 'laeuft' ? 'wait' : 'pointer',
                        fontFamily: T.schrift, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 8, transition: 'border-color .12s, background .12s',
                      }}
                    >
                      {scanZustand === 'laeuft' ? (
                        <>
                          <Loader2 size={22} color={T.akzent} style={{ animation: 'drehen .8s linear infinite' }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Wird gelesen…</span>
                        </>
                      ) : (
                        <>
                          <Camera size={22} color={T.akzent} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Zulassungsbescheinigung Teil I fotografieren</span>
                          <span style={{ fontSize: 12.5, color: T.leise }}>oder Datei hierher ziehen · JPG, PNG, HEIC</span>
                        </>
                      )}
                    </button>
                    {scanZustand === 'fehler' && (
                      <p style={{ margin: '10px 0 0', fontSize: 12.5, color: T.fehler, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertCircle size={13} /> Konnte nicht gelesen werden. Trag die Daten unten von Hand ein.
                      </p>
                    )}
                  </>
                )
              }
            />
            <input ref={dateiRef} type="file" accept="image/*" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) einlesen(f); }} />

            {/* ══ 2 · Fahrzeug ══ */}
            <Abschnitt nummer={2} titel="Fahrzeug" kinder={
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={zeile('1fr 1fr')}>
                  {/* Marke */}
                  <div ref={markeRef} style={{ position: 'relative' }} data-fehler={fehler.brand || undefined}>
                    <Feld label="Marke" pflicht fehler={fehler.brand} erkannt={erkannt.has('brand')} kinder={
                      <>
                        <button type="button" onClick={() => setMarkeOffen(o => !o)}
                          style={{ ...EING(!!fehler.brand), textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {data.brand && hatZeichen(data.brand) && <MarkenZeichen marke={data.brand} groesse={18} farbe={T.gedämpft} />}
                          <span style={{ color: data.brand ? T.text : T.leise, flex: 1 }}>{data.brand || 'Marke wählen'}</span>
                          <ChevronDown size={15} color={T.leise} />
                        </button>
                        {markeOffen && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4,
                            background: T.karte, border: `1px solid ${T.rand}`, borderRadius: 10,
                            boxShadow: '0 12px 32px rgba(15,23,42,0.12)', maxHeight: 320, overflow: 'auto',
                          }}>
                            <div style={{ padding: 8, borderBottom: `1px solid ${T.rand}`, position: 'sticky', top: 0, background: T.karte }}>
                              <div style={{ position: 'relative' }}>
                                <Search size={13} color={T.leise} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                <input autoFocus value={markeSuche} onChange={e => setMarkeSuche(e.target.value)}
                                  placeholder="Marke suchen…"
                                  style={{ ...EING(), padding: '8px 10px 8px 30px', fontSize: 13 }} />
                              </div>
                            </div>
                            {/*
                              Entweder Schnellauswahl oder Liste, nie beides.
                              Vorher standen die zwoelf haeufigen Marken als
                              Kacheln UND direkt darunter dieselbe Marke noch
                              einmal in der Gesamtliste — BMW zweimal
                              untereinander sieht nach Fehler aus.
                            */}
                            {!markeSuche ? (
                              <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 8 }}>
                                  {TOP_MARKEN.map(m => (
                                    <button key={m} type="button"
                                      onClick={() => { setzen('brand', m); setzen('model', ''); setMarkeOffen(false); setMarkeSuche(''); }}
                                      style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                                        padding: '11px 4px', borderRadius: 9, cursor: 'pointer',
                                        border: `1px solid ${data.brand === m ? T.akzent : T.rand}`,
                                        background: data.brand === m ? T.akzentHell : T.karte,
                                        fontFamily: T.schrift, fontSize: 11.5, fontWeight: 600,
                                        color: data.brand === m ? T.akzent : T.gedämpft,
                                      }}>
                                      {/*
                                        Nur ein gezeichnetes Zeichen, sonst nichts.
                                        Vorher stand bei Marken ohne Zeichen das
                                        Kuerzel ueber dem Namen — "FOR" ueber
                                        "Ford". Das liest sich wie ein Fehler.
                                      */}
                                      {hatZeichen(m) && (
                                        <MarkenZeichen marke={m} groesse={20} farbe={data.brand === m ? T.akzent : T.gedämpft} />
                                      )}
                                      {m}
                                    </button>
                                  ))}
                                </div>
                                <p style={{ margin: 0, padding: '0 14px 10px', fontSize: 12, color: T.leise }}>
                                  Andere Marke? Oben ins Suchfeld tippen.
                                </p>
                              </>
                            ) : (
                            <div>
                              {markenGefiltert.slice(0, 60).map(m => (
                                <button key={m} type="button"
                                  onClick={() => { setzen('brand', m); setzen('model', ''); setMarkeOffen(false); setMarkeSuche(''); }}
                                  style={{
                                    width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none',
                                    background: data.brand === m ? T.akzentHell : 'transparent',
                                    color: data.brand === m ? T.akzent : T.text,
                                    cursor: 'pointer', fontFamily: T.schrift, fontSize: 13.5,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                  }}>
                                  {hatZeichen(m) && <MarkenZeichen marke={m} groesse={15} farbe={T.leise} />}
                                  {m}
                                </button>
                              ))}
                              {markenGefiltert.length === 0 && (
                                <p style={{ padding: '12px 14px', margin: 0, fontSize: 13, color: T.leise }}>
                                  Keine Marke gefunden — du kannst sie unten von Hand eintragen.
                                </p>
                              )}
                            </div>
                            )}
                          </div>
                        )}
                      </>
                    } />
                  </div>

                  {/* Modell */}
                  <div ref={modellRef} style={{ position: 'relative' }}>
                    <Feld label="Modell" erkannt={erkannt.has('model')} kinder={
                      <>
                        <input
                          value={data.model}
                          onChange={e => setzen('model', e.target.value)}
                          onFocus={() => modelle.length > 0 && setModellOffen(true)}
                          /*
                            Beispiel aus der gewaehlten Marke. Vorher stand
                            hier fest "z.B. Golf VII" — auch wenn BMW
                            ausgewaehlt war.
                          */
                          placeholder={
                            data.brand
                              ? (modelle[0] ? `z.B. ${modelle[0]}` : 'Modell eingeben')
                              : 'Erst Marke wählen'
                          }
                          disabled={!data.brand}
                          style={{ ...EING(), background: data.brand ? T.karte : T.grund }}
                        />
                        {modellOffen && modelle.length > 0 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 4,
                            background: T.karte, border: `1px solid ${T.rand}`, borderRadius: 10,
                            boxShadow: '0 12px 32px rgba(15,23,42,0.12)', maxHeight: 240, overflow: 'auto',
                          }}>
                            {modelle
                              .filter(m => m.toLowerCase().includes(data.model.toLowerCase()))
                              .slice(0, 40)
                              .map(m => (
                                <button key={m} type="button"
                                  onClick={() => { setzen('model', m); setModellOffen(false); }}
                                  style={{
                                    width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none',
                                    background: 'transparent', color: T.text, cursor: 'pointer',
                                    fontFamily: T.schrift, fontSize: 13.5,
                                  }}>{m}</button>
                              ))}
                          </div>
                        )}
                      </>
                    } />
                  </div>
                </div>

                <div style={zeile('1fr 1fr')}>
                  <Feld
                    label="Fahrgestellnummer"
                    erkannt={erkannt.has('vin')}
                    hinweis="Gehört ins Inserat. Die Ausstattung erkennen wir aus deinen Fotos."
                    kinder={
                      <div style={{ position: 'relative' }}>
                        <input
                          value={data.vin}
                          onChange={e => setzen('vin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                          placeholder="WVWZZZ1JZW000001"
                          maxLength={17}
                          style={{ ...EING(), paddingRight: 46, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}
                        />
                        <span style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                          color: data.vin.length === 17 ? T.gut : T.leise,
                        }}>{data.vin.length}/17</span>
                      </div>
                    }
                  />
                </div>
              </div>
            } />

            {/* ══ 3 · Eckdaten ══ */}
            <Abschnitt nummer={3} titel="Eckdaten" hinweis="Das, wonach Käufer filtern." kinder={
              <div style={zeile('1fr 1fr 1fr')}>
                <div data-fehler={fehler.km || undefined}>
                  <Feld label="Kilometerstand" pflicht einheit="km" fehler={fehler.km} erkannt={erkannt.has('km')} kinder={
                    <input inputMode="numeric" value={data.km}
                      onChange={e => setzen('km', e.target.value.replace(/\D/g, ''))}
                      placeholder="84500" style={EING(!!fehler.km)} />
                  } />
                </div>
                <div data-fehler={fehler.price || undefined}>
                  <Feld label="Preis" pflicht einheit="€" fehler={fehler.price} kinder={
                    <input inputMode="numeric" value={data.price}
                      onChange={e => setzen('price', e.target.value.replace(/\D/g, ''))}
                      placeholder="18900" style={EING(!!fehler.price)} />
                  } />
                </div>
                <Feld label="Erstzulassung" erkannt={erkannt.has('firstRegistration')} kinder={
                  <input value={data.firstRegistration}
                    onChange={e => setzen('firstRegistration', e.target.value)}
                    placeholder="03/2019" style={EING()} />
                } />
              </div>
            } />

            {/* ══ 4 · Antrieb ══ */}
            <Abschnitt nummer={4} titel="Antrieb" kinder={
              <div style={{ display: 'grid', gap: 16 }}>
                <Feld label="Kraftstoff" erkannt={erkannt.has('fuelType')} kinder={
                  <Wahl optionen={KRAFTSTOFFE} wert={data.fuelType} aufWahl={v => setzen('fuelType', v)} />
                } />
                <div style={zeile('1fr 1fr 1fr')}>
                  <Feld label="Getriebe" kinder={
                    <Wahl optionen={GETRIEBE} wert={data.gearbox} aufWahl={v => setzen('gearbox', v)} spalten={2} />
                  } />
                  <Feld label="Leistung" einheit="PS" erkannt={erkannt.has('powerKw')} kinder={
                    <input inputMode="numeric" value={data.powerKw}
                      onChange={e => setzen('powerKw', e.target.value.replace(/\D/g, ''))}
                      placeholder="150" style={EING()} />
                  } />
                  <Feld label="Hubraum" einheit="ccm" erkannt={erkannt.has('displacementCcm')} kinder={
                    <input inputMode="numeric" value={data.displacementCcm}
                      onChange={e => setzen('displacementCcm', e.target.value.replace(/\D/g, ''))}
                      placeholder="1968" style={EING()} />
                  } />
                </div>
              </div>
            } />

            {/* ══ 5 · Weitere Angaben ══ */}
            <Abschnitt nummer={5} titel="Weitere Angaben" kinder={
              <div style={zeile('1fr 1fr')}>
                <Feld label="Farbe" erkannt={erkannt.has('color')} kinder={
                  <input value={data.color} onChange={e => setzen('color', e.target.value)}
                    placeholder="Tiefschwarz Perleffekt" style={EING()} />
                } />
                <Feld label="Sitzplätze" erkannt={erkannt.has('seats')} kinder={
                  <Wahl optionen={['2', '4', '5', '7']} wert={data.seats} aufWahl={v => setzen('seats', v)} spalten={4} />
                } />
              </div>
            } />

            {/* ══ 6 · Verbrauch ══ */}
            <div data-fehler={fehler.envkv || undefined}>
              <Abschnitt
                nummer={6}
                titel="Verbrauch und Emissionen"
                hinweis="Pflicht bei Neuwagen, Tageszulassung und Vorführwagen. Bei Gebrauchtwagen freiwillig."
                kinder={
                  <>
                    {/*
                      EnvkvFields meldet nur die geaenderten Felder, nicht
                      den ganzen Satz. Das Ergebnis muss deshalb auf den
                      bestehenden Stand gelegt werden — wer es direkt
                      einsetzt, loescht bei jeder Eingabe alle anderen Werte.
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
                }
              />
            </div>

            {/* ══ 7 · Ausstattung ══ */}
            <Abschnitt
              nummer={7}
              titel="Ausstattung"
              hinweis="Beim Hochladen der Fotos wird sie ergänzt — was zu sehen ist, wird erkannt."
              aktion={data.equipment.length > 0
                ? <span style={{ fontSize: 12.5, fontWeight: 700, color: T.akzent }}>{data.equipment.length}</span>
                : undefined}
              kinder={
                <div style={{ display: 'grid', gap: 14 }}>
                  {data.equipment.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {data.equipment.map((e, i) => (
                        <span key={`${e}-${i}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 8px 5px 11px', borderRadius: 7,
                          background: T.grund, border: `1px solid ${T.rand}`,
                          fontSize: 12.5, color: T.gedämpft,
                        }}>
                          {e}
                          <button type="button" onClick={() => setzen('equipment', data.equipment.filter((_, j) => j !== i))}
                            style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.leise }}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ position: 'relative' }}>
                    <Search size={14} color={T.leise} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
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
                      placeholder="Suchen oder eigene Ausstattung eintippen und Enter drücken"
                      style={{ ...EING(), paddingLeft: 34 }}
                    />
                  </div>

                  {ausstattungTreffer.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ausstattungTreffer.map(eintrag => {
                        const t = eintrag.label;
                        const drin = data.equipment.includes(t);
                        return (
                          <button key={eintrag.id} type="button" disabled={drin}
                            onClick={() => { setzen('equipment', [...data.equipment, t]); setAusstattungSuche(''); }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 10px', borderRadius: 7, cursor: drin ? 'default' : 'pointer',
                              border: `1px solid ${drin ? T.rand : T.randStark}`,
                              background: drin ? T.grund : T.karte,
                              color: drin ? T.leise : T.gedämpft,
                              fontFamily: T.schrift, fontSize: 12.5,
                            }}>
                            {drin ? <CheckCircle2 size={11} /> : <Plus size={11} />} {t}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Kategorien zum Durchblättern */}
                  <div style={{ border: `1px solid ${T.rand}`, borderRadius: 10, overflow: 'hidden' }}>
                    {EQUIPMENT_DB.map(gruppe => {
                      const kategorie = gruppe.label;
                      const eintraege = gruppe.items;
                      const offen = kategorieOffen === kategorie;
                      return (
                        <div key={kategorie} style={{ borderBottom: `1px solid ${T.rand}` }}>
                          <button type="button" onClick={() => setKategorieOffen(offen ? null : kategorie)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                              padding: '11px 14px', border: 'none', background: offen ? T.grund : T.karte,
                              cursor: 'pointer', fontFamily: T.schrift, fontSize: 13, fontWeight: 600, color: T.gedämpft,
                            }}>
                            <ChevronDown size={14} style={{ transform: offen ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
                            {kategorie}
                            <span style={{ marginLeft: 'auto', fontSize: 12, color: T.leise, fontWeight: 500 }}>
                              {eintraege.length}
                            </span>
                          </button>
                          {offen && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 14px 14px' }}>
                              {eintraege.map(eintrag => {
                                const e = eintrag.label;
                                const drin = data.equipment.includes(e);
                                return (
                                  <button key={eintrag.id} type="button"
                                    onClick={() => setzen('equipment', drin
                                      ? data.equipment.filter(x => x !== e)
                                      : [...data.equipment, e])}
                                    style={{
                                      padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                                      border: `1px solid ${drin ? T.akzent : T.rand}`,
                                      background: drin ? T.akzentHell : T.karte,
                                      color: drin ? T.akzent : T.gedämpft,
                                      fontFamily: T.schrift, fontSize: 12.5, fontWeight: drin ? 600 : 500,
                                    }}>{e}</button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              }
            />

            {/* ══ 8 · Notizen ══ */}
            <Abschnitt
              nummer={8}
              titel="Notizen für die Beschreibung"
              hinweis="Was den Text besser macht: Vorbesitzer, Reifen, Reparaturen, Besonderheiten."
              kinder={
                <textarea
                  value={data.dealerNotes}
                  onChange={e => setzen('dealerNotes', e.target.value)}
                  rows={3}
                  placeholder="Scheckheftgepflegt, zwei Vorbesitzer, Winterreifen auf Alu dabei, kleiner Kratzer hinten rechts."
                  style={{ ...EING(), resize: 'vertical', lineHeight: 1.6 }}
                />
              }
            />
          </main>

          {/* ══ Seitenleiste: was noch fehlt ══ */}
          {!schmal && (
            <aside style={{ position: 'sticky', top: 76 }}>
              <div style={{ background: T.karte, border: `1px solid ${T.rand}`, borderRadius: 14, padding: 18 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 700 }}>
                  {offenePflicht.length === 0 ? 'Bereit für Schritt 2' : 'Noch nötig'}
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: T.leise, lineHeight: 1.5 }}>
                  {offenePflicht.length === 0
                    ? 'Alles Nötige steht. Je mehr du ergänzt, desto besser wird die Beschreibung.'
                    : 'Ohne diese Angaben geht es nicht weiter.'}
                </p>

                {[
                  ['brand', 'Marke'], ['km', 'Kilometerstand'], ['price', 'Preis'],
                ].map(([schluessel, name]) => {
                  const da = String(data[schluessel as keyof FormData]).trim().length > 0;
                  return (
                    <div key={schluessel} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', fontSize: 13,
                      color: da ? T.gedämpft : T.text,
                    }}>
                      {da
                        ? <CheckCircle2 size={14} color={T.gut} />
                        : <span style={{ width: 14, height: 14, borderRadius: 7, border: `1.5px solid ${T.randStark}` }} />}
                      {name}
                    </div>
                  );
                })}

                <div style={{ height: 1, background: T.rand, margin: '14px 0' }} />

                <div style={{ fontSize: 12.5, color: T.leise, lineHeight: 1.6 }}>
                  {gefuellt} von {PFLICHT.length + OPTIONAL.length} Feldern ausgefüllt.
                  {data.equipment.length > 0 && <> {data.equipment.length} Ausstattungsmerkmale.</>}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ══ Fussleiste ══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)',
        borderTop: `1px solid ${T.rand}`,
        // Auf dem Handy sitzt die Dashboard-Navigation unten fest (56 px).
        // Ohne diesen Abstand liegt der Weiter-Knopf darunter und ist nicht
        // antippbar — der Fehler hat es schon einmal in die Anwendung geschafft.
        paddingBottom: schmal ? 56 : 0,
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.leise }}>
            {offenePflicht.length > 0
              ? <span style={{ color: T.fehler, fontWeight: 600 }}>
                  Es fehlt noch: {offenePflicht.map(k => ({ brand: 'Marke', km: 'Kilometerstand', price: 'Preis' })[k]).join(', ')}
                </span>
              : 'Weiter zu den Fotos'}
          </div>
          <button type="button" onClick={weiter} disabled={unterwegs}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 10, border: 'none',
              background: T.akzent, color: '#fff',
              fontFamily: T.schrift, fontSize: 14, fontWeight: 700,
              cursor: unterwegs ? 'wait' : 'pointer', opacity: unterwegs ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}>
            {unterwegs ? <Loader2 size={15} style={{ animation: 'drehen .8s linear infinite' }} /> : null}
            Weiter <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <style>{`@keyframes drehen { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
