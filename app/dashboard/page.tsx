'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Car, CheckCircle2, ChevronRight, Eye, Pencil, TrendingUp, FileText, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

interface Vehicle { id:string; brand:string; price:string; date:string; image:string; status:string; km?:string; }

const F = '"Inter",-apple-system,BlinkMacSystemFont,sans-serif';

const STATUS: Record<string, { label:string; dot:string; color:string }> = {
  'Aktiv':      { label:'Live',        dot:'#22c55e', color:'#15803d' },
  'Entwurf':    { label:'Entwurf',     dot:'#f59e0b', color:'#92400e' },
  'Reserviert': { label:'Reserviert',  dot:'#3b82f6', color:'#1e40af' },
  'Verkauft':   { label:'Verkauft',    dot:'#a855f7', color:'#6b21a8' },
};

function DashboardContent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [h] = useState(() => new Date().getHours());
  const [creditsBanner, setCreditsBanner] = useState<number | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const [isMobile, setIsMobile] = useState(false);
  const params = useSearchParams();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const sessionId = params.get('session_id');
    const creditsAdded = params.get('credits_added');
    if (!sessionId || !creditsAdded) return;
    fetch('/api/credits/fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then(r => r.json()).then(d => {
      if (d.ok && !d.alreadyFulfilled) setCreditsBanner(d.added);
      else if (d.alreadyFulfilled) setCreditsBanner(0);
    }).catch(() => {});
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    url.searchParams.delete('credits_added');
    window.history.replaceState({}, '', url.toString());
  }, [params]);

  useEffect(() => {
    fetch('/api/vehicles').then(r => r.json()).then(d => {
      if (d.vehicles?.length) setVehicles(d.vehicles.map((v: Record<string,unknown>) => ({
        id: v.id, brand: v.brand || 'Unbekannt',
        price: v.price ? `${Number(v.price).toLocaleString('de-DE')} €` : '—',
        km: v.km || '', date: new Date(v.created_at as string).toLocaleDateString('de-DE'),
        image: (v.vehicle_images as {processed_url?:string;original_url?:string}[])?.[0]?.processed_url || (v.vehicle_images as {processed_url?:string;original_url?:string}[])?.[0]?.original_url || '',
        status: v.status || 'Entwurf',
      })));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    import('../../lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from('profiles').select('plan, listing_credits').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) { setPlan(data.plan || 'free'); setCredits(data.listing_credits ?? 0); }
          });
      });
    });
  }, [creditsBanner]);

  const live   = vehicles.filter(v => v.status === 'Aktiv').length;
  const drafts = vehicles.filter(v => v.status === 'Entwurf').length;
  const sold   = vehicles.filter(v => v.status === 'Verkauft').length;
  const total  = vehicles.length;
  const greet  = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  const today  = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const pad = isMobile ? '16px' : '32px';

  return (
    <div style={{ fontFamily:F, minHeight:'100vh', background:'#f4f6f9', color:'#0f172a' }}>

      {/* ── TOP HEADER (desktop only) ── */}
      {!isMobile && (
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:`0 ${pad}`, display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px' }}>
          <div>
            <span style={{ fontSize:'13px', color:'#94a3b8', fontWeight:'500' }}>{greet} — </span>
            <span style={{ fontSize:'13px', color:'#64748b', fontWeight:'500' }}>{today}</span>
          </div>
          <Link href="/dashboard/listing/step1" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'7px', background:'#4f46e5', color:'#fff', padding:'9px 18px', fontWeight:'700', fontSize:'13px', borderRadius:'4px' }}>
            <Plus size={15} /> Neues Inserat
          </Link>
        </div>
      )}

      <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth:'1280px', margin:'0 auto' }}>

        {/* ── GREETING (mobile) ── */}
        {isMobile && (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'16px', fontWeight:'800', color:'#0f172a' }}>{greet} 👋</div>
            <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'2px' }}>{today}</div>
          </div>
        )}

        {/* ── PAYMENT SUCCESS ── */}
        {creditsBanner !== null && (
          <div style={{ marginBottom:'16px', padding:'12px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'4px', display:'flex', alignItems:'center', gap:'10px', fontSize:'14px', fontWeight:'600', color:'#15803d' }}>
            <CheckCircle2 size={16} />
            {creditsBanner > 0
              ? `${creditsBanner} Credit${creditsBanner > 1 ? 's' : ''} gutgeschrieben!`
              : 'Credit bereits gutgeschrieben.'}
          </div>
        )}

        {/* ── CREDIT BANNER ── */}
        {plan === 'free' && credits !== null && (
          <div style={{ marginBottom:'16px', display:'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', justifyContent:'space-between', padding: isMobile ? '14px 16px' : '16px 22px', background: credits === 0 ? '#7f1d1d' : '#3730a3', borderRadius:'4px', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ fontSize:'20px' }}>{credits === 0 ? '🔒' : '🎫'}</div>
              <div>
                <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight:'800', color:'#fff' }}>
                  {credits === 0 ? 'Keine Inserat-Credits' : `${credits} Credit${credits !== 1 ? 's' : ''} verfügbar`}
                </div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>
                  {credits === 0 ? 'Credit kaufen um Inserat zu erstellen.' : `Für ${credits} weitere Inserat${credits !== 1 ? 'e' : ''} nutzbar.`}
                </div>
              </div>
            </div>
            <Link href="/dashboard/pricing" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(255,255,255,0.15)', color:'#fff', padding:'9px 16px', borderRadius:'4px', fontWeight:'700', fontSize:'13px', whiteSpace:'nowrap', border:'1px solid rgba(255,255,255,0.25)', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {credits === 0 ? '🔑 Credit kaufen – 4,99 €' : '+ Weiteren kaufen'}
            </Link>
          </div>
        )}

        {/* ── STATS ── */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? '8px' : '0', marginBottom:'20px', background: isMobile ? 'transparent' : '#e2e8f0', border: isMobile ? 'none' : '1px solid #e2e8f0', borderRadius:'4px', overflow: isMobile ? 'visible' : 'hidden' }}>
          {[
            { icon:<FileText size={16}/>, label:'Inserate gesamt', value:total,  accent:'#4f46e5' },
            { icon:<Eye size={16}/>,      label:'Live / Aktiv',    value:live,   accent:'#16a34a' },
            { icon:<Pencil size={16}/>,   label:'Entwürfe',        value:drafts, accent:'#d97706' },
            { icon:<TrendingUp size={16}/>,label:'Verkauft',       value:sold,   accent:'#7c3aed' },
          ].map((s, i) => (
            <div key={s.label} style={{ background:'#fff', padding: isMobile ? '16px' : '20px 22px', display:'flex', alignItems:'center', gap:'12px', marginLeft: (!isMobile && i > 0) ? '1px' : '0', borderRadius: isMobile ? '4px' : '0', border: isMobile ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ color:s.accent }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: isMobile ? '26px' : '32px', fontWeight:'900', letterSpacing:'-2px', lineHeight:1, color:'#0f172a' }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'4px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── HAUPTBEREICH ── */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 272px', gap:'16px', alignItems:'start' }}>

          {/* INSERATE */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'4px', overflow:'hidden' }}>

            {/* Table header (desktop only) */}
            {!isMobile && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 130px 110px 100px', padding:'10px 20px', background:'#f8fafc', borderBottom:'1px solid #e8ecf0' }}>
                {['Fahrzeug', 'Preis', 'Kilometerstand', 'Status'].map(col => (
                  <div key={col} style={{ fontSize:'11px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>{col}</div>
                ))}
              </div>
            )}

            {/* Mobile list header */}
            {isMobile && (
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Meine Inserate</span>
                <Link href="/dashboard/gallery" style={{ textDecoration:'none', fontSize:'12px', fontWeight:'600', color:'#6366f1', display:'flex', alignItems:'center', gap:'3px' }}>Alle <ChevronRight size={12} /></Link>
              </div>
            )}

            {!loaded ? (
              <div style={{ padding:'48px', textAlign:'center', color:'#94a3b8', fontSize:'14px' }}>Lädt…</div>
            ) : vehicles.length === 0 ? (
              <div style={{ padding: isMobile ? '40px 20px' : '64px 40px', textAlign:'center' }}>
                <div style={{ width:'52px', height:'52px', background:'#f1f5f9', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', borderRadius:'4px' }}>
                  <Car size={24} color="#94a3b8" />
                </div>
                <div style={{ fontSize:'17px', fontWeight:'800', color:'#0f172a', marginBottom:'8px' }}>Noch keine Inserate</div>
                <p style={{ color:'#64748b', fontSize:'14px', marginBottom:'24px', lineHeight:1.6 }}>
                  Erstelle dein erstes Inserat in unter 2 Minuten.
                </p>
                <Link href="/dashboard/listing/step1" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'8px', background:'#4f46e5', color:'#fff', padding:'12px 24px', borderRadius:'4px', fontWeight:'700', fontSize:'14px' }}>
                  <Plus size={16} /> Jetzt loslegen
                </Link>
              </div>
            ) : (
              <div>
                {vehicles.map((car, i) => {
                  const sc = STATUS[car.status] || STATUS['Entwurf'];
                  if (isMobile) {
                    // Mobile: card layout
                    return (
                      <Link key={car.id} href={`/dashboard/listing/${car.id}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderBottom: i < vehicles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ width:'56px', height:'40px', flexShrink:0, background:'#f1f5f9', border:'1px solid #e8ecf0', overflow:'hidden', borderRadius:'3px' }}>
                          {car.image
                            ? <img src={car.image} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Car size={16} color="#cbd5e1" /></div>
                          }
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'14px', fontWeight:'700', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{car.brand}</div>
                          <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'1px' }}>{car.date}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:'14px', fontWeight:'800', color:'#4f46e5' }}>{car.price}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px', justifyContent:'flex-end' }}>
                            <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:sc.dot }} />
                            <span style={{ fontSize:'11px', fontWeight:'600', color:sc.color }}>{sc.label}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                  // Desktop: table row
                  return (
                    <Link key={car.id} href={`/dashboard/listing/${car.id}`}
                      style={{ textDecoration:'none', display:'grid', gridTemplateColumns:'1fr 130px 110px 100px', alignItems:'center', padding:'12px 20px', borderBottom: i < vehicles.length - 1 ? '1px solid #f1f5f9' : 'none', cursor:'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:'14px', minWidth:0 }}>
                        <div style={{ width:'64px', height:'44px', flexShrink:0, background:'#f1f5f9', border:'1px solid #e8ecf0', overflow:'hidden', borderRadius:'2px' }}>
                          {car.image
                            ? <img src={car.image} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Car size={18} color="#cbd5e1" /></div>
                          }
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:'14px', fontWeight:'700', color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{car.brand}</div>
                          <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'2px' }}>{car.date}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:'15px', fontWeight:'800', color:'#4f46e5', letterSpacing:'-0.3px' }}>{car.price}</div>
                      <div style={{ fontSize:'13px', color:'#64748b' }}>{car.km ? `${Number(car.km).toLocaleString('de-DE')} km` : '—'}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:sc.dot, flexShrink:0 }} />
                        <span style={{ fontSize:'12px', fontWeight:'600', color:sc.color }}>{sc.label}</span>
                      </div>
                    </Link>
                  );
                })}

                <Link href="/dashboard/listing/step1"
                  style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'12px', padding: isMobile ? '12px 16px' : '12px 20px', color:'#6366f1', borderTop:'1px solid #f1f5f9' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafaff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <div style={{ width: isMobile ? '56px' : '64px', height: isMobile ? '40px' : '44px', flexShrink:0, border:'1px dashed #c7d2fe', background:'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'2px' }}>
                    <Plus size={15} color="#6366f1" />
                  </div>
                  <span style={{ fontSize:'14px', fontWeight:'600' }}>Weiteres Inserat erstellen</span>
                  <ArrowRight size={14} style={{ marginLeft:'auto' }} />
                </Link>
              </div>
            )}

            {vehicles.length > 0 && (
              <div style={{ padding: isMobile ? '10px 16px' : '11px 20px', borderTop:'1px solid #f1f5f9', background:'#fafbfc', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'12px', color:'#94a3b8' }}>{total} Inserat{total !== 1 ? 'e' : ''}</span>
                <Link href="/dashboard/gallery" style={{ textDecoration:'none', fontSize:'13px', fontWeight:'700', color:'#6366f1', display:'flex', alignItems:'center', gap:'4px' }}>
                  Alle verwalten <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* ── RECHTE SPALTE (Desktop only) ── */}
          {!isMobile && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ background:'#0f172a', padding:'20px', borderRadius:'4px' }}>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#334155', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'14px' }}>Ablauf</div>
                {[
                  { n:'01', label:'FIN scannen',     sub:'Alle Daten auto.' },
                  { n:'02', label:'Fotos hochladen', sub:'KI-Hintergrund'   },
                  { n:'03', label:'KI-Text',         sub:'In Sekunden'      },
                  { n:'04', label:'Live schalten',   sub:'mobile.de & AS24' },
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:'14px', padding:'9px 0', borderBottom: i < 3 ? '1px solid #1e293b' : 'none' }}>
                    <div style={{ fontSize:'11px', fontWeight:'800', color:'#334155', paddingTop:'2px', flexShrink:0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:'#e2e8f0' }}>{s.label}</div>
                      <div style={{ fontSize:'11px', color:'#475569', marginTop:'1px' }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/listing/step1" style={{ textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', background:'#4f46e5', color:'#fff', padding:'11px', borderRadius:'4px', fontWeight:'700', fontSize:'13px', marginTop:'16px' }}>
                  <Plus size={14} /> Inserat erstellen
                </Link>
              </div>

              <div style={{ background:'#fff', border:'1px solid #e2e8f0', padding:'18px', borderRadius:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'20px' }}>📸</div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'800', color:'#0f172a' }}>Foto-Studio</div>
                    <div style={{ fontSize:'11px', color:'#64748b', marginTop:'1px' }}>KI-Hintergrund in Sekunden</div>
                  </div>
                </div>
                <Link href="/dashboard/backgrounds" style={{ textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', background:'#f8fafc', color:'#0f172a', padding:'9px', borderRadius:'4px', fontWeight:'700', fontSize:'12px', border:'1px solid #e2e8f0' }}>
                  Studio öffnen <ArrowRight size={12} />
                </Link>
              </div>

              <div style={{ background:'#fff', border:'1px solid #e2e8f0', padding:'18px', borderRadius:'4px' }}>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'12px' }}>Export-Ziele</div>
                {[
                  { name:'mobile.de',   color:'#f97316' },
                  { name:'AutoScout24', color:'#3b82f6' },
                  { name:'PDF Export',  color:'#22c55e' },
                ].map((p, i) => (
                  <div key={p.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom: i < 2 ? '1px solid #f8fafc' : 'none' }}>
                    <span style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a' }}>{p.name}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                      <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:p.color }} />
                      <span style={{ fontSize:'11px', color:'#94a3b8' }}>Bereit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── MOBILE SCHNELLZUGRIFF ── */}
        {isMobile && (
          <div style={{ marginTop:'16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Link href="/dashboard/backgrounds" style={{ textDecoration:'none', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ fontSize:'22px' }}>📸</div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Foto-Studio</div>
              <div style={{ fontSize:'11px', color:'#64748b' }}>KI-Hintergrund</div>
            </Link>
            <Link href="/dashboard/pricing" style={{ textDecoration:'none', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'4px', padding:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ fontSize:'22px' }}>💎</div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>Preise & Pläne</div>
              <div style={{ fontSize:'11px', color:'#64748b' }}>Upgrade & Credits</div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
