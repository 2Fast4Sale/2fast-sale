import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { berechneInserat } from '../../../lib/usageBilling';
import { guthabenPruefen } from '../../../lib/emailAusloeser';

export const dynamic = 'force-dynamic';

// GET — alle Fahrzeuge des eingeloggten Haendlers
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

// POST — neues Fahrzeug anlegen
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    /*
     * Credit-Pruefung gehoert hierher, nicht ins Formular.
     * Die Schritte 2-4 beziehen ihre Daten aus der URL — wer sie direkt
     * aufruft, umgeht jede Pruefung im Frontend. Das ist der Punkt, an dem
     * das Inserat tatsaechlich entsteht.
     */
    const { data: darfAnlegen, error: creditError } = await supabase
      .rpc('consume_listing_credit', { uid: user.id });

    if (creditError) {
      // Migration 015 noch nicht eingespielt: nicht blockieren, aber laut sein.
      console.error('[vehicles] Credit-Pruefung fehlgeschlagen:', creditError.message);
    } else if (darfAnlegen === false) {
      return NextResponse.json(
        { error: 'Keine Inserat-Credits vorhanden', code: 'no_credits' },
        { status: 402 }
      );
    }

    const body = await req.json();

    /* Basis-Spalten die immer existieren */
    const BASE_COLS = [
      'brand', 'vin', 'first_registration', 'displacement_ccm', 'power_kw',
      'fuel_type', 'color', 'seats', 'gross_weight_kg', 'km', 'price',
      'dealer_notes', 'description', 'equipment', 'status', 'background_id',
    ];
    /* Neue Spalten aus Migration 004 */
    const NEW_COLS = ['title', 'year', 'gearbox_type'];
    /*
     * Pflichtfelder von mobile.de aus Migration 022.
     *
     * Eigene Gruppe, weil die Route bei fehlenden Spalten stufenweise
     * zurueckfaellt: Wer die Migration noch nicht eingespielt hat, legt
     * das Inserat trotzdem an — nur ohne diese Angaben.
     */
    const MOBILE_COLS = [
      'body_type', 'vat_type', 'damaged', 'metallic', 'warranty',
      // Migration 023
      'hu_until', 'previous_owners', 'interior_type', 'interior_color',
      'doors', 'emission_class', 'drive_type',
    ];
    /* Pkw-EnVKV Spalten aus Migration 012 */
    const ENVKV_COLS = [
      'vehicle_kind', 'consumption_combined', 'power_consumption_combined',
      'co2_combined', 'co2_combined_discharged', 'electric_range_km',
    ];

    const buildPayload = (cols: string[]) => {
      const obj: Record<string, any> = { user_id: user.id };
      for (const key of cols) {
        if (key === 'equipment') {
          obj.equipment = Array.isArray(body.equipment) ? body.equipment : [];
        } else if (typeof body[key] === 'boolean') {
          // Ausdruecklich vor der naechsten Pruefung: Die verwirft leere
          // Werte, und false zaehlt dort faelschlich als leer. "Unfallfrei"
          // waere sonst nie gespeichert worden.
          obj[key] = body[key];
        } else if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
          obj[key] = body[key];
        }
      }
      return obj;
    };

    /* Erst mit allen Spalten versuchen */
    const fullPayload = buildPayload([...BASE_COLS, ...NEW_COLS, ...ENVKV_COLS, ...MOBILE_COLS]);
    let { data, error } = await supabase.from('vehicles').insert(fullPayload).select().single();

    /* Falls die EnVKV-Spalten (Migration 012) noch fehlen - ohne sie erneut versuchen */
    /* Fehlt Migration 022, ohne die mobile.de-Spalten erneut versuchen. */
    if (error && MOBILE_COLS.some(c => error!.message.includes(c))) {
      const retry = await supabase.from('vehicles')
        .insert(buildPayload([...BASE_COLS, ...NEW_COLS, ...ENVKV_COLS])).select().single();
      data  = retry.data;
      error = retry.error;
    }

    if (error && ENVKV_COLS.some(c => error!.message.includes(c))) {
      const retry = await supabase.from('vehicles')
        .insert(buildPayload([...BASE_COLS, ...NEW_COLS])).select().single();
      data  = retry.data;
      error = retry.error;
    }

    /* Falls neue Spalten noch nicht migriert sind — Fallback ohne sie */
    if (error && (error.message.includes('gearbox_type') || error.message.includes('title') || error.message.includes('year') || error.message.includes('schema cache'))) {
      const basePayload = buildPayload(BASE_COLS);
      const retry = await supabase.from('vehicles').insert(basePayload).select().single();
      data  = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    /*
     * Erst jetzt berechnen — nie ein Inserat abrechnen, das gar nicht entstanden
     * ist. Umgekehrt darf ein Abrechnungsfehler das Inserat nicht kippen:
     * berechneInserat wirft nicht, sondern haelt den Posten in der Datenbank
     * fest, damit nichts verloren geht.
     */
    if (data?.id) {
      /*
       * Kosten aus den Schritten 1 bis 3 diesem Fahrzeug zuordnen.
       *
       * Sie sind entstanden, bevor es das Fahrzeug gab — Scan,
       * Ausstattungserkennung, Freistellungen und Beschreibung laufen
       * alle vorher. Ohne diesen Schritt bleibt api_costs.vehicle_id
       * leer und man sieht nie, welches Inserat teuer war.
       *
       * Fehler hier duerfen das Inserat nicht kippen: Der Haendler hat
       * sein Fahrzeug, die Zuordnung ist Buchhaltung.
       */
      if (body.draft_id) {
        const { error: zuordnungsFehler } = await supabase.rpc('kosten_zuordnen', {
          p_draft_id:   body.draft_id,
          p_vehicle_id: data.id,
          p_user_id:    user.id,
        });
        if (zuordnungsFehler) {
          console.error('[vehicles] Kostenzuordnung fehlgeschlagen:', zuordnungsFehler.message);
        }
      }

      await berechneInserat({
        userId:       user.id,
        vehicleId:    data.id,
        bezeichnung:  [body.brand, body.title].find(Boolean) as string | undefined,
        studioImages: Number(body.studio_images ?? 0),
      });

      /*
       * Guthaben-Hinweis, wenn es knapp wird. Nach dem Anlegen und nicht
       * davor, damit der Rest-Stand stimmt, den die Mail nennt.
       */
      if (user.email) {
        await guthabenPruefen(user.id, user.email);
      }
    }

    return NextResponse.json({ vehicle: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
