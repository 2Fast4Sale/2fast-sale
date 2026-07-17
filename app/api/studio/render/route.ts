import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const carImage = formData.get('carImage') as File;
    const background = formData.get('background') as string;
    const dealerName = formData.get('dealerName') as string;

    if (!carImage) {
      return NextResponse.json(
        { error: 'Keine Auto-Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Mock: Gebe dieselbe Datei zur�ck (in Production: echte Rendering-Engine)
    const buffer = await carImage.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': carImage.type,
      },
    });
  } catch (error) {
    console.error('Studio Render Fehler:', error);
    return NextResponse.json(
      { error: 'Studio-Rendering fehlgeschlagen' },
      { status: 500 }
    );
  }
}