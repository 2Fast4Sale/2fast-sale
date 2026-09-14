import { NextResponse } from 'next/server';
import { raeume, STANDARD_RAUM } from '../../../../lib/studio/raeume';

/**
 * Liste der gerenderten Studioraeume fuer die Auswahlseite.
 *
 * Eine eigene Route statt einer Liste im Browser-Code, weil die Raeume
 * aus dem Dateisystem kommen: Wer tools/raeume_bauen.ps1 laufen laesst
 * und einen Raum dazurendert, soll ihn auf der Seite sehen, ohne dass
 * irgendwo ein Name nachgetragen werden muss.
 */
export async function GET() {
  return NextResponse.json({
    standard: STANDARD_RAUM,
    raeume: raeume().map((r) => ({ name: r.name, titel: r.titel, pfad: r.pfad })),
  });
}
