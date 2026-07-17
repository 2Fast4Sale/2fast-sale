'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText, Tag, Image, Plus, ChevronLeft, ChevronRight,
  Layers, Settings, LogOut, Download, Globe,
  HelpCircle, Zap, Home, Crown, Receipt, Building2, Menu, X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';

const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const W_OPEN   = '260px';
const W_CLOSED = '68px';

const SIDEBAR_BG   = '#ffffff';
const SIDEBAR_BORD = '#e2e8f0';
const ACTIVE_BG    = 'rgba(99,102,241,0.08)';
const ACTIVE_COLOR = '#6366f1';
const IDLE_COLOR   = '#64748b';
const SECTION_COLOR= '#94a3b8';
const MAIN_BG      = '#f0f2f5';

const navSections = [
  {
    label: 'Inserate',
    items: [
      { href: '/dashboard',               label: 'Übersicht',     icon: Home     },
      { href: '/dashboard/listing/step1', label: 'Neues Inserat', icon: FileText },
      { href: '/dashboard/gallery',       label: 'Alle Inserate', icon: Image    },
    ],
  },
  {
    label: 'Studio & Export',
    items: [
      { href: '/dashboard/backgrounds', label: 'Hintergründe', icon: Layers   },
      { href: '/dashboard/export',      label: 'Export',        icon: Download },
    ],
  },
  {
    label: 'Konto',
    items: [
      { href: '/dashboard/settings/dealer',  label: 'Händler-Profil', icon: Building2 },
      { href: '/dashboard/settings/abo',     label: 'Mein Abo',       icon: Crown     },
      { href: '/dashboard/settings/billing', label: 'Abrechnung',     icon: Receipt   },
      { href: '/dashboard/pricing',          label: 'Preise & Pläne', icon: Tag       },
      { href: '/dashboard/settings',         label: 'Einstellungen',  icon: Settings  },
    ],
  },
];

// Bottom nav items for mobile
const bottomNav = [
  { href: '/dashboard',               label: 'Home',     icon: Home     },
  { href: '/dashboard/gallery',       label: 'Inserate', icon: Image    },
  { href: '/dashboard/listing/step1', label: 'Neu',      icon: Plus     },
  { href: '/dashboard/pricing',       label: 'Preise',   icon: Tag      },
  { href: '/dashboard/settings',      label: 'Konto',    icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; company: string; plan: string } | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') router.push('/dashboard/listing/step1');
      if (e.key === 'g' || e.key === 'G') router.push('/dashboard/gallery');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) return;
      const { data } = await supabase.from('profiles').select('full_name, company, plan, onboarding_done').eq('id', u.id).single();
      setUser({
        name:    data?.full_name || u.email?.split('@')[0] || 'Haendler',
        email:   u.email || '',
        company: data?.company || '',
        plan:    data?.plan || 'free',
      });
      localStorage.setItem('dealer_plan',    data?.plan    || 'free');
      localStorage.setItem('dealer_company', data?.company || '');
    });
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const planColors: Record<string, string> = {
    free: '#94a3b8', basic: '#6366f1', premium: '#8b5cf6',
    business: '#f59e0b', enterprise: '#ef4444',
  };
  const planLabels: Record<string, string> = {
    free: 'Free', basic: 'Basic', premium: 'Premium', business: 'Business', enterprise: 'Enterprise',
  };

  const W = collapsed ? W_CLOSED : W_OPEN;

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: MAIN_BG, fontFamily: FONT }}>

        {/* ── MOBILE TOP BAR ── */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '52px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#fff" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>2Fast<span style={{ color: '#6366f1' }}>4</span>Sale</span>
          </Link>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/dashboard/listing/step1" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#4f46e5', color: '#fff', padding: '7px 12px', borderRadius: '4px', fontWeight: '700', fontSize: '12px' }}>
              <Plus size={13} /> Neu
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#64748b', cursor: 'pointer', padding: '7px', display: 'flex', alignItems: 'center' }}>
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {/* ── MOBILE SLIDE-DOWN MENU ── */}
        {mobileMenuOpen && (
          <div style={{ position: 'fixed', top: '52px', left: 0, right: 0, zIndex: 190, background: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 'calc(100vh - 52px - 56px)', overflowY: 'auto' }}>
            {navSections.map(section => (
              <div key={section.label}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SECTION_COLOR, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '12px 16px 4px' }}>{section.label}</div>
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: active ? ACTIVE_BG : 'transparent', color: active ? ACTIVE_COLOR : '#475569' }}>
                        <Icon size={17} />
                        <span style={{ fontSize: '14px', fontWeight: active ? '600' : '500' }}>{label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
              {user && (
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                  <strong style={{ color: '#0f172a' }}>{user.name}</strong>
                  {user.company && <span> · {user.company}</span>}
                  <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '700', color: planColors[user.plan] || '#6366f1', background: `${planColors[user.plan] || '#6366f1'}18`, padding: '1px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>{planLabels[user.plan] || user.plan}</span>
                </div>
              )}
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '10px 16px', fontSize: '13px', fontFamily: FONT, fontWeight: '500', width: '100%' }}>
                <LogOut size={15} /> Abmelden
              </button>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, marginTop: '52px', marginBottom: '56px', minHeight: 'calc(100vh - 108px)', backgroundColor: MAIN_BG, overflowX: 'hidden' }}>
          {children}
        </main>

        {/* ── BOTTOM NAV ── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, height: '56px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            const isNew = href === '/dashboard/listing/step1';
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: isNew ? '#4f46e5' : active ? ACTIVE_COLOR : IDLE_COLOR }}>
                {isNew ? (
                  <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-8px', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                    <Icon size={17} color="#fff" />
                  </div>
                ) : (
                  <Icon size={20} />
                )}
                <span style={{ fontSize: '10px', fontWeight: active || isNew ? '700' : '500', marginTop: isNew ? '2px' : '0' }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ──
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: MAIN_BG, fontFamily: FONT }}>

      <aside style={{
        width: W, minHeight: '100vh', backgroundColor: SIDEBAR_BG,
        borderRight: `1px solid ${SIDEBAR_BORD}`, boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.22s ease',
        overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
      }}>

        <div style={{ padding: '0 16px', height: '64px', borderBottom: `1px solid ${SIDEBAR_BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {!collapsed && (
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                <Zap size={16} color="#fff" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.6px', whiteSpace: 'nowrap' }}>
                2Fast<span style={{ color: '#6366f1' }}>4</span>Sale
              </span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', color: '#64748b', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: collapsed ? 'auto' : '0', transition: 'all 0.15s' }}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <div style={{ padding: '14px 12px 8px' }}>
          <Link href="/dashboard/listing/step1" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '4px', padding: collapsed ? '11px' : '11px 16px', justifyContent: collapsed ? 'center' : 'flex-start', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.15s' }}>
              <Plus size={16} color="#fff" style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>Neues Inserat</span>}
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {navSections.map((section) => (
            <div key={section.label} style={{ marginBottom: '6px' }}>
              {!collapsed && (
                <div style={{ fontSize: '11px', fontWeight: '700', color: SECTION_COLOR, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '12px 12px 6px' }}>
                  {section.label}
                </div>
              )}
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                return (
                  <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: collapsed ? '11px 0' : '9px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: '4px', marginBottom: '2px', backgroundColor: active ? ACTIVE_BG : 'transparent', color: active ? ACTIVE_COLOR : IDLE_COLOR, transition: 'all 0.14s', cursor: 'pointer' }}>
                      <div style={{ color: active ? '#6366f1' : IDLE_COLOR, display: 'flex', alignItems: 'center' }}>
                        <Icon size={17} style={{ flexShrink: 0 }} />
                      </div>
                      {!collapsed && <span style={{ fontSize: '13px', fontWeight: active ? '600' : '500', whiteSpace: 'nowrap', color: active ? '#6366f1' : '#475569' }}>{label}</span>}
                      {!collapsed && active && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '6px', background: '#6366f1' }} />}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}

          {!collapsed && (
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px solid ${SIDEBAR_BORD}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: SECTION_COLOR, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '6px 12px 6px' }}>Extern</div>
              {[
                { href: '/',         label: 'Homepage',  icon: Globe      },
                { href: '/features', label: 'Features',  icon: Zap        },
                { href: '/kontakt',  label: 'Support',   icon: HelpCircle },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', borderRadius: '4px', color: '#94a3b8', marginBottom: '1px' }}>
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: '400', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div style={{ padding: '10px 10px 12px', borderTop: `1px solid ${SIDEBAR_BORD}`, flexShrink: 0 }}>
          {!collapsed && user && (
            <div style={{ padding: '10px 12px', marginBottom: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{user.name}</div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: planColors[user.plan] || '#6366f1', background: `${planColors[user.plan] || '#6366f1'}18`, border: `1px solid ${planColors[user.plan] || '#6366f1'}30`, padding: '1px 7px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                  {planLabels[user.plan] || user.plan}
                </span>
              </div>
              {user.company && <div style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.company}</div>}
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '11px' : '9px 14px', justifyContent: collapsed ? 'center' : 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', transition: 'all 0.14s', fontSize: '13px', fontFamily: FONT, fontWeight: '500' }}>
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minHeight: '100vh', overflow: 'auto', backgroundColor: MAIN_BG }}>
        {children}
      </main>
    </div>
  );
}
