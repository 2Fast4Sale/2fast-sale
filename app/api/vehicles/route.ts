import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET â€” alle Fahrzeuge des eingeloggten Haendlers
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const { data, error } = await supabase
      .from('vehicles')
      .select(`*, vehicle_images(id, processed_url, original_url, position)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ vehicles: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST â€” neues Fahrzeug anlegen
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json();

    /* Basis-Spalten die immer existieren */
    const BASE_COLS = [
      'brand', 'vin', 'first_registration', 'displacement_ccm', 'power_kw',
      'fuel_type', 'color', 'seats', 'gross_weight_kg', 'km', 'price',
      'dealer_notes', 'description', 'equipment', 'status', 'background_id',
    ];
    /* Neue Spalten aus Migration 004 */
    const NEW_COLS = ['title', 'year', 'gearbox_type'];

    const buildPayload = (cols: string[]) => {
      const obj: Record<string, any> = { user_id: user.id };
      for (const key of cols) {
        if (key === 'equipment') {
          obj.equipment = Array.isArray(body.equipment) ? body.equipment : [];
        } else if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
          obj[key] = body[key];
        }
      }
      return obj;
    };

    /* Erst mit allen Spalten versuchen */
    const fullPayload = buildPayload([...BASE_COLS, ...NEW_COLS]);
    let { data, error } = await supabase.from('vehicles').insert(fullPayload).select().single();

    /* Falls neue Spalten noch nicht migriert sind â€” Fallback ohne sie */
    if (error && (error.message.includes('gearbox_type') || error.message.includes('title') || error.message.includes('year') || error.message.includes('schema cache'))) {
      const basePayload = buildPayload(BASE_COLS);
      const retry = await supabase.from('vehicles').insert(basePayload).select().single();
      data  = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return NextResponse.json({ vehicle: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
