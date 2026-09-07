'use client';

/**
 * Hintergrund-Auswahl.
 *
 * Zweiter Anlauf. Die erste Fassung zeigte zehn Kacheln, von denen
 * neun nur aus zwei Farben bestanden — es gibt schlicht keine
 * Vorschaubilder, weil die Hintergruende Beschreibungen sind und erst
 * beim Bearbeiten entstehen. Der Haendler waehlte blind zwischen
 * "Studio Grau" und "Industrieloft".
 *
 * Zwei Dinge sind jetzt anders:
 *
 * Die Studio-Hintergruende werden GERECHNET (lib/studio/hintergrund).
 * Fuer sie gibt es echte Vorschauen — mit einem Fahrzeugumriss darin,
 * weil ein leerer Raum nicht zeigt, wie ein Auto darin steht.
 *
 * Und die Seite sortiert nach Kosten statt nach Kategorie. Das ist
 * keine Buchhalterei: Ein gerechneter Hintergrund kostet nichts und
 * sieht bei allen zwoelf Bildern eines Fahrzeugs gleich aus. Ein
 * erzeugter kostet bei jedem einzelnen Bild und ist nur ueber den Seed
 * halbwegs stabil. Das gehoert vor die Wahl, nicht in die Rechnung.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Lock, Upload, Trash2, Crown, Zap, Sparkles, ImageOff, Camera,
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import {
  BACKGROUNDS, DEFAULT_BACKGROUND_ID, OWN_SHOWROOM_ID,
  canUseBackground, type BackgroundTier, type BackgroundEntry,
} from '../../../lib/backgrounds';
import { G } from '../listing/gestaltung';

const F = G.schrift;

/* Welche Hintergruende rechnet der Server selbst? Muss zu GERECHNET in
 * lib/studio/hintergrund.ts passen — dort steht die Wahrheit, hier nur
 * die Anzeige, weil sharp nicht ins Browser-Bundle darf. */
const GERECHNET = new Set(['studio_white', 'studio_dark', 'studio_grey']);

const TARIF: Record<BackgroundTier, { name: string; farbe: string; symbol: React.ReactNode }> = {
  free:     { name: 'Free',     farbe: '#4ade80', symbol: <Sparkles size={10} /> },
  pro:      { name: 'Pro',      farbe: '#7c8aff', symbol: <Zap size={10} />      },
  business: { name: 'Business', farbe: '#fbbf24', symbol: <Crown size={10} />    },
};

export default function HintergrundSeite() {
  const [gewaehlt, setGewaehlt]   = useState(DEFAULT_BACKGROUND_ID);
  const [bestaetigt, setBestaetigt] = useState(false);
  const [plan, setPlan]           = useState('free');
  const [eigenerUrl, setEigenerUrl] = useState<string | null>(null);
  const [laedt, setLaedt]         = useState(false);
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGewaehlt(localStorage.getItem('dealer_background') || DEFAULT_BACKGROUND_ID);
    setEigenerUrl(localStorage.getItem('dealer_custom_background_url') || null);

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
    kurzBestaetigen();
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
      // Zeitstempel gegen Caching — sonst zeigt der Browser nach dem
      // Ersetzen weiter das alte Bild.
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

  /* ── Eine Kachel ───────────────────────────────────────────────── */
  const Kachel = ({ bg }: { bg: BackgroundEntry }) => {
    const frei    = canUseBackground(plan, bg.tier);
    const aktiv   = gewaehlt === bg.id;
    const gerechnet = GERECHNET.has(bg.id);
    const t       = TARIF[bg.tier];

    return (
      <button
        onClick={() => waehlen(bg.id, bg.tier)}
        disabled={!frei}
        aria-pressed={aktiv}
        style={{
          textAlign: 'left', padding: 0, cursor: frei ? 'pointer' : 'not-allowed',
          background: G.buehneGrund, fontFamily: F,
          border: `1.5px solid ${aktiv ? G.buehneAkzent : G.buehneLinie + '3a'}`,
          borderRadius: 12, overflow: 'hidden',
          opacity: frei ? 1 : 0.5, position: 'relative',
          boxShadow: aktiv ? `0 0 0 3px ${G.buehneAkzent}22` : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}>

        {/* Vorschau */}
        <div style={{
          aspectRatio: '3 / 2', position: 'relative', overflow: 'hidden',
          background: `linear-gradient(170deg, ${bg.farben[0]} 0%, ${bg.farben[0]} 62%, ${bg.farben[1]} 100%)`,
        }}>
          {gerechnet ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={`/api/studio-eigen/vorschau?id=${bg.id}`} alt=""
                 style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            /*
             * Kein erfundenes Vorschaubild. Etwas zu zeigen, das
             * nachher anders aussieht, waere schlimmer als der ehrliche
             * Hinweis — der Haendler soll nicht ueberrascht werden.
             */
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 3px rgba(0,0,0,.5)',
            }}>
              <ImageOff size={17} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.02em' }}>
                entsteht beim Bearbeiten
              </span>
            </div>
          )}

          {aktiv && (
            <div style={{
              position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
              background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={14} color="#0a0c11" strokeWidth={3} />
            </div>
          )}

          {!frei && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(10,12,17,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={19} color="#fff" />
            </div>
          )}
        </div>

        {/* Beschriftung */}
        <div style={{ padding: '11px 13px 13px', borderTop: `1px solid ${G.buehneLinie}22` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: G.buehneText }}>{bg.label}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em',
              color: t.farbe, background: t.farbe + '1e',
              border: `1px solid ${t.farbe}44`, borderRadius: 20, padding: '1px 6px',
            }}>{t.symbol}{t.name}</span>
          </div>
          <p style={{
            margin: 0, fontSize: 11.5, lineHeight: 1.45, color: G.buehneLeise,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{bg.beschreibung}</p>
        </div>
      </button>
    );
  };

  const gerechnete = BACKGROUNDS.filter(b => GERECHNET.has(b.id));
  const erzeugte   = BACKGROUNDS.filter(b => !GERECHNET.has(b.id));

  const Abschnitt = ({ titel, hinweis, farbe, kinder }: {
    titel: string; hinweis: string; farbe: string; kinder: React.ReactNode;
  }) => (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 13 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: G.buehneText }}>{titel}</h2>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
          color: farbe, background: farbe + '1a', border: `1px solid ${farbe}3a`,
          borderRadius: 20, padding: '2px 8px',
        }}>{hinweis}</span>
      </div>
      <div style={{
        display: 'grid', gap: 14,
        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
      }}>{kinder}</div>
    </section>
  );

  return (
    <div style={{ background: G.buehneGrund, minHeight: '100vh', color: G.buehneText, fontFamily: F }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 22px 90px' }}>

        <header style={{ marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em' }}>
              Hintergründe
            </h1>
            {bestaetigt && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                color: '#4ade80', background: 'rgba(74,222,128,.12)',
                border: '1px solid rgba(74,222,128,.3)', borderRadius: 20, padding: '3px 10px',
              }}>
                <Check size={12} /> Gespeichert
              </span>
            )}
          </div>
          <p style={{
            margin: '9px 0 0', color: G.buehneLeise, fontSize: 14.5, maxWidth: '66ch', lineHeight: 1.6,
          }}>
            Der Raum, in dem deine Fahrzeuge stehen. Die Auswahl gilt für alle Inserate und
            lässt sich jederzeit ändern — bereits bearbeitete Bilder bleiben, wie sie sind.
          </p>
        </header>

        {/* ── Eigener Showroom ── */}
        <section style={{ marginBottom: 34 }}>
          <h2 style={{ margin: '0 0 13px', fontSize: 15, fontWeight: 700 }}>Eigener Showroom</h2>

          <div style={{
            display: 'grid', gap: 16, alignItems: 'stretch',
            gridTemplateColumns: eigenerUrl ? 'minmax(0,300px) minmax(0,1fr)' : '1fr',
          }}>
            {eigenerUrl && (
              <button onClick={eigenenWaehlen} aria-pressed={gewaehlt === OWN_SHOWROOM_ID}
                style={{
                  padding: 0, cursor: 'pointer', background: G.buehneGrund, overflow: 'hidden',
                  border: `1.5px solid ${gewaehlt === OWN_SHOWROOM_ID ? G.buehneAkzent : G.buehneLinie + '3a'}`,
                  borderRadius: 12, position: 'relative', aspectRatio: '3 / 2',
                  boxShadow: gewaehlt === OWN_SHOWROOM_ID ? `0 0 0 3px ${G.buehneAkzent}22` : 'none',
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={eigenerUrl} alt="Eigener Showroom"
                     style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {gewaehlt === OWN_SHOWROOM_ID && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                    background: G.buehneAkzent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={14} color="#0a0c11" strokeWidth={3} />
                  </div>
                )}
              </button>
            )}

            <div style={{
              border: `1px dashed ${G.buehneLinie}55`, borderRadius: 12, padding: '20px 22px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Camera size={17} color={G.buehneAkzent} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {eigenerUrl ? 'Showroom ersetzen' : 'Eigenen Showroom hochladen'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: G.buehneLeise, lineHeight: 1.55, maxWidth: '54ch' }}>
                Ein Foto deiner eigenen Halle — leer, quer aufgenommen, möglichst gleichmäßig
                ausgeleuchtet. Damit stehen deine Fahrzeuge dort, wo sie wirklich stehen,
                und jedes Inserat ist sofort als deins zu erkennen.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => dateiRef.current?.click()} disabled={laedt}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px',
                    cursor: laedt ? 'wait' : 'pointer', background: G.buehneAkzent, color: '#0a0c11',
                    border: 'none', borderRadius: 8, fontFamily: F, fontSize: 12.5, fontWeight: 700,
                  }}>
                  <Upload size={14} /> {laedt ? 'Wird geladen…' : 'Foto wählen'}
                </button>
                {eigenerUrl && (
                  <button onClick={eigenenEntfernen}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px',
                      cursor: 'pointer', background: 'transparent', color: '#f87171',
                      border: `1px solid ${G.buehneLinie}44`, borderRadius: 8,
                      fontFamily: F, fontSize: 12.5, fontWeight: 600,
                    }}>
                    <Trash2 size={13} /> Entfernen
                  </button>
                )}
              </div>
            </div>
          </div>

          <input ref={dateiRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const d = e.target.files?.[0]; if (d) hochladen(d); e.target.value = ''; }} />
        </section>

        <Abschnitt titel="Studio" hinweis="kostenlos gerechnet" farbe="#4ade80"
          kinder={gerechnete.map(b => <Kachel key={b.id} bg={b} />)} />

        <Abschnitt titel="Showroom und Außen" hinweis="wird je Bild erzeugt" farbe="#fbbf24"
          kinder={erzeugte.map(b => <Kachel key={b.id} bg={b} />)} />

        <p style={{
          margin: 0, fontSize: 12, color: G.buehneLeise, lineHeight: 1.6, maxWidth: '74ch',
          borderTop: `1px solid ${G.buehneLinie}22`, paddingTop: 16,
        }}>
          <strong style={{ color: G.buehneText }}>Warum die Trennung:</strong> Die Studio-Hintergründe
          rechnet der Server selbst — sie kosten nichts und sehen bei allen Bildern eines Fahrzeugs
          garantiert gleich aus. Die übrigen haben erkennbaren Inhalt und werden für jedes einzelne
          Bild neu erzeugt; das kostet, und trotz festem Startwert können kleine Unterschiede bleiben.
          Für ein Inserat mit zwölf Bildern ist das ein spürbarer Unterschied.
        </p>
      </div>
    </div>
  );
}
