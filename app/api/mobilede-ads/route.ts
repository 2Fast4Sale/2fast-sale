import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { zugangLesen } from '../../../lib/portalZugang';

export const dynamic = 'force-dynamic';

/**
 * Nachlesen, was bei mobile.de wirklich im Konto steht.
 *
 * ── Warum es diese Route gibt ────────────────────────────────────────
 *
 * Das erste Testinserat ging durch (Nummer 48569658647072), und dann
 * führte der Knopf "Im Händlerportal ansehen" auf portal.mobile.de —
 * also ins Produktivportal, das ein Sandbox-Inserat nicht kennt. Antwort:
 * "Zugriff verweigert, Error 403". Der Link ist entfernt, aber damit war
 * das Inserat nirgends nachprüfbar: Man hatte eine Nummer und musste
 * glauben, dass dahinter etwas Richtiges steht.
 *
 * Genau das ist der Punkt, an dem ein Fehler ungesehen bleibt. Ein
 * Inserat, das mobile.de ANNIMMT, kann immer noch falsche Angaben
 * enthalten — eine Marke, die wie Unsinn aussieht, einen Preis ohne
 * Mehrwertsteuerangabe, drei statt zwölf Fotos. Deshalb liest diese
 * Route zurück, was dort gespeichert ist, mit den Zugangsdaten des
 * Händlers und nur aus seinem eigenen Konto.
 *
 *   GET /api/mobilede-ads          → die letzten Inserate im Konto
 *   GET /api/mobilede-ads?id=…     → ein bestimmtes Inserat
 */

/** Was wir aus der Antwort zeigen — nicht das ganze rohe Inserat. */
interface Zeile {
  id: string;
  marke?: string;
  modell?: string;
  bezeichnung?: string;
  preis?: string;
  km?: string;
  erstzulassung?: string;
  bilder?: number;
  zustand?: string;
  kategorie?: string;
  getriebe?: string;
  kraftstoff?: string;
  leistungKw?: string;
  verbrauch?: string;
  co2?: string;
}

/** Zieht die Felder heraus, die man zum Prüfen braucht. */
function zeileAus(rohes: Record<string, unknown>): Zeile {
  const text = (w: unknown): string | undefined => {
    if (w == null) return undefined;
    if (typeof w === 'string' || typeof w === 'number') return String(w);
    /*
     * mobile.de verschachtelt vieles: price ist ein Objekt mit
     * consumerPriceGross, category eine Liste mit local/value. Hier wird
     * nur so tief gegraben, wie es für eine Prüfzeile nötig ist.
     */
    const o = w as Record<string, unknown>;
    const kandidat = [o.consumerPriceGross, o.value, o.local, o.amount, o.key]
      .find(k => typeof k === 'string' || typeof k === 'number');
    return kandidat != null ? String(kandidat) : undefined;
  };

  const bilder = Array.isArray(rohes.images) ? rohes.images.length : undefined;

  return {
    id: text(rohes.mobileAdId) || text(rohes.adKey) || text(rohes.id) || '',
    marke: text(rohes.make),
    modell: text(rohes.model),
    bezeichnung: text(rohes.modelDescription),
    preis: text(rohes.price),
    km: text(rohes.mileage),
    erstzulassung: text(rohes.firstRegistration),
    bilder,
    zustand: text(rohes.condition),
    kategorie: text(rohes.category),
    getriebe: text(rohes.gearbox),
    kraftstoff: text(rohes.fuel),
    leistungKw: text(rohes.power),
    verbrauch: text(rohes.consumptionCombined),
    co2: text(rohes.co2Emission),
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  const zugang = await zugangLesen(user.id, 'mobile');
  if (!zugang?.geheim || !zugang.kontoNummer) {
    return NextResponse.json(
      { error: 'Für mobile.de sind keine Zugangsdaten gespeichert.' },
      { status: 409 },
    );
  }

  const basis = zugang.testmodus
    ? 'https://services.sandbox.mobile.de/seller-api'
    : 'https://services.mobile.de/seller-api';

  const kopf = {
    Authorization: 'Basic ' + Buffer.from(`${zugang.benutzer ?? ''}:${zugang.geheim}`).toString('base64'),
    Accept: 'application/vnd.de.mobile.api+json',
  };

  const id = new URL(req.url).searchParams.get('id');
  const adresse = id
    ? `${basis}/sellers/${encodeURIComponent(zugang.kontoNummer)}/ads/${encodeURIComponent(id)}`
    : `${basis}/sellers/${encodeURIComponent(zugang.kontoNummer)}/ads?page.size=10`;

  try {
    const antwort = await fetch(adresse, { headers: kopf });
    const text = await antwort.text();
    let koerper: unknown;
    try { koerper = JSON.parse(text); } catch { koerper = text; }

    if (!antwort.ok) {
      return NextResponse.json(
        {
          error: antwort.status === 404
            ? 'Dieses Inserat liegt nicht in diesem Konto.'
            : `mobile.de antwortete mit ${antwort.status}.`,
          details: koerper,
        },
        { status: antwort.status },
      );
    }

    const d = koerper as Record<string, unknown>;
    const liste = Array.isArray(d?.ads) ? d.ads as Record<string, unknown>[] : null;

    return NextResponse.json({
      testmodus: zugang.testmodus,
      inserate: liste ? liste.map(zeileAus) : [zeileAus(d)],
      /*
       * Das rohe Inserat nur bei einer Einzelabfrage: Bei zehn Anzeigen
       * wären das hunderte Zeilen, und gebraucht wird es nur, wenn eine
       * Angabe strittig ist.
       */
      roh: id ? koerper : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'mobile.de war nicht erreichbar: ' + (err instanceof Error ? err.message : 'unbekannt') },
      { status: 502 },
    );
  }
}
