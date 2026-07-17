import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { image } = await req.json(); // Das Base64-Bild aus deinem Frontend

    if (!image) {
      return NextResponse.json({ error: 'Kein Bild vorhanden' }, { status: 400 });
    }

    console.log("Sende Bild an fal.ai (Fooocus Inpaint) via NanoBanana-Route...");

    // Wir nutzen das starke Fooocus-Inpaint-Modell von fal.ai.
    // Es isoliert das Auto automatisch und baut den Showroom nahtlos drumherum.
    const response = await fetch('https://queue.fal.run/fal-ai/fooocus/inpaint', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`, // Dein API-Key aus der .env.local
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: image,
        // Der Prompt f�r genau den Look, den du haben willst
        prompt: "A realistic high-end modern car photography studio, impressive circular ceiling lights reflecting perfectly on the clean car paint, highly polished grey concrete floor, professional soft studio shadows underneath the wheels, sharp focus, 8k resolution, cinematic lighting, showroom style",
        negative_prompt: "deformed wheels, changed car model, blurry, low quality, bad reflections, floating car",
        input_image_task: "image_to_image", 
        denoising_strength: 0.9, // Kills den alten Hintergrund komplett
        guidance_scale: 7.5,
        sync_mode: true
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Fal.ai API Fehler:", errText);
      throw new Error(`Fal.ai hat mit Status ${response.status} geantwortet`);
    }

    const data = await response.json();
    
    // fal.ai gibt die fertige Bild-URL in images[0].url zur�ck
    const completedStudioImage = data.images?.[0]?.url;

    if (!completedStudioImage) {
      throw new Error("Fal.ai hat kein Bild generiert.");
    }

    // WICHTIG: R�ckgabe als 'result', da dein Frontend 'data.result' erwartet!
    return NextResponse.json({ result: completedStudioImage });

  } catch (error: any) {
    console.error("Fehler in der NanoBanana Route:", error);
    return NextResponse.json({ error: error.message || 'Interner Serverfehler' }, { status: 500 });
  }
}
