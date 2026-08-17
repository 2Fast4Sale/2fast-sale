import { NextResponse } from 'next/server';
import {
  rechnungPdf, rechnungEmail, rechnungText, ausstellerAusUmgebung,
  type Rechnung,
} from '../../../lib/rechnung';

export const dynamic = 'force-dynamic';

/**
 * Musterrechnung zum Anschauen.
 *
 * Diese Route hatte vorher ihren eigenen, von Hand nachgebauten
 * PDF-Aufbau — Änderungen an der echten Rechnung kamen hier nie an, die
 * Vorschau zeigte also etwas anderes als der Kunde bekam. Jetzt läuft
 * sie durch denselben Baustein wie die Rechnung aus dem Credit-Kauf.
 *
 * /api/test-invoice-pdf      → PDF im Browser
 * /api/test-invoice-pdf?mail → HTML-Fassung der E-Mail
 * /api/test-invoice-pdf?text → Textfassung der E-Mail
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Nicht verfügbar' }, { status: 404 });
  }

  const jetzt = new Date();
  const muster: Rechnung = {
    nummer: 'MUSTER-0001',
    datum: jetzt,
    leistungsdatum: jetzt,
    empfaenger: {
      name: 'Autohaus Beispiel GmbH',
      strasse: 'Industriestraße 44',
      ort: '44787 Bochum',
      land: 'Deutschland',
      ustId: 'DE987654321',
    },
    positionen: [{
      bezeichnung: 'Inserat-Credit',
      beschreibung: 'KI-Fahrzeugbeschreibung, Studio-Fotos, Plattform-Export',
      menge: 25,
      einzelpreisBruttoCent: 499,
    }],
    steuersatz: 19,
    bezahlt: true,
    stripePdfUrl: null,
  };

  const aussteller = ausstellerAusUmgebung();
  const anfrage = new URL(req.url);

  if (anfrage.searchParams.has('mail')) {
    return new NextResponse(rechnungEmail(muster, aussteller), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (anfrage.searchParams.has('text')) {
    return new NextResponse(rechnungText(muster, aussteller), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const pdf = await rechnungPdf(muster, aussteller);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Musterrechnung.pdf"',
    },
  });
}
