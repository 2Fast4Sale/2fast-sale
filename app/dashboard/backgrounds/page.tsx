'use client';

/**
 * Hintergrund-Auswahl und -Einstellung.
 *
 * Dritter Anlauf, und diesmal mit einer klaren Aufteilung:
 *
 *   Diese Seite   — WELCHER Raum, und wie er aussieht.
 *   /dashboard/studio — WIE das Fahrzeug darin steht (Schatten,
 *                       Spiegelung, Groesse, Lage).
 *
 * Zwei Dinge, die vorher fehlten:
 *
 * Erstens: Die Vorschau zeigt das ECHTE freigestellte Fahrzeug, sobald
 * einmal eines vorliegt. Vorher stand dort ein gezeichneter Umriss —
 * der zeigte Licht und Schatten, aber nicht, wie ein wirkliches Auto
 * in dem Raum steht, und das ist die Frage vor der Wahl.
 *
 * Zweitens: Die Studio-Hintergruende sind einstellbar. Sie werden
 * gerechnet, nicht erzeugt — Wandfarbe, Bodenfarbe, Horizont und Licht
 * sind schlicht Zahlen in einer Formel. Sie fest vorzugeben waere eine
 * kuenstliche Beschraenkung: Jeder Haendler hat eine andere
 * Vorstellung davon, wie hell seine Bilder sein sollen.
 *
 * Die uebrigen sieben Hintergruende lassen sich nicht einstellen. Sie
 * haben erkennbaren Inhalt und entstehen bei jedem Bild neu — daran
 * kann diese Seite nichts drehen, und sie behauptet es auch nicht.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check, Lock, Upload, Trash2, Crown, Zap, Sparkles, ImageOff, Camera,
  RotateCcw, Loader2, SlidersHorizontal, Info,
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import {
  BACKGROUNDS, DEFAULT_BACKGROUND_ID, OWN_SHOWROOM_ID,
  canUseBackground, type BackgroundTier, type BackgroundEntry,
} from '../../../lib/backgrounds';
import { holen } from '../../../lib/studio/freigestelltSpeicher';
import { G } from '../listing/gestaltung';

const F = G.schrift;

/* Muss zu GERECHNET in lib/studio/hintergrund.ts passen. Dort steht
 * die Wahrheit; hier nur die Anzeige, weil sharp nicht ins
 * Browser-Bundle darf. */
const GERECHNET: Record<string, string> = {
  studio_white: 'studio_hell',
  studio_dark:  'studio_dunkel',
  studio_grey:  'studio_grau',
};

interface HgWerte {
  wandOben: string; wandUnten: string;
  bodenOben: string; bodenUnten: string;
  horizont: number; lichtX: number; lichtY: number;
  lichtGroesse: number; lichtStaerke: number;
}

/* Ausgangswerte je Vorlage — dieselben wie in lib/studio/hintergrund.ts. */
const AUSGANG: Record<string, HgWerte> = {
  studio_white: {
    wandOben: '#f4f5f7', wandUnten: '#dcdfe4', bodenOben: '#d3d7dd', bodenUnten: '#b3b8c0',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.30, lichtGroesse: 0.66, lichtStaerke: 0.30,
  },
  studio_dark: {
    wandOben: '#2b3038', wandUnten: '#14181d', bodenOben: '#191d23', bodenUnten: '#07090c',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.34, lichtGroesse: 0.62, lichtStaerke: 0.22,
  },
  studio_grey: {
    wandOben: '#8c9199', wandUnten: '#666c75', bodenOben: '#5c626b', bodenUnten: '#3a3f47',
    horizont: 0.74, lichtX: 0.5, lichtY: 0.32, lichtGroesse: 0.64, lichtStaerke: 0.26,
  },
};

const TARIF: Record<BackgroundTier, { name: string; farbe: string; symbol: React.ReactNode }> = {
  free:     { name: 'Free',     farbe: '#4ade80', symbol: <Sparkles size={10} /> },
  pro:      { name: 'Pro',      farbe: '#7c8aff', symbol: <Zap size={10} />      },
  business: { name: 'Business', farbe: '#fbbf24', symbol: <Crown size={10} />    },
};

const EINSTELLUNGEN_SCHLUESSEL = 'hintergrund_einstellungen_v1';


/*
 * Regler und Farbfeld stehen AUSSERHALB der Seite.
 *
 * Vorher waren sie im Rumpf der Komponente definiert. React sieht dann
 * bei jedem Rendern einen neuen Komponententyp, wirft das alte
 * Eingabefeld weg und baut ein neues — beim Ziehen eines Schiebers
 * reisst die Bewegung nach dem ersten Schritt ab, weil das Element
 * unter der Maus verschwindet. Im Browser gemessen: Die Kennung des
 * Elements wechselte bei jeder Aenderung.
 */
function Regler({ wert, name, min, max, schritt, beiAenderung }: {
  wert: number; name: string; min: number; max: number; schritt: number;
  beiAenderung: (v: number) => void;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: G.buehneLeise }}>{name}</span>
        <span style={{ fontSize: 12, color: G.buehneText, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(wert * 100)} %
        </span>
      </div>
      <input type="range" min={min} max={max} step={schritt} value={wert}
        onChange={e => beiAenderung(Number(e.target.value))}
        style={{ width: '100%', accentColor: G.buehneAkzent, cursor: 'pointer' }} />
    </label>
  );
}

function Farbe({ wert, name, beiAenderung }: {
  wert: string; name: string; beiAenderung: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
      <input type="color" value={wert} onChange={e => beiAenderung(e.target.value)}
        style={{
          width: 34, height: 26, padding: 0, border: `1px solid ${G.buehneLinie}55`,
          borderRadius: 5, background: 'none', cursor: 'pointer', flexShrink: 0,
        }} />
      <span style={{ fontSize: 12.5, color: G.buehneLeise }}>{name}</span>
      <span style={{
        marginLeft: 'auto', fontSize: 11, color: G.buehneLeise,
        fontFamily: G.ziffern, textTransform: 'uppercase',
      }}>{wert}</span>
    </label>
  );
}

export default function HintergrundSeite() {
  const [gewaehlt, setGewaehlt]     = useState(DEFAULT_BACKGROUND_ID);
  const [bestaetigt, setBestaetigt] = useState(false);
  const [plan, setPlan]             = useState('free');
  const [eigenerUrl, setEigenerUrl] = useState<string | null>(null);
  const [laedt, setLaedt]           = useState(false);

  const [fahrzeug, setFahrzeug]   = useState<string | null>(null);
  const [werte, setWerte]         = useState<HgWerte>(AUSGANG[DEFAULT_BACKGROUND_ID] ?? AUSGANG.studio_white);
  const [vorschau, setVorschau]   = useState<string | null>(null);
  const [rechnet, setRechnet]     = useState(false);
  const dateiRef = useRef<HTMLInputElement>(null);

  const einstellbar = gewaehlt in GERECHNET;

  useEffect(() => {
    const id = localStorage.getItem('dealer_background') || DEFAULT_BACKGROUND_ID;
    setGewaehlt(id);
    setEigenerUrl(localStorage.getItem('dealer_custom_background_url') || null);
    setFahrzeug(holen());

    try {
      const roh = localStorage.getItem(EINSTELLUNGEN_SCHLUESSEL);
      const alle = roh ? JSON.parse(roh) : {};
      setWerte({ ...(AUSGANG[id] ?? AUSGANG.studio_white), ...(alle?.[id] ?? {}) });
    } catch {
      setWerte(AUSGANG[id] ?? AUSGANG.studio_white);
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      const p = data?.plan || 'free';
      setPlan(p);
      localStorage.setItem('dealer_plan', p);
    });
  }, []);

  const kurzBestaetigen = () => {
    setBestaetigt(true);
    setTimeout(() => setBestaetigt(false), 1800);
  };

  const waehlen = (id: string, tier: BackgroundTier) => {
    if (!canUseBackground(plan, tier)) return;
    setGewaehlt(id);
    localStorage.setItem('dealer_background', id);
    localStorage.removeItem('dealer_custom_background_url');
    try {
      const roh = localStorage.getItem(EINSTELLUNGEN_SCHLUESSEL);
      const alle = roh ? JSON.parse(roh) : {};
      setWerte({ ...(AUSGANG[id] ?? AUSGANG.studio_white), ...(alle?.[id] ?? {}) });
    } catch {
      setWerte(AUSGANG[id] ?? AUSGANG.studio_white);
    }
    kurzBestaetigen();
  };

  /* ── Vorschau: kostenlos, darf oft laufen ── */
  const berechnen = useCallback(async (id: string, v: HgWerte, auto: string | null) => {
    const vorlage = GERECHNET[id];
    if (!vorlage || !auto) { setVorschau(null); return; }
    setRechnet(true);
    try {
      const res = await fetch('/api/studio-eigen/komponieren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freigestellt: auto, vorlage, breite: 1100, hintergrund: v,
        }),
      });
      const daten = await res.json();
      if (res.ok) setVorschau(daten.bild);
    } catch { /* Vorschau ist Beiwerk, kein Grund fuer eine Fehlermeldung */ }
    finally { setRechnet(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => berechnen(gewaehlt, werte, fahrzeug), 200);
    return () => clearTimeout(t);
  }, [gewaehlt, werte, fahrzeug, berechnen]);

  const einstellungenSichern = (neu: HgWerte) => {
    setWerte(neu);
    try {
      const roh = localStorage.getItem(EINSTELLUNGEN_SCHLUESSEL);
      const alle = roh ? JSON.parse(roh) : {};
      alle[gewaehlt] = neu;
      localStorage.setItem(EINSTELLUNGEN_SCHLUESSEL, JSON.stringify(alle));
    } catch { /* Speichern darf die Seite nicht kippen */ }
  };

  const eigenenWaehlen = () => {
    if (!eigenerUrl) return;
    setGewaehlt(OWN_SHOWROOM_ID);
    localStorage.setItem('dealer_background', OWN_SHOWROOM_ID);
    localStorage.setItem('dealer_custom_background_url', eigenerUrl);
    kurzBestaetigen();
  };

  const hochladen = async (datei: File) => {
    setLaedt(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');
      const endung = datei.name.split('.').pop();
      const pfad = `${user.id}/background.${endung}`;
      const { error } = await supabase.storage.from('vehicle-images').upload(pfad, datei, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(pfad);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      setEigenerUrl(url);
      localStorage.setItem('dealer_custom_background_url', url);
      localStorage.setItem('dealer_background', OWN_SHOWROOM_ID);
      setGewaehlt(OWN_SHOWROOM_ID);
      kurzBestaetigen();
    } catch (err) {
      alert('Hochladen fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setLaedt(false);
    }
  };

  const eigenenEntfernen = () => {
    setEigenerUrl(null);
    localStorage.removeItem('dealer_custom_background_url');
    localStorage.setItem('dealer_background', DEFAULT_BACKGROUND_ID);
    setGewaehlt(DEFAULT_BACKGROUND_ID);
  };

  /* ── Bausteine ─────────────────────────────────────────────────── */



  const Kachel = ({ bg }: { bg: BackgroundEntry }) => {
    const frei = canUseBackground(plan, bg.tier);
    const aktiv = gewaehlt === bg.id;
    const gerechnet = bg.id in GERECHNET;
    const t = TARIF[bg.tier];

    return (
      <button onClick={() => waehlen(bg.id, bg.tier)} disabled={!frei} aria-pressed={aktiv}
        style={{
          textAlign: 'left', padding: 0, cursor: frei ? 'pointer' : 'not-allowed',
          background: G.buehneGrund, fontFamily: F,
          border: `1.5px solid ${aktiv ? G.buehneAkzent : G.buehneLinie + '3a'}`,
          borderRadius: 11, overflow: 'hidden', opacity: frei ? 1 : 0.5,
          boxShadow: aktiv ? `0 0 0 3px ${G.buehneAkzent}22` : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}>
        <div style={{
          aspectRatio: '3 / 2', position: 'relative', overflow: 'hidden',
          background: gerechnet
            ? `linear-gradient(178deg, ${AUSGANG[bg.id].wandOben} 0%, ${AUSGANG[bg.id].wandUnten} 72%, ${AUSGANG[bg.id].bodenUnten} 100%)`
            : `linear-gradient(170deg, ${bg.farben[0]} 0%, ${bg.farben[0]} 62%, ${bg.farben[1]} 100%)`,
        }}>
          {!gerechnet && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 3px rgba(0,0,0,.55)',
            }}>
              <ImageOff size={16} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>entsteht beim Bearbeiten</span>
            </div>
          )}
          {aktiv && (
            <div style={{
              position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: '50%',
              background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Check size={13} color="#0a0c11" strokeWidth={3} /></div>
          )}
          {!frei && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(10,12,17,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Lock size={18} color="#fff" /></div>
          )}
        </div>
        <div style={{ padding: '9px 11px 11px', borderTop: `1px solid ${G.buehneLinie}22` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: G.buehneText }}>{bg.label}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9,
              fontWeight: 700, color: t.farbe, background: t.farbe + '1e',
              border: `1px solid ${t.farbe}44`, borderRadius: 20, padding: '1px 5px',
            }}>{t.symbol}{t.name}</span>
          </div>
        </div>
      </button>
    );
  };

  const gerechnete = BACKGROUNDS.filter(b => b.id in GERECHNET);
  const erzeugte   = BACKGROUNDS.filter(b => !(b.id in GERECHNET));

  return (
    <div style={{ background: G.buehneGrund, minHeight: '100vh', color: G.buehneText, fontFamily: F }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 22px 90px' }}>

        <header style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em' }}>Hintergründe</h1>
            {bestaetigt && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                color: '#4ade80', background: 'rgba(74,222,128,.12)',
                border: '1px solid rgba(74,222,128,.3)', borderRadius: 20, padding: '3px 10px',
              }}><Check size={12} /> Gespeichert</span>
            )}
          </div>
          <p style={{ margin: '8px 0 0', color: G.buehneLeise, fontSize: 14.5, maxWidth: '68ch', lineHeight: 1.6 }}>
            Der Raum, in dem deine Fahrzeuge stehen. Wie das Fahrzeug darin sitzt — Größe,
            Schatten, Spiegelung — stellst du unter <strong style={{ color: G.buehneText }}>Studio</strong> ein.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'start' }}>

          {/* ── Linke Spalte ── */}
          <div>
            {/* Grosse Vorschau */}
            <div style={{
              border: `1px solid ${G.buehneLinie}44`, borderRadius: 12, overflow: 'hidden',
              background: '#000', position: 'relative', marginBottom: 20,
              aspectRatio: '3 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {vorschau ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={vorschau} alt="Vorschau" style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 34, maxWidth: '46ch' }}>
                  <Camera size={30} color={G.buehneLeise} />
                  <p style={{ color: G.buehneText, fontSize: 14, margin: '13px 0 6px', fontWeight: 600 }}>
                    {einstellbar ? 'Noch kein Fahrzeug für die Vorschau' : 'Dieser Hintergrund lässt sich nicht vorab zeigen'}
                  </p>
                  <p style={{ color: G.buehneLeise, fontSize: 12.5, margin: 0, lineHeight: 1.55 }}>
                    {einstellbar
                      ? 'Stelle unter Studio einmal ein Foto frei — danach siehst du hier dein eigenes Fahrzeug in jedem Hintergrund, ohne dass etwas kostet.'
                      : 'Showroom- und Außenkulissen entstehen erst beim Bearbeiten des Bildes. Was hier zu sehen wäre, wäre geraten.'}
                  </p>
                </div>
              )}
              {rechnet && (
                <div style={{
                  position: 'absolute', top: 11, right: 11, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '5px 11px', fontSize: 11.5,
                }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Rechnet
                </div>
              )}
            </div>

            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 11, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Studio</h2>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                  color: '#4ade80', background: 'rgba(74,222,128,.1)',
                  border: '1px solid rgba(74,222,128,.3)', borderRadius: 20, padding: '2px 8px',
                }}>kostenlos · einstellbar</span>
              </div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(175px,1fr))' }}>
                {gerechnete.map(b => <Kachel key={b.id} bg={b} />)}
              </div>
            </section>

            <section style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 11, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Showroom und Außen</h2>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                  color: '#fbbf24', background: 'rgba(251,191,36,.1)',
                  border: '1px solid rgba(251,191,36,.3)', borderRadius: 20, padding: '2px 8px',
                }}>wird je Bild erzeugt</span>
              </div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(175px,1fr))' }}>
                {erzeugte.map(b => <Kachel key={b.id} bg={b} />)}
              </div>
            </section>

            {/* Eigener Showroom */}
            <section>
              <h2 style={{ margin: '0 0 11px', fontSize: 14.5, fontWeight: 700 }}>Eigener Showroom</h2>
              <div style={{
                display: 'grid', gap: 14,
                gridTemplateColumns: eigenerUrl ? 'minmax(0,260px) minmax(0,1fr)' : '1fr',
              }}>
                {eigenerUrl && (
                  <button onClick={eigenenWaehlen} aria-pressed={gewaehlt === OWN_SHOWROOM_ID}
                    style={{
                      padding: 0, cursor: 'pointer', background: G.buehneGrund, overflow: 'hidden',
                      border: `1.5px solid ${gewaehlt === OWN_SHOWROOM_ID ? G.buehneAkzent : G.buehneLinie + '3a'}`,
                      borderRadius: 11, position: 'relative', aspectRatio: '3 / 2',
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={eigenerUrl} alt="Eigener Showroom"
                         style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {gewaehlt === OWN_SHOWROOM_ID && (
                      <div style={{
                        position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: '50%',
                        background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Check size={13} color="#0a0c11" strokeWidth={3} /></div>
                    )}
                  </button>
                )}
                <div style={{
                  border: `1px dashed ${G.buehneLinie}55`, borderRadius: 11, padding: '17px 19px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {eigenerUrl ? 'Showroom ersetzen' : 'Eigenen Showroom hochladen'}
                  </span>
                  <p style={{ margin: 0, fontSize: 12.5, color: G.buehneLeise, lineHeight: 1.55, maxWidth: '52ch' }}>
                    Ein Foto deiner eigenen Halle — leer, quer aufgenommen, gleichmäßig ausgeleuchtet.
                    Dann stehen deine Fahrzeuge dort, wo sie wirklich stehen.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => dateiRef.current?.click()} disabled={laedt}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px',
                        cursor: laedt ? 'wait' : 'pointer', background: G.buehneAkzent, color: '#0a0c11',
                        border: 'none', borderRadius: 8, fontFamily: F, fontSize: 12.5, fontWeight: 700,
                      }}>
                      <Upload size={13} /> {laedt ? 'Wird geladen…' : 'Foto wählen'}
                    </button>
                    {eigenerUrl && (
                      <button onClick={eigenenEntfernen}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                          cursor: 'pointer', background: 'transparent', color: '#f87171',
                          border: `1px solid ${G.buehneLinie}44`, borderRadius: 8,
                          fontFamily: F, fontSize: 12.5, fontWeight: 600,
                        }}>
                        <Trash2 size={12} /> Entfernen
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <input ref={dateiRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const d = e.target.files?.[0]; if (d) hochladen(d); e.target.value = ''; }} />
            </section>
          </div>

          {/* ── Rechte Spalte: einstellen ── */}
          <aside style={{
            border: `1px solid ${G.buehneLinie}44`, borderRadius: 12,
            padding: '16px 17px', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <SlidersHorizontal size={15} color={G.buehneAkzent} />
              <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Einstellen</h2>
            </div>

            {!einstellbar ? (
              <p style={{
                margin: 0, fontSize: 12.5, color: G.buehneLeise, lineHeight: 1.6,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                Nur die Studio-Hintergründe lassen sich einstellen — sie werden gerechnet.
                Showroom und Außen entstehen bei jedem Bild neu; daran kann hier nichts gedreht werden.
              </p>
            ) : (
              <>
                <Farbe wert={werte.wandOben} name="Wand oben" beiAenderung={v => einstellungenSichern({ ...werte, wandOben: v })} />
                <Farbe wert={werte.wandUnten} name="Wand unten" beiAenderung={v => einstellungenSichern({ ...werte, wandUnten: v })} />
                <Farbe wert={werte.bodenOben} name="Boden vorn" beiAenderung={v => einstellungenSichern({ ...werte, bodenOben: v })} />
                <Farbe wert={werte.bodenUnten} name="Boden hinten" beiAenderung={v => einstellungenSichern({ ...werte, bodenUnten: v })} />

                <div style={{ height: 1, background: G.buehneLinie + '33', margin: '14px 0' }} />

                <Regler wert={werte.horizont} name="Horizont" min={0.4} max={0.92} schritt={0.01} beiAenderung={v => einstellungenSichern({ ...werte, horizont: v })} />
                <Regler wert={werte.lichtStaerke} name="Licht" min={0} max={0.6} schritt={0.01} beiAenderung={v => einstellungenSichern({ ...werte, lichtStaerke: v })} />
                <Regler wert={werte.lichtX} name="Licht waagerecht" min={0} max={1} schritt={0.01} beiAenderung={v => einstellungenSichern({ ...werte, lichtX: v })} />
                <Regler wert={werte.lichtY} name="Licht senkrecht" min={0} max={0.8} schritt={0.01} beiAenderung={v => einstellungenSichern({ ...werte, lichtY: v })} />
                <Regler wert={werte.lichtGroesse} name="Lichtgröße" min={0.2} max={1} schritt={0.01} beiAenderung={v => einstellungenSichern({ ...werte, lichtGroesse: v })} />

                <button onClick={() => einstellungenSichern(AUSGANG[gewaehlt])}
                  style={{
                    width: '100%', marginTop: 4, padding: '9px', cursor: 'pointer',
                    background: 'transparent', border: `1px solid ${G.buehneLinie}55`,
                    borderRadius: 8, color: G.buehneLeise, fontFamily: F, fontSize: 12.5, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <RotateCcw size={12} /> Auf Ausgangswerte
                </button>

                {!fahrzeug && (
                  <p style={{ margin: '13px 0 0', fontSize: 11.5, color: G.buehneLeise, lineHeight: 1.55 }}>
                    Für die Vorschau fehlt noch ein freigestelltes Fahrzeug. Unter <strong
                    style={{ color: G.buehneText }}>Studio</strong> einmal ein Foto laden — danach
                    kostet keine Einstellung mehr etwas.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 1040px) {
          div[style*="grid-template-columns: minmax(0,1fr) 320px"] { grid-template-columns: 1fr !important }
        }`}</style>
    </div>
  );
}
