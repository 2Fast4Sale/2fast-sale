'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EINWILLIGUNG_EREIGNIS } from './AnalyseMitEinwilligung';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (!consent) setVisible(true);
    } catch {
      /* Ohne Speicher keine Messung und kein Banner noetig. */
    }
    /* Ueber diesen Weg laesst sich die Wahl spaeter wieder oeffnen. */
    const oeffnen = () => setVisible(true);
    window.addEventListener('cookie-banner-oeffnen', oeffnen);
    return () => window.removeEventListener('cookie-banner-oeffnen', oeffnen);
  }, []);

  /* Die Entscheidung sofort wirksam machen, nicht erst beim naechsten Laden. */
  const merken = (wert: 'accepted' | 'declined') => {
    try { localStorage.setItem('cookie_consent', wert); } catch { /* egal */ }
    window.dispatchEvent(new Event(EINWILLIGUNG_EREIGNIS));
    setVisible(false);
  };

  const accept = () => merken('accepted');
  const decline = () => merken('declined');

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#0a1628',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', flexWrap: 'wrap',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      fontFamily: '"Inter", -apple-system, sans-serif',
    }}>
      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '680px', lineHeight: 1.6 }}>
        Technisch notwendige Speicherung brauchen wir für Anmeldung und Warenkorb — die läuft immer.
        Zusätzlich möchten wir anonym messen, welche Seiten aufgerufen werden, um das Angebot zu verbessern.
        Das passiert nur mit deiner Zustimmung, und du kannst sie jederzeit widerrufen. Mehr dazu in der{' '}
        <Link href="/datenschutz" style={{ color: '#60a5fa', textDecoration: 'none' }}>Datenschutzerklärung</Link>.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button onClick={decline} style={{
          padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
          background: 'transparent', color: '#cbd5e1', fontSize: '13px', fontWeight: '700',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Nur notwendige
        </button>
        <button onClick={accept} style={{
          padding: '9px 18px', borderRadius: '8px', border: 'none',
          background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Alle akzeptieren
        </button>
      </div>
    </div>
  );
}
