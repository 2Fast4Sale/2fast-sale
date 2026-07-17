import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Wir holen uns das Bild UND den Key direkt aus deiner page.tsx!
    const { image, apiKey } = await req.json();

    if (!image) return NextResponse.json({ error: 'Kein Bild empfangen' }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: 'Kein API-Key von der Page �bergeben' }, { status: 400 });

    const formData = new FormData();
    formData.append('image_file_b64', image);
    formData.append('size', 'auto');
    formData.append('shadow_remove', 'true');
    formData.append('type', 'car');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey.trim(), // Der Key kommt jetzt dynamisch von der Page
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: errText }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: { 'Content-Type': 'image/png' },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server-Fehler' }, { status: 500 });
  }
}