import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logLlmCost, currentUserId } from '../../../lib/apiCosts';

export const dynamic = 'force-dynamic';

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

function toImageBlock(img: string): Anthropic.ImageBlockParam {
  if (img.startsWith('data:')) {
    const [header, data] = img.split(',');
    const mediaType = header.split(':')[1].split(';')[0] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
  }
  return { type: 'image', source: { type: 'url', url: img } };
}

export async function POST(req: Request) {
  try {
    const { images, draftId } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ equipment: [] });
    }

    const imageBlocks = images.slice(0, 3).map(toImageBlock);

    const response = await getAnthropic().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analysiere diese Fahrzeugfotos und erkenne sichtbare Ausstattungsmerkmale.
Schaue genau auf: Innenraum, Sitze, Lenkrad, Armaturenbrett, Felgen, Dach, Scheinwerfer, Stoßstangen.

Diese Liste landet in einem Verkaufsinserat. Jedes falsche Merkmal ist eine
falsche Angabe zum Fahrzeug, für die der Händler haftet. Deshalb gilt:
Nimm ein Merkmal NUR auf, wenn es auf einem der Fotos eindeutig zu sehen ist.
Im Zweifel weglassen. Eine kurze Liste ist richtig, eine lange mit einem
Fehler ist falsch.

Erlaubt, wenn eindeutig sichtbar:
- Ledersitze (Lederstruktur und Nähte klar erkennbar)
- Panoramadach (durchgehende Glasfläche im Dach sichtbar)
- Schiebedach
- Alufelgen
- Dachreling
- Anhängerkupplung (Kugelkopf sichtbar)
- Navigationssystem (Kartenansicht auf dem Bildschirm sichtbar)
- Rückfahrkamera (Kamerabild auf dem Bildschirm sichtbar)
- Sitzheizung (Taste mit Sitzheizungssymbol klar lesbar)

NIE aufnehmen, auch wenn es so aussieht — das ist auf Fotos verwechselbar
oder nicht sichtbar:
- Xenon oder LED (Scheinwerfertechnik)
- Klimaautomatik oder Klimaanlage
- Sportsitze, Sportfelgen, Sportauspuff (Bewertung, keine Tatsache)
- Assistenzsysteme, Motor, Getriebe, Pakete, Farbe, Ausstattungslinie

Antworte NUR als pures JSON ohne Markdown:
{"equipment": ["Merkmal 1", "Merkmal 2"]}

Nur Namen aus der erlaubten Liste, genau so geschrieben. Wenn nichts
eindeutig ist: {"equipment": []}`,
          },
          ...imageBlocks,
        ],
      }],
    });

    await logLlmCost({
      userId: await currentUserId(),
      draftId: draftId ?? null,
      operation: 'detect-equipment',
      model: 'claude-opus-4-8',
      usage: response.usage,
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;
    const result = JSON.parse(extractJson(text));

    /*
     * Nur Merkmale aus der erlaubten Liste. Die Anweisung oben verbietet
     * Raten, aber eine Anweisung ist keine Garantie — und ein falsches
     * "LED-Scheinwerfer" im Inserat ist eine falsche Angabe, fuer die der
     * Haendler haftet. Was nicht auf der Liste steht, kommt nie durch.
     */
    const erlaubt = new Set([
      'Ledersitze', 'Panoramadach', 'Schiebedach', 'Alufelgen', 'Dachreling',
      'Anhängerkupplung', 'Navigationssystem', 'Rückfahrkamera', 'Sitzheizung',
    ]);
    const equipment = (Array.isArray(result.equipment) ? result.equipment : [])
      .filter((m: unknown): m is string => typeof m === 'string' && erlaubt.has(m.trim()))
      .map((m: string) => m.trim());

    return NextResponse.json({ equipment: [...new Set(equipment)] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

