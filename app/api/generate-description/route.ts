import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brand, km, year, fuel, gearbox, color, power, equipment, dealerNotes, seats, displacement } = body;

    let aiStyleTemplate = '';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('ai_style_template').eq('id', user.id).single();
        aiStyleTemplate = data?.ai_style_template || '';
      }
    } catch { /* ignorieren */ }

    const equipmentList = Array.isArray(equipment) && equipment.length > 0
      ? `Ausstattung: ${equipment.join(', ')}.`
      : '';

    const styleInstruction = aiStyleTemplate
      ? `\n\nWICHTIG â€” Orientiere dich am Schreibstil dieses HÃ¤ndlers:\n"${aiStyleTemplate}"\nÃœbernimm den Ton und Stil, aber schreib eine neue Beschreibung fÃ¼r das aktuelle Fahrzeug.`
      : '';

    const prompt = `Erstelle eine professionelle Verkaufsbeschreibung fÃ¼r folgendes Fahrzeug:

Fahrzeug: ${brand || 'Unbekannt'}
Erstzulassung: ${year || 'k.A.'}
Kilometerstand: ${km ? `${Number(km).toLocaleString('de-DE')} km` : 'k.A.'}
Leistung: ${power ? `${power} PS` : 'k.A.'}
Kraftstoff: ${fuel || 'k.A.'}
Getriebe: ${gearbox || 'k.A.'}
Farbe: ${color || 'k.A.'}
SitzplÃ¤tze: ${seats || 'k.A.'}
Hubraum: ${displacement ? `${Number(displacement).toLocaleString('de-DE')} ccm` : 'k.A.'}
${equipmentList}
${dealerNotes ? `\nHÃ¤ndler-Notizen: ${dealerNotes}` : ''}${styleInstruction}

Schreibe 3â€“4 SÃ¤tze auf Deutsch. Ãœberzeugend, kaufmotivierend, kein Marketing-Blabla. Nur FlieÃŸtext, keine AufzÃ¤hlungen. Max. 80 WÃ¶rter.`;

    const response = await getAnthropic().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 200,
      system: 'Du bist ein erfahrener FahrzeughÃ¤ndler der ehrliche, Ã¼berzeugende Inserate schreibt.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;
    return NextResponse.json({ text: text.trim() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ error: 'Beschreibung konnte nicht generiert werden', details: msg }, { status: 500 });
  }
}

