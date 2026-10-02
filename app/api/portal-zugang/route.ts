import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import {
  zugaengeAnzeigen, zugangSpeichern, zugangLoeschen, zugangLesen,
  pruefungMerken, verschluesselungBereit, PORTAL_NAMEN, type Portal,
} from '../../../lib/portalZugang';

export const dynamic = 'force-dynamic';

/**
 * Zugangsdaten des Händlers für mobile.de und AutoScout24.
 *
 * Die Tabelle portal_zugaenge hat absichtlich keine RLS-Richtlinie —
 * dort liegen fremde Passwörter, und der Browser hat damit nichts zu
 * tun. Alles läuft über diese Route, und sie gibt das Geheimnis NIE
 * zurück: nur, ob eines gesetzt ist.
 */

const istPortal = (w: unknown): w is Portal => w === 'mobile' || w === 'as24';

async function nutzer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await nutzer();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  return NextResponse.json({
    zugaenge: await zugaengeAnzeigen(user.id),
    /*
     * Die Oberfläche soll sagen können, warum Speichern nicht geht,
     * statt einen Fehler erst beim Abschicken zu zeigen.
     */
    bereit: verschluesselungBereit(),
  });
}

export async function POST(req: NextRequest) {
  const user = await nutzer();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  const eingang = await req.json().catch(() => ({}));
  const portal = eingang?.portal;
  if (!istPortal(portal)) {
    return NextResponse.json({ error: 'Unbekanntes Portal.' }, { status: 400 });
  }

  const text = (w: unknown): string | undefined =>
    typeof w === 'string' ? w.trim().slice(0, 200) : undefined;

  const fehler = await zugangSpeichern(user.id, portal, {
    benutzer:    text(eingang.benutzer),
    geheim:      typeof eingang.geheim === 'string' && eingang.geheim ? eingang.geheim.slice(0, 500) : undefined,
    kontoNummer: text(eingang.kontoNummer),
    testmodus:   typeof eingang.testmodus === 'boolean' ? eingang.testmodus : undefined,
  });

  if (fehler) return NextResponse.json({ error: fehler }, { status: 503 });
  return NextResponse.json({ ok: true, zugaenge: await zugaengeAnzeigen(user.id) });
}

export async function DELETE(req: NextRequest) {
  const user = await nutzer();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  const portal = new URL(req.url).searchParams.get('portal');
  if (!istPortal(portal)) {
    return NextResponse.json({ error: 'Unbekanntes Portal.' }, { status: 400 });
  }

  const fehler = await zugangLoeschen(user.id, portal);
  if (fehler) return NextResponse.json({ error: fehler }, { status: 500 });
  return NextResponse.json({ ok: true, zugaenge: await zugaengeAnzeigen(user.id) });
}

/**
 * Zugang prüfen, ohne ein Inserat anzulegen.
 *
 * PUT, weil es den Prüfstand am Zugang ändert. Gefragt wird jeweils
 * etwas Harmloses, das aber Anmeldung UND Kontonummer braucht:
 *
 *   mobile.de    GET /seller-api/sellers/{id}/ads?page.size=1
 *   AutoScout24  GET /customers/{id}/listings?pageSize=1
 *
 * Ein 401 heisst falsches Passwort, ein 403 oder 404 heisst: Anmeldung
 * stimmt, aber die Kontonummer gehört nicht dazu. Diese Unterscheidung
 * ist der halbe Weg zur Lösung, wenn ein Händler anruft.
 */
export async function PUT(req: NextRequest) {
  const user = await nutzer();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  const eingang = await req.json().catch(() => ({}));
  const portal = eingang?.portal;
  if (!istPortal(portal)) {
    return NextResponse.json({ error: 'Unbekanntes Portal.' }, { status: 400 });
  }

  const zugang = await zugangLesen(user.id, portal);
  if (!zugang || !zugang.kontoNummer) {
    return NextResponse.json(
      { error: `Für ${PORTAL_NAMEN[portal]} sind noch keine Zugangsdaten gespeichert.` },
      { status: 409 },
    );
  }
  if (!zugang.geheim) {
    return NextResponse.json(
      { error: 'Das gespeicherte Passwort konnte nicht entschlüsselt werden. Bitte neu eingeben.' },
      { status: 409 },
    );
  }

  const kopf: Record<string, string> = {
    Authorization: 'Basic ' + Buffer.from(`${zugang.benutzer ?? ''}:${zugang.geheim}`).toString('base64'),
  };

  let adresse: string;
  if (portal === 'mobile') {
    const basis = zugang.testmodus
      ? 'https://services.sandbox.mobile.de/seller-api'
      : 'https://services.mobile.de/seller-api';
    adresse = `${basis}/sellers/${encodeURIComponent(zugang.kontoNummer)}/ads?page.size=1`;
    kopf.Accept = 'application/vnd.de.mobile.api+json';
  } else {
    adresse = `https://listing-creation.api.autoscout24.com/customers/${encodeURIComponent(zugang.kontoNummer)}/listings?pageSize=1`;
    kopf.Accept = 'application/json';
    if (zugang.testmodus) kopf['X-Testmode'] = 'true';
  }

  let ok = false;
  let meldung: string;
  try {
    const antwort = await fetch(adresse, { headers: kopf });
    if (antwort.ok) {
      ok = true;
      meldung = `Verbindung steht${zugang.testmodus ? ' (Testmodus)' : ''}.`;
    } else if (antwort.status === 401) {
      meldung = 'Benutzername oder Passwort wurden abgelehnt.';
    } else if (antwort.status === 403) {
      meldung = 'Anmeldung in Ordnung, aber dieser Zugang darf nicht auf die angegebene Kundennummer.';
    } else if (antwort.status === 404) {
      meldung = 'Die Kundennummer ist unter diesem Zugang nicht zu finden.';
    } else {
      meldung = `Das Portal antwortete mit ${antwort.status}.`;
    }
  } catch (err) {
    meldung = 'Das Portal war nicht erreichbar: '
      + (err instanceof Error ? err.message : 'unbekannter Fehler');
  }

  /* Nur eigene Zugänge bekommen einen Prüfstand — meine aus der
     Umgebung stehen nicht in der Tabelle. */
  if (zugang.quelle === 'haendler') {
    await pruefungMerken(user.id, portal, ok, meldung);
  }

  return NextResponse.json({
    ok,
    meldung,
    testmodus: zugang.testmodus,
    quelle: zugang.quelle,
    zugaenge: await zugaengeAnzeigen(user.id),
  });
}
