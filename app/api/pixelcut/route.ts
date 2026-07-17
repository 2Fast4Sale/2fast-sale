import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Studio-Hintergründe: Backdrop-Farbe, Boden-Farbe, Glanz-Farbe
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

// Stabile Bild-Hintergründe (Unsplash CDN, kostenlos, stabil)
const IMAGE_BACKGROUNDS: Record<string, string> = {
  // Showroom-Innenräume (leer oder Auto im Hintergrund verschwommen)
  showroom_modern:  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=2000&q=90',
  showroom_dark:    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2000&q=90',
  showroom_luxury:  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=2000&q=90',
  // Outdoor
  outdoor_road:     'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=2000&q=90',
  outdoor_mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2000&q=90',
  outdoor_city:     'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=2000&q=90',
};

async function makeGradientBuffer(id: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const p = STUDIO_PRESETS[id] ?? STUDIO_PRESETS.studio_white;
  const W = 2000, H = 1333;
  // Bodenlinie bei 64% — passend zum Compositor
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
    <!-- Weicher Übergang Wand→Boden (Infinity-Kurve) -->
    <ellipse cx="${W / 2}" cy="${FLOOR_Y}" rx="${W * 0.8}" ry="80" fill="${p.floor}" opacity="0.45"/>
    <!-- Zentrales Rücklicht / Studio-Glow -->
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

    const apiKey = process.env.PHOTOROOM_API_KEY;
    if (!apiKey) {
      // Kein PhotoRoom-Key → remove.bg Fallback (besser als rembg für Autos)
      return await fallbackRemoveBg(image, backgroundId);
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

    if (LOCAL_BG_MAP[bgId]) {
      const filePath = join(process.cwd(), 'public', 'backgrounds', LOCAL_BG_MAP[bgId]);
      if (existsSync(filePath)) {
        const bgBuf = readFileSync(filePath);
        formData.append('background.imageFile', new Blob([bgBuf], { type: 'image/jpeg' }), 'bg.jpg');
      }
    } else if (IMAGE_BACKGROUNDS[bgId]) {
      formData.append('background.imageUrl', IMAGE_BACKGROUNDS[bgId]);
      formData.append('background.scaling', 'fill');
    } else {
      const gradBuf = await makeGradientBuffer(bgId);
      formData.append('background.imageFile', new Blob([gradBuf as unknown as ArrayBuffer], { type: 'image/jpeg' }), 'bg.jpg');
    }

    // Ausgabe: Auto unten zentriert, kein shadow (shadow.mode war fehlerhaft)
    formData.append('outputSize',          '2000x1333');
    formData.append('paddingTop',          '0.18');
    formData.append('paddingRight',        '0.18');
    formData.append('paddingBottom',       '0.00');
    formData.append('paddingLeft',         '0.18');
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
      return await fallbackRemoveBg(image, backgroundId);
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    return NextResponse.json({ result: `data:image/jpeg;base64,${resultBuffer.toString('base64')}` });

  } catch (error: any) {
    console.error('Pixelcut Fehler:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Fallback 1: remove.bg (bessere Auto-Erkennung als rembg)
async function fallbackRemoveBg(image: string, backgroundId?: string): Promise<NextResponse> {
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  if (removeBgKey) {
    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const formData = new FormData();
      formData.append('image_file_b64', base64Data);
      formData.append('size', 'auto');
      formData.append('type', 'car');           // ← wichtig: Auto-Modus für bessere Räder/Kanten
      formData.append('shadow_remove', 'false');

      const res = await fetch('https://api.remove.bg/v1.0/removebg', {
        method:  'POST',
        headers: { 'X-Api-Key': removeBgKey },
        body:    formData,
      });

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        // Transparentes PNG auf Hintergrundfarbe compositen (Sharp)
        const withBg = await applyBackgroundToTransparent(buf, backgroundId);
        return NextResponse.json({ result: withBg });
      }
    } catch { /* weiter zum nächsten Fallback */ }
  }

  // ── Fallback 2: FAL rembg
  return await fallbackFalRembg(image, backgroundId);
}

// ── Fallback 2: FAL.ai rembg → dann Hintergrund draufcompositen
async function fallbackFalRembg(image: string, backgroundId?: string): Promise<NextResponse> {
  try {
    const res = await fetch('https://fal.run/fal-ai/imageutils/rembg', {
      method:  'POST',
      headers: {
        'Authorization':  `Key ${process.env.FAL_API_KEY}`,
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({ image_url: image }),
    });
    if (!res.ok) throw new Error('rembg fehlgeschlagen');
    const data    = await res.json();
    const imgRes  = await fetch(data.image?.url);
    const pngBuf  = Buffer.from(await imgRes.arrayBuffer());
    const result  = await applyBackgroundToTransparent(pngBuf, backgroundId);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'Bildverarbeitung fehlgeschlagen' }, { status: 500 });
  }
}

// ── PNG mit Transparenz auf Hintergrundfarbe compositen — mit Boden-Spiegelung
async function applyBackgroundToTransparent(pngBuffer: Buffer, backgroundId?: string): Promise<string> {
  try {
    const sharp = (await import('sharp')).default;

    const id = backgroundId ?? 'studio_infinity';
    let bgBuffer: Buffer;

    // Lokale Datei zuerst prüfen (studio_infinity etc.)
    const LOCAL_BACKGROUNDS: Record<string, string> = {
      studio_infinity: 'studio_infinity.jpg',
      classic:         'classic.jpg',
      modern:          'backgrounds/modern.jpg',
    };
    if (LOCAL_BACKGROUNDS[id]) {
      const filePath = join(process.cwd(), 'public', 'backgrounds', LOCAL_BACKGROUNDS[id]);
      if (existsSync(filePath)) {
        bgBuffer = readFileSync(filePath);
      } else {
        bgBuffer = await makeGradientBuffer('studio_white');
      }
    } else if (IMAGE_BACKGROUNDS[id]) {
      const res = await fetch(IMAGE_BACKGROUNDS[id]);
      bgBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      bgBuffer = await makeGradientBuffer(id);
    }

    const W = 2000, H = 1333;
    const isRealPhoto = LOCAL_BACKGROUNDS[id] != null || IMAGE_BACKGROUNDS[id] != null;
    const FLOOR_Y = Math.round(H * (isRealPhoto ? 0.60 : 0.64));

    // Hintergrund auf Zielgröße bringen
    const bgResized = await sharp(bgBuffer).resize(W, H, { fit: 'cover' }).toBuffer();

    // 1. PNG sicherstellen + RGBA raw pixels lesen
    const carPng  = await sharp(pngBuffer).ensureAlpha().png().toBuffer();
    const carFull = await sharp(carPng).metadata();
    const srcW = carFull.width!;
    const srcH = carFull.height!;
    const rawFull = await sharp(carPng).raw().toBuffer(); // RGBA

    // 2. Pixel-Scan: Bounding Box aller Pixel mit Alpha > 200
    let bottomRow = 0;
    let topRow    = srcH;
    let leftCol   = srcW;
    let rightCol  = 0;
    for (let r = 0; r < srcH; r++) {
      for (let c = 0; c < srcW; c++) {
        const a = rawFull[(r * srcW + c) * 4 + 3];
        if (a > 100) {
          if (r < topRow)  topRow  = r;
          if (r > bottomRow) bottomRow = r;
          if (c < leftCol)  leftCol  = c;
          if (c > rightCol) rightCol = c;
        }
      }
    }
    // Fallback falls keine Pixel gefunden
    if (topRow >= srcH) { topRow = 0; bottomRow = srcH - 1; leftCol = 0; rightCol = srcW - 1; }
    // Sicherheitsmarge: 4px Polster auf jeder Seite
    const pad = 4;
    const cropTop    = Math.max(0, topRow - pad);
    const cropLeft   = Math.max(0, leftCol - pad);
    const cropWidth  = Math.min(srcW - cropLeft, rightCol - leftCol + 1 + pad * 2);
    const cropHeight = Math.min(srcH - cropTop,  bottomRow - topRow  + 1 + pad * 2);

    console.log('[Studio] scan: top=%d bottom=%d left=%d right=%d src=%dx%d',
      topRow, bottomRow, leftCol, rightCol, srcW, srcH);

    // 3. Eng zugeschnitten
    const carCropped = await sharp(carPng)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .toBuffer();

    // 4. Auf 65% × 50% skalieren
    const carScaled = await sharp(carCropped)
      .resize(Math.round(W * 0.65), Math.round(H * 0.50), { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
    const carMeta = await sharp(carScaled).metadata();
    const cW = carMeta.width!;
    const cH = carMeta.height!;

    // 5. Platzierung: Unterkante auf FLOOR_Y (8px einsinken für festen Bodenkontakt)
    const carLeft = Math.round((W - cW) / 2);
    const carTop  = FLOOR_Y - cH + 8;
    console.log('[Studio] placed: cW=%d cH=%d carTop=%d floor=%d', cW, cH, carTop, FLOOR_Y);

    // 6. Reflexion: untere 35% des Autos, gespiegelt + weichgezeichnet
    const reflSrcH = Math.round(cH * 0.35);
    const reflH    = Math.min(reflSrcH, H - FLOOR_Y - 5);
    const mirrorBlurred = await sharp(carScaled)
      .extract({ left: 0, top: cH - reflSrcH, width: cW, height: reflSrcH })
      .flip()
      .blur(5)
      .toBuffer();
    const fadeSvg = `<svg width="${cW}" height="${reflH}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="white" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient></defs>
      <rect width="${cW}" height="${reflH}" fill="url(#f)"/>
    </svg>`;
    const mirrorMasked = await sharp(mirrorBlurred)
      .extract({ left: 0, top: 0, width: cW, height: reflH })
      .composite([{ input: Buffer.from(fadeSvg), blend: 'dest-in' }])
      .png().toBuffer();

    // 7. Schatten-Ellipse auf dem Boden
    const shadowSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <filter id="b"><feGaussianBlur stdDeviation="13"/></filter>
      <ellipse cx="${W/2}" cy="${FLOOR_Y+3}" rx="${Math.round(cW*0.42)}" ry="${Math.round(H*0.021)}"
        fill="rgba(0,0,0,0.65)" filter="url(#b)"/>
    </svg>`;

    const result = await sharp(bgResized)
      .composite([
        { input: Buffer.from(shadowSvg), blend: 'multiply' },
        { input: mirrorMasked, left: carLeft, top: FLOOR_Y, blend: 'over' },
        { input: carScaled,    left: carLeft, top: carTop,  blend: 'over' },
      ])
      .jpeg({ quality: 93 })
      .toBuffer();

    return `data:image/jpeg;base64,${result.toString('base64')}`;
  } catch (e: any) {
    console.error('[applyBackground] FEHLER:', e?.message ?? e);
    console.error('[applyBackground] Stack:', e?.stack);
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  }
}
