import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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
    const { images } = await req.json();

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
Schaue genau auf: Innenraum, Sitze, Lenkrad, Armaturenbrett, Felgen, Dach, Scheinwerfer, StoÃŸstangen.

Erkenne nur was wirklich sichtbar ist, z.B.:
- Ledersitze, Stoff-Sitze, Sportsitze
- Panoramadach, Schiebedach
- Alufelgen, Sportfelgen
- LED-Scheinwerfer, Xenon-Scheinwerfer
- Navigationssystem, Touchscreen
- Klimaanlage, Klimaautomatik
- Sitzheizung (wenn KnÃ¶pfe sichtbar)
- RÃ¼ckfahrkamera
- Sportauspuff
- Dachreling
- AnhÃ¤ngerkupplung

Antworte NUR als pures JSON ohne Markdown:
{"equipment": ["Merkmal 1", "Merkmal 2"]}

Maximal 12 Merkmale. Nur wirklich sichtbare Dinge.`,
          },
          ...imageBlocks,
        ],
      }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;
    const result = JSON.parse(extractJson(text));

    return NextResponse.json({ equipment: result.equipment || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

