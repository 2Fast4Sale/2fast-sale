'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, Sparkles, Zap } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = '/dashboard';
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080e1a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

      {/* Animierte Hintergrund-Orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)', top: '-100px', left: '50%', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.10), transparent 70%)', bottom: '-80px', right: '-80px' }} />
      </div>

      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        <Link href="/" style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6', textDecoration: 'none', display: 'block', marginBottom: '48px' }}>2Fast4Sale</Link>

        {/* Erfolgs-Icon */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
          <div style={{ width: '96px', height: '96px', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))', border: '2px solid rgba(16,185,129,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <CheckCircle2 size={44} style={{ color: '#10b981' }} />
          </div>
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '28px', height: '28px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={14} color="#fff" />
          </div>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#f8fafc', margin: '0 0 14px 0', letterSpacing: '-0.5px' }}>
          Willkommen bei 2Fast4Sale!
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.7, margin: '0 0 40px 0' }}>
          Dein Abonnement ist aktiv. Du wirst in <strong style={{ color: '#f1f5f9' }}>{countdown}</strong> Sekunden automatisch weitergeleitet.
        </p>

        {/* Was dich erwartet */}
        <div style={{ backgroundColor: '#0d1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '28px', marginBottom: '28px', textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '18px' }}>Was dich erwartet</div>
          {[
            { icon: <Zap size={15} />, text: 'Fahrzeugschein hochladen — Daten werden automatisch ausgelesen', color: '#3b82f6' },
            { icon: <Sparkles size={15} />, text: 'Fotos hochladen — KI erstellt professionelle Studio-Bilder', color: '#8b5cf6' },
            { icon: <CheckCircle2 size={15} />, text: 'Inserat fertig — Direkt auf mobile.de & AutoScout24 publizieren', color: '#10b981' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', backgroundColor: `${item.color}18`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0, marginTop: '1px' }}>
                {item.icon}
              </div>
              <span style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/dashboard/listing" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', padding: '14px 28px', borderRadius: '14px', fontWeight: '800', textDecoration: 'none', fontSize: '15px', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
            Erstes Inserat erstellen <ArrowRight size={16} />
          </Link>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#0d1525', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '14px 24px', borderRadius: '14px', fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}>
            Dashboard
          </Link>
        </div>

        {/* Fortschrittsbalken für Countdown */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: '#10b981', borderRadius: '99px', width: `${((8 - countdown) / 8) * 100}%`, transition: 'width 1s linear' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#334155', marginTop: '8px' }}>Weiterleitung in {countdown}s…</div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}

