'use client';

/**
 * Schritt 1 — als Showroom statt als Formular.
 *
 * Vier Entwürfe vorher haben nicht getroffen, und alle vier hatten
 * denselben Denkfehler: Sie zeigten ein Formular. Mal dichter, mal
 * dunkler, mal mit grösserer Schrift — aber immer eine Liste von
 * Feldern, die abgearbeitet werden will. Feldlisten sehen nach Arbeit
 * aus, egal wie gut sie gesetzt sind.
 *
 * Hier steht deshalb etwas anderes im Vordergrund: das Inserat, das
 * gerade entsteht. Oben wächst der Titel mit jeder Eingabe, der Preis
 * steht gross daneben, die Eckdaten als Kennzahlen darunter. Wer tippt,
 * sieht nicht ein Formular voller Lücken, sondern ein Fahrzeug, das
 * Gestalt annimmt.
 *
 * Das ist keine Spielerei, sondern das Versprechen des Produkts:
 * Der Händler soll sehen, dass am Ende etwas Ansehnliches herauskommt.
 * Ein Werkzeug, das aussieht wie ein Antragsformular, macht das
 * unglaubwürdig — auch wenn die Fotos danach gut werden.
 *
 * Die Eingabe rutscht dafür nach unten und wird schmaler: eine ruhige
 * Leiste, kein Bildschirm voller Kästen. Was der Scan geliefert hat,
 * steht oben in der Zusammenfassung; nachtragen muss man nur die Lücken,
 * und die sind markiert.
 *
 * Die Logik liegt in useEntwurf.ts und ist mit den anderen Fassungen
 * geteilt — Scan, Marken-Zerlegung, EnVKV-Prüfung, Credit-Prüfung und
 * Titelvorschlag verhalten sich identisch.
 */

import { useState } from 'react';
import {
  Camera, Loader2, ArrowRight, ChevronDown, Search, X, Plus, RotateCcw, AlertCircle,
} from 'lucide-react';
import MarkenZeichen, { hatZeichen } from '../../../components/MarkenZeichen';
import { EQUIPMENT_DB } from '../../../../lib/equipmentDatabase';
import EnvkvFields from '../../../components/EnvkvFields';
import { type VehicleKind } from '../../../../lib/envkv';
import {
  useEntwurf, KRAFTSTOFFE, GETRIEBE, TOP_MARKEN, PFLICHT_NAME, type FormData,
} from './useEntwurf';

/* ────────────────────────── Gestaltung ────────────────────────── */

/*
 * Hell.
 *
 * Die erste Fassung war dunkel — Bildbearbeitungssoftware sieht so aus,
 * und das Werkzeug tut ja etwas Ähnliches. Beim Benutzen zeigte sich der
 * Haken: Ein Datenblatt liest man anders als ein Bild. Feine Linien,
 * Beschriftungen und leere Felder verschwimmen auf dunklem Grund, und
 * genau davon lebt diese Seite.
 *
 * Alle Textfarben gegen die weisse Fläche gerechnet, keine unter 4,5:1.
 */
const F = {
  schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  /** Der Seitengrund liegt nur knapp unter Weiss — genug, damit sich die Karten absetzen. */
  grund:   '#f6f7f9',
  flaeche: '#ffffff',
  erhoben: '#ffffff',
  linie:   '#e4e8ee',
  text:    '#0f172a',
  gedämpft:'#475569',
  /*
   * 5,30:1 gegen den Seitengrund.
   *
   * #64748b haette gegen Weiss gereicht (4,76), aber die Beschriftungen
   * stehen auf dem Seitengrund #f6f7f9 — dort kam es nur auf 4,44 und lag
   * damit knapp unter der Grenze. Gemessen wird gegen den Untergrund, den
   * das Element wirklich hat, nicht gegen den, den man im Kopf hat.
   */
  leise:   '#5b6878',
  akzent:  '#4338ca',
  gut:     '#047857',
  /*
   * 5,36:1 auf dem eigenen Farbfeld.
   *
   * #b45309 reichte gegen Weiss (5,02), aber die Warnungen stehen auf
   * einer eingefaerbten Flaeche aus derselben Farbe — dort kam es nur
   * auf 4,15. Ein Farbfeld hebt den Untergrund an und frisst genau den
   * Kontrast, den die Farbe gegen Weiss noch hatte. Gemessen wird gegen
   * den Untergrund, den das Element wirklich hat.
   */
  luecke:  '#a04a08',
  fehler:  '#b91c1c',
} as const;

const ART_ANZEIGE: Record<VehicleKind, string> = {
  gebrauchtwagen: 'Gebrauchtwagen',
  neuwagen:       'Neuwagen',
  tageszulassung: 'Tageszulassung',
  vorfuehrwagen:  'Vorführwagen',
  jahreswagen:    'Jahreswagen',
};

/* ────────────────────────── Bausteine ────────────────────────── */

/*
 * Ausserhalb der Formular-Komponente definiert.
 *
 * Innerhalb entsteht bei jeder Zustandsaenderung ein neuer
 * Komponententyp. React kann ihn nicht mit dem vorherigen gleichsetzen,
 * haengt den alten Baum ab und baut ihn neu auf — dabei verliert das
 * Eingabefeld den Fokus. In der Praxis: ein Zeichen tippen, dann ist man
 * draussen und muss neu hineinklicken. Der Fehler ist beim Lesen des
 * Codes praktisch unsichtbar und beim Benutzen sofort unertraeglich.
 */

/** Eingabe ohne Kasten — nur eine Linie, die bei Fokus aufleuchtet. */
function Eingabe({ wert, aendern, platzhalter, einheit, gross, erkannt }: {
  wert: string; aendern: (v: string) => void; platzhalter: string;
  einheit?: string; gross?: boolean; erkannt?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, borderBottom: `1px solid ${F.linie}`, paddingBottom: 5 }}>
      <input
        value={wert} onChange={ev => aendern(ev.target.value)} placeholder={platzhalter}
        onFocus={ev => (ev.target.parentElement!.style.borderBottomColor = F.akzent)}
        onBlur={ev => (ev.target.parentElement!.style.borderBottomColor = F.linie)}
        style={{
          width: '100%', boxSizing: 'border-box', background: 'transparent',
          border: 'none', outline: 'none', padding: 0, color: F.text,
          fontSize: gross ? 20 : 15, fontWeight: gross ? 600 : 400,
          fontFamily: F.schrift,
        }} />
      {einheit && <span style={{ fontSize: 12.5, color: F.leise, flexShrink: 0 }}>{einheit}</span>}
      {erkannt && (
        <span title="aus dem Fahrzeugschein" style={{ fontSize: 10.5, color: F.gut, flexShrink: 0, fontWeight: 700 }}>●</span>
      )}
    </div>
  );
}

/**
 * Feldbeschriftung mit Herkunftshinweis.
 *
 * Drei Zustaende, weil der Haendler drei verschiedene Dinge wissen muss:
 *
 *   luecke  — Pflichtangabe, ohne die es nicht weitergeht.
 *   selbst  — Der Scan liefert das nie. Getriebe steht auf keinem
 *             Fahrzeugschein, also muss es von Hand kommen — es sah aber
 *             aus wie jedes andere Feld und wurde uebersehen.
 *   sonst   — Kommt aus dem Schein oder ist entbehrlich.
 *
 * Ohne diese Unterscheidung sieht ein leeres Feld, das der Scan gleich
 * fuellt, genauso aus wie eines, auf das der Haendler ewig wartet.
 */
function Beschriftung({ text, luecke, selbst, erledigt }: {
  text: string; luecke?: boolean; selbst?: boolean; erledigt?: boolean;
}) {
  const zeigeSelbst = selbst && !erledigt;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: luecke ? F.luecke : zeigeSelbst ? F.akzent : F.leise,
    }}>
      {text}
      {luecke && (
        <span style={{
          padding: '1px 6px', borderRadius: 4, letterSpacing: 0, textTransform: 'none',
          fontSize: 10.5, background: 'rgba(180,83,9,0.09)', color: F.luecke,
        }}>Pflicht</span>
      )}
      {zeigeSelbst && !luecke && (
        <span style={{
          padding: '1px 6px', borderRadius: 4, letterSpacing: 0, textTransform: 'none',
          fontSize: 10.5, background: 'rgba(67,56,202,0.09)', color: F.akzent,
        }}>trägst du ein</span>
      )}
    </div>
  );
}

function Wahl({ optionen, wert, beiWahl }: {
  optionen: string[]; wert: string; beiWahl: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {optionen.map(o => {
        const an = wert === o;
        return (
          <button key={o} type="button" onClick={() => beiWahl(o)}
            style={{
              padding: '6px 11px', borderRadius: 7, cursor: 'pointer', fontFamily: F.schrift,
              fontSize: 12.5, fontWeight: an ? 600 : 500,
              border: `1px solid ${an ? F.akzent : F.linie}`,
              background: an ? 'rgba(67,56,202,0.07)' : 'transparent',
              color: an ? F.akzent : F.gedämpft,
            }}>{o}</button>
        );
      })}
    </div>
  );
}

function Block({ titel, kinder, rechts }: { titel: string; kinder: React.ReactNode; rechts?: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${F.linie}`, padding: '20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        {/*
          Deutlicher als vorher: 15px in Textfarbe statt 12px in Grau, mit
          einem Akzentstrich davor. Die Ueberschriften waren so leise, dass
          die Seite wie eine einzige lange Liste wirkte und man beim
          Scrollen nicht merkte, in welchem Abschnitt man ist.
        */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 3, height: 15, borderRadius: 2, background: F.akzent }} />
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px',
                       color: F.text }}>{titel}</h2>
        </div>
        {rechts && <div style={{ marginLeft: 'auto' }}>{rechts}</div>}
      </div>
      {kinder}
    </section>
  );
}


export default function Showroom() {
  const e = useEntwurf();
  const { data, setzen, erkannt, schmal, offenePflicht } = e;

  const [markeOffen, setMarkeOffen]       = useState(false);
  const [markeSuche, setMarkeSuche]       = useState('');
  const [ueberZone, setUeberZone]         = useState(false);
  const [ausstattungSuche, setAusstattungSuche] = useState('');
  const [ausstattungOffen, setAusstattungOffen] = useState(false);
  const [envkvOffen, setEnvkvOffen]       = useState(false);
  /*
   * Zugeklappt wird nur, was ERLEDIGT ist — nicht, was lang ist.
   *
   * Vorher war "Weitere Angaben" immer zu. Damit verschwanden genau die
   * Felder, die von Hand nachgetragen werden muessen, wenn der Scan sie
   * nicht gefunden hat. Wer nichts sieht, traegt nichts nach.
   *
   * null heisst: nach Datenlage entscheiden. true/false heisst: der
   * Haendler hat selbst geklappt, und das gilt dann.
   */
  const [mehrGeklappt, setMehrGeklappt] = useState<boolean | null>(null);

  /*
   * Verbrauchsangaben: Pflicht zeigt sie immer. Freiwillig geoeffnet
   * laesst sich wieder schliessen — vorher setzte der Knopf nur auf
   * "offen", und danach gab es keinen Weg zurueck.
   */
  const envkvSichtbar = e.envkvPflicht || envkvOffen;

  /* Farbe, Sitze und FIN — offen, solange eines davon leer ist. */
  const mehrLuecken = [data.color, data.seats, data.vin].filter(x => !String(x).trim()).length;
  const mehrOffen = mehrGeklappt ?? mehrLuecken > 0;
  const zahl = (v: string) => (v ? Number(v).toLocaleString('de-DE') : '');

  /* ── Startbildschirm ── */

  if (!e.blattOffen) {
    return (
      <div style={{
        minHeight: '100vh', background: F.grund, color: F.text, fontFamily: F.schrift,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 20,
      }}>
        {/*
          Ein Lichtschein hinter dem Ganzen. Der einzige Effekt auf der
          Seite — er soll andeuten, worum es geht: ein Fahrzeug im
          Scheinwerferlicht, nicht ein Antrag auf einem Schreibtisch.
        */}
        <div style={{
          position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 620, height: 620, pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(67,56,202,0.07) 0%, transparent 68%)',
        }} />

        <div style={{ textAlign: 'center', maxWidth: 460, position: 'relative' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: F.akzent, marginBottom: 12 }}>
            Neues Inserat
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: schmal ? 27 : 34, fontWeight: 700,
                       letterSpacing: '-1px', lineHeight: 1.15 }}>
            Schein fotografieren.<br />Den Rest machen wir.
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: F.leise, lineHeight: 1.65 }}>
            Marke, Modell, Erstzulassung, Leistung, Hubraum und Farbe werden ausgelesen.
            Du trägst den Preis nach — fertig.
          </p>
        </div>

        <button
          type="button"
          onClick={() => e.dateiRef.current?.click()}
          onDragOver={ev => { ev.preventDefault(); setUeberZone(true); }}
          onDragLeave={() => setUeberZone(false)}
          onDrop={ev => {
            ev.preventDefault(); setUeberZone(false);
            const f = ev.dataTransfer.files?.[0];
            if (f?.type.startsWith('image/')) e.einlesen(f);
          }}
          disabled={e.scanZustand === 'laeuft'}
          style={{
            position: 'relative', width: '100%', maxWidth: 380, padding: '18px 26px',
            borderRadius: 12, border: 'none', cursor: e.scanZustand === 'laeuft' ? 'wait' : 'pointer',
            background: ueberZone ? '#98a4ff' : F.akzent, color: '#ffffff',
            fontFamily: F.schrift, fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: '0 8px 22px rgba(67,56,202,0.22)',
          }}>
          {e.scanZustand === 'laeuft'
            ? <><Loader2 size={18} style={{ animation: 'drehen .8s linear infinite' }} /> Wird gelesen…</>
            : <><Camera size={18} /> Fahrzeugschein aufnehmen</>}
        </button>

        <button type="button" onClick={() => e.setBlattOffen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.schrift,
                   fontSize: 13, color: F.leise, position: 'relative' }}>
          oder von Hand eintragen
        </button>

        <input ref={e.dateiRef} type="file" accept="image/*" hidden
          onChange={ev => { const f = ev.target.files?.[0]; if (f) e.einlesen(f); }} />
        <style>{`@keyframes drehen { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  /* ── Showroom ── */

  return (
    <div style={{ minHeight: '100vh', background: F.grund, color: F.text, fontFamily: F.schrift }}>

      {/* ══ Das entstehende Inserat ══ */}
      <div style={{
        borderBottom: `1px solid ${F.linie}`,
        background: F.flaeche,
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: schmal ? '26px 20px 22px' : '38px 24px 30px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
                           textTransform: 'uppercase', color: F.akzent }}>Schritt 1 von 4</span>
            {e.scanZustand === 'fertig' && (
              <span style={{ fontSize: 11.5, color: F.gut, fontWeight: 600 }}>
                ● {erkannt.size} Felder aus dem Schein
              </span>
            )}
            <button type="button" onClick={() => e.dateiRef.current?.click()}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                       background: 'none', border: `1px solid ${F.linie}`, borderRadius: 7,
                       padding: '5px 10px', cursor: 'pointer', fontFamily: F.schrift,
                       fontSize: 12, color: F.gedämpft }}>
              {e.scanBild ? <><RotateCcw size={11} /> Neu scannen</> : <><Camera size={11} /> Schein scannen</>}
            </button>
          </div>

          {/*
            Der Titel, wie er entsteht. Noch leere Bestandteile stehen als
            blasse Platzhalter da — man sieht, was noch kommt, statt einer
            leeren Zeile.
          */}
          <h1 style={{
            margin: '0 0 4px', fontSize: schmal ? 26 : 38, fontWeight: 700,
            letterSpacing: '-1.1px', lineHeight: 1.12, minHeight: schmal ? 32 : 46,
          }}>
            {e.titelBisher.length > 0
              ? e.titelBisher.map((t, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ color: F.leise, fontWeight: 300 }}> · </span>}
                    {t}
                  </span>
                ))
              /*
                #94a3b8 statt der Linienfarbe. Als Rahmen ist die richtig,
                als Schrift war sie mit 1,23:1 schlicht nicht zu sehen — der
                Platzhalter soll blass wirken, nicht verschwinden.
              */
              : <span style={{ color: '#7f8da3', fontWeight: 400 }}>Noch kein Fahrzeug</span>}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{
              fontSize: schmal ? 30 : 40, fontWeight: 700, letterSpacing: '-1.4px',
              color: data.price ? F.text : '#7f8da3', lineHeight: 1,
            }}>
              {data.price ? `${zahl(data.price)} €` : '— €'}
            </div>
            {data.km && (
              <div style={{ fontSize: 15, color: F.gedämpft }}>{zahl(data.km)} km</div>
            )}
            {data.equipment.length > 0 && (
              <div style={{ fontSize: 13, color: F.leise }}>
                {data.equipment.length} Ausstattungsmerkmale
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Die Eingabe ══ */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: `0 ${schmal ? 20 : 24}px 110px` }}>

        {/* Was fehlt — ganz oben, sonst nirgends */}
        {offenePflicht.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, marginTop: 18,
            padding: '11px 14px', borderRadius: 9,
            background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(251,191,36,0.26)',
          }}>
            <AlertCircle size={15} color={F.luecke} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: F.luecke, fontWeight: 600 }}>
              Fehlt noch: {offenePflicht.map(k => PFLICHT_NAME[k]).join(', ')}
            </span>
          </div>
        )}

        {/* Fahrzeug + Eckdaten nebeneinander */}
        <Block titel="Fahrzeug" kinder={
          <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <Beschriftung text="Marke" luecke={!data.brand} />
              <button type="button" onClick={() => setMarkeOffen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'transparent', border: 'none', borderBottom: `1px solid ${F.linie}`,
                  padding: '0 0 5px', cursor: 'pointer', fontFamily: F.schrift,
                  fontSize: 15, color: data.brand ? F.text : F.leise, textAlign: 'left',
                }}>
                {data.brand && hatZeichen(data.brand) && <MarkenZeichen marke={data.brand} groesse={17} farbe={F.gedämpft} />}
                <span style={{ flex: 1 }}>{data.brand || 'wählen'}</span>
                <ChevronDown size={15} color={F.leise} />
              </button>

              {markeOffen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, marginTop: 6,
                  background: F.erhoben, border: `1px solid ${F.linie}`, borderRadius: 11,
                  boxShadow: '0 14px 36px rgba(15,23,42,0.13)', maxHeight: 320, overflow: 'auto',
                }}>
                  <div style={{ padding: 8, position: 'sticky', top: 0, background: F.erhoben, borderBottom: `1px solid ${F.linie}` }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} color={F.leise} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input autoFocus value={markeSuche} onChange={ev => setMarkeSuche(ev.target.value)}
                        placeholder="Marke suchen…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 30px',
                                 background: F.flaeche, border: `1px solid ${F.linie}`, borderRadius: 8,
                                 color: F.text, fontSize: 13, fontFamily: F.schrift, outline: 'none' }} />
                    </div>
                  </div>
                  {/* Entweder Schnellauswahl oder Liste, nie beides. */}
                  {!markeSuche ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 8 }}>
                      {TOP_MARKEN.map(m => (
                        <button key={m} type="button"
                          onClick={() => { setzen('brand', m); setzen('model', ''); setMarkeOffen(false); }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            padding: '11px 4px', borderRadius: 9, cursor: 'pointer',
                            border: `1px solid ${data.brand === m ? F.akzent : F.linie}`,
                            background: data.brand === m ? 'rgba(67,56,202,0.07)' : 'transparent',
                            color: data.brand === m ? F.akzent : F.gedämpft,
                            fontFamily: F.schrift, fontSize: 11, fontWeight: 600,
                          }}>
                          {/* Kein Kürzel neben dem Namen — "FOR" über "Ford" liest sich wie ein Fehler. */}
                          {hatZeichen(m) && <MarkenZeichen marke={m} groesse={19} farbe={data.brand === m ? F.akzent : F.gedämpft} />}
                          {m}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {e.markenSuchen(markeSuche).slice(0, 60).map(m => (
                        <button key={m} type="button"
                          onClick={() => { setzen('brand', m); setzen('model', ''); setMarkeOffen(false); setMarkeSuche(''); }}
                          style={{ width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none',
                                   background: 'transparent', color: F.text, cursor: 'pointer',
                                   fontFamily: F.schrift, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {hatZeichen(m) && <MarkenZeichen marke={m} groesse={14} farbe={F.leise} />}
                          {m}
                        </button>
                      ))}

                      {/*
                        Freie Eingabe, wenn die Liste nichts Passendes hat.
                        Ohne sie war die Marke die einzige Sackgasse im
                        Formular: Modelle kann man tippen, Marken nicht —
                        wer einen Polestar hereinbekam, kam schlicht nicht
                        weiter.

                        Keine Liste bleibt vollstaendig. Gerade bei den
                        chinesischen Herstellern kommt jedes Jahr eine Marke
                        dazu, und der Haendler soll nicht auf ein Update
                        warten muessen, um sein Fahrzeug einzustellen.
                      */}
                      {!e.markenSuchen(markeSuche).some(m => m.toLowerCase() === markeSuche.trim().toLowerCase()) && (
                        <button type="button"
                          onClick={() => {
                            setzen('brand', markeSuche.trim());
                            setzen('model', '');
                            setMarkeOffen(false); setMarkeSuche('');
                          }}
                          style={{ width: '100%', textAlign: 'left', padding: '11px 14px',
                                   border: 'none', borderTop: `1px solid ${F.linie}`,
                                   background: 'transparent', color: F.akzent, cursor: 'pointer',
                                   fontFamily: F.schrift, fontSize: 13, fontWeight: 600,
                                   display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Plus size={13} />
                          „{markeSuche.trim()}" übernehmen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Beschriftung text="Modell" />
              <Eingabe erkannt={erkannt.has('model')} wert={data.model} aendern={v => setzen('model', v)}
                platzhalter={data.brand ? (e.modelle[0] ?? 'Modell') : 'erst Marke wählen'} />
            </div>
          </div>
        } />

        <Block titel="Eckdaten" kinder={
          <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr 1fr', gap: 20 }}>
            <div>
              {/* Steht auf keinem Fahrzeugschein: der Preis ist eine Entscheidung. */}
              <Beschriftung text="Preis" luecke={!data.price} selbst erledigt={!!data.price} />
              <Eingabe erkannt={erkannt.has('price')} gross einheit="€" wert={zahl(data.price)}
                aendern={v => setzen('price', v.replace(/\D/g, ''))} platzhalter="18.900" />
            </div>
            <div>
              <Beschriftung text="Kilometerstand" luecke={!data.km} />
              <Eingabe erkannt={erkannt.has('km')} gross einheit="km" wert={zahl(data.km)}
                aendern={v => setzen('km', v.replace(/\D/g, ''))} platzhalter="84.500" />
            </div>
            <div>
              <Beschriftung text="Erstzulassung" />
              <Eingabe erkannt={erkannt.has('firstRegistration')} wert={data.firstRegistration}
                aendern={v => setzen('firstRegistration', v)} platzhalter="03/2019" />
            </div>
          </div>
        } />

        {/*
          Steht bewusst weit oben.
          Vorher war dieser Block der letzte der Seite — dabei ist er das
          Einzige, was der Scan NICHT liefern kann und was die Qualitaet
          der spaeteren Beschreibung wirklich bestimmt. Eingeklappt oder
          ganz unten heisst: wird uebersehen, und der Text wird
          entsprechend blass.
        */}
        <Block titel="Was der Scan nicht weiss"
          rechts={<span style={{ fontSize: 11.5, color: F.leise }}>bestimmt, wie gut die Beschreibung wird</span>}
          kinder={
            <>
              <textarea value={data.dealerNotes} onChange={ev => setzen('dealerNotes', ev.target.value)} rows={3}
                placeholder="Zwei Vorbesitzer · scheckheftgepflegt · Winterreifen auf Alu dabei · Zahnriemen bei 120.000 gemacht · kleiner Kratzer hinten rechts"
                style={{ width: '100%', boxSizing: 'border-box', background: F.flaeche,
                         border: `1px solid ${data.dealerNotes ? F.linie : 'rgba(124,138,255,0.32)'}`,
                         borderRadius: 9, padding: 13,
                         color: F.text, fontSize: 14, fontFamily: F.schrift,
                         resize: 'vertical', lineHeight: 1.7, outline: 'none' }} />
              <p style={{ margin: '9px 0 0', fontSize: 12.5, color: F.leise, lineHeight: 1.6 }}>
                Historie, Reifen, Reparaturen, Macken. Steht nichts hier, bleibt die
                Beschreibung bei dem, was auf dem Schein steht — und liest sich wie
                jedes andere Inserat.
              </p>
            </>
          }
        />

        <Block titel="Antrieb" kinder={
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <Beschriftung text="Kraftstoff" />
              <Wahl optionen={KRAFTSTOFFE} wert={data.fuelType} beiWahl={v => setzen('fuelType', data.fuelType === v ? '' : v)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr 1fr', gap: 20 }}>
              <div>
                {/* Der Fahrzeugschein nennt kein Getriebe — das kommt immer von Hand. */}
                <Beschriftung text="Getriebe" selbst erledigt={!!data.gearbox} />
                <Wahl optionen={GETRIEBE} wert={data.gearbox} beiWahl={v => setzen('gearbox', data.gearbox === v ? '' : v)} />
              </div>
              <div>
                <Beschriftung text="Leistung" />
                <Eingabe erkannt={erkannt.has('powerKw')} einheit="PS" wert={data.powerKw}
                  aendern={v => setzen('powerKw', v.replace(/\D/g, ''))} platzhalter="150" />
              </div>
              <div>
                <Beschriftung text="Hubraum" />
                <Eingabe erkannt={erkannt.has('displacementCcm')} einheit="ccm" wert={data.displacementCcm}
                  aendern={v => setzen('displacementCcm', v.replace(/\D/g, ''))} platzhalter="1968" />
              </div>
            </div>
          </div>
        } />

        {/* Selten Geändertes hinter einem Klick */}
        <Block titel="Weitere Angaben"
          rechts={
            <button type="button" onClick={() => setMehrGeklappt(!mehrOffen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.schrift,
                       fontSize: 12.5, color: F.leise, display: 'flex', alignItems: 'center', gap: 5 }}>
              <ChevronDown size={13} style={{ transform: mehrOffen ? 'none' : 'rotate(-90deg)' }} />
              {mehrOffen ? 'schliessen' : `Farbe, Sitze, FIN${mehrLuecken > 0 ? ` · ${mehrLuecken} offen` : ''}`}
            </button>
          }
          kinder={mehrOffen ? (
            <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr 1fr', gap: 20 }}>
              <div>
                <Beschriftung text="Farbe" />
                <Eingabe erkannt={erkannt.has('color')} wert={data.color} aendern={v => setzen('color', v)} platzhalter="Tiefschwarz" />
              </div>
              <div>
                <Beschriftung text="Sitzplätze" />
                <Wahl optionen={['2', '4', '5', '7']} wert={data.seats} beiWahl={v => setzen('seats', data.seats === v ? '' : v)} />
              </div>
              <div>
                <Beschriftung text="Fahrgestellnummer" />
                <Eingabe erkannt={erkannt.has('vin')} wert={data.vin}
                  aendern={v => setzen('vin', v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  platzhalter="WVWZZZ1JZW000001" />
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: F.leise }}>
              {[data.color, data.seats ? `${data.seats} Sitze` : '', data.vin].filter(Boolean).join(' · ')
                || 'Nichts eingetragen — meist auch nicht nötig.'}
            </p>
          )}
        />

        {/* Verbrauch: bei Gebrauchtwagen eingeklappt */}
        <Block titel="Verbrauch und Emissionen"
          rechts={
            <span style={{ fontSize: 11.5, color: e.envkvPflicht ? F.luecke : F.leise, fontWeight: e.envkvPflicht ? 600 : 500 }}>
              {e.envkvPflicht ? 'Pflichtangaben' : 'bei Gebrauchtwagen freiwillig'}
            </span>
          }
          kinder={
            <div data-luecke={e.fehler.envkv ? 'true' : undefined}>
              {!envkvSichtbar ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Wahl
                    optionen={Object.values(ART_ANZEIGE)}
                    wert={ART_ANZEIGE[(data.envkv.vehicleKind as VehicleKind) ?? 'gebrauchtwagen']}
                    beiWahl={anzeige => {
                      const schluessel = (Object.keys(ART_ANZEIGE) as VehicleKind[])
                        .find(k => ART_ANZEIGE[k] === anzeige) ?? 'gebrauchtwagen';
                      e.setData(p => ({ ...p, envkv: { ...p.envkv, vehicleKind: schluessel } }));
                      e.setFehler(p => ({ ...p, envkv: '' }));
                    }} />
                  <button type="button" onClick={() => setEnvkvOffen(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.schrift,
                             fontSize: 12.5, color: F.leise, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    Verbrauchswerte angeben
                  </button>
                </div>
              ) : (
                <>
                  {/*
                    EnvkvFields meldet nur die geänderten Felder — das Ergebnis
                    muss auf den bestehenden Stand gelegt werden, sonst löscht
                    jede Eingabe die anderen Werte.
                  */}
                  <EnvkvFields
                    value={data.envkv} fuelType={data.fuelType} isMobile={schmal}
                    onChange={teil => {
                      e.setData(p => ({ ...p, envkv: { ...p.envkv, ...teil } }));
                      e.setFehler(p => ({ ...p, envkv: '' }));
                    }} />
                  {e.fehler.envkv && (
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: F.fehler,
                                display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertCircle size={13} /> {e.fehler.envkv}
                    </p>
                  )}
                  {/*
                    Weg zurueck. Vorher setzte "freiwillig angeben" den Block
                    dauerhaft auf offen — wer sich vertippt hatte, wurde ihn
                    nicht mehr los. Bei Pflichtangaben gibt es den Knopf
                    nicht: dort waere Zuklappen keine Hilfe, sondern eine
                    Falle.
                  */}
                  {!e.envkvPflicht && (
                    <button type="button" onClick={() => setEnvkvOffen(false)}
                      style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                               fontFamily: F.schrift, fontSize: 12.5, color: F.leise,
                               display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
                      <ChevronDown size={13} style={{ transform: 'rotate(180deg)' }} />
                      Verbrauchswerte ausblenden
                    </button>
                  )}
                </>
              )}
            </div>
          }
        />

        {/* Ausstattung: kommt aus den Fotos */}
        <Block titel="Ausstattung"
          rechts={<span style={{ fontSize: 11.5, color: F.leise }}>wird aus den Fotos ergänzt</span>}
          kinder={
            <div>
              {data.equipment.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {data.equipment.map((m, i) => (
                    <span key={`${m}-${i}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 7px 4px 10px', borderRadius: 7,
                      background: F.flaeche, border: `1px solid ${F.linie}`,
                      fontSize: 12, color: F.gedämpft,
                    }}>
                      {m}
                      <button type="button" onClick={() => setzen('equipment', data.equipment.filter((_, j) => j !== i))}
                        style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: F.leise }}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p style={{ margin: '0 0 12px', fontSize: 13, color: F.leise, lineHeight: 1.65 }}>
                {/*
                  Der Grund gehört sichtbar hin, sonst klickt sich der Händler
                  durch eine Liste, die Schritt 2 gleich selbst füllt.
                */}
                Beim Hochladen der Fotos wird erkannt, was zu sehen ist. Hier lohnt sich
                nur, was man <em>nicht</em> sieht: Scheckheft, Vorbesitzer, Standheizung.
              </p>

              <div style={{ position: 'relative', maxWidth: 420 }}>
                <Plus size={14} color={F.leise} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={ausstattungSuche} onChange={ev => setAusstattungSuche(ev.target.value)}
                  onKeyDown={ev => {
                    if (ev.key === 'Enter' && ausstattungSuche.trim()) {
                      ev.preventDefault();
                      const v = ausstattungSuche.trim();
                      if (!data.equipment.includes(v)) setzen('equipment', [...data.equipment, v]);
                      setAusstattungSuche('');
                    }
                  }}
                  placeholder="Eintippen und Enter"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px 9px 32px',
                           background: F.flaeche, border: `1px solid ${F.linie}`, borderRadius: 8,
                           color: F.text, fontSize: 13, fontFamily: F.schrift, outline: 'none' }} />
              </div>

              {e.ausstattungSuchen(ausstattungSuche).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {e.ausstattungSuchen(ausstattungSuche).map(eintrag => {
                    const t = eintrag.label;
                    const drin = data.equipment.includes(t);
                    return (
                      <button key={eintrag.id} type="button" disabled={drin}
                        onClick={() => { setzen('equipment', [...data.equipment, t]); setAusstattungSuche(''); }}
                        style={{ padding: '5px 10px', borderRadius: 7, cursor: drin ? 'default' : 'pointer',
                                 border: `1px solid ${F.linie}`, background: 'transparent',
                                 color: drin ? F.leise : F.gedämpft, fontFamily: F.schrift, fontSize: 12 }}>
                        {drin ? '✓ ' : '+ '}{t}
                      </button>
                    );
                  })}
                </div>
              )}

              <button type="button" onClick={() => setAusstattungOffen(o => !o)}
                style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                         fontFamily: F.schrift, fontSize: 12.5, color: F.leise,
                         display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
                <ChevronDown size={13} style={{ transform: ausstattungOffen ? 'none' : 'rotate(-90deg)' }} />
                {ausstattungOffen ? 'Liste schliessen' : 'Alle Merkmale durchgehen'}
              </button>

              {ausstattungOffen && (
                <div style={{ marginTop: 12, display: 'grid', gap: 14 }}>
                  {EQUIPMENT_DB.map(gruppe => (
                    <div key={gruppe.label}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                                    textTransform: 'uppercase', color: F.leise, marginBottom: 7 }}>
                        {gruppe.label}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {gruppe.items.map(eintrag => {
                          const m = eintrag.label;
                          const drin = data.equipment.includes(m);
                          return (
                            <button key={eintrag.id} type="button"
                              onClick={() => setzen('equipment', drin
                                ? data.equipment.filter(x => x !== m)
                                : [...data.equipment, m])}
                              style={{ padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                                       border: `1px solid ${drin ? F.akzent : F.linie}`,
                                       background: drin ? 'rgba(67,56,202,0.07)' : 'transparent',
                                       color: drin ? F.akzent : F.gedämpft,
                                       fontFamily: F.schrift, fontSize: 12 }}>{m}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
        />

      </div>

      <input ref={e.dateiRef} type="file" accept="image/*" hidden
        onChange={ev => { const f = ev.target.files?.[0]; if (f) e.einlesen(f); }} />

      {/* ══ Fussleiste ══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${F.linie}`,
        // Auf dem Handy sitzt die Dashboard-Navigation unten fest (56 px).
        // Ohne diesen Abstand liegt der Weiter-Knopf darunter und ist nicht
        // antippbar — der Fehler hat es schon einmal in die Anwendung geschafft.
        paddingBottom: schmal ? 56 : 0,
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '11px 24px',
                      display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: offenePflicht.length ? F.luecke : F.leise }}>
            {offenePflicht.length > 0
              ? `Fehlt noch: ${offenePflicht.map(k => PFLICHT_NAME[k]).join(', ')}`
              : 'Weiter zu den Fotos'}
          </span>
          <button type="button" onClick={e.weiter} disabled={e.unterwegs}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
              borderRadius: 9, border: 'none', background: F.akzent, color: '#ffffff',
              fontFamily: F.schrift, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap',
              cursor: e.unterwegs ? 'wait' : 'pointer', opacity: e.unterwegs ? 0.7 : 1,
            }}>
            {e.unterwegs && <Loader2 size={14} style={{ animation: 'drehen .8s linear infinite' }} />}
            Weiter <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes drehen { to { transform: rotate(360deg) } }
        input::placeholder, textarea::placeholder { color: ${F.leise}; opacity: .6 }
      `}</style>
    </div>
  );
}
