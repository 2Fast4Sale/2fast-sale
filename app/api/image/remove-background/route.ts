import { NextRequest, NextResponse } from 'next/server';

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

    // Gebe dieselbe Datei zur�ck (in Production: echte API nutzen)
    const buffer = await file.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.type,
      },
    });
  } catch (error) {
    console.error('Background Removal Fehler:', error);
    return NextResponse.json(
      { error: 'Bildverarbeitung fehlgeschlagen' },
      { status: 500 }
    );
  }
}