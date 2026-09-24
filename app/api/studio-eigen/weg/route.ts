import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Sagt dem Browser, wer die Bilder macht.
 *
 * Steht hier `gemini: true`, spart sich Schritt 2 das eigene
 * Freistellen: Es waere verlorene Rechenzeit, weil Gemini das ganze
 * Bild ohnehin neu aufbaut. Der Browser schickt dann das Originalfoto.
 */
export async function GET() {
  return NextResponse.json({
    gemini: !!process.env.GEMINI_API_KEY && process.env.STUDIO_WEG !== 'aus',
  });
}
