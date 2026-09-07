'use client';

/**
 * Studio einstellen.
 *
 * Hier wird festgelegt, wie ein Fahrzeug im fertigen Bild steht:
 * Hintergrund, Licht, Schatten, Spiegelung, Lage. Die Werte gelten
 * danach fuer alle Inserate.
 *
 * Der Aufbau folgt den Kosten, nicht der Technik:
 *
 *   Freistellen kostet Geld und passiert EINMAL.
 *   Einstellen kostet nichts und passiert hundertmal.
 *
 * Deshalb wird das Foto einmal freigestellt und liegt danach im
 * Browser. Jeder Reglerzug schickt nur noch das freigestellte Bild an
 * den eigenen Kompositor — kein Anbieter, keine Kosten. Waeren beide
 * Schritte zusammen, wuerde jede Bewegung am Regler ein Freibild
 * verbrennen, und die Seite waere unbenutzbar.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Loader2, RotateCcw, Check, AlertCircle, Image as BildIcon } from 'lucide-react';
import { G } from '../listing/gestaltung';
import { merken, holen } from '../../../lib/studio/freigestelltSpeicher';

const F = G.schrift;

/* Die Werte stehen doppelt — hier fuer die Oberflaeche, in lib/studio
 * fuer die Berechnung. Ein gemeinsamer Import waere schoener, zoege aber
 * sharp ins Browser-Bundle. */
const VORLAGEN = [
  { id: 'studio_dunkel', name: 'Studio dunkel' },
  { id: 'studio_hell',   name: 'Studio hell'   },
  { id: 'studio_grau',   name: 'Studio grau'   },
  { id: 'studio_warm',   name: 'Studio warm'   },
];

/** Kennzeichnet die Wahl "eigene Halle" statt eines gerechneten Raums. */
const EIGENER = 'eigener_showroom';

interface Werte {
  breitenanteil: number; bodenabstand: number; ausrichtung: number;
  schattenStaerke: number; schattenWeichheit: number; schattenHoehe: number; schattenVersatz: number;
  spiegelungStaerke: number; spiegelungLaenge: number; angleichung: number;
  horizont: number; lichtX: number; lichtY: number; lichtGroesse: number; lichtStaerke: number;
}

const STANDARD: Werte = {
  breitenanteil: 0.82, bodenabstand: 0.10, ausrichtung: 0.50,
  schattenStaerke: 0.55, schattenWeichheit: 26, schattenHoehe: 0.10, schattenVersatz: 0.02,
  spiegelungStaerke: 0.22, spiegelungLaenge: 0.35, angleichung: 0.45,
  horizont: 0.74, lichtX: 0.50, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.24,
};

const SPEICHER = 'studio_einstellungen_v1';


/*
 * Ausserhalb der Seite definiert — sonst baut React die Eingabefelder
 * bei jedem Rendern neu auf und ein gezogener Schieber reisst nach dem
 * ersten Schritt ab. Im Browser gemessen: Die Kennung des Elements
 * wechselte bei jeder Aenderung.
 */
function Regler({ wert, name, min, max, schritt, einheit, beiAenderung }: {
  wert: number; name: string; min: number; max: number; schritt: number;
  einheit?: string; beiAenderung: (v: number) => void;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: G.buehneLeise }}>{name}</span>
        <span style={{ fontSize: 12, color: G.buehneText, fontVariantNumeric: 'tabular-nums' }}>
          {einheit === '%' ? Math.round(wert * 100) + ' %' : wert.toFixed(schritt < 1 ? 2 : 0) + (einheit ?? '')}
        </span>
      </div>
      <input type="range" min={min} max={max} step={schritt} value={wert}
        onChange={e => beiAenderung(Number(e.target.value))}
        style={{ width: '100%', accentColor: G.buehneAkzent, cursor: 'pointer' }} />
    </label>
  );
}

function Block({ titel, kinder }: { titel: string; kinder: React.ReactNode }) {
  return (
    <section style={{
      border: `1px solid ${G.buehneLinie}44`, borderRadius: 8,
      padding: '14px 16px', marginBottom: 14, background: 'rgba(255,255,255,0.02)',
    }}>
      <h2 style={{
        margin: '0 0 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.09em',
        textTransform: 'uppercase', color: G.buehneAkzent,
      }}>{titel}</h2>
      {kinder}
    </section>
  );
}

export default function StudioSeite() {
  const [freigestellt, setFreigestellt] = useState<string | null>(null);
  const [vorschau, setVorschau]         = useState<string | null>(null);
  const [vorlage, setVorlage]           = useState('studio_dunkel');
  const [werte, setWerte]               = useState<Werte>(STANDARD);
  const [laeuft, setLaeuft]             = useState(false);
  const [rechnet, setRechnet]           = useState(false);
  const [fehler, setFehler]             = useState<string | null>(null);
  const [gespeichert, setGespeichert]   = useState(false);
  const [eigenerUrl, setEigenerUrl]     = useState<string | null>(null);
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) {
        const g = JSON.parse(roh);
        if (g.werte) setWerte({ ...STANDARD, ...g.werte });
        if (g.vorlage) setVorlage(g.vorlage);
      }
    } catch { /* kaputter Eintrag darf die Seite nicht blockieren */ }
    // Schon einmal freigestellt? Dann nicht noch einmal bezahlen.
    const gemerkt = holen();
    if (gemerkt) setFreigestellt(gemerkt);

    /*
     * Die Hintergrund-Seite ist die fuehrende Stelle fuer die Wahl des
     * Raums. Wer dort seine eigene Halle hinterlegt hat, soll sie hier
     * sehen — vorher kannte diese Seite nur ihre vier Vorlagen und
     * ueberging die Auswahl stillschweigend.
     */
    const halle = localStorage.getItem('dealer_custom_background_url');
    setEigenerUrl(halle);
    if (halle && localStorage.getItem('dealer_background') === 'custom') setVorlage(EIGENER);
  }, []);

  /* ── Freistellen: kostet ein Bild, laeuft genau einmal ── */
  const freistellen = async (datei: File) => {
    setFehler(null);
    setLaeuft(true);
    try {
      const b64 = await new Promise<string>((ok, weg) => {
        const l = new FileReader();
        l.onload = () => ok(l.result as string);
        l.onerror = weg;
        l.readAsDataURL(datei);
      });

      const res = await fetch('/api/studio-eigen/freistellen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 }),
      });
      const daten = await res.json();
      if (!res.ok) throw new Error(daten.error || 'Freistellen fehlgeschlagen');
      setFreigestellt(daten.freigestellt);
      /*
       * Merken, damit die Hintergrund-Auswahl dasselbe Fahrzeug zeigen
       * kann. Freistellen kostet — dieses eine Bild soll ueberall
       * dienen, wo eine Vorschau gebraucht wird.
       */
      void merken(daten.freigestellt);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Freistellen fehlgeschlagen');
    } finally {
      setLaeuft(false);
    }
  };

  /* ── Vorschau: kostenlos, darf oft laufen ── */
  const berechnen = useCallback(async (bild: string, v: Werte, vl: string) => {
    setRechnet(true);
    try {
      const res = await fetch('/api/studio-eigen/komponieren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freigestellt: bild,
          vorlage: vl === EIGENER ? 'studio_dunkel' : vl,
          hintergrundUrl: vl === EIGENER ? eigenerUrl : undefined,
          breite: 1200,
          hintergrund: {
            horizont: v.horizont, lichtX: v.lichtX, lichtY: v.lichtY,
            lichtGroesse: v.lichtGroesse, lichtStaerke: v.lichtStaerke,
          },
          kompositor: {
            breitenanteil: v.breitenanteil, bodenabstand: v.bodenabstand, ausrichtung: v.ausrichtung,
            schattenStaerke: v.schattenStaerke, schattenWeichheit: v.schattenWeichheit,
            schattenHoehe: v.schattenHoehe, schattenVersatz: v.schattenVersatz,
            spiegelungStaerke: v.spiegelungStaerke, spiegelungLaenge: v.spiegelungLaenge,
            angleichung: v.angleichung,
          },
        }),
      });
      const daten = await res.json();
      if (!res.ok) throw new Error(daten.error || 'Vorschau fehlgeschlagen');
      setVorschau(daten.bild);
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Vorschau fehlgeschlagen');
    } finally {
      setRechnet(false);
    }
  }, [eigenerUrl]);

  /*
   * Entprellt, sonst laeuft bei jedem Pixel am Regler eine Berechnung
   * und die Antworten kommen in falscher Reihenfolge zurueck.
   */
  useEffect(() => {
    if (!freigestellt) return;
    const t = setTimeout(() => berechnen(freigestellt, werte, vorlage), 180);
    return () => clearTimeout(t);
  }, [freigestellt, werte, vorlage, berechnen]);

  const speichern = () => {
    localStorage.setItem(SPEICHER, JSON.stringify({ werte, vorlage }));
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
  };



  return (
    <div style={{ background: G.buehneGrund, minHeight: '100vh', color: G.buehneText, fontFamily: F }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 22px 80px' }}>

        <header style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Studio einstellen</h1>
          <p style={{ margin: '8px 0 0', color: G.buehneLeise, fontSize: 14.5, maxWidth: '65ch', lineHeight: 1.6 }}>
            Hintergrund, Schatten und Spiegelung werden hier gerechnet, nicht eingekauft.
            Freigestellt wird einmal — das kostet ein Bild. Danach ist jede Änderung kostenlos.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 22, alignItems: 'start' }}>

          {/* ── Vorschau ── */}
          <div style={{
            border: `1px solid ${G.buehneLinie}44`, borderRadius: 10, overflow: 'hidden',
            background: '#000', position: 'relative', minHeight: 420,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {vorschau ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vorschau} alt="Vorschau" style={{ width: '100%', display: 'block' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <BildIcon size={38} color={G.buehneLeise} />
                <p style={{ color: G.buehneLeise, fontSize: 14, margin: '14px 0 0' }}>
                  {laeuft ? 'Fahrzeug wird freigestellt…' : 'Noch kein Bild geladen'}
                </p>
              </div>
            )}

            {(rechnet || laeuft) && (
              <div style={{
                position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '6px 12px', fontSize: 12,
              }}>
                <Loader2 size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                {laeuft ? 'Freistellen' : 'Rechnet'}
              </div>
            )}
          </div>

          {/* ── Regler ── */}
          <div>
            <input ref={dateiRef} type="file" accept="image/*" hidden
              onChange={e => { const d = e.target.files?.[0]; if (d) freistellen(d); }} />

            <button onClick={() => dateiRef.current?.click()} disabled={laeuft}
              style={{
                width: '100%', padding: '11px', marginBottom: 14, cursor: laeuft ? 'wait' : 'pointer',
                background: G.buehneAkzent, color: '#0a0c11', border: 'none', borderRadius: 8,
                fontFamily: F, fontSize: 13.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <Upload size={15} />
              {freigestellt ? 'Anderes Foto laden' : 'Foto laden und freistellen'}
            </button>

            {!freigestellt && (
              <p style={{ fontSize: 12, color: G.buehneLeise, margin: '0 0 14px', lineHeight: 1.55 }}>
                Das Freistellen verbraucht ein Bild aus deinem Kontingent. Danach kannst du beliebig
                oft an den Reglern drehen, ohne dass etwas kostet.
              </p>
            )}

            {fehler && (
              <p style={{
                display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12.5,
                color: '#f87171', margin: '0 0 14px', lineHeight: 1.5,
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {fehler}
              </p>
            )}

            <Block titel="Hintergrund" kinder={
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {[...VORLAGEN, ...(eigenerUrl ? [{ id: EIGENER, name: 'Meine Halle' }] : [])].map(v => (
                    <button key={v.id} onClick={() => setVorlage(v.id)}
                      style={{
                        padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: F, fontSize: 12,
                        fontWeight: vorlage === v.id ? 700 : 500,
                        border: `1px solid ${vorlage === v.id ? G.buehneAkzent : G.buehneLinie + '55'}`,
                        background: vorlage === v.id ? G.buehneAkzent + '22' : 'transparent',
                        color: vorlage === v.id ? G.buehneAkzent : G.buehneLeise,
                      }}>{v.name}</button>
                  ))}
                </div>
                <Regler wert={werte.horizont} name="Horizont" min={0.4} max={0.92} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, horizont: v }))} />
                <Regler wert={werte.lichtStaerke} name="Licht" min={0} max={0.6} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, lichtStaerke: v }))} />
                <Regler wert={werte.lichtX} name="Licht waagerecht" min={0} max={1} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, lichtX: v }))} />
                <Regler wert={werte.lichtY} name="Licht senkrecht" min={0} max={0.8} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, lichtY: v }))} />
                <Regler wert={werte.lichtGroesse} name="Lichtgröße" min={0.2} max={1} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, lichtGroesse: v }))} />
              </>
            } />

            <Block titel="Fahrzeug" kinder={
              <>
                <Regler wert={werte.breitenanteil} name="Größe" min={0.4} max={0.98} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, breitenanteil: v }))} />
                <Regler wert={werte.ausrichtung} name="Position" min={0} max={1} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, ausrichtung: v }))} />
                <Regler wert={werte.bodenabstand} name="Bodenabstand" min={0} max={0.35} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, bodenabstand: v }))} />
                <Regler wert={werte.angleichung} name="Licht angleichen" min={0} max={1} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, angleichung: v }))} />
              </>
            } />

            <Block titel="Schatten" kinder={
              <>
                <Regler wert={werte.schattenStaerke} name="Stärke" min={0} max={1} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, schattenStaerke: v }))} />
                <Regler wert={werte.schattenWeichheit} name="Weichheit" min={1} max={80} schritt={1} beiAenderung={v => setWerte(p => ({ ...p, schattenWeichheit: v }))} />
                <Regler wert={werte.schattenHoehe} name="Höhe" min={0.02} max={0.3} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, schattenHoehe: v }))} />
                <Regler wert={werte.schattenVersatz} name="Versatz" min={-0.1} max={0.1} schritt={0.005} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, schattenVersatz: v }))} />
              </>
            } />

            <Block titel="Spiegelung" kinder={
              <>
                <Regler wert={werte.spiegelungStaerke} name="Stärke" min={0} max={0.6} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, spiegelungStaerke: v }))} />
                <Regler wert={werte.spiegelungLaenge} name="Länge" min={0} max={0.7} schritt={0.01} einheit="%" beiAenderung={v => setWerte(p => ({ ...p, spiegelungLaenge: v }))} />
              </>
            } />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setWerte(STANDARD)}
                style={{
                  flex: 1, padding: '10px', cursor: 'pointer', background: 'transparent',
                  border: `1px solid ${G.buehneLinie}66`, borderRadius: 8, color: G.buehneLeise,
                  fontFamily: F, fontSize: 12.5, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <RotateCcw size={13} /> Zurücksetzen
              </button>
              <button onClick={speichern}
                style={{
                  flex: 1, padding: '10px', cursor: 'pointer',
                  background: gespeichert ? '#4ade80' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${G.buehneLinie}66`, borderRadius: 8,
                  color: gespeichert ? '#0a0c11' : G.buehneText,
                  fontFamily: F, fontSize: 12.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Check size={13} /> {gespeichert ? 'Gespeichert' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 980px) {
          div[style*="grid-template-columns: minmax(0,1fr) 340px"] { grid-template-columns: 1fr !important }
        }`}</style>
    </div>
  );
}
