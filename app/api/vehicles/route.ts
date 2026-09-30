import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { berechneInserat } from '../../../lib/usageBilling';
import { guthabenPruefen } from '../../../lib/emailAusloeser';
import {
  fahrzeugFelder, BASIS_SPALTEN, NEUE_SPALTEN, MOBILE_SPALTEN, ENVKV_SPALTEN,
} from '../../../lib/vehicleColumns';

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
    /*
     * Hier nur PRUEFEN. Abgebucht wird erst, wenn das Fahrzeug wirklich
     * in der Datenbank steht.
     *
     * Vorher stand an dieser Stelle consume_listing_credit — der Credit
     * war also weg, sobald die Anfrage ankam. Schlug das Insert danach
     * fehl (fehlende Spalte, Netzfehler, RLS), hatte der Haendler kein
     * Inserat und trotzdem einen Credit weniger. Bei einem Gratis-Konto
     * mit genau einem Credit heisst das: nie wieder ein Inserat.
     */
    const { data: profil, error: profilFehler } = await supabase
      .from('profiles')
      .select('plan, listing_credits')
      .eq('id', user.id)
      .single();

    if (profilFehler) {
      // Kein Profil lesbar: nicht blockieren, aber laut sein.
      console.error('[vehicles] Profil nicht lesbar:', profilFehler.message);
    } else if ((profil?.plan || 'free') === 'free' && (profil?.listing_credits ?? 0) < 1) {
      return NextResponse.json(
        { error: 'Keine Inserat-Credits vorhanden', code: 'no_credits' },
        { status: 402 }
      );
    }

    const body = await req.json();

    /*
     * Spaltenlisten und das Aussieben stehen in lib/vehicleColumns.ts.
     *
     * Sie standen hier — und NUR hier. Die PATCH-Route hatte keine und
     * schrieb den Korb aus Schritt 4 unveraendert in die Tabelle, samt
     * studio_images und draft_id, die keine Spalten sind.
     */
    const buildPayload = (cols: readonly string[]) => ({
      user_id: user.id,
      ...fahrzeugFelder(body as Record<string, unknown>, cols),
      // equipment soll auch dann gesetzt sein, wenn keines mitkam:
      // die Spalte ist ein Array, null waere etwas anderes als leer.
      equipment: Array.isArray(body.equipment) ? body.equipment : [],
    });

    const BASE_COLS   = BASIS_SPALTEN;
    const NEW_COLS    = NEUE_SPALTEN;
    const MOBILE_COLS = MOBILE_SPALTEN;
    const ENVKV_COLS  = ENVKV_SPALTEN;

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
       * Jetzt abbuchen — das Fahrzeug steht. consume_listing_credit
       * prueft und zieht in einem Schritt; sagt es hier nein, ist in der
       * Zwischenzeit ein zweites Inserat durchgelaufen. Dann bleibt
       * dieses Inserat trotzdem stehen: es ist angelegt, und dem
       * Haendler ein fertiges Inserat wieder wegzunehmen waere
       * schlimmer als ein Credit zu viel.
       */
      const { data: abgebucht, error: abbuchFehler } = await supabase
        .rpc('consume_listing_credit', { uid: user.id });
      if (abbuchFehler) {
        console.error('[vehicles] Credit-Abbuchung fehlgeschlagen:', abbuchFehler.message);
      } else if (abgebucht === false) {
        console.warn('[vehicles] Inserat angelegt, aber kein Credit mehr vorhanden:', data.id);
      }

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
