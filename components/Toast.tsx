'use client';

import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: <CheckCircle2 size={17} />,
  error:   <XCircle size={17} />,
  info:    <Info size={17} />,
  warning: <AlertTriangle size={17} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#0d2a1f', border: 'rgba(16,185,129,0.35)',  text: '#6ee7b7', icon: '#10b981' },
  error:   { bg: '#2a0d0d', border: 'rgba(239,68,68,0.35)',   text: '#fca5a5', icon: '#ef4444' },
  info:    { bg: '#0d1a2e', border: 'rgba(59,130,246,0.35)',  text: '#93c5fd', icon: '#3b82f6' },
  warning: { bg: '#2a1d0d', border: 'rgba(245,158,11,0.35)',  text: '#fcd34d', icon: '#f59e0b' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const remove = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p.slice(-4), { id, message, type }]);
    timers.current[id] = setTimeout(() => remove(id), 3800);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ── Toast Container ── */}
      <div style={{
        position: 'fixed', bottom: '28px', right: '28px',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '10px',
                padding: '13px 16px',
                minWidth: '280px', maxWidth: '400px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                pointerEvents: 'auto',
                animation: 'toastIn 0.25s ease',
                fontFamily: '"DM Sans",-apple-system,sans-serif',
              }}
            >
              <span style={{ color: c.icon, flexShrink: 0 }}>{ICONS[t.type]}</span>
              <span style={{ fontSize: '15px', color: c.text, fontWeight: '500', flex: 1, lineHeight: 1.4 }}>
                {t.message}
              </span>
              <button
                onClick={() => remove(t.id)}
                style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', opacity: 0.6, padding: '2px', display: 'flex', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
