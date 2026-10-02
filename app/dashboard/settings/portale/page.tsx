'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Trash2, Save, PlugZap, Lock,
} from 'lucide-react';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

/**
 * Portal-Zugänge des Händlers.
 *
 * Hier gibt der Händler die Zugangsdaten ein, mit denen 2Fast4Sale in
 * SEIN Konto bei mobile.de und AutoScout24 einstellt. Ohne diese Seite
 * liefen die Exporte über meine eigenen Zugangsdaten aus der Umgebung —
 * das Inserat wäre in meinem Konto gelandet, nicht in seinem.
 *
 * Drei Dinge, die diese Seite leisten muss, weil es um fremde Passwörter
 * geht:
 *
 *   1. Das Passwort NIE wieder anzeigen. Der Server schickt es auch nicht
 *      zurück; das Feld bleibt leer und sagt nur, ob eines gespeichert
 *      ist. Ein Feld, das ein Passwort anzeigt, liest irgendwann jemand
 *      über die Schulter.
 *   2. Den Testmodus zur Voreinstellung machen. Ein Inserat, das aus
 *      Versehen öffentlich wird, kostet den Händler Geld und Ruf.
 *   3. Prüfen können, ohne ein Inserat anzulegen. Sonst ist der erste
 *      Test ein echtes Fahrzeug auf einem echten Portal.
 */

type Portal = 'mobile' | 'as24';

interface Anzeige {
  portal: Portal;
  vorhanden: boolean;
  benutzer: string | null;
  kontoNummer: string | null;
  testmodus: boolean;
  geheimGesetzt: boolean;
  geprueftAm: string | null;
  pruefOk: boolean | null;
  pruefMeldung: string | null;
}

const TEXTE: Record<Portal, {
  name: string; farbe: string;
  nummerName: string; nummerHinweis: string; benutzerHinweis: string;
}> = {
  mobile: {
    name: 'mobile.de',
    farbe: '#ff6600',
    nummerName: 'Verkäufernummer (sellerId)',
    /*
     * mobile.de nennt in seinen Mails beide Nummern direkt nebeneinander:
     * eine Kundennummer (Kd-Nr.) und eine Seller-ID, und sie sehen gleich
     * aus — vierstellig, dicht beieinander. Gebraucht wird die SELLER-ID;
     * mit der Kundennummer antwortet die Schnittstelle mit 404, was wie
     * ein Tippfehler aussieht und keiner ist.
     */
    nummerHinweis: 'Die Seller-ID, NICHT die Kundennummer (Kd-Nr.) — mobile.de nennt beide, '
      + 'und mit der Kundennummer antwortet die Schnittstelle mit 404.',
    benutzerHinweis: 'Der API-Benutzer, nicht dein Login für die Website.',
  },
  as24: {
    name: 'AutoScout24',
    farbe: '#1a77c9',
    nummerName: 'Kundennummer (customerId)',
    nummerHinweis: 'Die Kundennummer, unter der deine Fahrzeuge laufen.',
    benutzerHinweis: 'Benutzer des API-Zugangs beziehungsweise des Datenpartner-Kontos.',
  },
};

export default function PortalZugaenge() {
  const [zugaenge, setZugaenge] = useState<Anzeige[]>([]);
  const [bereit, setBereit] = useState(true);
  const [schluessel, setSchluessel] = useState<{ stand: string; laenge: number } | null>(null);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState('');

  const holen = async () => {
    try {
      const antwort = await fetch('/api/portal-zugang');
      const d = await antwort.json();
      if (!antwort.ok) throw new Error(d.error || 'Konnte nicht geladen werden.');
      setZugaenge(d.zugaenge || []);
      setBereit(d.bereit !== false);
      setSchluessel(d.schluessel ?? null);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Konnte nicht geladen werden.');
    } finally {
      setLaden(false);
    }
  };

  useEffect(() => { holen(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: F, color: '#0f172a' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 60px' }}>

        <Link href="/dashboard/settings" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
          color: '#475569', fontSize: 13, fontWeight: 600, marginBottom: 18,
        }}>
          <ArrowLeft size={14} /> Einstellungen
        </Link>

        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.6px', margin: '0 0 8px' }}>
          Portal-Zugänge
        </h1>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: '0 0 24px' }}>
          Damit dein fertiges Inserat in <strong>dein</strong> Konto bei mobile.de oder
          AutoScout24 übertragen wird, braucht 2Fast4Sale die Zugangsdaten deines
          API-Zugangs. Sie werden verschlüsselt gespeichert und nie wieder angezeigt.
        </p>

        {!bereit && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, padding: '13px 15px',
            marginBottom: 18, borderRadius: 11, background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c', fontSize: 13, lineHeight: 1.6,
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Zugangsdaten können gerade nicht sicher gespeichert werden.</strong>
              {' '}Gespeichert wird in diesem Zustand nichts — lieber eine Meldung als ein
              Passwort im Klartext in der Datenbank.
              {/*
                Die beiden Fälle brauchen verschiedene Handgriffe, deshalb
                stehen sie hier getrennt da. "Bitte später versuchen" war
                richtig und nutzlos.
              */}
              {schluessel?.stand === 'fehlt' && (
                <span style={{ display: 'block', marginTop: 7 }}>
                  Auf dem Server ist <code>PORTAL_SCHLUESSEL</code> nicht gesetzt. Entweder fehlt
                  die Variable bei Vercel, sie steht in der falschen Umgebung (Production muss
                  angekreuzt sein), oder es wurde danach nicht neu bereitgestellt — eine neue
                  Variable gilt erst ab dem nächsten Deployment.
                </span>
              )}
              {schluessel?.stand === 'format' && (
                <span style={{ display: 'block', marginTop: 7 }}>
                  <code>PORTAL_SCHLUESSEL</code> ist gesetzt, hat aber das falsche Format:
                  {' '}{schluessel.laenge} Zeichen angekommen. Gebraucht werden 32 Byte, also
                  44 Zeichen base64 (endet meist auf <code>=</code>) oder 64 Zeichen hex.
                  Vermutlich ist beim Kopieren etwas abgeschnitten oder mitgerutscht.
                </span>
              )}
            </span>
          </div>
        )}

        {fehler && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', marginBottom: 18,
            borderRadius: 10, background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c', fontSize: 13,
          }}>
            <AlertTriangle size={14} /> {fehler}
          </div>
        )}

        {laden ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#475569', fontSize: 14 }}>
            <Loader2 size={16} style={{ animation: 'drehen 1s linear infinite' }} /> Wird geladen …
          </div>
        ) : (
          (['mobile', 'as24'] as Portal[]).map(portal => (
            <PortalKarte
              key={portal}
              portal={portal}
              stand={zugaenge.find(z => z.portal === portal)}
              bereit={bereit}
              neuLaden={holen}
            />
          ))
        )}

        <div style={{
          marginTop: 22, padding: '14px 16px', borderRadius: 12,
          background: '#fff', border: '1px solid #e8edf3', fontSize: 12.5,
          color: '#475569', lineHeight: 1.7,
        }}>
          <strong style={{ color: '#0f172a' }}>Noch keinen API-Zugang?</strong> Bei mobile.de
          schaltet ihn der Kundenservice frei (Betreff „API support request GERMANY"), bei
          AutoScout24 läuft es über <code>daten@autoscout24.com</code>. Beide verlangen einen
          gewerblichen Zugang. Solange nichts eingetragen ist, bleibt der Export in Schritt 4
          ein Trockenlauf: Du siehst, was übertragen würde, es geht aber nichts raus.
        </div>
      </div>
      <style>{`@keyframes drehen { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function PortalKarte({ portal, stand, bereit, neuLaden }: {
  portal: Portal;
  stand?: Anzeige;
  bereit: boolean;
  neuLaden: () => Promise<void>;
}) {
  const t = TEXTE[portal];
  const [benutzer, setBenutzer] = useState(stand?.benutzer ?? '');
  const [nummer, setNummer] = useState(stand?.kontoNummer ?? '');
  const [geheim, setGeheim] = useState('');
  const [testmodus, setTestmodus] = useState(stand?.testmodus !== false);
  const [speichert, setSpeichert] = useState(false);
  const [prueft, setPrueft] = useState(false);
  const [meldung, setMeldung] = useState<{ text: string; ok: boolean } | null>(null);

  const speichern = async () => {
    setSpeichert(true);
    setMeldung(null);
    try {
      const antwort = await fetch('/api/portal-zugang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal, benutzer, kontoNummer: nummer, testmodus,
          // Leer heisst: vorhandenes Passwort stehen lassen.
          ...(geheim ? { geheim } : {}),
        }),
      });
      const d = await antwort.json();
      if (!antwort.ok) throw new Error(d.error || 'Speichern fehlgeschlagen.');
      setGeheim('');
      setMeldung({ text: 'Gespeichert.', ok: true });
      await neuLaden();
    } catch (err) {
      setMeldung({ text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen.', ok: false });
    } finally {
      setSpeichert(false);
    }
  };

  const pruefen = async () => {
    setPrueft(true);
    setMeldung(null);
    try {
      const antwort = await fetch('/api/portal-zugang', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal }),
      });
      const d = await antwort.json();
      if (!antwort.ok) throw new Error(d.error || 'Prüfung fehlgeschlagen.');
      setMeldung({ text: d.meldung, ok: Boolean(d.ok) });
      await neuLaden();
    } catch (err) {
      setMeldung({ text: err instanceof Error ? err.message : 'Prüfung fehlgeschlagen.', ok: false });
    } finally {
      setPrueft(false);
    }
  };

  const entfernen = async () => {
    if (!confirm(`Zugang zu ${t.name} wirklich entfernen? Der Export dorthin geht danach nicht mehr.`)) return;
    setSpeichert(true);
    try {
      const antwort = await fetch(`/api/portal-zugang?portal=${portal}`, { method: 'DELETE' });
      const d = await antwort.json();
      if (!antwort.ok) throw new Error(d.error || 'Entfernen fehlgeschlagen.');
      setBenutzer(''); setNummer(''); setGeheim('');
      setMeldung({ text: 'Zugang entfernt.', ok: true });
      await neuLaden();
    } catch (err) {
      setMeldung({ text: err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.', ok: false });
    } finally {
      setSpeichert(false);
    }
  };

  const feld: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14,
    fontFamily: F, color: '#0f172a', outline: 'none', background: '#fff',
  };
  const label: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #e8edf3', borderRadius: 16,
      padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: t.farbe, flexShrink: 0,
        }} />
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, flex: 1 }}>{t.name}</h2>
        {stand?.vorhanden ? (
          <span style={{
            fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            background: stand.testmodus ? 'rgba(251,191,36,0.14)' : 'rgba(16,185,129,0.12)',
            color: stand.testmodus ? '#a16207' : '#047857',
          }}>
            {stand.testmodus ? 'Testmodus' : 'Im Betrieb'}
          </span>
        ) : (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>nicht eingerichtet</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label}>Benutzer</label>
          <input value={benutzer} onChange={e => setBenutzer(e.target.value)}
            autoComplete="off" placeholder="api-benutzer" style={feld} />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t.benutzerHinweis}</div>
        </div>
        <div>
          <label style={label}>{t.nummerName}</label>
          <input value={nummer} onChange={e => setNummer(e.target.value)}
            autoComplete="off" placeholder="123456" style={feld} />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t.nummerHinweis}</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Passwort / Schlüssel</label>
        <input type="password" value={geheim} onChange={e => setGeheim(e.target.value)}
          autoComplete="new-password"
          placeholder={stand?.geheimGesetzt ? 'gespeichert — leer lassen, um es zu behalten' : 'Passwort des API-Zugangs'}
          style={feld} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', marginTop: 5 }}>
          <Lock size={11} /> Verschlüsselt gespeichert. Wird nie wieder angezeigt — auch mir nicht.
        </div>
      </div>

      {/*
        Testmodus als Schalter und nicht als Häkchen "live schalten":
        Die harmlose Einstellung soll die sein, die man aus Versehen
        stehen lässt.
      */}
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 16,
        fontSize: 13, color: '#334155', cursor: 'pointer', lineHeight: 1.5,
      }}>
        <input type="checkbox" checked={testmodus} onChange={e => setTestmodus(e.target.checked)}
          style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }} />
        <span>
          <strong>Testmodus</strong> — Inserate gehen in die Testumgebung des Portals,
          werden nicht öffentlich und kosten nichts. Erst ausschalten, wenn ein Testinserat
          richtig aussah.
        </span>
      </label>

      {meldung && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', marginBottom: 14,
          borderRadius: 9, fontSize: 13, lineHeight: 1.55,
          background: meldung.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.07)',
          border: `1px solid ${meldung.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: meldung.ok ? '#047857' : '#b91c1c',
        }}>
          {meldung.ok ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      : <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
          {meldung.text}
        </div>
      )}

      {!meldung && stand?.pruefMeldung && (
        <div style={{ fontSize: 12.5, color: stand.pruefOk ? '#047857' : '#b45309', marginBottom: 14 }}>
          Letzte Prüfung: {stand.pruefMeldung}
          {stand.geprueftAm && ` (${new Date(stand.geprueftAm).toLocaleString('de-DE')})`}
        </div>
      )}

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <button type="button" onClick={speichern} disabled={speichert || !bereit}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
            borderRadius: 9, border: 'none', cursor: speichert || !bereit ? 'default' : 'pointer',
            background: '#4338ca', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: F,
            opacity: speichert || !bereit ? 0.6 : 1,
          }}>
          {speichert ? <Loader2 size={14} style={{ animation: 'drehen 1s linear infinite' }} /> : <Save size={14} />}
          Speichern
        </button>

        <button type="button" onClick={pruefen} disabled={prueft || !stand?.vorhanden}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
            borderRadius: 9, border: '1px solid #cbd5e1', cursor: prueft || !stand?.vorhanden ? 'default' : 'pointer',
            background: '#fff', color: '#334155', fontSize: 13.5, fontWeight: 700, fontFamily: F,
            opacity: prueft || !stand?.vorhanden ? 0.5 : 1,
          }}>
          {prueft ? <Loader2 size={14} style={{ animation: 'drehen 1s linear infinite' }} /> : <PlugZap size={14} />}
          Verbindung prüfen
        </button>

        {stand?.vorhanden && (
          <button type="button" onClick={entfernen} disabled={speichert}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px',
              borderRadius: 9, border: '1px solid rgba(185,28,28,0.25)', cursor: 'pointer',
              background: '#fff', color: '#b91c1c', fontSize: 13.5, fontWeight: 700, fontFamily: F,
              marginLeft: 'auto',
            }}>
            <Trash2 size={14} /> Entfernen
          </button>
        )}
      </div>
    </div>
  );
}
