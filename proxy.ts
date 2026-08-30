import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { bauzaunPruefen, BAUZAUN_KEKS, BAUZAUN_PARAM } from './lib/bauzaun';

// ── Rate Limiter (In-Memory, reicht für Start) ──────────────────────────────
// Key: IP-Adresse → { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/auth':                    { max: 10,  windowMs: 60_000  }, // Login: 10x/min
  '/api/billing':                 { max: 20,  windowMs: 60_000  }, // Billing: 20x/min
  '/api/generate-description':    { max: 30,  windowMs: 60_000  }, // KI: 30x/min
  '/api/pixelcut':                { max: 40,  windowMs: 60_000  }, // Foto-KI: 40x/min
  '/api/inquiries':               { max: 30,  windowMs: 60_000  }, // Anfragen: 30x/min
  '/api/':                        { max: 120, windowMs: 60_000  }, // API allgemein: 120x/min
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string, path: string): boolean {
  // Passendes Limit finden
  const limitKey = Object.keys(LIMITS).find(k => path.startsWith(k)) || null;
  if (!limitKey) return false;

  const { max, windowMs } = LIMITS[limitKey];
  const key = `${ip}:${limitKey}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > max) return true;
  return false;
}

// Alten Store-Einträge gelegentlich bereinigen
let lastCleanup = Date.now();
function cleanupStore() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, val] of rateLimitStore.entries()) {
    if (now > val.resetAt) rateLimitStore.delete(key);
  }
}

// ── Proxy (formerly middleware) ─────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  cleanupStore();

  // Rate Limit nur auf API-Routen
  if (pathname.startsWith('/api/')) {
    const ip = getIp(request);
    if (isRateLimited(ip, pathname)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte warte kurz.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '120',
          },
        }
      );
    }
  }

  /*
   * Bauzaun: Besucher sehen "in Arbeit", du siehst alles.
   *
   * Vor der Sitzungserneuerung, damit ein Fremder nicht bei jedem
   * Aufruf eine Supabase-Anfrage ausloest.
   */
  const zaun = bauzaunPruefen(request);

  if (zaun.keksSetzen) {
    /* Schluessel aus der Adresse nehmen, damit er nicht im Verlauf,
       im Verweis-Kopf oder in einem geteilten Link landet. */
    const sauber = request.nextUrl.clone();
    sauber.searchParams.delete(BAUZAUN_PARAM);
    const antwort = NextResponse.redirect(sauber);
    antwort.cookies.set(BAUZAUN_KEKS, process.env.BAUZAUN_SCHLUESSEL!, {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
    return antwort;
  }

  if (zaun.aktiv && !zaun.durchlassen) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = '/bauzaun';
    ziel.search = '';
    /* Umschreiben statt umleiten: Die Adresse bleibt stehen, damit ein
       spaeterer Aufruf derselben Seite mit Schluessel funktioniert. */
    return NextResponse.rewrite(ziel, { status: 503 });
  }

  // Supabase Session aktuell halten
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
