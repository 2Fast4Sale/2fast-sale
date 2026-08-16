import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createClient } from '../../../../lib/supabase/server';
import { buildEnvkvText, isEnvkvRequired, type VehicleKind } from '../../../../lib/envkv';

export const dynamic = 'force-dynamic';

/**
 * Fahrzeug-Datenblatt als PDF.
 *
 * Zweck: der Ausdruck fuer die Scheibe oder den Verkaufsraum. Das ist der
 * Export, der ohne Freigabe von mobile.de oder AutoScout24 funktioniert und
 * einem Haendler sofort etwas bringt.
 *
 * Enthaelt bewusst auch die EnVKV-Angaben — bei Neuwagen, Tageszulassungen
 * und Vorfuehrwagen sind die auch am Fahrzeug vorgeschrieben, nicht nur im
 * Online-Inserat.
 */

const DARK  = '#0f172a';
const GRAY  = '#475569';
const LGRAY = '#94a3b8';
const BLUE  = '#4f46e5';

const eur = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0
    ? n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €'
    : 'Auf Anfrage';
};

const km = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('de-DE') + ' km' : '—';
};

/** Laedt ein Bild. Schlaegt es fehl, wird es einfach weggelassen. */
async function bildLaden(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Kein Fahrzeug angegeben' }, { status: 400 });

  const { data: v } = await supabase
    .from('vehicles')
    .select('*, vehicle_images(processed_url, original_url, position)')
    .eq('id', id)
    .eq('user_id', user.id)   // nur eigene Fahrzeuge
    .single();

  if (!v) return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });

  const { data: profil } = await supabase
    .from('profiles').select('company, full_name').eq('id', user.id).single();

  // Bilder in Reihenfolge, bearbeitete bevorzugt
  const bildUrls = ((v.vehicle_images || []) as { processed_url?: string; original_url?: string; position?: number }[])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(i => i.processed_url || i.original_url)
    .filter(Boolean) as string[];

  const bilder = (await Promise.all(bildUrls.slice(0, 5).map(bildLaden))).filter(Boolean) as Buffer[];

  // bufferedPages ist noetig, damit am Ende ueber alle Seiten iteriert und die
  // Fusszeile nachtraeglich gesetzt werden kann. Ohne das wirft switchToPage.
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const teile: Buffer[] = [];
  doc.on('data', (c: Buffer) => teile.push(c));
  const fertig = new Promise<Buffer>(res => doc.on('end', () => res(Buffer.concat(teile))));

  const W = 595 - 80;   // A4-Breite minus Raender

  // ── Kopf ────────────────────────────────────────────────────────────────
  doc.rect(0, 0, 595, 64).fill(BLUE);
  doc.fontSize(19).font('Helvetica-Bold').fillColor('#ffffff')
     .text(profil?.company || profil?.full_name || '2Fast4Sale', 40, 22);

  let y = 88;

  // ── Titel und Preis ─────────────────────────────────────────────────────
  doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK)
     .text(String(v.title || v.brand || 'Fahrzeug'), 40, y, { width: W - 150 });
  doc.fontSize(22).font('Helvetica-Bold').fillColor(BLUE)
     .text(eur(v.price), 40, y, { width: W, align: 'right' });

  y = doc.y + 14;

  // ── Titelbild ───────────────────────────────────────────────────────────
  if (bilder[0]) {
    try {
      doc.image(bilder[0], 40, y, { fit: [W, 230], align: 'center' });
      y += 242;
    } catch { /* unlesbares Bild ueberspringen */ }
  }

  // ── Eckdaten ────────────────────────────────────────────────────────────
  const ps = v.power_kw ? Math.round(Number(v.power_kw) * 1.36) : null;
  const daten: [string, string][] = [
    ['Kilometerstand', km(v.km)],
    ['Erstzulassung',  String(v.first_registration || v.year || '—')],
    ['Kraftstoff',     String(v.fuel_type || '—')],
    ['Getriebe',       String(v.gearbox_type || '—')],
    ['Leistung',       ps ? `${v.power_kw} kW (${ps} PS)` : '—'],
    ['Farbe',          String(v.color || '—')],
    ['Hubraum',        v.displacement_ccm ? `${v.displacement_ccm} ccm` : '—'],
    ['Sitzplaetze',    String(v.seats || '—')],
  ];

  doc.fontSize(9).font('Helvetica-Bold').fillColor(LGRAY).text('FAHRZEUGDATEN', 40, y);
  y = doc.y + 6;

  const spalte = W / 2;
  daten.forEach(([label, wert], i) => {
    const x  = 40 + (i % 2) * spalte;
    const zy = y + Math.floor(i / 2) * 18;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text(label, x, zy, { width: spalte - 90 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
       .text(wert, x + spalte - 95, zy, { width: 90, align: 'right' });
  });
  y += Math.ceil(daten.length / 2) * 18 + 14;

  // ── Ausstattung ─────────────────────────────────────────────────────────
  const ausstattung = (v.equipment || []) as string[];
  if (ausstattung.length) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(LGRAY).text('AUSSTATTUNG', 40, y);
    y = doc.y + 4;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(ausstattung.join('  ·  '), 40, y, { width: W });
    y = doc.y + 14;
  }

  // ── Beschreibung ────────────────────────────────────────────────────────
  if (v.description) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(LGRAY).text('BESCHREIBUNG', 40, y);
    y = doc.y + 4;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(String(v.description), 40, y, { width: W, lineGap: 2 });
    y = doc.y + 14;
  }

  // ── EnVKV ───────────────────────────────────────────────────────────────
  const envkvText = buildEnvkvText({
    vehicleKind:              (v.vehicle_kind as VehicleKind) || 'gebrauchtwagen',
    consumptionCombined:      v.consumption_combined,
    powerConsumptionCombined: v.power_consumption_combined,
    co2Combined:              v.co2_combined,
    co2CombinedDischarged:    v.co2_combined_discharged,
    electricRangeKm:          v.electric_range_km,
  }, String(v.fuel_type || ''));

  if (envkvText) {
    if (y > 640) { doc.addPage(); y = 40; }
    doc.fontSize(9).font('Helvetica-Bold').fillColor(LGRAY).text('VERBRAUCH UND EMISSIONEN', 40, y);
    y = doc.y + 4;
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text(envkvText, 40, y, { width: W, lineGap: 1.5 });
    y = doc.y + 12;
  }

  // ── Weitere Bilder auf Folgeseite ───────────────────────────────────────
  if (bilder.length > 1) {
    doc.addPage();
    doc.fontSize(9).font('Helvetica-Bold').fillColor(LGRAY).text('WEITERE ANSICHTEN', 40, 40);
    let by = 60;
    for (const bild of bilder.slice(1)) {
      if (by > 620) { doc.addPage(); by = 40; }
      try {
        doc.image(bild, 40, by, { fit: [W, 220], align: 'center' });
        by += 232;
      } catch { /* unlesbares Bild ueberspringen */ }
    }
  }

  // ── Fusszeile auf allen Seiten ──────────────────────────────────────────
  const seiten = doc.bufferedPageRange();
  for (let i = 0; i < seiten.count; i++) {
    doc.switchToPage(seiten.start + i);
    doc.fontSize(7.5).font('Helvetica').fillColor(LGRAY)
       .text(
         `${profil?.company || profil?.full_name || ''}  ·  Erstellt mit 2Fast4Sale  ·  ${new Date().toLocaleDateString('de-DE')}`,
         40, 800, { width: W, align: 'center' }
       );
  }

  doc.end();
  const pdf = await fertig;

  const name = String(v.title || v.brand || 'Fahrzeug')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${name || 'Fahrzeug'}.pdf"`,
    },
  });
}
