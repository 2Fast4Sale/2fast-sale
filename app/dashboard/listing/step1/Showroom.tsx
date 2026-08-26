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
  Camera, Loader2, ArrowRight, ChevronDown, ChevronRight, Search, X, Plus, RotateCcw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import MarkenZeichen, { hatZeichen } from '../../../components/MarkenZeichen';
import { EQUIPMENT_DB } from '../../../../lib/equipmentDatabase';
import EnvkvFields from '../../../components/EnvkvFields';
import { type VehicleKind } from '../../../../lib/envkv';
import { G } from '../gestaltung';
import {
  useEntwurf, KRAFTSTOFFE, GETRIEBE, KAROSSERIE, POLSTERUNG, INNENFARBE,
  ANTRIEB, EURONORM, SELBST_FELDER, TOP_MARKEN, PFLICHT_NAME,
} from './useEntwurf';

/* ────────────────────────── Gestaltung ────────────────────────── */

/*
 * Dunkler Rahmen, weisses Blatt.
 *
 * Der Kopf bleibt dunkel und zeigt das entstehende Inserat; gearbeitet
 * wird auf Weiss. Ein Datenblatt liest man anders als ein Bild: Feine
 * Linien, Beschriftungen und leere Felder verschwimmen auf dunklem
 * Grund, und genau davon lebt der untere Teil der Seite.
 *
 * Die Werte liegen in ../gestaltung, damit alle vier Schritte dieselben
 * lesen. Dort stehen zwei Saetze — `rahmen…` fuer den dunklen Grund,
 * die kurzen Namen fuer das weisse Blatt.
 */
const F = G;

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

/**
 * Eingabe ohne Kasten — nur eine Linie, die bei Fokus aufleuchtet.
 * Mit Beispiel statt Platzhalter.
 *
 * Die Platzhalter lauteten "18.900", "84.500", "03/2019", "Tiefschwarz".
 * Alles plausible Werte — und weil sie gut lesbar sein sollen, standen
 * sie in fast derselben Farbe da wie eine Eingabe. Das Ergebnis: Ein
 * leeres Formular sah ausgefuellt aus. Oben stand "Fehlt noch: Preis,
 * Kilometerstand", waehrend darunter Zahlen zu sehen waren — als haette
 * die Anwendung einen Fehler.
 *
 * Zwei Massnahmen, weil eine allein nicht reicht:
 *
 *   "z. B." davor — der Unterschied wird gelesen, nicht nur gesehen.
 *     Ihn allein ueber die Helligkeit zu machen, ist die uebliche
 *     Loesung und genau die, die hier versagt hat: Entweder blass genug
 *     zum Unterscheiden und dann zu blass zum Lesen, oder umgekehrt.
 *
 *   Kursiv — trennt die Schriften auf einen Blick, ohne dass der
 *     Kontrast leidet.
 */
function Eingabe({ wert, aendern, platzhalter, hinweis, einheit, gross, erkannt }: {
  wert: string; aendern: (v: string) => void; platzhalter: string;
  /**
   * Ein Hinweis statt eines Beispiels — wird wörtlich übernommen.
   *
   * Nötig, weil nicht jeder Platzhalter ein Beispielwert ist. Das
   * Modellfeld zeigt ohne gewählte Marke "erst Marke wählen", und die
   * pauschale Voranstellung machte daraus "z. B. erst Marke wählen".
   */
  hinweis?: string;
  einheit?: string; gross?: boolean; erkannt?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, borderBottom: `1px solid ${F.linie}`, paddingBottom: 5 }}>
      <input
        className="beispiel"
        value={wert} onChange={ev => aendern(ev.target.value)}
        placeholder={hinweis ?? `z. B. ${platzhalter}`}
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
          fontSize: 10.5, background: F.luekeSchleier, color: F.luecke,
        }}>Pflicht</span>
      )}
      {zeigeSelbst && !luecke && (
        <span style={{
          padding: '1px 6px', borderRadius: 4, letterSpacing: 0, textTransform: 'none',
          fontSize: 10.5, background: F.akzentSchleier, color: F.akzent,
        }}>trägst du ein</span>
      )}
    </div>
  );
}

/**
 * Ja/Nein — als zwei Schaltflächen, nicht als Häkchen.
 *
 * Ein leeres Kästchen sagt nicht, ob jemand "nein" gemeint oder die
 * Frage übersehen hat. Bei "unfallfrei" ist das kein Detail: Wer die
 * Frage überspringt, veröffentlicht am Ende eine Aussage über den
 * Zustand des Fahrzeugs, die er nie getroffen hat.
 */
function JaNein({ wert, beiWahl, jaText = 'Ja', neinText = 'Nein' }: {
  wert: boolean; beiWahl: (v: boolean) => void; jaText?: string; neinText?: string;
}) {
  const knopf = (an: boolean, text: string, wohin: boolean) => (
    <button type="button" onClick={() => beiWahl(wohin)}
      style={{
        padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: F.schrift,
        fontSize: 12.5, fontWeight: an ? 600 : 500,
        border: `1px solid ${an ? F.akzent : F.linie}`,
        background: an ? F.akzentSchleier : 'transparent',
        color: an ? F.akzent : F.gedämpft,
      }}>{text}</button>
  );
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {knopf(!wert, neinText, false)}
      {knopf(wert, jaText, true)}
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
              background: an ? F.akzentSchleier : 'transparent',
              color: an ? F.akzent : F.gedämpft,
            }}>{o}</button>
        );
      })}
    </div>
  );
}

/**
 * Ein Abschnitt, der sich zusammenfaltet, sobald er fertig ist.
 *
 * Das ist die Antwort auf ein Problem, das mit jedem neuen Feld groesser
 * wurde: Die Seite sah nach immer mehr Handarbeit aus, obwohl der Scan
 * das meiste davon fuellt. Ein ausgefuelltes Feld, das weiter Platz
 * beansprucht, sieht aus wie eine offene Aufgabe.
 *
 * Ist alles beisammen, bleibt eine Zeile: Titel, die Werte im Klartext,
 * ein "aendern". Nach einem Scan schrumpft die Seite damit auf die
 * Luecken zusammen — und genau das soll der Haendler sehen.
 *
 * Wer selbst aufklappt, dessen Entscheidung gilt und schlaegt die
 * Automatik, bis er wieder zuklappt.
 */
function Block({ titel, kinder, rechts, fertig, zusammenfassung, startZu, inhalt }: {
  titel: string; kinder: React.ReactNode; rechts?: React.ReactNode;
  fertig?: boolean; zusammenfassung?: string;
  /**
   * Beginnt zugeklappt, auch wenn noch nichts ausgefüllt ist.
   *
   * Für alles, was keine Pflichtangabe enthält. Offen standen neun
   * Abschnitte mit rund fünfzig Auswahlknöpfen untereinander — die Seite
   * sah nach Arbeit aus, bevor der Händler das erste Zeichen getippt
   * hatte. Zugeklappt sieht er zuerst, was er wirklich braucht.
   */
  startZu?: boolean;
  /** Was in einem zugeklappten, noch leeren Block steckt. */
  inhalt?: string;
}) {
  const [selbstGeklappt, setSelbstGeklappt] = useState<boolean | null>(null);
  const zu = selbstGeklappt ?? (startZu === true || (fertig === true && !!zusammenfassung));

  if (zu) {
    /*
     * Zwei Arten von "zu", die verschieden aussehen müssen.
     *
     * Erledigt: grünes Häkchen, daneben die Werte. Das ist eine
     * Bestätigung — hier ist nichts mehr zu tun.
     *
     * Noch leer: kein Häkchen, sondern die Aufzählung dessen, was
     * drinsteckt. Ein grüner Haken vor einem leeren Abschnitt wäre eine
     * Lüge, und der Händler würde ihn nie öffnen.
     */
    const erledigt = fertig === true && !!zusammenfassung;
    return (
      <section style={{ borderTop: `1px solid ${F.linieLeise}`, padding: '13px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {erledigt
              ? <CheckCircle2 size={13} color={F.gut} />
              : <ChevronRight size={13} color={F.leise} />}
            <span style={{ fontSize: 13, fontWeight: 600, color: F.gedämpft }}>{titel}</span>
          </span>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 12.5, color: F.leise,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{erledigt ? zusammenfassung : inhalt}</span>
          <button type="button" onClick={() => setSelbstGeklappt(false)}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                     fontFamily: F.schrift, fontSize: 12.5, color: F.akzent, padding: 0 }}>
            {erledigt ? 'ändern' : 'öffnen'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ borderTop: `1px solid ${F.linieLeise}`, padding: '20px 0' }}>
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {rechts}
          {/*
            Auch wenn der Block noch nicht fertig ist. Wer einen
            zugeklappten Abschnitt öffnet und dann feststellt, dass er
            ihn doch nicht braucht, muss ihn wieder schliessen können —
            sonst ist jedes Öffnen endgültig, und das hatten wir hier
            schon einmal bei den Verbrauchswerten.
          */}
          {(startZu || (fertig && zusammenfassung)) && (
            <button type="button" onClick={() => setSelbstGeklappt(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       fontFamily: F.schrift, fontSize: 12.5, color: F.leise, padding: 0 }}>
              zuklappen
            </button>
          )}
        </div>
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
  /** Der eingelesene Schein in gross, zum Nachlesen einzelner Felder. */
  const [scheinGross, setScheinGross]     = useState(false);

  /*
   * Verbrauchsangaben: Pflicht zeigt sie immer. Freiwillig geoeffnet
   * laesst sich wieder schliessen — vorher setzte der Knopf nur auf
   * "offen", und danach gab es keinen Weg zurueck.
   */
  const envkvSichtbar = e.envkvPflicht || envkvOffen;

  /*
   * Wie viele der vier Angaben fehlen noch, die nur der Händler machen
   * kann. Wird in der Überschrift des Blocks angezeigt.
   */
  const offeneSelbst = SELBST_FELDER.filter(f => !String(data[f]).trim()).length;

  /*
   * Noch kein einziges Zeichen eingetragen.
   *
   * Der Kopf zeigt dann einen ruhigen Satz statt der leeren Hülle des
   * Inserats. Sobald irgendetwas dasteht, wechselt er auf Titel und
   * Preis — auch wenn der Rest noch fehlt.
   */
  const leerAmAnfang =
    e.titelBisher.length === 0 && !data.price && !data.km && data.equipment.length === 0;

  /*
   * Was in der zugeklappten Zeile eines Blocks steht.
   *
   * Nur gefuellte Werte, mit Trennzeichen verbunden. Leere wegzulassen
   * statt "-" zu schreiben ist Absicht: Eine Zeile voller Striche sieht
   * aus wie ein Mangel, obwohl der Block vollstaendig ist.
   */
  const zusammen = (...teile: (string | false | undefined)[]) =>
    teile.filter(Boolean).join(' · ');

  /* Farbe, Sitze und FIN — offen, solange eines davon leer ist. */
  const mehrLuecken = [data.color, data.seats, data.vin].filter(x => !String(x).trim()).length;
  const zahl = (v: string) => (v ? Number(v).toLocaleString('de-DE') : '');

  /* ── Startbildschirm ── */

  if (!e.blattOffen) {
    return (
      <div style={{
        minHeight: '100vh', background: F.buehneGrund, color: F.buehneText, fontFamily: F.schrift,
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
          background: 'radial-gradient(circle, rgba(124,138,255,0.13) 0%, transparent 68%)',
        }} />

        <div style={{ textAlign: 'center', maxWidth: 460, position: 'relative' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: F.buehneAkzent, marginBottom: 12 }}>
            Neues Inserat
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: schmal ? 27 : 34, fontWeight: 700,
                       letterSpacing: '-1px', lineHeight: 1.15 }}>
            Schein fotografieren.<br />Den Rest machen wir.
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: F.buehneLeise, lineHeight: 1.65 }}>
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
            background: ueberZone ? '#98a4ff' : F.buehneAkzent, color: '#0a0c11',
            fontFamily: F.schrift, fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: '0 10px 34px rgba(124,138,255,0.32)',
          }}>
          {e.scanZustand === 'laeuft'
            ? <><Loader2 size={18} style={{ animation: 'drehen .8s linear infinite' }} /> Wird gelesen…</>
            : <><Camera size={18} /> Fahrzeugschein aufnehmen</>}
        </button>

        <button type="button" onClick={() => e.setBlattOffen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.schrift,
                   fontSize: 13, color: F.buehneLeise, position: 'relative' }}>
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
        borderBottom: `1px solid ${F.rahmenLinie}`,
        background: `linear-gradient(180deg, ${F.rahmenFlaeche} 0%, ${F.grund} 100%)`,
      }}>
        <div style={{ maxWidth: F.breite, margin: '0 auto', padding: schmal ? '26px 20px 22px' : '38px 24px 30px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
                           textTransform: 'uppercase', color: F.rahmenAkzent }}>Schritt 1 von 4</span>
            {e.scanZustand === 'fertig' && (
              <span style={{ fontSize: 11.5, color: F.rahmenGut, fontWeight: 600 }}>
                ● {erkannt.size} Felder aus dem Schein
              </span>
            )}
            {/*
              Der eingelesene Schein, klein.

              Das Bild lag schon vor — es wurde nur nirgends gezeigt.
              Wer zwei Fahrzeuge nacheinander einpflegt, hat sonst keine
              Möglichkeit zu prüfen, ob die Daten oben vom richtigen
              Schein stammen. Ein falsch zugeordneter Schein fällt sonst
              erst auf, wenn das Inserat online steht.

              Anklickbar: gross genug zum Nachlesen, wenn ein Feld
              zweifelhaft aussieht.
            */}
            {e.scanBild && (
              <button type="button" onClick={() => setScheinGross(true)}
                title="Eingelesenen Fahrzeugschein ansehen"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
                         background: 'none', border: 'none', padding: 0, cursor: 'zoom-in' }}>
                <span style={{ fontSize: 11, color: F.rahmenLeise }}>Schein</span>
                <img src={e.scanBild} alt="Eingelesener Fahrzeugschein"
                  style={{ width: 54, height: 36, objectFit: 'cover', borderRadius: 5,
                           border: `1px solid ${F.rahmenLinie}`, display: 'block' }} />
              </button>
            )}

            <button type="button" onClick={() => e.dateiRef.current?.click()}
              style={{ marginLeft: e.scanBild ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 5,
                       background: 'none', border: `1px solid ${F.rahmenLinie}`, borderRadius: 7,
                       padding: '5px 10px', cursor: 'pointer', fontFamily: F.schrift,
                       fontSize: 12, color: F.rahmenLeise }}>
              {e.scanBild ? <><RotateCcw size={11} /> Neu scannen</> : <><Camera size={11} /> Schein scannen</>}
            </button>
          </div>

          {/* Der Schein in gross, wenn man ihn angeklickt hat. */}
          {scheinGross && e.scanBild && (
            <div onClick={() => setScheinGross(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.92)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                       cursor: 'zoom-out' }}>
              <img src={e.scanBild} alt="Eingelesener Fahrzeugschein"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
              <button type="button" onClick={() => setScheinGross(false)}
                aria-label="Schliessen"
                style={{ position: 'absolute', top: 18, right: 18, width: 38, height: 38,
                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9,
                         color: F.rahmenText, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {/*
            Der Titel, wie er entsteht. Noch leere Bestandteile stehen als
            blasse Platzhalter da — man sieht, was noch kommt, statt einer
            leeren Zeile.
          */}
          {/*
            Am Anfang ist hier nichts — und das darf man nicht gross
            ausstellen.

            Vorher stand im leeren Zustand "Noch kein Fahrzeug" in 38 px
            und darunter "— €" in 40 px. Zwei riesige Hinweise auf
            Leere, bevor der Haendler ein Zeichen getippt hat. Das sah
            nicht ruhig aus, sondern kaputt.

            Jetzt steht dort ein Satz, der sagt, was gleich passiert.
            Sobald das erste Feld gefuellt ist, wechselt der Kopf auf
            das entstehende Inserat und waechst mit.
          */}
          {leerAmAnfang ? (
            <div style={{ minHeight: schmal ? 46 : 60, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: schmal ? 19 : 23, fontWeight: 600, color: F.rahmenText,
                            letterSpacing: '-0.5px', lineHeight: 1.25 }}>
                Dein Inserat entsteht hier
              </div>
            </div>
          ) : (
            <>
              <h1 style={{
                margin: '0 0 4px', fontSize: schmal ? 26 : 38, fontWeight: 700,
                letterSpacing: '-1.1px', lineHeight: 1.12, minHeight: schmal ? 32 : 46,
              }}>
                {e.titelBisher.length > 0
                  ? e.titelBisher.map((t, i) => (
                      <span key={i}>
                        {i > 0 && <span style={{ color: F.rahmenLeise, fontWeight: 300 }}> · </span>}
                        {t}
                      </span>
                    ))
                  : <span style={{ color: F.rahmenLeise, fontWeight: 400 }}>Noch kein Fahrzeug</span>}
              </h1>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                <div style={{
                  fontSize: schmal ? 30 : 40, fontWeight: 700, letterSpacing: '-1.4px',
                  color: data.price ? F.rahmenText : F.rahmenLeise, lineHeight: 1,
                }}>
                  {data.price ? `${zahl(data.price)} €` : '— €'}
                </div>
                {data.km && (
                  <div style={{ fontSize: 15, color: F.rahmenLeise }}>{zahl(data.km)} km</div>
                )}
                {data.equipment.length > 0 && (
                  <div style={{ fontSize: 13, color: F.rahmenLeise }}>
                    {data.equipment.length} Ausstattungsmerkmale
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ Die Eingabe ══ */}
      {/*
        Das weisse Blatt.

        Der Kopf darueber bleibt dunkel und zeigt das entstehende
        Inserat; hier wird gearbeitet. Ein Datenblatt liest man anders
        als ein Bild: Feine Linien, Beschriftungen und leere Felder
        verschwimmen auf dunklem Grund, und genau davon lebt dieser
        Teil der Seite.

        Der Abstand nach unten bleibt aussen am Rahmen, nicht am Blatt
        -- sonst haette das Blatt 110 Pixel Leerraum unter dem letzten
        Feld.
      */}
      <div style={{ maxWidth: F.breite, margin: '0 auto', padding: `22px ${schmal ? 14 : 24}px 110px` }}>
      <div style={{
        background: F.flaeche,
        border: `1px solid ${F.linieLeise}`,
        borderRadius: schmal ? 12 : 16,
        padding: `2px ${schmal ? 18 : 30}px 26px`,
        color: F.text,
      }}>

        {/*
          Hier stand derselbe Kasten "Fehlt noch: …", den auch die
          Fussleiste zeigt — zweimal dieselbe Liste auf einer Seite.

          Geblieben ist die Fussleiste: Sie steht fest am unteren Rand
          und ist damit auch nach 2000 Pixeln Scrollen noch da, waehrend
          der Kasten oben nach der ersten Bildschirmhoehe verschwand.
          An den Feldern selbst steht ohnehin "Pflicht".
        */}

        {/* Fahrzeug + Eckdaten nebeneinander */}
        <Block titel="Fahrzeug"
          fertig={!!data.brand && !!data.model && !!data.firstRegistration}
          zusammenfassung={zusammen(
            [data.brand, data.model].filter(Boolean).join(' '),
            data.firstRegistration && `EZ ${data.firstRegistration}`,
            data.vin && `FIN ${data.vin}`,
          )}
          kinder={
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
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxHeight: 320, overflow: 'auto',
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
                            background: data.brand === m ? F.akzentSchleier : 'transparent',
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
                          „{markeSuche.trim()}“ übernehmen
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
                platzhalter={e.modelle[0] ?? 'Golf VII'}
                hinweis={data.brand ? undefined : 'erst Marke wählen'} />
            </div>
          </div>
        } />

        <Block titel="Eckdaten"
          fertig={!!data.price && !!data.km}
          zusammenfassung={zusammen(
            data.price && `${zahl(data.price)} €`,
            data.km && `${zahl(data.km)} km`,
          )}
          kinder={
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
          Die restlichen Pflichtangaben — zusammen, nicht verstreut.

          Getriebe, Karosserieform und Umsatzsteuer standen vorher in
          drei verschiedenen Abschnitten weiter unten, zwischen lauter
          freiwilligen Feldern. Wer die Seite von oben abarbeitete,
          hatte nach den Eckdaten das Gefühl, fertig zu sein, und stiess
          erst in der Fussleiste auf "Fehlt noch: Getriebe,
          Karosserieform, Umsatzsteuer".

          Alle sechs Pflichtangaben stehen jetzt in den ersten drei
          Abschnitten. Was danach kommt, ist Kür.

          Die drei haben ausserdem etwas gemeinsam: Keine davon steht im
          Fahrzeugschein. Der Scan kann sie nicht liefern, sie kommen
          immer von Hand — daher der Titel. Solange sie leer sind, steht
          an ihnen "Pflicht"; das ist die dringendere Auskunft und
          verdrängt den Hinweis "trägst du ein".
        */}
        <Block titel="Das trägst du selbst ein"
          fertig={!!data.gearbox && !!data.bodyType && !!data.vatType}
          zusammenfassung={zusammen(
            data.gearbox,
            data.bodyType,
            data.vatType === 'ausgewiesen' ? 'MwSt. ausweisbar' : data.vatType === 'differenz' ? '§ 25a' : '',
          )}
          kinder={
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                {/* Der Fahrzeugschein nennt kein Getriebe. */}
                <Beschriftung text="Getriebe" luecke={!data.gearbox} selbst erledigt={!!data.gearbox} />
                <Wahl optionen={GETRIEBE} wert={data.gearbox} beiWahl={v => setzen('gearbox', data.gearbox === v ? '' : v)} />
              </div>

              <div>
                <Beschriftung text="Karosserieform" luecke={!data.bodyType} selbst erledigt={!!data.bodyType} />
                <Wahl optionen={KAROSSERIE} wert={data.bodyType}
                  beiWahl={v => setzen('bodyType', data.bodyType === v ? '' : v)} />
              </div>

              <div>
                <Beschriftung text="Umsatzsteuer" luecke={!data.vatType} selbst erledigt={!!data.vatType} />
                <Wahl
                  optionen={['ausweisbar', 'Differenzbesteuert § 25a']}
                  wert={data.vatType === 'ausgewiesen' ? 'ausweisbar'
                      : data.vatType === 'differenz' ? 'Differenzbesteuert § 25a' : ''}
                  beiWahl={v => setzen('vatType', v === 'ausweisbar' ? 'ausgewiesen' : 'differenz')} />
                <p style={{ margin: '7px 0 0', fontSize: 12.5, color: F.leise, lineHeight: 1.6 }}>
                  {/*
                    Der Satz gehoert dazu. Wer die beiden Begriffe nicht
                    taeglich benutzt, raet sonst — und ein falscher Wert
                    kostet den gewerblichen Kaeufer, der danach filtert.
                  */}
                  Von Privat angekauft? Dann fast immer § 25a.
                </p>
              </div>
            </div>
          }
        />

        {/*
          Steht bewusst weit oben.
          Vorher war dieser Block der letzte der Seite — dabei ist er das
          Einzige, was der Scan NICHT liefern kann und was die Qualitaet
          der spaeteren Beschreibung wirklich bestimmt. Eingeklappt oder
          ganz unten heisst: wird uebersehen, und der Text wird
          entsprechend blass.
        */}
        <Block titel="Was der Scan nicht weiss"
          kinder={
            <>
              <textarea value={data.dealerNotes} onChange={ev => setzen('dealerNotes', ev.target.value)} rows={3}
                placeholder="Zwei Vorbesitzer · scheckheftgepflegt · Winterreifen auf Alu dabei · Zahnriemen bei 120.000 gemacht · kleiner Kratzer hinten rechts"
                style={{ width: '100%', boxSizing: 'border-box', background: F.flaeche,
                         border: `1px solid ${data.dealerNotes ? F.linie : `${F.akzent}55`}`,
                         borderRadius: 9, padding: 13,
                         color: F.text, fontSize: 14, fontFamily: F.schrift,
                         resize: 'vertical', lineHeight: 1.7, outline: 'none' }} />
              <p style={{ margin: '9px 0 0', fontSize: 12.5, color: F.leise, lineHeight: 1.6 }}>
                Je mehr hier steht, desto besser wird der Text.
              </p>
            </>
          }
        />

        <Block titel="Antrieb"
          fertig={!!data.fuelType && !!data.gearbox && !!data.powerKw}
          zusammenfassung={zusammen(
            data.fuelType, data.gearbox,
            data.powerKw && `${data.powerKw} PS`,
            data.displacementCcm && `${zahl(data.displacementCcm)} ccm`,
          )}
          kinder={
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <Beschriftung text="Kraftstoff" />
              <Wahl optionen={KRAFTSTOFFE} wert={data.fuelType} beiWahl={v => setzen('fuelType', data.fuelType === v ? '' : v)} />
            </div>
            {/* Das Getriebe steht jetzt oben bei den Pflichtangaben. */}
            <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr', gap: 20 }}>
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

        {/*
          Was hier bleibt, ist bei mobile.de gefordert, aber schnell
          beantwortet: drei Ja-Nein-Fragen. Karosserieform und
          Umsatzsteuer sind nach oben zu den übrigen Pflichtangaben
          gewandert — sie kosten Überlegung und gehören dorthin, wo der
          Händler noch bei der Sache ist.
        */}
        <Block titel="Zustand"
          fertig
          zusammenfassung={zusammen(
            data.damaged ? 'beschädigt' : 'unfallfrei',
            data.metallic && 'Metallic',
            data.warranty && 'mit Garantie',
          )}
          kinder={
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr 1fr', gap: 20 }}>
                <div>
                  <Beschriftung text="Zustand" />
                  <JaNein wert={data.damaged}
                    beiWahl={v => setzen('damaged', v)}
                    neinText="Unfallfrei" jaText="Beschädigt" />
                </div>
                <div>
                  <Beschriftung text="Metallic-Lackierung" />
                  <JaNein wert={data.metallic} beiWahl={v => setzen('metallic', v)} />
                </div>
                <div>
                  <Beschriftung text="Garantie" />
                  <JaNein wert={data.warranty} beiWahl={v => setzen('warranty', v)} />
                </div>
              </div>
            </div>
          }
        />

        {/*
          Was Käufer suchen.
          Nicht Pflicht bei mobile.de, aber Filterkriterien: Wer nach
          "HU neu" oder "1 Vorbesitzer" sucht, findet ein Inserat ohne
          diese Angaben gar nicht erst.

          Die Überschrift zählt mit. "Noch 2 von 4" beantwortet die Frage,
          die vor einem neuen Block im Kopf steht — ob das jetzt viel
          wird. Eine stumme Liste beantwortet sie nicht, und der Händler
          nimmt im Zweifel an: viel.
        */}
        <Block titel="Wonach Käufer filtern"
          startZu
          inhalt={offeneSelbst > 0
            ? `${offeneSelbst} Angaben, die nur du machen kannst — danach filtern Käufer`
            : 'HU, Vorbesitzer, Polsterung, Innenfarbe, Türen, Schadstoffklasse'}
          fertig={offeneSelbst === 0}
          zusammenfassung={zusammen(
            data.huUntil && `HU ${data.huUntil}`,
            data.previousOwners && `${data.previousOwners} Vorbesitzer`,
            data.interiorType, data.interiorColor,
            data.doors && `${data.doors} Türen`,
            data.emissionClass,
          )}
          rechts={
            <span style={{ fontSize: 11.5, fontWeight: 600, color: offeneSelbst === 0 ? F.gut : F.leise }}>
              {offeneSelbst === 0
                ? 'vollständig'
                : `noch ${offeneSelbst} von ${SELBST_FELDER.length}`}
            </span>
          }
          kinder={
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr', gap: 20 }}>
                <div>
                  <Beschriftung text="HU gültig bis" selbst erledigt={!!data.huUntil} />
                  <Eingabe wert={data.huUntil} aendern={v => setzen('huUntil', v)} platzhalter="09/2026" />
                </div>
                <div>
                  <Beschriftung text="Vorbesitzer" selbst erledigt={!!data.previousOwners} />
                  <Wahl optionen={['1', '2', '3', '4+']} wert={data.previousOwners}
                    beiWahl={v => setzen('previousOwners', data.previousOwners === v ? '' : v)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr', gap: 20 }}>
                <div>
                  <Beschriftung text="Polsterung" selbst erledigt={!!data.interiorType} />
                  <Wahl optionen={POLSTERUNG} wert={data.interiorType}
                    beiWahl={v => setzen('interiorType', data.interiorType === v ? '' : v)} />
                </div>
                <div>
                  <Beschriftung text="Innenfarbe" selbst erledigt={!!data.interiorColor} />
                  <Wahl optionen={INNENFARBE} wert={data.interiorColor}
                    beiWahl={v => setzen('interiorColor', data.interiorColor === v ? '' : v)} />
                </div>
              </div>

              {/*
                Aus dem Schein. Steht darunter und leiser, weil der Scan
                sie liefert — der Händler prüft sie nur. Sie hier gleich
                gross wie die vier oben zu zeigen, liesse den Block nach
                sieben Aufgaben aussehen statt nach vier.
              */}
              <div style={{ borderTop: `1px solid ${F.linieLeise}`, paddingTop: 16 }}>
                <div style={{ fontSize: 11.5, color: F.leise, marginBottom: 12 }}>
                  Aus dem Schein — nur prüfen
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: schmal ? '1fr' : '1fr 1fr 1fr', gap: 20 }}>
                  <div>
                    <Beschriftung text="Türen" />
                    <Wahl optionen={['2', '3', '4', '5']} wert={data.doors}
                      beiWahl={v => setzen('doors', data.doors === v ? '' : v)} />
                  </div>
                  <div>
                    <Beschriftung text="Schadstoffklasse" />
                    <Wahl optionen={EURONORM} wert={data.emissionClass}
                      beiWahl={v => setzen('emissionClass', data.emissionClass === v ? '' : v)} />
                  </div>
                  <div>
                    <Beschriftung text="Antrieb" />
                    <Wahl optionen={ANTRIEB} wert={data.driveType}
                      beiWahl={v => setzen('driveType', data.driveType === v ? '' : v)} />
                  </div>
                </div>
              </div>
            </div>
          }
        />

        {/*
          Selten Geändertes hinter einem Klick.

          Hatte bis eben eine eigene Klappmechanik mit eigenem Knopf,
          eigenem Pfeil und einem Satz "Nichts eingetragen" im
          zugeklappten Zustand. Neben drei Nachbarn, die inzwischen
          alle gleich zuklappen, sah dieser eine anders aus und stand
          als einziger offen da. Jetzt dieselbe Mechanik wie überall.
        */}
        <Block titel="Weitere Angaben"
          startZu
          inhalt={zusammen(data.color, data.seats && `${data.seats} Sitze`, data.vin)
            || 'Farbe, Sitzplätze, Fahrgestellnummer — meist nicht nötig'}
          fertig={mehrLuecken === 0}
          zusammenfassung={zusammen(data.color, data.seats && `${data.seats} Sitze`, data.vin)}
          kinder={
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
          }
        />

        {/* Verbrauch: bei Gebrauchtwagen eingeklappt */}
        <Block titel="Verbrauch und Emissionen"
          startZu={!e.envkvPflicht}
          inhalt="Bei Gebrauchtwagen freiwillig"
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
          startZu
          inhalt="Wird aus den Fotos ergänzt — hier nur nachtragen"
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
                Nur, was man auf Fotos <em>nicht</em> sieht — Scheckheft, Standheizung.
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
                                       background: drin ? F.akzentSchleier : 'transparent',
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
      </div>

      <input ref={e.dateiRef} type="file" accept="image/*" hidden
        onChange={ev => { const f = ev.target.files?.[0]; if (f) e.einlesen(f); }} />

      {/* ══ Fussleiste ══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${F.rahmenLinie}`,
        // Auf dem Handy sitzt die Dashboard-Navigation unten fest (56 px).
        // Ohne diesen Abstand liegt der Weiter-Knopf darunter und ist nicht
        // antippbar — der Fehler hat es schon einmal in die Anwendung geschafft.
        paddingBottom: schmal ? 56 : 0,
      }}>
        <div style={{ maxWidth: F.breite, margin: '0 auto', padding: '11px 24px',
                      display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: offenePflicht.length ? F.rahmenLuecke : F.rahmenLeise }}>
            {offenePflicht.length > 0
              ? `Fehlt noch: ${offenePflicht.map(k => PFLICHT_NAME[k]).join(', ')}`
              : 'Weiter zu den Fotos'}
          </span>
          <button type="button" onClick={e.weiter} disabled={e.unterwegs}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
              borderRadius: 9, border: 'none', background: F.rahmenAkzent, color: '#ffffff',
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
        /*
          Die Regel steht zwar am Ende bei der Fussleiste, gilt aber
          allen Feldern -- und die sitzen auf dem weissen Blatt. Deshalb
          die Kartenfarbe, nicht die Rahmenfarbe.

          Kursiv, damit ein Beispiel nicht wie eine Eingabe aussieht.
          Die Helligkeit allein reicht dafuer nicht: blass genug zum
          Unterscheiden waere zu blass zum Lesen.
        */
        input::placeholder, textarea::placeholder {
          color: ${F.blass}; opacity: 1; font-style: italic;
        }
      `}</style>
    </div>
  );
}
