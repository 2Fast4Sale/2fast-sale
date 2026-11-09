import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logLlmCost, currentUserId } from '../../../lib/apiCosts';
import { normalizeEquipmentList } from '../../../lib/equipmentDatabase';
/* Die Stellenliste liegt in lib/, weil die Oberflaeche dieselbe braucht.
   Zwei Fassungen wuerden auseinanderlaufen. */
import { STELLEN, belegePruefen, codesPruefen } from '../../../lib/ausstattungStellen';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/*
 * ── Warum es diese Route gibt ──────────────────────────────────────
 *
 * Der schlechteste Fall ist der Normalfall: Ein Haendler mit zehn
 * Autos im Monat hat keine DAT-Lizenz, keinen Herstellerzugang und bei
 * einem Teil der Fahrzeuge auch keine Bestellbestaetigung — Eintausch,
 * Auktion, Privatkauf. Fuer den sind alle bisherigen Quellen zu.
 *
 * Was er immer hat, ist das Auto. Es steht auf seinem Platz, und er
 * fotografiert es ohnehin.
 *
 * Die bestehende Fotoerkennung (detect-equipment) schaut auf acht
 * Bilder aus dem Inseratsstapel und laesst deshalb mit Recht nur neun
 * Merkmale zu. Klimaautomatik, Tempomat oder Einparkhilfe verbietet sie
 * ausdruecklich — auf einer Aussenaufnahme oder einem weiten
 * Innenraumbild sind die nicht zu sehen, sondern nur zu vermuten.
 *
 * Auf einer Nahaufnahme der richtigen Stelle sind sie aber ABLESBAR.
 * Eine Taste mit "A/C", ein Bedienteil mit "AUTO" und zwei getrennten
 * Temperaturanzeigen, Schaltwippen hinter dem Lenkrad: Das ist lesen,
 * nicht ableiten. Darum gibt es hier einen zweiten, groesseren Katalog
 * — gebunden an die Stelle, an der das Merkmal lesbar ist.
 *
 * Die Sicherung ist nicht die Anweisung, sondern der Beleg: Zu jedem
 * Merkmal muss das Modell sagen, WAS zu sehen war. Steht kein Beleg
 * dabei, faellt das Merkmal heraus. Und der Beleg steht hinterher in
 * der Oberflaeche, damit der Haendler in zwei Sekunden nachsehen kann,
 * statt zu glauben.
 *
 * Der Fahrzeugdatentraeger wird bewusst anders behandelt: Von dort
 * werden nur die Codes abgeschrieben, nie uebersetzt. "4A3" als
 * Sitzheizung auszuschreiben waere geraten — die Zuordnungstabelle hat
 * niemand hier.
 */

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function alsBildBlock(bild: string): Anthropic.ImageBlockParam | null {
  if (!bild.startsWith('data:')) return { type: 'image', source: { type: 'url', url: bild } };
  const [kopf, daten] = bild.split(',');
  const typ = kopf.split(':')[1]?.split(';')[0];
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(typ)) return null;
  return { type: 'image', source: { type: 'base64', media_type: typ as any, data: daten } };
}

export async function POST(req: Request) {
  try {
    const { bilder, draftId } = await req.json() as {
      bilder?: { stelle: string; bild: string }[];
      draftId?: string;
    };

    if (!Array.isArray(bilder) || bilder.length === 0) {
      return NextResponse.json({ equipment: [], belege: [], codes: [] });
    }

    /* Hoechstens acht Nahaufnahmen je Aufruf — mehr Stellen gibt es
       nicht, und jedes Bild wird bezahlt. */
    const gueltig = bilder
      .filter(b => b && typeof b.bild === 'string' && STELLEN[b.stelle])
      .slice(0, 8);
    if (gueltig.length === 0) {
      return NextResponse.json({ equipment: [], belege: [], codes: [] });
    }

    const inhalt: Anthropic.ContentBlockParam[] = [{
      type: 'text',
      text: `Du siehst Nahaufnahmen aus einem Fahrzeug. Jedes Bild ist mit der Stelle
beschriftet, die es zeigt.

Diese Liste landet in einem Verkaufsinserat. Jedes falsche Merkmal ist eine
falsche Zusicherung, für die der Händler haftet — nicht du und nicht die
Software. Deshalb gilt ohne Ausnahme:

ABLESEN, NICHT ABLEITEN.

Ein Merkmal darfst du nur aufnehmen, wenn du auf dem Bild etwas KONKRETES
dafür siehst: eine lesbare Beschriftung, ein eindeutiges Symbol auf einer
Taste, oder einen Inhalt auf dem eingeschalteten Bildschirm. Nicht, weil
das Fahrzeug so aussieht, nicht weil die Ausstattungslinie es üblich macht,
nicht weil es zur Baureihe gehört.

Zu JEDEM Merkmal musst du einen Beleg angeben: in wenigen Worten, was
genau zu sehen war. "Taste mit Sitzsymbol und drei Wellenlinien" ist ein
Beleg. "Ist üblich bei diesem Modell", "wahrscheinlich vorhanden" oder
"Sitzheizung erkennbar" ist keiner. Ohne Beleg lass das Merkmal weg.

Eine kurze Liste mit drei belegten Merkmalen ist richtig. Eine lange mit
einem geratenen ist falsch.

Nimm je Stelle ausschließlich Merkmale aus dieser Liste, genau so
geschrieben:

${gueltig.map(({ stelle }) =>
  `[${stelle}] ${STELLEN[stelle].titel}\n  ${STELLEN[stelle].merkmale.join('\n  ') || '(nur Codes abschreiben, siehe unten)'}`,
).join('\n\n')}

Besonderes zum Fahrzeugdatenträger, falls dabei: Schreibe die Werkscodes
nur ab, Zeichen für Zeichen, in das Feld "codes". Übersetze sie NICHT in
Ausstattungsnamen — welcher Code was bedeutet, weißt du nicht sicher, und
eine geratene Bedeutung wäre genau der Fehler, der hier nicht passieren
darf. Kein Code gehört in "equipment".

Antworte NUR als pures JSON, ohne Markdown:
{"equipment": [{"merkmal": "...", "beleg": "...", "stelle": "..."}], "codes": ["..."]}

Wenn nichts eindeutig belegbar ist: {"equipment": [], "codes": []}`,
    }];

    for (const { stelle, bild } of gueltig) {
      const block = alsBildBlock(bild);
      if (!block) continue;
      inhalt.push({ type: 'text', text: `Stelle: ${stelle} — ${STELLEN[stelle].titel}` });
      inhalt.push(block);
    }

    const antwort = await getAnthropic().messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      messages: [{ role: 'user', content: inhalt }],
    });

    const text = (antwort.content.find(t => t.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
    const roh = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? text.trim();
    const ergebnis = JSON.parse(roh);

    /* Nachkontrolle in lib/ausstattungStellen.ts, damit eine Probe sie
       ohne Modellaufruf durchspielen kann. */
    const treffer = belegePruefen(ergebnis.equipment, gueltig.map(g => g.stelle));
    const codes   = codesPruefen(ergebnis.codes);

    await logLlmCost({
      userId: await currentUserId(),
      draftId: draftId ?? null,
      operation: 'ausstattung-nahaufnahme',
      model: 'claude-opus-4-8',
      usage: antwort.usage,
      meta: {
        stellen: gueltig.map(g => g.stelle),
        merkmale: treffer.length,
        codes: codes.length,
        /* Wie viel das Modell geliefert hat, das die Nachkontrolle
           verworfen hat. Steigt diese Zahl, stimmt etwas mit der
           Anweisung nicht. */
        verworfen: Math.max(0, (Array.isArray(ergebnis.equipment) ? ergebnis.equipment.length : 0) - treffer.length),
      },
    });

    return NextResponse.json({
      equipment: normalizeEquipmentList(treffer.map(t => t.merkmal)),
      belege: treffer,
      codes,
    });
  } catch (error: any) {
    console.error('[ausstattung-nahaufnahme]', error);
    return NextResponse.json({ error: 'Erkennung fehlgeschlagen', details: error.message }, { status: 500 });
  }
}
