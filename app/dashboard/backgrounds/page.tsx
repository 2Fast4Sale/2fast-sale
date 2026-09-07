'use client';

/**
 * Raum-Konfigurator.
 *
 * Vierter Anlauf, und der erste mit dem richtigen Aufbau. Die drei
 * vorherigen boten fertige Raeume zur Auswahl oder Schieberegler zum
 * Einstellen. Beides ist falsch fuer diese Aufgabe:
 *
 * Fertige Raeume sind zu wenige. Acht Vorlagen decken nicht ab, was
 * Haendler wollen — heller Raum mit dunklem Boden, dunkler Raum mit
 * hellem Boden, warm mit Estrich.
 *
 * Regler sind zu viel. Wer eine Wandfarbe waehlen soll, ist mit vier
 * Farbfeldern und fuenf Reglern beschaeftigt, statt zu entscheiden.
 *
 * Der Weg dazwischen: zwei Kataloge, frei kombinierbar. Acht Waende
 * und acht Boeden ergeben vierundsechzig Raeume, und der Haendler
 * trifft zwei Entscheidungen statt neun. Abgeschaut beim
 * Gecko-Konfigurator von Octopus, dessen Setup-Code "BD0089R1015"
 * genau dasselbe ausdrueckt: Wand plus Boden.
 *
 * Der Schalter "Fahrzeug ausblenden" hat denselben Grund wie dort: In
 * der grossen Vorschau will man sehen, wie ein Auto im Raum steht — im
 * Katalog will man die Wand sehen, und da steht ein Auto davor nur im
 * Weg.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Upload, Trash2, Camera, ChevronLeft, ChevronRight,
  Eye, EyeOff, Copy, Shuffle,
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { OWN_SHOWROOM_ID } from '../../../lib/backgrounds';
import { G } from '../listing/gestaltung';

const F = G.schrift;

/* Muss zu WAENDE/BOEDEN in lib/studio/hintergrund.ts passen. Dort steht
 * die Wahrheit; hier nur die Namen, weil sharp nicht ins Browser-Bundle
 * darf. */
const WAENDE: [string, string][] = [
  ['W01', 'Weiß, nahtlos'], ['W02', 'Weiß mit Decke'], ['W03', 'Hellgrau'],
  ['W04', 'Mittelgrau'],    ['W05', 'Anthrazit'],      ['W06', 'Schwarz'],
  ['W07', 'Warm, Nussbaum'],['W08', 'Blaugrau, kühl'],
];
const BOEDEN: [string, string][] = [
  ['B01', 'Hell, matt'],    ['B02', 'Hell, glänzend'], ['B03', 'Grau, matt'],
  ['B04', 'Grau, poliert'], ['B05', 'Beton, dunkel'],  ['B06', 'Asphalt'],
  ['B07', 'Schwarz, Spiegel'], ['B08', 'Warm, Estrich'],
];

const STANDARD_CODE = 'W02B02';
const CODE_SCHLUESSEL = 'studio_raum_code';

export default function RaumKonfigurator() {
  const [wand, setWand]   = useState('W02');
  const [boden, setBoden] = useState('B02');
  const [reiter, setReiter] = useState<'wand' | 'boden'>('wand');
  const [mitAuto, setMitAuto] = useState(true);
  const [gemerkt, setGemerkt] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  const [eigenerUrl, setEigenerUrl] = useState<string | null>(null);
  const [eigenerAktiv, setEigenerAktiv] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const dateiRef = useRef<HTMLInputElement>(null);

  const code = `${wand}${boden}`;

  useEffect(() => {
    const gespeichert = localStorage.getItem(CODE_SCHLUESSEL) || STANDARD_CODE;
    const t = gespeichert.match(/^(W\d{2})(B\d{2})$/i);
    if (t) { setWand(t[1].toUpperCase()); setBoden(t[2].toUpperCase()); }
    setEigenerUrl(localStorage.getItem('dealer_custom_background_url'));
    setEigenerAktiv(localStorage.getItem('dealer_background') === OWN_SHOWROOM_ID);

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      localStorage.setItem('dealer_plan', data?.plan || 'free');
    });
  }, []);

  /* Jede Wahl gilt sofort — ein Speichern-Knopf waere hier nur eine
   * zusaetzliche Handlung ohne Nutzen. */
  const merken = (w: string, b: string) => {
    localStorage.setItem(CODE_SCHLUESSEL, `${w}${b}`);
    localStorage.setItem('dealer_background', `${w}${b}`);
    localStorage.removeItem('dealer_custom_background_url_aktiv');
    setEigenerAktiv(false);
    setGemerkt(true);
    setTimeout(() => setGemerkt(false), 1500);
  };

  const setzeWand  = (w: string) => { setWand(w);  merken(w, boden); };
  const setzeBoden = (b: string) => { setBoden(b); merken(wand, b); };

  /* Blaettern mit den Pfeilen — bezieht sich immer auf den offenen Reiter. */
  const blaettern = (richtung: -1 | 1) => {
    const liste = reiter === 'wand' ? WAENDE : BOEDEN;
    const jetzt = reiter === 'wand' ? wand : boden;
    const i = liste.findIndex(([id]) => id === jetzt);
    const neu = liste[(i + richtung + liste.length) % liste.length][0];
    if (reiter === 'wand') setzeWand(neu); else setzeBoden(neu);
  };

  const zufall = () => {
    const w = WAENDE[Math.floor(Math.random() * WAENDE.length)][0];
    const b = BOEDEN[Math.floor(Math.random() * BOEDEN.length)][0];
    setWand(w); setBoden(b); merken(w, b);
  };

  const codeKopieren = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1500);
    } catch { /* ohne Zwischenablage-Recht passiert eben nichts */ }
  };

  const eigenenWaehlen = () => {
    if (!eigenerUrl) return;
    localStorage.setItem('dealer_background', OWN_SHOWROOM_ID);
    setEigenerAktiv(true);
    setGemerkt(true);
    setTimeout(() => setGemerkt(false), 1500);
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
      setEigenerAktiv(true);
    } catch (err) {
      alert('Hochladen fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setLaedt(false);
    }
  };

  const eigenenEntfernen = () => {
    setEigenerUrl(null);
    setEigenerAktiv(false);
    localStorage.removeItem('dealer_custom_background_url');
    localStorage.setItem('dealer_background', code);
  };

  const liste = reiter === 'wand' ? WAENDE : BOEDEN;

  return (
    <div style={{ background: G.buehneGrund, minHeight: '100vh', color: G.buehneText, fontFamily: F }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 22px 90px' }}>

        <header style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em' }}>Raum wählen</h1>
            {gemerkt && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                color: '#4ade80', background: 'rgba(74,222,128,.12)',
                border: '1px solid rgba(74,222,128,.3)', borderRadius: 20, padding: '3px 10px',
              }}><Check size={12} /> Übernommen</span>
            )}
          </div>
          <p style={{ margin: '8px 0 0', color: G.buehneLeise, fontSize: 14.5, maxWidth: '70ch', lineHeight: 1.6 }}>
            Wand und Boden werden getrennt gewählt und frei kombiniert — acht mal acht ergibt
            64 Räume. Alle werden gerechnet und kosten nichts.
          </p>
        </header>

        {/* ── Grosse Vorschau ── */}
        <div style={{
          border: `1px solid ${G.buehneLinie}44`, borderRadius: 13, overflow: 'hidden',
          background: '#000', position: 'relative', marginBottom: 14,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`${code}-${mitAuto}`}
               src={`/api/studio-eigen/vorschau?code=${code}&b=1200${mitAuto ? '' : '&leer=1'}`}
               alt={`Raum ${code}`}
               style={{ width: '100%', display: 'block', aspectRatio: '3 / 2', objectFit: 'cover' }} />

          <button onClick={() => blaettern(-1)} aria-label="Zurück"
            style={{ ...pfeilStil, left: 14 }}><ChevronLeft size={20} /></button>
          <button onClick={() => blaettern(1)} aria-label="Weiter"
            style={{ ...pfeilStil, right: 14 }}><ChevronRight size={20} /></button>

          <button onClick={() => setMitAuto(m => !m)}
            style={{
              position: 'absolute', top: 13, right: 13, display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 13px', cursor: 'pointer', background: 'rgba(10,12,17,0.72)',
              border: `1px solid ${G.buehneLinie}55`, borderRadius: 20,
              color: G.buehneText, fontFamily: F, fontSize: 12, fontWeight: 600,
            }}>
            {mitAuto ? <EyeOff size={13} /> : <Eye size={13} />}
            {mitAuto ? 'Fahrzeug ausblenden' : 'Fahrzeug zeigen'}
          </button>
        </div>

        {/* ── Code-Leiste ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          border: `1px solid ${G.buehneLinie}44`, borderRadius: 10,
          padding: '11px 15px', marginBottom: 24, background: 'rgba(255,255,255,0.02)',
        }}>
          <span style={{ fontSize: 12.5, color: G.buehneLeise }}>Dein Raum-Code</span>
          <code style={{
            fontFamily: G.ziffern, fontSize: 15, fontWeight: 700, letterSpacing: '.06em',
            color: G.buehneAkzent, background: G.buehneAkzent + '18',
            border: `1px dashed ${G.buehneAkzent}66`, borderRadius: 7, padding: '4px 11px',
          }}>{code}</code>
          <button onClick={codeKopieren}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', cursor: 'pointer',
              background: 'transparent', border: `1px solid ${G.buehneLinie}55`, borderRadius: 7,
              color: kopiert ? '#4ade80' : G.buehneLeise, fontFamily: F, fontSize: 12, fontWeight: 600,
            }}>
            {kopiert ? <Check size={12} /> : <Copy size={12} />} {kopiert ? 'Kopiert' : 'Kopieren'}
          </button>
          <button onClick={zufall}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 11px', cursor: 'pointer', background: 'transparent',
              border: `1px solid ${G.buehneLinie}55`, borderRadius: 7,
              color: G.buehneLeise, fontFamily: F, fontSize: 12, fontWeight: 600,
            }}>
            <Shuffle size={12} /> Überraschung
          </button>
        </div>

        {/* ── Katalog ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['wand', 'boden'] as const).map(r => (
            <button key={r} onClick={() => setReiter(r)}
              style={{
                padding: '8px 18px', cursor: 'pointer', fontFamily: F, fontSize: 13,
                fontWeight: reiter === r ? 700 : 500, borderRadius: 8,
                border: `1px solid ${reiter === r ? G.buehneAkzent : G.buehneLinie + '44'}`,
                background: reiter === r ? G.buehneAkzent + '1e' : 'transparent',
                color: reiter === r ? G.buehneAkzent : G.buehneLeise,
              }}>
              {r === 'wand' ? 'Wand' : 'Boden'}
            </button>
          ))}
        </div>

        <div style={{
          display: 'grid', gap: 11, marginBottom: 34,
          gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
        }}>
          {liste.map(([id, name]) => {
            const aktiv = reiter === 'wand' ? wand === id : boden === id;
            /*
             * Die Kachel zeigt NUR den eigenen Baustein: eine Wand vor
             * neutralem Boden, ein Boden unter neutraler Wand. Sonst
             * saehe man immer die aktuelle Kombination und koennte
             * nicht beurteilen, was der Baustein selbst beitraegt.
             */
            const kachelCode = reiter === 'wand' ? `${id}B03` : `W04${id}`;
            return (
              <button key={id}
                onClick={() => (reiter === 'wand' ? setzeWand(id) : setzeBoden(id))}
                aria-pressed={aktiv}
                style={{
                  padding: 0, cursor: 'pointer', overflow: 'hidden', fontFamily: F,
                  background: G.buehneGrund, textAlign: 'left',
                  border: `1.5px solid ${aktiv ? G.buehneAkzent : G.buehneLinie + '33'}`,
                  borderRadius: 10,
                  boxShadow: aktiv ? `0 0 0 3px ${G.buehneAkzent}22` : 'none',
                }}>
                <div style={{ position: 'relative', aspectRatio: '3 / 2', background: '#111' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/studio-eigen/vorschau?code=${kachelCode}&b=300&leer=1`} alt=""
                       loading="lazy"
                       style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {aktiv && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6, width: 21, height: 21, borderRadius: '50%',
                      background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Check size={12} color="#0a0c11" strokeWidth={3} /></div>
                  )}
                </div>
                <div style={{ padding: '8px 10px 9px', borderTop: `1px solid ${G.buehneLinie}22` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: G.buehneText }}>{name}</div>
                  <div style={{ fontSize: 10, color: G.buehneLeise, fontFamily: G.ziffern }}>{id}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Eigene Halle ── */}
        <section>
          <h2 style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 700 }}>Oder deine eigene Halle</h2>
          <p style={{ margin: '0 0 13px', fontSize: 13, color: G.buehneLeise, lineHeight: 1.55, maxWidth: '62ch' }}>
            Statt eines gerechneten Raums ein Foto deiner Halle — leer, quer aufgenommen, die Kamera
            etwa auf Kotflügelhöhe. Dann stehen deine Fahrzeuge dort, wo sie wirklich stehen.
          </p>

          <div style={{
            display: 'grid', gap: 14,
            gridTemplateColumns: eigenerUrl ? 'minmax(0,260px) minmax(0,1fr)' : '1fr',
          }}>
            {eigenerUrl && (
              <button onClick={eigenenWaehlen} aria-pressed={eigenerAktiv}
                style={{
                  padding: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  aspectRatio: '3 / 2', background: G.buehneGrund, borderRadius: 10,
                  border: `1.5px solid ${eigenerAktiv ? G.buehneAkzent : G.buehneLinie + '33'}`,
                  boxShadow: eigenerAktiv ? `0 0 0 3px ${G.buehneAkzent}22` : 'none',
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={eigenerUrl} alt="Eigene Halle"
                     style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {eigenerAktiv && (
                  <div style={{
                    position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: '50%',
                    background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Check size={13} color="#0a0c11" strokeWidth={3} /></div>
                )}
              </button>
            )}

            <div style={{
              border: `1px dashed ${G.buehneLinie}55`, borderRadius: 10, padding: '17px 19px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 11,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={16} color={G.buehneAkzent} />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {eigenerUrl ? 'Halle ersetzen' : 'Halle hochladen'}
                </span>
              </div>
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
    </div>
  );
}

const pfeilStil: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
  background: 'rgba(10,12,17,0.68)', border: '1px solid rgba(255,255,255,0.16)',
  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
