import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logApiCost, imageCostMicros, currentUserId } from '../../../lib/apiCosts';

export const dynamic = 'force-dynamic';

// Studio-HintergrÃ¼nde: Backdrop-Farbe, Boden-Farbe, Glanz-Farbe
const STUDIO_PRESETS: Record<string, { backdrop: string; floor: string; glow: string; vignette: string }> = {
  studio_white:  { backdrop: '#d0d0d0', floor: '#e8e8e8', glow: '#ffffff', vignette: 'rgba(0,0,0,0.22)' },
  studio_grey:   { backdrop: '#707070', floor: '#909090', glow: '#c0c0c0', vignette: 'rgba(0,0,0,0.30)' },
  studio_dark:   { backdrop: '#0e0e0e', floor: '#1c1c1c', glow: '#3a3a3a', vignette: 'rgba(0,0,0,0.55)' },
  studio_navy:   { backdrop: '#060e18', floor: '#0d1e35', glow: '#1a4080', vignette: 'rgba(0,0,20,0.55)' },
  studio_beige:  { backdrop: '#b8aa94', floor: '#d4c9b4', glow: '#eee6d6', vignette: 'rgba(20,10,0,0.20)' },
  studio_carbon: { backdrop: '#111111', floor: '#1e1e1e', glow: '#383838', vignette: 'rgba(0,0,0,0.60)' },
  studio_ice:    { backdrop: '#aad0e8', floor: '#cce4f4', glow: '#eaf6ff', vignette: 'rgba(0,20,40,0.20)' },
  studio_sunset: { backdrop: '#c0503a', floor: '#d47050', glow: '#ff9966', vignette: 'rgba(60,0,0,0.35)' },
};

// Stabile Bild-HintergrÃ¼nde (Unsplash CDN, kostenlos, stabil)
const IMAGE_BACKGROUNDS: Record<string, string> = {
  // Showroom-InnenrÃ¤ume (leer oder Auto im Hintergrund verschwommen)
  showroom_modern:  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=2000&q=90',
  showroom_dark:    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2000&q=90',
  showroom_luxury:  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=2000&q=90',
  // Outdoor
  outdoor_road:     'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=2000&q=90',
  outdoor_mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2000&q=90',
  outdoor_city:     'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=2000&q=90',
};

/** Farben eines Studio-Hintergrunds — identisch zum Editor im Dashboard. */
type StudioPreset = { backdrop: string; floor: string; glow: string; vignette: string };

/** Kennung fuer den selbst gestalteten Hintergrund des Haendlers. */
const CUSTOM_STUDIO_ID = 'custom_studio';

/**
 * Laedt den eigenen Hintergrund des angemeldeten Haendlers.
 * Faellt still auf null zurueck — ein fehlender Hintergrund darf die
 * Bildverarbeitung nicht kippen.
 */
async function loadCustomPreset(): Promise<StudioPreset | null> {
  try {
    const { createClient } = await import('../../../lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles').select('custom_background').eq('id', user.id).single();
    const p = data?.custom_background as StudioPreset | null;
    if (!p?.backdrop || !p?.floor || !p?.glow || !p?.vignette) return null;
    return p;
  } catch {
    return null;
  }
}

async function makeGradientBuffer(id: string, custom?: StudioPreset | null): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const p = custom ?? STUDIO_PRESETS[id] ?? STUDIO_PRESETS.studio_white;
  const W = 2000, H = 1333;
  // Bodenlinie bei 64% â€” passend zum Compositor
  const FLOOR_Y = Math.round(H * 0.64);

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${p.vignette.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')')}"/>
        <stop offset="100%" stop-color="${p.backdrop}"/>
      </linearGradient>
      <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${p.floor}"/>
        <stop offset="100%" stop-color="${p.backdrop}"/>
      </linearGradient>
      <radialGradient id="backglow" cx="50%" cy="75%" r="48%" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="${p.glow}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${p.backdrop}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="floorglow" cx="50%" cy="${FLOOR_Y}px" r="55%" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="${p.glow}" stop-opacity="0.50"/>
        <stop offset="100%" stop-color="${p.floor}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vig" cx="50%" cy="50%" r="75%" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.35"/>
      </radialGradient>
    </defs>
    <!-- Backdrop (Wand) -->
    <rect width="${W}" height="${FLOOR_Y + 40}" fill="url(#bd)"/>
    <!-- Boden -->
    <rect y="${FLOOR_Y - 40}" width="${W}" height="${H - FLOOR_Y + 40}" fill="url(#fl)"/>
    <!-- Weicher Ãœbergang Wandâ†’Boden (Infinity-Kurve) -->
    <ellipse cx="${W / 2}" cy="${FLOOR_Y}" rx="${W * 0.8}" ry="80" fill="${p.floor}" opacity="0.45"/>
    <!-- Zentrales RÃ¼cklicht / Studio-Glow -->
    <rect width="${W}" height="${H}" fill="url(#backglow)"/>
    <!-- Boden-Glanz -->
    <rect y="${FLOOR_Y}" width="${W}" height="${H - FLOOR_Y}" fill="url(#floorglow)"/>
    <!-- Rand-Vignette -->
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const { image, backgroundId, customBackgroundUrl } = await req.json();
    if (!image) return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });

    // Eigenen Hintergrund nur laden, wenn er auch gewaehlt ist —
    // spart bei allen anderen Faellen einen DB-Aufruf pro Bild.
    const custom = backgroundId === CUSTOM_STUDIO_ID ? await loadCustomPreset() : null;

    /*
     * Sandbox-Modus: derselbe Key mit Praefix "sandbox_". Kostenlos, 1.000
     * Aufrufe im Monat (max. 100 taeglich), Ergebnis traegt ein Wasserzeichen.
     * Gedacht zum Ausprobieren von Hintergruenden und Schatten, ohne Guthaben
     * zu verbrauchen. Fuer echte Kundenbilder muss PHOTOROOM_SANDBOX aus sein.
     */
    const roherKey = process.env.PHOTOROOM_API_KEY;
    const apiKey = roherKey && process.env.PHOTOROOM_SANDBOX === 'true'
      ? `sandbox_${roherKey}`
      : roherKey;

    if (!apiKey) {
      console.error('[pixelcut] PHOTOROOM_API_KEY fehlt');
      return NextResponse.json(
        { error: 'Studio-Bearbeitung ist nicht konfiguriert.' },
        { status: 503 }
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    formData.append('imageFile', new Blob([imageBuffer], { type: 'image/jpeg' }), 'car.jpg');

    // Hintergrund laden
    const LOCAL_BG_MAP: Record<string, string> = {
      studio_infinity: 'studio_infinity.jpg',
      classic: 'classic.jpg',
    };
    const bgId = backgroundId ?? 'studio_infinity';

    if (customBackgroundUrl) {
      /*
       * Eigenes Showroom-Foto des Haendlers. Steht vor allen anderen Faellen:
       * wer sein eigenes hochgeladen hat, will genau das sehen — nicht eine
       * Vorlage. Bisher wurde der Wert entgegengenommen und ignoriert.
       */
      formData.append('background.imageUrl', customBackgroundUrl);
      formData.append('background.scaling', 'fill');
    } else if (LOCAL_BG_MAP[bgId]) {
      const filePath = join(process.cwd(), 'public', 'backgrounds', LOCAL_BG_MAP[bgId]);
      if (existsSync(filePath)) {
        const bgBuf = readFileSync(filePath);
        formData.append('background.imageFile', new Blob([bgBuf], { type: 'image/jpeg' }), 'bg.jpg');
      }
    } else if (IMAGE_BACKGROUNDS[bgId]) {
      formData.append('background.imageUrl', IMAGE_BACKGROUNDS[bgId]);
      formData.append('background.scaling', 'fill');
    } else {
      const gradBuf = await makeGradientBuffer(bgId, custom);
      formData.append('background.imageFile', new Blob([gradBuf as unknown as ArrayBuffer], { type: 'image/jpeg' }), 'bg.jpg');
    }

    /*
     * Schatten. Frueher deaktiviert, weil ein ungueltiger Wert einen Fehler
     * ausgeloest hatte — gueltig sind laut PhotoRoom-Doku ausschliesslich
     * ai.soft, ai.hard, ai.floating und ai.auto-with-overrides.
     *
     * ai.soft ist fuer Fahrzeuge richtig: weicher Bodenschatten wie im Studio.
     * ai.floating waere falsch, das laesst das Objekt schweben — ein Auto steht
     * auf dem Boden.
     *
     * Ohne Schatten wirkt ein freigestelltes Fahrzeug flach aufgeklebt. Das ist
     * der groesste sichtbare Unterschied zwischen "freigestellt" und "Studio".
     */
    formData.append('shadow.mode', process.env.PHOTOROOM_SHADOW_MODE || 'ai.soft');

    /*
     * Raender. Frueher stand unten 0.00 — dadurch sass das Fahrzeug auf der
     * Bildkante und wirkte angeschnitten statt aufgestellt. Mit Luft nach unten
     * sieht man den Boden unter den Raedern, was zusammen mit dem Schatten erst
     * den Studio-Eindruck ergibt.
     *
     * Ueber Env feinjustierbar, ohne Deploy.
     */
    formData.append('outputSize',          '2000x1333');
    formData.append('paddingTop',          process.env.STUDIO_PADDING_TOP    || '0.24');
    formData.append('paddingRight',        process.env.STUDIO_PADDING_RIGHT  || '0.22');
    formData.append('paddingBottom',       process.env.STUDIO_PADDING_BOTTOM || '0.10');
    formData.append('paddingLeft',         process.env.STUDIO_PADDING_LEFT   || '0.22');
    formData.append('verticalAlignment',   'bottom');
    formData.append('horizontalAlignment', 'center');

    const response = await fetch('https://image-api.photoroom.com/v2/edit', {
      method:  'POST',
      headers: { 'x-api-key': apiKey },
      body:    formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('PhotoRoom Fehler:', err);
      /*
       * Bewusst kein Ersatz-Compositing mehr. Ein selbst zusammengesetztes
       * Bild sieht schlechter aus als gar keins und beschaedigt genau das,
       * wofuer der Haendler zahlt. Besser ehrlich melden und erneut versuchen
       * lassen — das Originalfoto bleibt im Inserat erhalten.
       */
      return NextResponse.json(
        { error: 'Studio-Bearbeitung gerade nicht verfügbar. Bitte gleich nochmal versuchen.' },
        { status: 503 }
      );
    }

    await logApiCost({
      userId: await currentUserId(),
      service: 'photoroom',
      operation: 'remove-bg',
      unitsIn: 1,
      costMicros: imageCostMicros('photoroom'),
    });

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    return NextResponse.json({ result: `data:image/jpeg;base64,${resultBuffer.toString('base64')}` });

  } catch (error: any) {
    console.error('Pixelcut Fehler:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
