'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, Clock } from 'lucide-react';

export default function KontaktPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#0d1525',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '14px 18px',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080e1a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#f1f5f9' }}>

      {/* Navbar */}
      <nav style={{ padding: '0 40px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontSize: '20px', fontWeight: '900', color: '#3b82f6', textDecoration: 'none', letterSpacing: '-0.5px' }}>2Fast4Sale</Link>
        <Link href="/auth/login" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none', fontWeight: '600' }}>Einloggen →</Link>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: '900', margin: '0 0 16px 0', letterSpacing: '-1px', color: '#f8fafc' }}>Kontakt</h1>
          <p style={{ color: '#475569', fontSize: '18px', maxWidth: '540px', margin: '0 auto', lineHeight: 1.7 }}>
            Fragen zum Produkt, Preisen oder einer Enterprise-Lösung? Wir antworten innerhalb von 24 Stunden.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '48px', alignItems: 'start' }}>

          {/* Kontaktinfo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              { icon: <Mail size={20} />, label: 'E-Mail', value: 'info@2fast4sale.de', href: 'mailto:info@2fast4sale.de', color: '#3b82f6' },
              { icon: <Phone size={20} />, label: 'Telefon', value: '+49 (0) 30 123456789', href: 'tel:+4930123456789', color: '#10b981' },
              { icon: <MapPin size={20} />, label: 'Adresse', value: 'Musterstraße 1\n10115 Berlin', href: null, color: '#8b5cf6' },
              { icon: <Clock size={20} />, label: 'Antwortzeit', value: 'Werktags < 24 Stunden\nEnterprise: < 4 Stunden', href: null, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{ backgroundColor: '#0d1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '22px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '44px', height: '44px', backgroundColor: `${item.color}18`, borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '5px' }}>{item.label}</div>
                  {item.href ? (
                    <a href={item.href} style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', textDecoration: 'none' }}>{item.value}</a>
                  ) : (
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', whiteSpace: 'pre-line' }}>{item.value}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Enterprise CTA */}
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '18px', padding: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#f59e0b', marginBottom: '8px' }}>Enterprise-Lösung gesucht?</div>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7, margin: '0 0 16px 0' }}>
                Individuelle Inseratsmenge, White-Label, API-Zugang und dedizierter Support für Autohausgruppen.
              </p>
              <a href="mailto:enterprise@2fast4sale.de" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#f59e0b', textDecoration: 'none' }}>
                enterprise@2fast4sale.de →
              </a>
            </div>
          </div>

          {/* Kontaktformular */}
          <div style={{ backgroundColor: '#0d1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '40px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={30} style={{ color: '#10b981' }} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', margin: '0 0 10px 0' }}>Nachricht gesendet…</h3>
                <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 24px 0' }}>Wir melden uns innerhalb von 24 Stunden bei dir.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', company: '', subject: '', message: '' }); }}
                  style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Weitere Nachricht senden
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc', margin: '0 0 4px 0' }}>Nachricht schreiben</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {[{ key: 'name', label: 'Name *', placeholder: 'Max Mustermann' }, { key: 'company', label: 'Autohaus / Firma', placeholder: 'Autohaus GmbH' }].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '7px' }}>{f.label}</label>
                      <input style={inputStyle} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '7px' }}>E-Mail *</label>
                  <input type="email" style={inputStyle} placeholder="max@autohaus.de" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '7px' }}>Betreff</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                    <option value="">Bitte wählen…</option>
                    <option>Allgemeine Anfrage</option>
                    <option>Enterprise / Großkunde</option>
                    <option>Technischer Support</option>
                    <option>Partnerschaft</option>
                    <option>Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '7px' }}>Nachricht *</label>
                  <textarea style={{ ...inputStyle, minHeight: '130px', resize: 'vertical', lineHeight: 1.7 }} placeholder="Wie können wir helfen?" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
                <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', padding: '15px', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', boxShadow: '0 8px 24px rgba(37,99,235,0.35)', transition: 'all 0.2s' }}>
                  {loading ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Wird gesendet…</> : <><Send size={17} /> Nachricht senden</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} input::placeholder,textarea::placeholder{color:#334155}`}</style>
    </div>
  );
}

