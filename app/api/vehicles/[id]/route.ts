import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import {
  fahrzeugFelder, BASIS_SPALTEN, NEUE_SPALTEN, MOBILE_SPALTEN, ENVKV_SPALTEN,
} from '../../../../lib/vehicleColumns';

export const dynamic = 'force-dynamic';

// PATCH � Fahrzeug aktualisieren
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    /*
     * Nur echte Spalten, und nur die erlaubten.
     *
     * Vorher ging der Korb aus Schritt 4 unveraendert in die Tabelle. Darin
     * stecken studio_images und draft_id, die keine Spalten von vehicles
     * sind — jedes zweite Speichern desselben Inserats scheiterte deshalb
     * mit "Could not find the 'draft_id' column of 'vehicles'". Und ein
     * mitgeschicktes user_id haette das Fahrzeug in ein fremdes Konto
     * verschoben.
     */
    const felder = fahrzeugFelder(body as Record<string, unknown>);
    if (Object.keys(felder).length === 0) {
      return NextResponse.json({ error: 'Keine Angaben zum Speichern' }, { status: 400 });
    }

    let { data, error } = await supabase
      .from('vehicles')
      .update(felder)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    /*
     * Stufenweise zurueckfallen wie beim Anlegen: Wer eine der spaeteren
     * Migrationen noch nicht eingespielt hat, soll speichern koennen — nur
     * ohne diese Angaben. Sonst schlaegt jedes Speichern fehl.
     */
    if (error && [...MOBILE_SPALTEN, ...ENVKV_SPALTEN].some(c => error!.message.includes(c))) {
      const wenigerFelder = fahrzeugFelder(body as Record<string, unknown>,
        [...BASIS_SPALTEN, ...NEUE_SPALTEN]);
      const zweiterVersuch = await supabase
        .from('vehicles')
        .update(wenigerFelder)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      data  = zweiterVersuch.data;
      error = zweiterVersuch.error;
    }

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    return NextResponse.json({ vehicle: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE � Fahrzeug l�schen
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
