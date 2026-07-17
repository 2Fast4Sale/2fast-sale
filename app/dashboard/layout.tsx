'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText, Tag, Image, Plus, ChevronLeft, ChevronRight,
  Layers, Settings, LogOut, Download, Globe,
  HelpCircle, Zap, Home, Crown, Receipt, Building2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';

const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

/* Sidebar breiter: 260px expanded, 68px collapsed */
const W_OPEN     = '260px';
const W_CLOSED   = '68px';

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; company: string; plan: string } | null>(null);

  // Tastenkuerzel: N = Neues Inserat, G = Galerie, S = Einstellungen
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const planColors: Record<string, string> = {
    free:       '#94a3b8',
    basic:      '#6366f1',
    premium:    '#8b5cf6',
    business:   '#f59e0b',
    enterprise: '#ef4444',
  };
  const planLabels: Record<string, string> = {
    free: 'Free', basic: 'Basic', premium: 'Premium', business: 'Business', enterprise: 'Enterprise',
  };

  const W = collapsed ? W_CLOSED : W_OPEN;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: MAIN_BG, fontFamily: FONT }}>

      {/* -------- SIDEBAR -------- */}
      <aside style={{
        width: W,
        minHeight: '100vh',
        backgroundColor: SIDEBAR_BG,
        borderRight: `1px solid ${SIDEBAR_BORD}`,
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s ease',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>

        {/* -- Logo -- */}
        <div style={{
          padding: '0 16px', height: '64px',
          borderBottom: `1px solid ${SIDEBAR_BORD}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
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
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '4px', color: '#64748b',
              cursor: 'pointer', padding: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginLeft: collapsed ? 'auto' : '0',
              transition: 'all 0.15s',
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* -- Neues Inserat CTA -- */}
        <div style={{ padding: '14px 12px 8px' }}>
          <Link href="/dashboard/listing/step1" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '4px',
              padding: collapsed ? '11px' : '11px 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              transition: 'all 0.15s',
            }}>
              <Plus size={16} color="#fff" style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
                  Neues Inserat
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* -- Navigation -- */}
        <nav style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {navSections.map((section) => (
            <div key={section.label} style={{ marginBottom: '6px' }}>
              {!collapsed && (
                <div style={{
                  fontSize: '11px', fontWeight: '700', color: SECTION_COLOR,
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  padding: '12px 12px 6px',
                }}>
                  {section.label}
                </div>
              )}
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                return (
                  <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: collapsed ? '11px 0' : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: '4px', marginBottom: '2px',
                      backgroundColor: active ? ACTIVE_BG : 'transparent',
                      color: active ? ACTIVE_COLOR : IDLE_COLOR,
                      transition: 'all 0.14s', cursor: 'pointer',
                      boxShadow: 'none',
                    }}>
                      <div style={{ color: active ? '#6366f1' : IDLE_COLOR, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
                        <Icon size={17} style={{ flexShrink: 0 }} />
                      </div>
                      {!collapsed && (
                        <span style={{ fontSize: '13px', fontWeight: active ? '600' : '500', whiteSpace: 'nowrap', color: active ? '#6366f1' : '#475569' }}>
                          {label}
                        </span>
                      )}
                      {!collapsed && active && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '6px', background: '#6366f1' }} />}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Externe Links */}
          {!collapsed && (
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px solid ${SIDEBAR_BORD}` }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: SECTION_COLOR, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '6px 12px 6px' }}>
                Extern
              </div>
              {[
                { href: '/',         label: 'Homepage',  icon: Globe      },
                { href: '/features', label: 'Features',  icon: Zap        },
                { href: '/kontakt',  label: 'Support',   icon: HelpCircle },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '7px 12px', borderRadius: '4px',
                    color: '#94a3b8', transition: 'color 0.14s', marginBottom: '1px',
                  }}>
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: '400', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* -- User Card + Logout -- */}
        <div style={{ padding: '10px 10px 12px', borderTop: `1px solid ${SIDEBAR_BORD}`, flexShrink: 0 }}>
          {!collapsed && user && (
            <div style={{
              padding: '10px 12px', marginBottom: '8px',
              backgroundColor: '#f8fafc',
              borderRadius: '4px', border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                  {user.name}
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: '700',
                  color: planColors[user.plan] || '#6366f1',
                  background: `${planColors[user.plan] || '#6366f1'}18`,
                  border: `1px solid ${planColors[user.plan] || '#6366f1'}30`,
                  padding: '1px 7px', borderRadius: '4px',
                  textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  {planLabels[user.plan] || user.plan}
                </span>
              </div>
              {user.company && (
                <div style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.company}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: collapsed ? '11px' : '9px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '4px', color: '#ef4444',
              cursor: 'pointer', transition: 'all 0.14s',
              fontSize: '13px', fontFamily: FONT, fontWeight: '500',
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      {/* -------- MAIN CONTENT -------- */}
      <main style={{ flex: 1, minHeight: '100vh', overflow: 'auto', backgroundColor: MAIN_BG }}>
        {children}
      </main>
    </div>
  );
}






