'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

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
        Wir verwenden technisch notwendige Cookies für den Betrieb dieser Website sowie Analyse-Cookies zur Verbesserung unseres Angebots.
        Weitere Infos in unserer{' '}
        <Link href="/datenschutz" style={{ color: '#60a5fa', textDecoration: 'none' }}>Datenschutzerklärung</Link>.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button onClick={decline} style={{
          padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
          background: 'transparent', color: '#64748b', fontSize: '13px', fontWeight: '600',
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
