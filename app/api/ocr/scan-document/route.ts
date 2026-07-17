import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Mock-Daten (in Production: echte OCR integrieren)
    const mockData = {
      vin: 'WBADT43452G946970',
      marke: 'BMW',
      modell: '320i',
      baujahr: 2018,
      hubraum: '2.0L',
      kraftstoff: 'Benzin',
      getriebe: 'Automatik',
      kilometerstand: 75000,
      farbe: 'Wei�',
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('OCR-Fehler:', error);
    return NextResponse.json(
      { error: 'OCR-Verarbeitung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
