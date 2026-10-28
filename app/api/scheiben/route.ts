import { NextRequest, NextResponse } from 'next/server';
import { scheibenSaeubern, scheibenGrund } from '../../../lib/studio/scheibenSaeubern';
import { logApiCost, imageCostMicros, currentUserId } from '../../../lib/apiCosts';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Innenraumfoto: weichzeichnen, was durch die Scheiben zu sehen ist.
 *
 * Eigene Route und kein Teil von /api/studio-eigen/verarbeiten, weil
 * es eine andere Aufgabe an einer anderen Sorte Foto ist: Hier wird
 * nichts freigestellt, nichts in eine Halle gesetzt und nichts
 * beschattet. Das Foto bleibt, wo es ist; nur der Blick nach draussen
 * wird unscharf.
 *
 * Kostet eine Gemini-Anfrage je Foto. Deshalb laeuft sie nur auf
 * ausdruecklichen Knopfdruck am einzelnen Bild und nicht ueber den
 * ganzen Stapel.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  try {
    const { image, draftId } = await req.json();
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });
    }

    const roh = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const gebucht = async (anzahl: number) => {
      await logApiCost({
        userId: await currentUserId(),
        draftId: draftId ?? null,
        service: 'gemini_bild',
        operation: 'scheiben-saeubern',
        unitsIn: anzahl,
        costMicros: imageCostMicros('gemini_bild', anzahl),
      });
    };

    const ergebnis = await scheibenSaeubern(roh, gebucht);

    if (!ergebnis) {
      /*
       * 200 und nicht 4xx: Das ist kein Fehler des Haendlers. Sein Foto
       * bleibt, wie es war, und die Oberflaeche sagt ihm den Grund.
       */
      return NextResponse.json({ geaendert: false, grund: scheibenGrund() });
    }

    return NextResponse.json({
      geaendert: true,
      anteil: Number((ergebnis.anteil * 100).toFixed(1)),
      bild: `data:image/jpeg;base64,${ergebnis.bild.toString('base64')}`,
    });
  } catch (fehler) {
    console.error('[scheiben] Fehler:', fehler);
    return NextResponse.json({ error: 'Unerwarteter Fehler.' }, { status: 500 });
  }
}
