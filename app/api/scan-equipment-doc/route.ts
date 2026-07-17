import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeEquipmentList } from '../../../lib/equipmentDatabase';

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
    const { image } = await req.json();

    const response = await getAnthropic().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Du bist ein Experte fÃ¼r Kfz-Ausstattung und mobile.de-Inserate.

Analysiere dieses Dokument (kann sein: BestellbestÃ¤tigung, Ausstattungsliste, altes Inserat, Ãœbergabeprotokoll, Herstellerbrief, Screenshot einer Anzeige, oder beliebiges anderes Dokument mit Fahrzeuginformationen).

Extrahiere ALLE Ausstattungsmerkmale die du findest. Ãœbersetze alles ins Deutsche.

Beispiele was zu suchen ist:
- Navigationssystem, Navi, GPS, MMI, iDrive, COMAND, Sync
- Ledersitze, Alcantara, Stoff, Kunstleder
- Klimaautomatik, Klimaanlage, Zweizonen, Dreizonen
- Sitzheizung, Lenkradheizung, Standheizung
- Panoramadach, Schiebedach, Glasdach
- LED, Xenon, Matrix, Laser (Scheinwerfer)
- Einparkhilfe, PDC, Parkpilot, RÃ¼ckfahrkamera, 360Â° Kamera
- Apple CarPlay, Android Auto, Bluetooth, USB, DAB+
- Tempomat, ACC, adaptiver Tempomat, Abstandsregeltempomat
- Spurhalteassistent, Totwinkel, Notbremssystem, SpurfÃ¼hrung
- Head-up Display, digitales Cockpit, Virtual Cockpit
- AnhÃ¤ngerkupplung, Dachreling, Sportfahrwerk, Luftfederung
- Alufelgen (mit ZollgrÃ¶ÃŸe wenn angegeben), WinterrÃ¤der
- Allradantrieb, 4WD, AWD, xDrive, quattro, 4Motion
- Premium-Soundsystem (Bose, Harman Kardon, B&O, Burmester, JBL)
- Ambientebeleuchtung, elektrische Sitze, Memory-Sitze
- Keyless Entry/Go, Start-Stopp, Mild-Hybrid, Plug-in Hybrid
- Scheckheftgepflegt, Garantie, 1. Hand, Unfallfreiheit

Antworte NUR als pures JSON ohne Markdown:
{"equipment": ["Merkmal 1", "Merkmal 2", ...]}

Gib so viele Merkmale wie mÃ¶glich zurÃ¼ck. Lieber zu viel als zu wenig.`,
          },
          toImageBlock(image),
        ],
      }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;
    const result = JSON.parse(extractJson(text));
    const equipment: string[] = result.equipment || [];

    return NextResponse.json({ equipment: normalizeEquipmentList(equipment) });
  } catch (error: any) {
    console.error('[scan-equipment-doc]', error);
    return NextResponse.json({ error: 'Scan fehlgeschlagen', details: error.message }, { status: 500 });
  }
}

