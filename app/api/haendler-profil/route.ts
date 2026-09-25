import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Haendler-Profil speichern.
 *
 * Warum ueber den Server und nicht direkt aus dem Browser: Der direkte
 * Weg lief still ins Leere — der Knopf meldete Erfolg, in der Datenbank
 * stand danach weiterhin `company: null`. Ursache ist eine Zugriffsregel
 * auf der Tabelle, die der Browser nicht umgehen kann.
 *
 * Hier wird zuerst die Sitzung geprueft und NUR die eigene Zeile
 * geschrieben: Die Kennung kommt aus der Sitzung, nie aus der Anfrage.
 */
const ERLAUBT = [
  'full_name', 'company', 'phone', 'website', 'address',
  'ai_style_template', 'ai_title_template', 'default_background',
] as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

    const eingang = await req.json().catch(() => ({}));
    const zeile: Record<string, unknown> = { id: user.id };
    for (const feld of ERLAUBT) {
      if (typeof eingang?.[feld] === 'string') zeile[feld] = eingang[feld];
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'Server ist nicht vollstaendig eingerichtet.' }, { status: 503 });
    }

    const dienst = createServiceClient(url, key);
    const { error } = await dienst.from('profiles').upsert(zeile);
    if (error) {
      console.error('[haendler-profil] Speichern fehlgeschlagen:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* Gegenprobe: zurueckgeben, was wirklich in der Datenbank steht. */
    const { data: gespeichert } = await dienst.from('profiles')
      .select('company, full_name, phone, website, address, default_background')
      .eq('id', user.id).single();

    return NextResponse.json({ ok: true, gespeichert });
  } catch (err) {
    console.error('[haendler-profil] Fehler:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Speichern.' }, { status: 500 });
  }
}

/**
 * Profil laden.
 *
 * Aus demselben Grund wie das Speichern: Sperrt die Zugriffsregel die
 * Tabelle, bekommt der Browser beim Lesen einfach nichts zurueck — die
 * Felder blieben leer, und es sah aus, als waere nichts gespeichert
 * worden.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'Server ist nicht vollstaendig eingerichtet.' }, { status: 503 });
    }

    const dienst = createServiceClient(url, key);
    const { data, error } = await dienst.from('profiles')
      .select('company, full_name, phone, website, address, ai_style_template, ai_title_template, default_background, plan')
      .eq('id', user.id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profil: data ?? null, email: user.email ?? '' });
  } catch (err) {
    console.error('[haendler-profil] Laden fehlgeschlagen:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Laden.' }, { status: 500 });
  }
}
