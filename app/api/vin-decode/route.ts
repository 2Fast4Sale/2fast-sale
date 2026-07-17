import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeEquipmentList } from '../../../lib/equipmentDatabase';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Kraftstoff normalisieren ──────────────────────────────────────────────────
function mapFuel(raw: string): string | null {
  if (!raw) return null;
  const r = raw.toLowerCase();
  if (r.includes('plug') || r.includes('phev'))               return 'Plug-in Hybrid';
  if (r.includes('diesel'))                                    return 'Diesel';
  if (r.includes('gasoline') || r.includes('petrol') || r.includes('benzin')) return 'Benzin';
  if (r.includes('electric') || r.includes('elektro') || r.includes('bev'))   return 'Elektro';
  if (r.includes('hybrid'))                                    return 'Hybrid';
  if (r.includes('lpg'))                                       return 'LPG';
  if (r.includes('cng'))                                       return 'CNG';
  return null;
}

// ── Schritt 1: Vincario — Basisdaten aus Herstellerdatenbank ──────────────────
interface VincarioResult {
  brand: string | null;
  model: string | null;
  year: string | null;
  fuelType: string | null;
  powerPs: string | null;
  displacementCcm: string | null;
  gearbox: string | null;
  doors: string | null;
  seats: string | null;
  drive: string | null;
  bodyType: string | null;
  wheelSize: string | null;
  co2: string | null;
  maxSpeed: string | null;
  weight: string | null;
}

async function fetchVincario(vin: string): Promise<VincarioResult | null> {
  const apiKey    = process.env.VINCARIO_API_KEY;
  const secretKey = process.env.VINCARIO_SECRET_KEY;
  if (!apiKey || !secretKey) return null;

  const vinUp   = vin.toUpperCase();
  const control = createHash('sha1')
    .update(`${vinUp}|decode|${apiKey}|${secretKey}`)
    .digest('hex')
    .substring(0, 10);

  const url = `https://api.vincario.com/3.2/${apiKey}/${control}/decode/${vinUp}.json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!res.ok) {
    console.error('[vincario] HTTP', res.status);
    return null;
  }

  const json = await res.json();
  const rows: { label: string; value: unknown }[] = Array.isArray(json?.decode) ? json.decode : [];

  const get = (label: string): string | null => {
    const row = rows.find(r =>
      r.label.toLowerCase() === label.toLowerCase() ||
      r.label.toLowerCase().includes(label.toLowerCase())
    );
    if (!row || row.value == null || row.value === '') return null;
    if (Array.isArray(row.value)) return row.value.length > 0 ? String(row.value[0]) : null;
    return String(row.value).trim() || null;
  };

  const make   = get('Make');
  const model  = get('Model');
  const series = get('Series') || get('Trim') || get('Variant') || get('Version');

  const hp = parseFloat(get('Engine Power (HP)') || '');
  const kw = parseFloat(get('Engine Power (kW)') || '');
  const powerPs = !isNaN(hp) && hp > 0 ? String(Math.round(hp))
                : !isNaN(kw) && kw > 0 ? String(Math.round(kw * 1.36)) : null;

  const cc = parseFloat(get('Engine Displacement (ccm)') || '');

  const tx = (get('Transmission') || get('Transmission (full)') || '').toLowerCase();
  let gearbox: string | null = null;
  if (tx.includes('dsg') || tx.includes('s tronic') || tx.includes('dct')) gearbox = 'DSG';
  else if (tx.includes('pdk') || tx.includes('tiptronic'))                  gearbox = 'PDK';
  else if (tx.includes('cvt'))                                               gearbox = 'CVT';
  else if (tx.includes('auto'))                                              gearbox = 'Automatik';
  else if (tx.includes('manual') || tx.includes('schalt') || tx.includes('manuell')) gearbox = 'Schaltgetriebe';

  const result: VincarioResult = {
    brand:           make,
    model:           [model, series].filter(Boolean).join(' ') || null,
    year:            get('Model Year'),
    fuelType:        mapFuel(get('Fuel Type - Primary') || get('Fuel Type') || ''),
    powerPs,
    displacementCcm: !isNaN(cc) && cc > 0 ? String(Math.round(cc)) : null,
    gearbox,
    doors:           get('Number of Doors'),
    seats:           get('Number of Seats'),
    drive:           get('Drive'),
    bodyType:        get('Body'),
    wheelSize:       get('Wheel Size'),
    co2:             get('Average CO2 Emission (g/km)'),
    maxSpeed:        get('Max Speed (km/h)'),
    weight:          get('Weight Empty (kg)'),
  };

  console.log('[vincario] brand:', result.brand, '| model:', result.model, '| year:', result.year, '| powerPs:', result.powerPs);
  return result;
}

// ── Schritt 2: Claude — präzise Ausstattung für bekanntes Fahrzeug ────────────
async function fetchEquipment(vin: string, vincario: VincarioResult | null): Promise<{
  fuelType: string | null;
  powerPs: string | null;
  displacementCcm: string | null;
  gearbox: string | null;
  equipment: string[];
  confidence: string;
}> {
  // Kontext aus Vincario für Claude aufbereiten
  const vehicleContext = vincario
    ? `Bestätigte Fahrzeugdaten aus Herstellerdatenbank:
- Marke: ${vincario.brand || '?'}
- Modell: ${vincario.model || '?'}
- Baujahr: ${vincario.year || '?'}
- Kraftstoff: ${vincario.fuelType || 'unbekannt'}
- Leistung: ${vincario.powerPs ? vincario.powerPs + ' PS' : 'unbekannt'}
- Hubraum: ${vincario.displacementCcm ? vincario.displacementCcm + ' ccm' : 'unbekannt'}
- Getriebe: ${vincario.gearbox || 'unbekannt'}
- Karosserie: ${vincario.bodyType || 'unbekannt'}
- Türen: ${vincario.doors || 'unbekannt'}
- Antrieb: ${vincario.drive || 'unbekannt'}

Generiere die VOLLSTÄNDIGE Serienausstattung für dieses Fahrzeug.`
    : `VIN: ${vin}
WMI (1-3): WVW/WV2=VW, WAU=Audi, WBA/WBS=BMW, WDB/WDD/WDC=Mercedes, W0L=Opel, SAL=Land Rover, VF1=Renault, VF7=Citroën
BAUJAHR (Pos 10): G=2016 H=2017 J=2018 K=2019 L=2020 M=2021 N=2022 P=2023 R=2024 S=2025
ZZZ in Pos 4-6 = EU-Standard-Platzhalter, kein Fehler. Dekodiere Modell aus Pos 7-9.

Dekodiere das Fahrzeug und generiere die vollständige Serienausstattung.`;

  const vehicle = vincario
    ? `${vincario.brand || ''} ${vincario.model || ''} ${vincario.year || ''} ${vincario.bodyType || ''} ${vincario.drive || ''}`.trim()
    : `VIN ${vin} — WVW=VW, WAU=Audi, WBA=BMW, WDB=Mercedes. Pos10: G=2016 H=2017 J=2018 K=2019 L=2020 M=2021 N=2022 P=2023 R=2024. ZZZ in Pos4-6 = EU-Platzhalter.`;

  // Alle Labels aus der Datenbank — Claude soll nur diese verwenden
  const ALL_LABELS = [
    // Sicherheit
    'ABS','ESP','Fahrerairbag','Beifahrerairbag','Seitenairbags','Kopfairbags','Knieairbags','ISOFIX','Reifendruckkontrolle',
    'Einparkhilfe hinten','Einparkhilfe vorne','Einparkhilfe vorne & hinten','Rückfahrkamera','360°-Kamera',
    'Notbremsassistent','Spurhalteassistent','Totwinkel-Assistent','Müdigkeitswarner','Kollisionswarner','Bergabfahrhilfe','Berganfahrhilfe',
    // Fahrerassistenz
    'Tempomat','Adaptiver Tempomat (ACC)','Verkehrszeichenerkennung','Einparkassistent','Spurführungsassistent',
    'Fernlichtassistent','Nachtsichtkamera','Head-up Display',
    // Komfort
    'Klimaanlage','Klimaautomatik','Vierzonen-Klimaautomatik','Sitzheizung','Sitzbelüftung','Lenkradheizung',
    'Sitz-Massage','Elektrisch verstellbare Sitze','Sitz-Memory','Panoramadach','Schiebedach',
    'Standheizung','Standklimatisierung','Elektrische Heckklappe','Keyless Entry','Start-Stopp-Automatik',
    'Multifunktionslenkrad','Sprachsteuerung','Elektrisch einstell- und klappbare Außenspiegel','Automatisch abblendende Spiegel','Ambientebeleuchtung',
    // Infotainment
    'Navigationssystem','Online-Navigation','Apple CarPlay','Android Auto','Bluetooth','DAB+ Digitalradio',
    'USB-Anschluss','WLAN / WiFi Hotspot','Kabelloses Laden','Premium-Soundsystem','Touchscreen',
    'Digitales Cockpit','Connected Services / App Connect','Fond-Entertainment-System',
    // Licht
    'LED-Scheinwerfer','Xenon-Scheinwerfer','Matrix-LED / Laser-Scheinwerfer','LED-Tagfahrlicht',
    'Kurvenlicht / adaptives Licht','LED-Rückleuchten','Lichtsensor','Nebelscheinwerfer',
    // Innenausstattung
    'Lederausstattung','Kunstleder / Alcantara','Stoffausstattung','Sportsitze','7 Sitze','6 Sitze','5 Sitze',
    'Holzdekor','Aluminiumdekor','Dachhimmel schwarz','Veloursfußmatten',
    // Exterieur
    '17-Zoll-Leichtmetallfelgen','18-Zoll-Leichtmetallfelgen','19-Zoll-Leichtmetallfelgen','20-Zoll-Leichtmetallfelgen','21-Zoll-Leichtmetallfelgen',
    'Winterräder inklusive','Sportfahrwerk','Luftfederung','Anhängerkupplung','Dachreling','Spoiler','Metallic-Lackierung',
    // Antrieb
    'Allradantrieb','Hinterradantrieb','Frontantrieb','Automatikgetriebe','Schaltgetriebe',
    'Mild-Hybrid','Vollhybrid (HEV)','Plug-in-Hybrid (PHEV)','Elektroantrieb (BEV)',
    'Scheckheftgepflegt','Neuwertig / 1. Hand','Herstellergarantie',
  ];

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system:     'Du bist eine Fahrzeugausstattungs-API. Antworte NUR mit einem JSON-Objekt. Kein Text, kein Markdown, kein Code-Block. Direkt mit { beginnen.',
    messages: [{
      role:    'user',
      content: `${vehicleContext}

Wähle aus dieser Liste NUR die Merkmale, die für dieses KONKRETE Fahrzeug (Marke, Modell, Baujahr, Motorisierung) als Serienausstattung oder sehr häufige Option bekannt sind:
${ALL_LABELS.join(' | ')}

WICHTIGE REGELN:
- Nur Labels aus der obigen Liste, exakt so geschrieben
- Basis-Sicherheit: ABS, ESP, Fahrerairbag, Beifahrerairbag, Seitenairbags, Kopfairbags, ISOFIX, Reifendruckkontrolle
- powerPs EXAKT aus den Fahrzeugdaten übernehmen (${vincario?.powerPs ? vincario.powerPs + ' PS laut Herstellerdaten' : 'aus VIN schätzen'})
- Nur Ausstattungen hinzufügen die für DIESEN genauen Motor/Ausbaustufe bekannt sind
- NICHT hinzufügen: Lenkradheizung, Sitzbelüftung, Panoramadach, Anhängerkupplung — es sei denn, für dieses Modell typisch
- Keine Extras erfinden — lieber 5 weniger als 1 falsch
- fuelType auf Deutsch (Benzin/Diesel/Elektro/Hybrid)

Antworte mit diesem JSON:`,
    }],
  });

  const text = (response.content[0] as Anthropic.TextBlock).text.trim();
  console.log('[claude raw]', text.substring(0, 600));

  // JSON extrahieren — unterstützt reines JSON, Code-Fence, eingebettetes JSON
  let jsonStr = text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();
  else {
    const brace = text.match(/\{[\s\S]*\}/);
    if (brace) jsonStr = brace[0].trim();
  }

  const r = JSON.parse(jsonStr);

  return {
    fuelType:        mapFuel(r.fuelType || '') || null,
    powerPs:         r.powerPs  ? String(r.powerPs)  : r.powerKw ? String(Math.round(Number(r.powerKw) * 1.36)) : null,
    displacementCcm: r.displacementCcm ? String(r.displacementCcm) : null,
    gearbox:         r.gearbox  || null,
    equipment:       normalizeEquipmentList(Array.isArray(r.equipment) ? r.equipment : []),
    confidence:      r.confidence || 'medium',
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { vin } = await req.json();
    if (!vin || vin.length < 11) {
      return NextResponse.json({ error: 'FIN zu kurz (mind. 11 Zeichen)' }, { status: 400 });
    }

    // Schritt 1: Vincario (schnell, ~200ms)
    let vincario: VincarioResult | null = null;
    try {
      vincario = await fetchVincario(vin);
    } catch (e) {
      console.error('[vincario error]', e);
    }

    // Schritt 2: Claude mit Vincario-Kontext (präzise Ausstattung)
    // Bis zu 2 Versuche falls JSON-Parsing scheitert
    let claudeResult: Awaited<ReturnType<typeof fetchEquipment>> | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        claudeResult = await fetchEquipment(vin, vincario);
        if (claudeResult && claudeResult.equipment.length > 0) break;
      } catch (e) {
        console.error(`[claude error attempt ${attempt}]`, e);
      }
    }

    if (!vincario && !claudeResult) {
      return NextResponse.json({ error: 'FIN nicht erkannt — bitte manuell eingeben.' }, { status: 404 });
    }

    // Ergebnis zusammenführen: Vincario hat Vorrang bei Basisdaten
    const brand = vincario?.brand
      ? [vincario.brand, vincario.model].filter(Boolean).join(' ')
      : null;

    const result = {
      brand:           brand           || null,
      year:            vincario?.year  || null,
      fuelType:        vincario?.fuelType        || claudeResult?.fuelType        || null,
      powerKw:         vincario?.powerPs         || claudeResult?.powerPs         || null,
      displacementCcm: vincario?.displacementCcm || claudeResult?.displacementCcm || null,
      gearbox:         vincario?.gearbox         || claudeResult?.gearbox         || null,
      seats:           vincario?.seats           || null,
      equipment:       claudeResult?.equipment   || [],
      source:          vincario ? 'vincario+claude' : 'claude',
      confidence:      vincario ? 'high' : (claudeResult?.confidence || 'medium'),
    };

    console.log('[result] brand:', result.brand, '| powerKw:', result.powerKw, '| equip:', result.equipment.length);
    return NextResponse.json(result);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[vin-decode]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
