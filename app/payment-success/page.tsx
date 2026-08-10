'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ec4899','#ef4444'];
    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 300,
      w: 7 + Math.random() * 9,
      h: 4 + Math.random() * 6,
      r: Math.random() * Math.PI * 2,
      dr: (Math.random() - 0.5) * 0.15,
      vx: (Math.random() - 0.5) * 4,
      vy: 2.5 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
    }));
    let alive = true;
    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += p.dr; p.vy += 0.04;
        if (p.y > canvas.height * 0.75) p.opacity = Math.max(0, p.opacity - 0.018);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (pieces.some(p => p.opacity > 0)) requestAnimationFrame(draw);
    };
    draw();
    return () => { alive = false; };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }} />;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const credits = searchParams.get('credits_added');
  const [countdown, setCountdown] = useState(5);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          router.push('/dashboard');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const isCredit = !!credits;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080e1a 0%, #0d1525 50%, #080e1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Inter", -apple-system, sans-serif',
      padding: '20px',
      position: 'relative',
    }}>
      <Confetti />

      <div style={{
        position: 'relative', zIndex: 20,
        textAlign: 'center', maxWidth: '480px', width: '100%',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Icon */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))',
          border: '3px solid rgba(16,185,129,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 0 60px rgba(16,185,129,0.2)',
        }}>
          <span style={{ fontSize: '48px' }}>🎉</span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: '32px', fontWeight: '900', color: '#f8fafc',
          margin: '0 0 12px', letterSpacing: '-1px', lineHeight: 1.1,
        }}>
          Vielen Dank!
        </h1>

        <p style={{ fontSize: '18px', color: '#10b981', fontWeight: '700', margin: '0 0 20px' }}>
          {isCredit
            ? `${credits} Inserat-Credit${Number(credits) > 1 ? 's' : ''} gutgeschrieben`
            : plan
            ? `${plan.charAt(0).toUpperCase() + plan.slice(1)}-Plan aktiviert`
            : 'Zahlung erfolgreich'}
        </p>

        <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 40px', lineHeight: 1.7 }}>
          {isCredit
            ? 'Deine Credits sind sofort verfügbar. Du kannst jetzt ein neues Inserat erstellen.'
            : 'Dein Account wurde erfolgreich aufgewertet. Alle Features sind sofort verfügbar.'}
        </p>

        {/* Countdown */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '20px', marginBottom: '24px',
        }}>
          <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
            Weiterleitung in
          </div>
          <div style={{ fontSize: '48px', fontWeight: '900', color: '#6366f1', lineHeight: 1 }}>
            {countdown}
          </div>
          <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>Sekunden</div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff', fontSize: '15px', fontWeight: '700',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}>
            Zum Dashboard →
          </Link>
          {isCredit && (
            <Link href="/dashboard/listing/step1" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px', borderRadius: '12px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              color: '#10b981', fontSize: '15px', fontWeight: '700',
              textDecoration: 'none',
            }}>
              Inserat erstellen
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
