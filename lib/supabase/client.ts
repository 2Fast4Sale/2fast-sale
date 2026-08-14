import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase-Client für den Browser — bewusst als einzelne Instanz.
 *
 * Warum das wichtig ist: Jeder Aufruf von createBrowserClient erzeugt einen
 * eigenen Client mit eigenem Token-Refresh. Läuft das Zugriffstoken ab und
 * mehrere Instanzen erneuern gleichzeitig, wird derselbe Refresh-Token
 * mehrfach eingelöst. Supabase wertet das als möglichen Token-Diebstahl und
 * widerruft die gesamte Sitzung — der Nutzer fliegt raus und muss sich neu
 * anmelden.
 *
 * Auf dem Handy passiert das häufiger, weil die langsamere Verbindung das
 * Zeitfenster für so ein Rennen vergrößert.
 *
 * Einige Seiten rufen createClient() mehrfach auf. Durch den zwischen-
 * gespeicherten Client bekommen alle dieselbe Instanz, und es gibt nur noch
 * einen Refresh-Vorgang.
 */
/*
 * Ueber diese Hilfsfunktion, damit TypeScript den konkreten Client-Typ
 * ableiten kann. Ein direktes ReturnType<typeof createBrowserClient> loest
 * die Generics auf und verliert dabei die Typinformation — Aufrufer bekommen
 * dann implizites any.
 */
function neuerClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type BrowserClient = ReturnType<typeof neuerClient>;

let browserClient: BrowserClient | null = null;

export function createClient(): BrowserClient {
  // Auf dem Server (z.B. beim Vorrendern) nie zwischenspeichern — sonst
  // teilen sich verschiedene Anfragen denselben Client.
  if (typeof window === 'undefined') return neuerClient();

  if (!browserClient) browserClient = neuerClient();
  return browserClient;
}
