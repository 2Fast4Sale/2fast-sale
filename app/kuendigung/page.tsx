'use client';

/**
 * Kündigungsseite nach § 312k BGB.
 *
 * Seit Juli 2022 muss jeder im Netz geschlossene Dauerschuldvertrag über
 * einen Kündigungsbutton kündbar sein. Das Gesetz ist ungewöhnlich
 * genau, und jede Vorgabe hat einen Grund:
 *
 *   Ohne Anmeldung. Der Anlass für das Gesetz war, dass Leute ihr Konto
 *   nicht mehr erreichten und deshalb weiterzahlten.
 *
 *   Die Schaltfläche heisst "Verträge hier kündigen", die Bestätigung
 *   "jetzt kündigen" — wörtlich so vorgeschrieben, damit niemand sie
 *   hinter "Feedback geben" versteckt.
 *
 *   Keine Zwischenschritte, keine Rückfragen, kein Halteangebot. Die
 *   Bestätigungsseite ist unmittelbar erreichbar.
 *
 *   Der Eingang wird sofort in Textform bestätigt, mit Inhalt, Datum und
 *   Uhrzeit.
 *
 * Fehlt der Button, kann der Kunde jederzeit formlos kündigen — und es
 * ist abmahnfähig.
 */

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const F = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const T = {
  grund: '#0a0c11', flaeche: '#12151d', linie: '#5c6a82', linieLeise: '#2a3140',
  text: '#f8fafc', gedämpft: '#c2cad8', leise: '#8d99ad',
  akzent: '#7c8aff', gut: '#4ade80', fehler: '#fb7185',
};

interface Antwort {
  vorgang: string;
  zeitpunkt: string;
  bestaetigungVerschickt: boolean;
}

export default function Kuendigung() {
  const [form, setForm] = useState({
    email: '', name: '', vertrag: '', art: 'ordentlich', grund: '', zumDatum: '',
  });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [fertig, setFertig] = useState<Antwort | null>(null);

  const setzen = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const eing: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: T.grund,
    border: `1px solid ${T.linieLeise}`, borderRadius: 9, padding: '11px 13px',
    color: T.text, fontSize: 14, fontFamily: F, outline: 'none',
  };
  const label: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 12.5, fontWeight: 600, color: T.gedämpft,
  };

  const absenden = async () => {
    setFehler('');
    if (!form.email.trim()) { setFehler('Bitte gib deine E-Mail-Adresse an.'); return; }
    if (form.art === 'ausserordentlich' && !form.grund.trim()) {
      setFehler('Bei einer ausserordentlichen Kündigung ist der Grund anzugeben.');
      return;
    }
    setLaeuft(true);
    try {
      const res = await fetch('/api/kuendigung', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setFehler(d.error || 'Die Kündigung konnte nicht entgegengenommen werden.'); return; }
      setFertig(d);
    } catch {
      setFehler('Netzwerkfehler. Bitte versuch es erneut oder schreib uns direkt.');
    } finally {
      setLaeuft(false);
    }
  };

  if (fertig) {
    return (
      <div style={{ minHeight: '100vh', background: T.grund, color: T.text, fontFamily: F,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <CheckCircle2 size={22} color={T.gut} />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Kündigung eingegangen</h1>
          </div>
          <p style={{ margin: '0 0 18px', fontSize: 14.5, color: T.gedämpft, lineHeight: 1.7 }}>
            Eingegangen am <strong>{fertig.zeitpunkt} Uhr</strong>. Vorgangsnummer{' '}
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fertig.vorgang}</span>.
          </p>

          {/*
            Ehrlich sagen, wenn die Bestätigungsmail nicht rausging. Die
            Kündigung ist trotzdem wirksam — sie ist eingegangen und
            festgehalten. Aber wer auf eine Mail wartet, die nicht kommt,
            hält seine Kündigung für gescheitert und zahlt weiter.
          */}
          <div style={{ padding: '14px 16px', borderRadius: 10,
                        background: fertig.bestaetigungVerschickt ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.09)',
                        border: `1px solid ${fertig.bestaetigungVerschickt ? 'rgba(74,222,128,0.25)' : 'rgba(251,191,36,0.26)'}`,
                        fontSize: 13.5, lineHeight: 1.7, color: T.gedämpft }}>
            {fertig.bestaetigungVerschickt
              ? 'Die Bestätigung ist an deine E-Mail-Adresse unterwegs. Bitte hebe sie auf.'
              : 'Die Bestätigungsmail konnte nicht zugestellt werden. Deine Kündigung ist trotzdem wirksam und mit Datum und Uhrzeit festgehalten — notier dir bitte die Vorgangsnummer oben.'}
          </div>

          <p style={{ margin: '18px 0 0', fontSize: 13, color: T.leise, lineHeight: 1.7 }}>
            Dein Zugang bleibt bis zum Ende des bezahlten Zeitraums bestehen.
            Bereits erstellte Inserate bleiben erhalten.
          </p>

          <Link href="/" style={{ display: 'inline-block', marginTop: 22, fontSize: 13.5, color: T.akzent }}>
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.grund, color: T.text, fontFamily: F, padding: '48px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.6px' }}>
          Verträge hier kündigen
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 14.5, color: T.leise, lineHeight: 1.7 }}>
          Ohne Anmeldung. Fülle aus, was du weisst — die E-Mail-Adresse deines Kontos
          reicht. Du bekommst die Bestätigung sofort per E-Mail.
        </p>

        <div style={{ background: T.flaeche, border: `1px solid ${T.linieLeise}`,
                      borderRadius: 14, padding: 24, display: 'grid', gap: 18 }}>

          <div>
            <label style={label}>E-Mail-Adresse deines Kontos *</label>
            <input type="email" value={form.email} onChange={setzen('email')}
              placeholder="max@autohaus.de" style={eing} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={label}>Name</label>
              <input value={form.name} onChange={setzen('name')} placeholder="Max Mustermann" style={eing} />
            </div>
            <div>
              <label style={label}>Vertrag</label>
              <input value={form.vertrag} onChange={setzen('vertrag')} placeholder="z.B. Paket M" style={eing} />
            </div>
          </div>

          <div>
            <label style={label}>Art der Kündigung *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['ordentlich', 'Ordentlich'], ['ausserordentlich', 'Ausserordentlich']] as const).map(([id, text]) => {
                const an = form.art === id;
                return (
                  <button key={id} type="button" onClick={() => setForm(p => ({ ...p, art: id }))}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer', fontFamily: F,
                      fontSize: 13.5, fontWeight: an ? 600 : 500,
                      border: `1px solid ${an ? T.akzent : T.linieLeise}`,
                      background: an ? 'rgba(124,138,255,0.13)' : 'transparent',
                      color: an ? T.akzent : T.gedämpft,
                    }}>{text}</button>
                );
              })}
            </div>
          </div>

          {/* § 312k Abs. 2: Bei ausserordentlicher Kündigung ist der Grund anzugeben. */}
          {form.art === 'ausserordentlich' && (
            <div>
              <label style={label}>Grund *</label>
              <textarea value={form.grund} onChange={setzen('grund')} rows={3}
                placeholder="Warum kündigst du ausserordentlich?"
                style={{ ...eing, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          )}

          <div>
            <label style={label}>Kündigung zum</label>
            <input value={form.zumDatum} onChange={setzen('zumDatum')}
              placeholder="nächstmöglicher Zeitpunkt" style={eing} />
          </div>

          {fehler && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '11px 14px',
                          borderRadius: 9, background: 'rgba(251,113,133,0.09)',
                          border: '1px solid rgba(251,113,133,0.26)', fontSize: 13.5, color: T.fehler }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {fehler}
            </div>
          )}

          {/*
            Die Beschriftung ist vorgeschrieben: "jetzt kündigen" oder eine
            ebenso eindeutige Formulierung. Keine Rueckfrage davor, kein
            Halteangebot — das Gesetz verlangt, dass die Bestaetigungsseite
            unmittelbar zur Kuendigung fuehrt.
          */}
          <button type="button" onClick={absenden} disabled={laeuft}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              padding: '14px', borderRadius: 10, border: 'none',
              background: T.akzent, color: '#0a0c11',
              fontFamily: F, fontSize: 15, fontWeight: 700,
              cursor: laeuft ? 'wait' : 'pointer', opacity: laeuft ? 0.7 : 1,
            }}>
            {laeuft && <Loader2 size={16} style={{ animation: 'drehen .8s linear infinite' }} />}
            Jetzt kündigen
          </button>
        </div>

        <p style={{ margin: '20px 0 0', fontSize: 12.5, color: T.leise, lineHeight: 1.7 }}>
          Du kannst auch formlos per E-Mail kündigen. Dieser Weg ist der schnellere,
          weil du die Bestätigung sofort bekommst.
        </p>

        <Link href="/" style={{ display: 'inline-block', marginTop: 18, fontSize: 13.5, color: T.akzent }}>
          Zurück zur Startseite
        </Link>
      </div>

      <style>{`@keyframes drehen { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
