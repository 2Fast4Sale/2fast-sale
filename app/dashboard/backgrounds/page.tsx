'use client';

/**
 * Raumauswahl.
 *
 * Fuenfter Anlauf. Die vorigen vier boten gerechnete Raeume — erst
 * Vorlagen, dann Regler, dann zwei Kataloge fuer Wand und Boden mit 144
 * Kombinationen. Die sahen alle nach Computergrafik aus, und 144 davon
 * helfen nicht, wenn keine einzige echt wirkt.
 *
 * Jetzt sind es wenige Raeume, dafuer gerendert: echte Materialien,
 * echte Perspektive, Pflanzen und Bodenkreis als Modelle. Die Liste
 * kommt vom Server (/api/studio-eigen/raeume), damit ein neu
 * gerenderter Raum ohne Codeaenderung auftaucht.
 *
 * Gespeichert wird in `studio_raum`; Schritt 2 liest genau diesen
 * Schluessel und schickt ihn an /api/studio-eigen/verarbeiten.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, Upload, Trash2, Camera } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { OWN_SHOWROOM_ID } from '../../../lib/backgrounds';
import { G } from '../listing/gestaltung';

const F = G.schrift;
const RAUM_SCHLUESSEL = 'studio_raum';

interface Raum { name: string; titel: string; pfad: string }

export default function RaumAuswahl() {
  const [liste, setListe] = useState<Raum[]>([]);
  const [gewaehlt, setGewaehlt] = useState<string>('');
  const [gemerkt, setGemerkt] = useState(false);
  const [fehler, setFehler] = useState('');
  const [eigenerUrl, setEigenerUrl] = useState<string | null>(null);
  const [eigenerAktiv, setEigenerAktiv] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [horizont, setHorizont] = useState<number | null>(null);
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEigenerUrl(localStorage.getItem('dealer_custom_background_url'));
    const h = Number(localStorage.getItem('dealer_custom_background_horizont') || '');
    setHorizont(h > 0 ? h : null);
    setEigenerAktiv(localStorage.getItem('dealer_background') === OWN_SHOWROOM_ID);

    fetch('/api/studio-eigen/raeume')
      .then(r => r.json())
      .then((d: { standard: string; raeume: Raum[] }) => {
        setListe(d.raeume);
        const gespeichert = localStorage.getItem(RAUM_SCHLUESSEL);
        /*
         * Ein gespeicherter Name, den es nicht mehr gibt — etwa
         * "weiss_beton" aus dem vorigen Satz —, faellt auf den Standard
         * zurueck. Sonst waere kein Raum markiert und der Haendler
         * wuesste nicht, womit seine Bilder gerade entstehen.
         */
        const gueltig = d.raeume.some(r => r.name === gespeichert) ? gespeichert! : d.standard;
        setGewaehlt(gueltig);
      })
      .catch(() => setFehler('Die Räume konnten nicht geladen werden.'));

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      localStorage.setItem('dealer_plan', data?.plan || 'free');
    });
  }, []);

  const bestaetigen = () => {
    setGemerkt(true);
    setTimeout(() => setGemerkt(false), 1500);
  };

  /* Jede Wahl gilt sofort — ein Speichern-Knopf waere nur ein Klick mehr. */
  const waehlen = (name: string) => {
    setGewaehlt(name);
    localStorage.setItem(RAUM_SCHLUESSEL, name);
    localStorage.setItem('dealer_background', 'raum');
    setEigenerAktiv(false);
    bestaetigen();
  };

  const eigenenWaehlen = () => {
    if (!eigenerUrl) return;
    localStorage.setItem('dealer_background', OWN_SHOWROOM_ID);
    setEigenerAktiv(true);
    bestaetigen();
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
      // Neues Foto, neue Bodenlinie — die alte Markierung gehoert zum
      // alten Bild und wuerde den Schatten falsch setzen.
      setHorizont(null);
      localStorage.removeItem('dealer_custom_background_horizont');
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
    localStorage.removeItem('dealer_custom_background_horizont');
    setHorizont(null);
    localStorage.setItem('dealer_background', 'raum');
  };

  const aktuell = liste.find(r => r.name === gewaehlt);

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
            In diesem Raum stehen alle deine Fahrzeuge. Die Wahl gilt sofort für alle neuen Fotos —
            so sehen deine Inserate einheitlich aus.
          </p>
        </header>

        {fehler && <p style={{ color: '#f87171', fontSize: 14 }}>{fehler}</p>}

        {/* ── Große Vorschau ── */}
        {aktuell && !eigenerAktiv && (
          <div style={{
            border: `1px solid ${G.buehneLinie}44`, borderRadius: 13, overflow: 'hidden',
            background: '#000', marginBottom: 12,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aktuell.pfad} alt={aktuell.titel}
                 style={{ width: '100%', display: 'block', aspectRatio: '3 / 2', objectFit: 'cover' }} />
          </div>
        )}
        {aktuell && !eigenerAktiv && (
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 24 }}>{aktuell.titel}</div>
        )}

        {/* ── Katalog ── */}
        <div style={{
          display: 'grid', gap: 12, marginBottom: 36,
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
        }}>
          {liste.map(r => {
            const aktiv = !eigenerAktiv && gewaehlt === r.name;
            return (
              <button key={r.name} onClick={() => waehlen(r.name)} aria-pressed={aktiv}
                style={{
                  padding: 0, cursor: 'pointer', overflow: 'hidden', fontFamily: F,
                  background: G.buehneGrund, textAlign: 'left', borderRadius: 10,
                  border: `1.5px solid ${aktiv ? G.buehneAkzent : G.buehneLinie + '33'}`,
                  boxShadow: aktiv ? `0 0 0 3px ${G.buehneAkzent}22` : 'none',
                }}>
                <div style={{ position: 'relative', aspectRatio: '3 / 2', background: '#111' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.pfad} alt="" loading="lazy"
                       style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {aktiv && (
                    <div style={{
                      position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: '50%',
                      background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Check size={13} color="#0a0c11" strokeWidth={3} /></div>
                  )}
                </div>
                <div style={{ padding: '9px 11px 10px', borderTop: `1px solid ${G.buehneLinie}22` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: G.buehneText }}>{r.titel}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Eigene Halle ── */}
        <section>
          <h2 style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 700 }}>Oder deine eigene Halle</h2>
          <p style={{ margin: '0 0 13px', fontSize: 13, color: G.buehneLeise, lineHeight: 1.55, maxWidth: '62ch' }}>
            Statt eines unserer Räume ein Foto deiner Halle — leer, quer aufgenommen, die Kamera
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
          {/*
            Bodenlinie markieren.

            Ohne diese Linie weiss der Schatten nicht, wo in einem
            fremden Foto der Boden liegt, und das Auto schwebt. Ein Klick
            genuegt; die Linie wird als Anteil der Bildhoehe gespeichert
            und in Schritt 2 mitgeschickt.
          */}
          {eigenerUrl && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
                Bodenlinie markieren
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: G.buehneLeise, lineHeight: 1.55, maxWidth: '62ch' }}>
                Klicke auf die Stelle, an der der Boden auf die hintere Wand trifft.
                Daran richtet sich der Schatten unter deinen Fahrzeugen aus.
                {horizont === null && <strong style={{ color: '#fbbf24' }}> Noch nicht markiert.</strong>}
              </p>
              <div
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const anteil = Math.min(0.9, Math.max(0.1, (e.clientY - r.top) / r.height));
                  setHorizont(anteil);
                  localStorage.setItem('dealer_custom_background_horizont', anteil.toFixed(4));
                  bestaetigen();
                }}
                style={{
                  position: 'relative', cursor: 'crosshair', maxWidth: 720, borderRadius: 10,
                  overflow: 'hidden', border: `1px solid ${G.buehneLinie}44`, aspectRatio: '3 / 2',
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={eigenerUrl} alt="Eigene Halle – Bodenlinie markieren"
                     style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {horizont !== null && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: `${horizont * 100}%`,
                    borderTop: `2px dashed ${G.buehneAkzent}`, pointerEvents: 'none',
                  }} />
                )}
              </div>
            </div>
          )}
          <input ref={dateiRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const d = e.target.files?.[0]; if (d) hochladen(d); e.target.value = ''; }} />
        </section>
      </div>
    </div>
  );
}
