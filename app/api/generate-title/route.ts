import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../../../lib/supabase/server';

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brand, model, year, fuel, gearbox, color, power, equipment } = body;

    let titleTemplate = '';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('ai_title_template').eq('id', user.id).single();
        titleTemplate = data?.ai_title_template || '';
      }
    } catch { /* ignorieren */ }

    if (!titleTemplate) {
      // Fallback: einfacher Titel ohne KI
      const parts = [brand, model, year, power ? `${power} PS` : '', fuel].filter(Boolean);
      return NextResponse.json({ title: parts.join(' Â· ') });
    }

    const topEquip = Array.isArray(equipment) ? equipment.slice(0, 5).join(', ') : '';

    const response = await getAnthropic().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Du bist ein Experte fÃ¼r mobile.de Inserate.

Der HÃ¤ndler mÃ¶chte Titel IMMER in diesem Format/Stil:
"${titleTemplate}"

Erstelle jetzt einen Titel fÃ¼r dieses Fahrzeug im EXAKT gleichen Stil (gleiche Sonderzeichen, gleiche Schreibweise, gleiche Struktur):

Marke: ${brand || ''}
Modell: ${model || ''}
Baujahr: ${year || ''}
Kraftstoff: ${fuel || ''}
Getriebe: ${gearbox || ''}
Farbe: ${color || ''}
Leistung: ${power ? `${power} PS` : ''}
Top-Ausstattung: ${topEquip}

Antworte NUR mit dem Titel als reinem JSON: {"title": "..."}
Kein Markdown, keine ErklÃ¤rung, nur JSON.`,
      }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;
    const result = JSON.parse(extractJson(text));
    return NextResponse.json({ title: result.title || '' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ error: 'Titel konnte nicht generiert werden', details: msg }, { status: 500 });
  }
}

