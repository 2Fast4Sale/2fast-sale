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

/** Woher ein Wert stammt. */
export type Quelle = 'schein' | 'dat';

/**
 * Felder, die DAT ueber die Fahrgestellnummer liefern kann.
 *
 * Herstellerdaten zur Ausstattung. HU und Vorbesitzer stehen bewusst
 * NICHT dabei: Das eine ist der Stand der letzten Hauptuntersuchung, das
 * andere die Besitzhistorie aus Teil II — beides kennt kein
 * Datenanbieter, das weiss nur, wer das Fahrzeug vor sich stehen hat.
 */
export const DAT_FELDER = [
  'interiorType', 'interiorColor', 'doors', 'emissionClass', 'driveType',
] as const;

export interface FormData {
  brand: string; model: string; vin: string;
  firstRegistration: string; km: string; price: string;
  fuelType: string; gearbox: string; powerKw: string;
  displacementCcm: string; color: string; seats: string;
  equipment: string[]; dealerNotes: string;
  envkv: EnvkvData;

  /*
   * Die fuenf Pflichtfelder von mobile.de.
   *
   * Ohne sie laesst sich dort kein Inserat anlegen — nachzulesen in der
   * offiziellen CSV-Schnittstelle. Bisher entstanden hier Inserate, die
   * vollstaendig aussahen und beim Uebertragen zurueckgewiesen worden
   * waeren.
   */
  bodyType: string;
  /** 'ausgewiesen' = Regelbesteuerung, 'differenz' = § 25a UStG. */
  vatType: 'ausgewiesen' | 'differenz' | '';
  damaged: boolean;
  metallic: boolean;
  warranty: boolean;

  /*
   * Weitere mobile.de-Felder. Nicht Pflicht, aber auf jedem ernsthaften
   * Inserat vorhanden — Käufer filtern nach HU und Vorbesitzern, und ein
   * Inserat ohne diese Angaben wird bei der Suche nicht gefunden.
   */
  /** MM/JJJJ. Als Text: Der Schein nennt Monat und Jahr, keinen Tag. */
  huUntil: string;
  previousOwners: string;
  interiorType: string;
  interiorColor: string;
  /** Vom Schein: Türen, Euronorm, Antriebsart. */
  doors: string;
  emissionClass: string;
  driveType: string;

  /*
   * Steht im Fahrzeugschein und wandert direkt ins Inserat.
   *
   * Leermasse ist Feld G — das LEERGEWICHT, nicht die zulaessige
   * Gesamtmasse. Beide Portale zeigen genau diese Zahl unter
   * "Gewicht"; AutoScout24 sagt es woertlich ("without driver,
   * passengers or liquids").
   *
   * Die Anhaengelasten kennt nur mobile.de. AutoScout24 hat fuer
   * Personenwagen kein Feld dafuer.
   */
  leermasseKg: string;
  anhaengelastGebremstKg: string;
  anhaengelastUngebremstKg: string;

  /**
   * Fuer welchen Markt das Fahrzeug gebaut wurde, als ISO-Code.
   *
   * Bei mobile.de PFLICHT fuer Neuwagen ("countryversion-missing"),
   * bei Gebrauchtwagen freiwillig. Beide Portale nennen das Feld
   * gleich.
   */
  countryVersion: string;

  /*
   * Drei Angaben, die ein vollstaendiges Inserat zeigt und die NICHT
   * im Fahrzeugschein stehen. Der Haendler traegt sie ein, oder DAT
   * liefert sie spaeter.
   *
   * Die Tankgroesse kennt nur mobile.de — AutoScout24 hat fuer
   * Personenwagen kein Feld dafuer.
   */
  cylinders: string;
  fuelTankVolume: string;
  manufacturerColorName: string;

  /**
   * Letzte Wartung — Monat/Jahr und Kilometerstand.
   *
   * Steht im Serviceheft, in keiner Datenbank. Auch DAT kennt es
   * nicht. Den Kilometerstand nimmt nur mobile.de; AutoScout24 hat
   * nur das Datum.
   */
  lastServiceDate: string;
  lastServiceKm: string;
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

/**
 * Karosserieformen.
 *
 * Im Klartext, nicht als mobile.de-Code. Die Umsetzung nach
 * "Car.Limousine" gehoert in die Exportschicht — sonst muesste man bei
 * einem zweiten Portal jede Zeile anfassen.
 */
export const POLSTERUNG   = ['Stoff', 'Teilleder', 'Leder', 'Velour', 'Alcantara'];
export const INNENFARBE   = ['Schwarz', 'Grau', 'Beige', 'Braun', 'Andere'];
export const ANTRIEB      = ['Frontantrieb', 'Heckantrieb', 'Allrad'];
export const EURONORM     = ['Euro 4', 'Euro 5', 'Euro 6', 'Euro 6d-Temp', 'Euro 6d'];
/* Klartext; die Umsetzung auf den ISO-Code macht die Exportschicht. */
export const LAENDERVERSION = ['Deutschland', 'Österreich', 'Schweiz', 'Italien',
                              'Frankreich', 'Niederlande', 'Spanien', 'Polen'];

/**
 * Die vier Angaben, die der Händler je Fahrzeug selbst machen muss.
 *
 * Als Liste, damit die Oberfläche zählen kann, wie viele noch offen
 * sind. "Noch 2 von 4" beantwortet die Frage, die vor einem neuen Block
 * im Kopf steht — nämlich ob das jetzt viel wird.
 */
export const SELBST_FELDER = ['huUntil', 'previousOwners', 'interiorType', 'interiorColor'] as const;

export const KAROSSERIE = [
  'Limousine', 'Kombi', 'SUV / Geländewagen', 'Kleinwagen',
  'Cabrio / Roadster', 'Coupé', 'Van / Kleinbus', 'Transporter',
];
/*
 * Die Namen muessen genau den Anzeigenamen in mobileMarken.ts
 * entsprechen. "Mercedes" stand hier lange und passte auf keinen
 * Eintrag: Die Kachel setzte die Marke, aber die Modelliste blieb
 * leer, weil es keine Marke dieses Namens gibt. Sie heisst
 * "Mercedes-Benz".
 */
export const TOP_MARKEN  = ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Opel', 'Ford',
                            'Skoda', 'Seat', 'Hyundai', 'Kia', 'Toyota', 'Renault'];

export const PFLICHT_NAME: Record<string, string> = {
  brand: 'Marke', km: 'Kilometerstand', price: 'Preis', gearbox: 'Getriebe',
  bodyType: 'Karosserieform', vatType: 'Umsatzsteuer',
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
    bodyType: '', vatType: '', damaged: false, metallic: false, warranty: false,
    huUntil: '', previousOwners: '', interiorType: '', interiorColor: '',
    doors: '', emissionClass: '', driveType: '',
    countryVersion: '', cylinders: '', fuelTankVolume: '', manufacturerColorName: '',
    lastServiceDate: '', lastServiceKm: '',
    leermasseKg: '', anhaengelastGebremstKg: '', anhaengelastUngebremstKg: '',
  });

  const [blattOffen, setBlattOffen]   = useState(false);
  const [fehler, setFehler]           = useState<Record<string, string>>({});
  /**
   * Woher ein Feld seinen Wert hat.
   *
   * Vorher nur eine Menge von Feldnamen — "erkannt" oder nicht. Das
   * reichte, solange es eine Quelle gab. Mit DAT kommt eine zweite dazu,
   * und der Unterschied ist fuer den Haendler wichtig: Was aus dem Schein
   * kommt, hat er selbst fotografiert; was von DAT kommt, sind
   * Herstellerdaten. Beides darf er glauben, aber aus verschiedenen
   * Gruenden — und wenn etwas falsch ist, muss er wissen, wo er
   * nachsehen muss.
   */
  const [herkunft, setHerkunft] = useState<Map<string, Quelle>>(new Map());
  /** Nur die Feldnamen — fuer Aufrufer, die die Quelle nicht brauchen. */
  const erkannt = useMemo(() => new Set(herkunft.keys()), [herkunft]);
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

  /*
   * Auch Wahrheitswerte, seit die mobile.de-Pflichtfelder dazugekommen
   * sind. Vorher nahm die Funktion nur Text, und die Aufrufer haben den
   * Typ mit einer Umdeutung erzwungen — das laeuft, bis jemand den Wert
   * spaeter als Text behandelt.
   */
  const setzen = (k: keyof FormData, v: string | string[] | boolean) => {
    setData(p => ({ ...p, [k]: v }));
    setFehler(p => ({ ...p, [k]: '' }));
    // Von Hand geändert heisst: nicht mehr „erkannt".
    setHerkunft(p => { const n = new Map(p); n.delete(k as string); return n; });
  };

  /*
   * Getriebe gehoert dazu.
   *
   * Es war als "traegst du ein" gekennzeichnet, aber nicht verlangt —
   * man kam bis Schritt 4 und hatte am Ende ein Inserat, das bei
   * mobile.de nicht vollstaendig ist. Getriebe ist dort Pflichtfeld,
   * und der Fahrzeugschein liefert es nie: Es kommt immer von Hand.
   *
   * Eine Kennzeichnung ohne Pruefung ist ein Hinweis, den man
   * uebersehen darf. Wenn es ohne nicht geht, muss es auch aufhalten.
   */
  /*
   * Karosserieform und Umsatzsteuer sind bei mobile.de Pflicht.
   *
   * Beschaedigt, Metallic und Garantie sind es dort auch, haben aber ein
   * sinnvolles Nein als Voreinstellung — sie sind immer beantwortet und
   * muessen deshalb nicht aufhalten. Karosserieform und Umsatzsteuer
   * haben keine Voreinstellung, die stimmen koennte: Raten waere hier
   * schlimmer als fragen.
   */
  const PFLICHT = ['brand', 'km', 'price', 'gearbox', 'bodyType', 'vatType'] as const;
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
            // Stehen ebenfalls auf der Zulassungsbescheinigung Teil I.
            doors: nimm('doors', d.doors != null ? String(d.doors) : '', p.doors),
            emissionClass: nimm('emissionClass', d.emissionClass ?? '', p.emissionClass),
            driveType: nimm('driveType', d.driveType ?? '', p.driveType),
            // Aus Feld 4 (Aufbau), nur wo eindeutig — siehe scan-doc.
            bodyType: nimm('bodyType', d.bodyType ?? '', p.bodyType),
            // Feld G und O.1/O.2 — vom Scan geprueft, sonst leer.
            leermasseKg: nimm('leermasseKg', d.leermasseKg != null ? String(d.leermasseKg) : '', p.leermasseKg),
            anhaengelastGebremstKg: nimm('anhaengelastGebremstKg', d.anhaengelastGebremstKg != null ? String(d.anhaengelastGebremstKg) : '', p.anhaengelastGebremstKg),
            anhaengelastUngebremstKg: nimm('anhaengelastUngebremstKg', d.anhaengelastUngebremstKg != null ? String(d.anhaengelastUngebremstKg) : '', p.anhaengelastUngebremstKg),
            equipment: Array.isArray(d.equipment)
              ? [...new Set([...p.equipment, ...d.equipment])] : p.equipment,
          };
        });

        setHerkunft(p => {
          const n = new Map(p);
          for (const feld of neu) n.set(feld, 'schein');
          return n;
        });
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
    if (!data.gearbox.trim()) e.gearbox = 'fehlt';
    if (!data.bodyType.trim()) e.bodyType = 'fehlt';
    if (!data.vatType) e.vatType = 'fehlt';

    const envkv = validateEnvkv(data.envkv, data.fuelType);
    if (!envkv.complete) e.envkv = `EnVKV-Pflichtangaben fehlen: ${envkv.missing.join(', ')}`;

    setFehler(e);
    if (Object.keys(e).length > 0) {
      setBlattOffen(true);
      /*
       * Zwei Bilder warten, nicht eines.
       *
       * Das Setzen der Fehler klappt zugeklappte Bloecke mit Luecken
       * erst auf (siehe `luecke` in Block). Nach einem einzelnen
       * requestAnimationFrame kann React noch nicht fertig gezeichnet
       * haben — dann sucht die Abfrage eine Stelle, die es in diesem
       * Moment noch nicht gibt, findet nichts und springt nirgendwo
       * hin.
       */
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const ziel = document.querySelector('[data-luecke="true"]');
        if (!ziel) return;
        ziel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
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
    fehler, setFehler, erkannt, herkunft, setHerkunft,
    blattOffen, setBlattOffen,
    scanZustand, scanBild, einlesen, dateiRef,
    weiter, unterwegs,
    schmal, offenePflicht, envkvPflicht,
    modelle, markenSuchen, ausstattungSuchen, titelBisher,
  };
}
