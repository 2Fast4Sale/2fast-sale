import type { NextRequest } from 'next/server';

/**
 * Der Bauzaun: Besucher sehen "in Arbeit", du siehst alles.
 *
 * Die Seite verspricht Dinge, die noch nicht laufen — Studio-Bilder
 * ohne Wasserzeichen, Direktexport zu den Portalen, bezahlbare Pakete.
 * Bis das stimmt, soll niemand versehentlich darauf stossen und einen
 * falschen Eindruck mitnehmen.
 *
 * WICHTIG: Das ist ein Vorhang, kein Schloss.
 *
 * Wer die Adresse einer Unterseite kennt und den Schluessel hat, kommt
 * durch — mehr soll es auch nicht leisten. Die echten Grenzen liegen
 * woanders: /dashboard haengt an der Anmeldung, die APIs an ihren
 * eigenen Pruefungen. Der Bauzaun verhindert nur, dass ein
 * Zufallsbesucher ein halbfertiges Produkt fuer das fertige haelt.
 *
 * AUS, solange BAUZAUN_SCHLUESSEL nicht gesetzt ist. Bewusst so
 * herum: Eine vergessene Umgebungsvariable soll die Seite nicht
 * unerreichbar machen.
 */

/** Diese Pfade bleiben IMMER offen. */
const IMMER_OFFEN = [
  /*
   * Rechtlich: Impressum und Datenschutzerklaerung muessen erreichbar
   * sein, ohne dass jemand einen Schluessel braucht. Die AGB und der
   * Kuendigungsknopf nach § 312k gehoeren dazu — ein Kunde, der
   * kuendigen will, darf nicht vor einem Bauzaun stehen.
   */
  '/impressum',
  '/datenschutz',
  '/agb',
  '/kuendigung',
  /* Damit du dich ueberhaupt anmelden kannst. */
  '/auth',
  /*
   * Die Anwendung selbst. Ohne das laedt hinter dem Zaun nichts mehr,
   * und die Trockenlaeufe der Portal-Routen waeren auch zu.
   */
  '/api',
];

/** Name des Kekses, der dich durchlaesst. */
export const BAUZAUN_KEKS = 'bauzaun';

/** Anhang an der Adresse, der den Keks setzt: ?bauzaun=<schluessel> */
export const BAUZAUN_PARAM = 'bauzaun';

export interface BauzaunEntscheidung {
  /** Steht der Zaun ueberhaupt? */
  aktiv: boolean;
  /** Darf dieser Aufruf durch? */
  durchlassen: boolean;
  /** Schluessel kam als Adressanhang — Keks setzen und sauber umleiten. */
  keksSetzen: boolean;
}

export function bauzaunPruefen(request: NextRequest): BauzaunEntscheidung {
  const schluessel = process.env.BAUZAUN_SCHLUESSEL;
  if (!schluessel) return { aktiv: false, durchlassen: true, keksSetzen: false };

  const { pathname, searchParams } = request.nextUrl;

  if (IMMER_OFFEN.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return { aktiv: true, durchlassen: true, keksSetzen: false };
  }

  /* Schluessel in der Adresse: einmal eintippen, danach nie wieder. */
  if (searchParams.get(BAUZAUN_PARAM) === schluessel) {
    return { aktiv: true, durchlassen: true, keksSetzen: true };
  }

  if (request.cookies.get(BAUZAUN_KEKS)?.value === schluessel) {
    return { aktiv: true, durchlassen: true, keksSetzen: false };
  }

  /*
   * Angemeldete Nutzer duerfen ebenfalls durch.
   *
   * Geprueft wird nur, OB ein Supabase-Sitzungskeks da ist, nicht ob
   * er gueltig ist. Fuer einen Vorhang genuegt das: Wer einen
   * abgelaufenen Keks mitbringt, sieht die Seite und faellt an der
   * naechsten echten Pruefung durch. Die Sitzung hier zu pruefen
   * hiesse, sie in jedem Aufruf zu erneuern — teuer fuer nichts.
   */
  const angemeldet = request.cookies.getAll()
    .some(k => k.name.startsWith('sb-') && k.name.includes('auth-token'));
  if (angemeldet) return { aktiv: true, durchlassen: true, keksSetzen: false };

  return { aktiv: true, durchlassen: false, keksSetzen: false };
}
