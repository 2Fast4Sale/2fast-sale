import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeEquipmentList } from '../../../lib/equipmentDatabase';

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function toImageBlock(img: string): Anthropic.ImageBlockParam {
  if (img.startsWith('data:')) {
    const [header, data] = img.split(',');
    const mediaType = header.split(':')[1].split(';')[0] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
  }
  return { type: 'image', source: { type: 'url', url: img } };
}

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) return brace[0].trim();
  return text.trim();
}

const SYSTEM_PROMPT = `Du bist der weltweit beste KI-Experte fÃ¼r deutsche Fahrzeugscheine (Zulassungsbescheinigung Teil I).
Du erkennst jeden Code, jedes Feld und jede AbkÃ¼rzung prÃ¤zise.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Text, kein Markdown, kein Code-Block. Direkt mit { beginnen.`;

const USER_PROMPT = `Analysiere diesen deutschen Fahrzeugschein (Zulassungsbescheinigung Teil I) mit maximaler PrÃ¤zision.

â•â•â• FELDER DES FAHRZEUGSCHEINS â•â•â•

PFLICHTFELDER (immer ausfÃ¼llen):
â€¢ D.1: Marke (Hersteller)
â€¢ D.3: Handelsbezeichnung / Modell (vollstÃ¤ndig inkl. Variante/Trim)
â€¢ E: FIN / VIN (17 Zeichen, exakt wie abgedruckt)
â€¢ B: Datum der Erstzulassung â†’ Format MM/JJJJ
â€¢ P.1: Hubraum in cmÂ³ (nur Zahl)
â€¢ P.2: Leistung in kW â†’ in PS umrechnen: kW Ã— 1,3596 (runden)
â€¢ P.3: Kraftstoffart â†’ "Benzin" | "Diesel" | "Elektro" | "Hybrid" | "Plug-in Hybrid" | "LPG" | "CNG"
â€¢ R: Farbe des Fahrzeugs (auf Deutsch, z.B. "Schwarz", "Silber Metallic", "PerlweiÃŸ")
â€¢ S.1: Anzahl SitzplÃ¤tze gesamt (inkl. Fahrer)
â€¢ G: Leermasse in kg

ZUSATZFELDER (wenn sichtbar):
â€¢ T: HÃ¶chstgeschwindigkeit km/h
â€¢ V.7: CO2-Emission g/km
â€¢ O.1: Zul. AnhÃ¤ngelast gebremst kg

â•â•â• FELD 22 â€” SCHLÃœSSELNUMMERN (KERN DER AUSSTATTUNG) â•â•â•

Lies ALLE Codes aus Feld 22 vollstÃ¤ndig ab und Ã¼bersetze jeden einzelnen.

â”€â”€ VW / AUDI / SEAT / SKODA (VAG-Gruppe) â”€â”€
0E3=Sitzheizung vorne+hinten | 1E1=Sportfahrwerk | 1Z7=AnhÃ¤ngerkupplung | 2C1=Dachreling | 3C4=Fensterheber elektrisch | 3KA=Parkpilot hinten | 3KG=Parkpilot vorne+hinten | 4A3=Ambientebeleuchtung | 4K1=Klimaautomatik 4-Zonen | 4L2=Dachreling Alu | 5DF=Nebelscheinwerfer | 5G0=DAB-Radio | 5IT=Innenraumbeleuchtung LED | 5MG=Digitales Cockpit | 5NA=Verkehrszeichenerkennung | 5TG=Display Radio 8" | 6FA=Sitzheizung hinten | 6K8=Standheizung | 7X2=Einparkhilfe hinten | 8IT=Einparkhilfe hinten | 8IU=RÃ¼ckfahrkamera | 8IY=Einparkhilfe vorne+hinten | 9S1=App-Connect CarPlay/Android | AU3=Einparkhilfe Automatik | EC1=Sitzheizung vorne | GX3=Tempomat | GW1=Klimaautomatik | GW5=Klimaanlage | IQ4=Totwinkelassistent | IW3=MÃ¼digkeitswarner | IW7=Notbremsassistent | IW9=Spurhalteassistent | JA1=Adaptiver Tempomat | KA2=LED-Scheinwerfer vorne | KA5=Matrix-LED-Scheinwerfer | KH2=Xenon-Scheinwerfer | MFL=Multifunktionslenkrad | N1U=Lederausstattung | N2H=Kunstleder/Alcantara | NN2=Stoffausstattung | NW1=Sportsitze | QC5=Sitz-Memory | QG0=Schalensitze | QQ6=Sitzheizung | RFK=RÃ¼ckfahrkamera | RNS=Navigationssystem | RNS2=Navigation Plus | R0A=Online-Navigation | UL6=Head-up Display

â”€â”€ BMW / MINI â”€â”€
205=Tempomat | 302=Klimaautomatik | 351=Reserveradmulde | 403=Lederausstattung | 410=Lederlenkrad | 416=Sportsitze | 420=Sitz-Memory Fahrer | 422=Sitzheizung vorne | 428=Sitzheizung hinten | 431=SitzlÃ¼ftung | 442=Elektrische Sitzverstellung | 490=Komfortzugang/Keyless | 508=Navigationssystem Professional | 514=DAB+ | 521=Bluetooth | 534=Bluetooth Handyvorbereitung | 544=USB | 552=Apple CarPlay | 563=Harman-Kardon Sound | 609=Xenon-Scheinwerfer | 610=LED-Scheinwerfer | 612=LED-Nebelscheinwerfer | 676=Panoramadach | 710=RÃ¼ckfahrkamera | 760=Head-up Display | 775=Adaptiver Tempomat | 801=Spurhalteassistent | 817=Totwinkelassistent | 851=Einparkhilfe hinten | 853=Einparkhilfe vorne+hinten | 8TH=360Â°-Kamera | 875=Verkehrszeichenerkennung | 877=Notbremsassistent | 879=Aktiver Spurhalte-Assistent | 945=AnhÃ¤ngerkupplung | 982=Fernlichtassistent | 1CB=Ambientebeleuchtung | 1CA=Ambientebeleuchtung erweiterbar | 2PA=M-Sportpaket | 3AG=Standheizung

â”€â”€ MERCEDES-BENZ â”€â”€
H04=Sportsitze | H05=7-Sitzer | H15=Artico-Kunstleder | H16=Lederausstattung Nappa | H60=Lederlenkrad | H65=Sitzheizung vorne | H66=Sitzheizung vorne+hinten | H82=Elektrische Sitzverstellung | H89=Klimaautomatik 2-Zonen | H90=Klimaautomatik 4-Zonen | J25=AMG-Paket | J53=Panoramadach | J88=Schiebedach | L09=DAB+ | M04=Bluetooth | M13=Einparkhilfe hinten | M17=Einparkhilfe vorne+hinten | M29=Aktiver Park-Assistent | M30=RÃ¼ckfahrkamera | M55=360Â°-Kamera | M66=Totwinkelassistent | M71=Fernlichtassistent | M79=Verkehrszeichenerkennung | M8U=Keyless-Go | N06=Navigationssystem | M78=Spurhalteassistent | N36=Head-up Display | N68=Apple CarPlay | P81=Adaptiver Tempomat | P84=Tempomat | R70=USB | U60=Multifunktionslenkrad | U28=LED-Scheinwerfer | X63=AnhÃ¤ngerkupplung

â”€â”€ OPEL / VAUXHALL â”€â”€
A01=Klimaanlage | A34=Klimaautomatik 2-Zonen | B20=Sitzheizung vorne | E35=Sitzheizung vorne+hinten | F01=Lederausstattung | J31=Panoramadach | K03=RÃ¼ckfahrkamera | K44=Einparkhilfe hinten | K45=Einparkhilfe vorne+hinten | L00=Navigationssystem | M88=Digitales Cockpit | N40=Totwinkelassistent | P01=Tempomat | P61=Adaptiver Tempomat | S52=Navigationssystem | S67=Bluetooth | T38=DAB+ | W60=Einparkhilfe hinten

â”€â”€ FORD â”€â”€
AAS=Navigationssystem | ACE=RÃ¼ckfahrkamera | ACL=Einparkhilfe hinten | ACP=Einparkhilfe vorne+hinten | AGN=Sitzheizung | AHV=Klimaautomatik | AHX=Klimaanlage | APX=DAB+ | ATR=Tempomat | AUP=Adaptiver Tempomat | AUT=Spurhalteassistent | AUV=Notbremsassistent | CUE=LED-Scheinwerfer | DGE=Bluetooth | FPO=Lederausstattung | FSC=Panoramadach

â”€â”€ RENAULT / NISSAN / DACIA â”€â”€
7711=Klimaautomatik | 7714=Sitzheizung | 7718=Navigationssystem | 7720=Bluetooth | 7723=Einparkhilfe hinten | 7724=RÃ¼ckfahrkamera | 7727=DAB+ | 7730=LED-Scheinwerfer | 7731=Totwinkelassistent | 7740=Tempomat | 7745=Adaptiver Tempomat

â”€â”€ UNIVERSELLE KBA-SCHLÃœSSEL & ABKÃœRZUNGEN â”€â”€
ACC=Adaptiver Tempomat | AHK=AnhÃ¤ngerkupplung | AHV=AnhÃ¤ngerkupplung abnehmbar | ALU=Leichtmetallfelgen | AMB=Ambientebeleuchtung | BT=Bluetooth | CAM=RÃ¼ckfahrkamera | CARPLAY=Apple CarPlay | DAB=DAB+ Digitalradio | DSG=DSG-Getriebe | ESP=ESP | GSD=Glasdach/Schiebedach | HEAD-UP=Head-up Display | HUD=Head-up Display | IQ=LED-Matrix | ISOFIX=ISOFIX | KEYLESS=Keyless Entry/Go | KLA=Klimaautomatik | KLIMA=Klimaanlage | LEDER=Lederausstattung | LED=LED-Scheinwerfer | LHZ=Lenkradheizung | LMF=Leichtmetallfelgen | MFL=Multifunktionslenkrad | NAVI=Navigationssystem | P2W=Einparkhilfe hinten | PDC=Einparkhilfe | PDCV=Einparkhilfe vorne | RFK=RÃ¼ckfahrkamera | SH=Standheizung | SHA=Schaltgetriebe | SHZ=Sitzheizung | STHZ=Standheizung | TEMP=Tempomat | XENON=Xenon-Scheinwerfer | WINTER=WinterrÃ¤der

â•â•â• SCHRITT 3 â€” TRIM-LEVEL AUSSTATTUNG â•â•â•

Erkennst du Ausstattungsnamen â†’ fÃ¼ge typische Merkmale dieser Linie hinzu:
â€¢ VW: Comfortline, Highline, R-Line, GTI, GTD, GTE, Allstar, Move
â€¢ Audi: Sport, S line, S-Tronic, quattro, Ambition, Attraction
â€¢ BMW: Sport, M Sport, xDrive, Luxury, M-Paket
â€¢ Mercedes: Avantgarde, Exclusive, AMG-Line, AMG, Night, Progressive
â€¢ Opel: Edition, Elegance, GS Line, OPC, Business
â€¢ Ford: Titanium, ST-Line, Vignale, Active
â€¢ Renault: Life, Zen, Business, Intens, RS

â•â•â• AUSGABE â•â•â•

Gibt es Codes die du nicht kennst â†’ Ã¼bersetze sie bestmÃ¶glich aus dem Kontext.
FÃ¼ge ALLE erkannten Merkmale ein. Lieber 5 zu viel als 1 zu wenig.
powerPs = kW aus P.2 Ã— 1.3596 (gerundet auf ganze Zahl).

Gib exakt dieses JSON zurÃ¼ck (keine anderen Felder, keine Kommentare):
{
  "brand": "Marke Modell Variante",
  "vin": "XXXXXXXXXXXXXXXXX",
  "firstRegistration": "MM/JJJJ",
  "displacementCcm": 1968,
  "powerPs": 150,
  "fuelType": "Diesel",
  "color": "Farbe",
  "seats": 5,
  "grossWeightKg": 2100,
  "equipment": ["alle erkannten Merkmale auf Deutsch, mind. 15 wenn irgendwie mÃ¶glich"]
}`;

// â”€â”€ Labels aus der Datenbank fÃ¼r Normalisierung â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DB_LABELS = [
  'ABS','ESP','Fahrerairbag','Beifahrerairbag','Seitenairbags','Kopfairbags','Knieairbags','ISOFIX','Reifendruckkontrolle',
  'Einparkhilfe hinten','Einparkhilfe vorne','Einparkhilfe vorne & hinten','RÃ¼ckfahrkamera','360Â°-Kamera',
  'Notbremsassistent','Spurhalteassistent','Totwinkel-Assistent','MÃ¼digkeitswarner','Kollisionswarner',
  'Bergabfahrhilfe','Berganfahrhilfe','Tempomat','Adaptiver Tempomat (ACC)','Verkehrszeichenerkennung',
  'Einparkassistent','SpurfÃ¼hrungsassistent','Fernlichtassistent','Nachtsichtkamera','Head-up Display',
  'Klimaanlage','Klimaautomatik','Vierzonen-Klimaautomatik','Sitzheizung','SitzbelÃ¼ftung','Lenkradheizung',
  'Sitz-Massage','Elektrisch verstellbare Sitze','Sitz-Memory','Panoramadach','Schiebedach',
  'Standheizung','Standklimatisierung','Elektrische Heckklappe','Keyless Entry','Start-Stopp-Automatik',
  'Multifunktionslenkrad','Sprachsteuerung','Elektrisch einstell- und klappbare AuÃŸenspiegel',
  'Automatisch abblendende Spiegel','Ambientebeleuchtung',
  'Navigationssystem','Online-Navigation','Apple CarPlay','Android Auto','Bluetooth','DAB+ Digitalradio',
  'USB-Anschluss','WLAN / WiFi Hotspot','Kabelloses Laden','Premium-Soundsystem','Touchscreen',
  'Digitales Cockpit','Connected Services / App Connect',
  'LED-Scheinwerfer','Xenon-Scheinwerfer','Matrix-LED / Laser-Scheinwerfer','LED-Tagfahrlicht',
  'Kurvenlicht / adaptives Licht','LED-RÃ¼ckleuchten','Lichtsensor','Nebelscheinwerfer',
  'Lederausstattung','Kunstleder / Alcantara','Stoffausstattung','Sportsitze',
  'Holzdekor','Aluminiumdekor','Dachhimmel schwarz','VeloursfuÃŸmatten',
  '16-Zoll-Leichtmetallfelgen','17-Zoll-Leichtmetallfelgen','18-Zoll-Leichtmetallfelgen',
  '19-Zoll-Leichtmetallfelgen','20-Zoll-Leichtmetallfelgen','21-Zoll-Leichtmetallfelgen',
  'WinterrÃ¤der inklusive','Sportfahrwerk','Luftfederung','AnhÃ¤ngerkupplung','Dachreling',
  'Spoiler','Metallic-Lackierung','Allradantrieb','Hinterradantrieb','Frontantrieb',
  'Automatikgetriebe','Schaltgetriebe','Mild-Hybrid','Vollhybrid (HEV)','Plug-in-Hybrid (PHEV)',
  'Elektroantrieb (BEV)','Scheckheftgepflegt','Neuwertig / 1. Hand','Herstellergarantie',
];

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'Kein Bild' }, { status: 400 });

    const response = await getAnthropic().messages.create({
      model:      'claude-opus-4-8',
      max_tokens: 2000,
      system:     SYSTEM_PROMPT,
      messages:   [{
        role:    'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          toImageBlock(image),
        ],
      }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text;
    console.log('[scan-doc raw]', text.substring(0, 300));

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(extractJson(text));
    } catch (e) {
      console.error('[scan-doc] JSON parse error:', text.substring(0, 500));
      return NextResponse.json({ error: 'Dokument konnte nicht gelesen werden' }, { status: 422 });
    }

    // powerKw Feld rÃ¼ckwÃ¤rtskompatibel â€” Scanner gibt jetzt powerPs direkt
    // Fallback: falls Modell noch powerKw schickt, konvertieren
    if (result.powerKw && !result.powerPs) {
      result.powerPs = Math.round(Number(result.powerKw) * 1.3596);
      delete result.powerKw;
    }

    // Equipment normalisieren: zuerst gegen DB-Labels matchen, Rest behalten
    if (Array.isArray(result.equipment)) {
      const rawList = result.equipment as string[];
      const normalized: string[] = [];

      for (const raw of rawList) {
        const q = raw.toLowerCase().trim();
        // Exakter DB-Label-Match
        const exact = DB_LABELS.find(l => l.toLowerCase() === q);
        if (exact) { normalized.push(exact); continue; }
        // Teilstring-Match
        const partial = DB_LABELS.find(l =>
          l.toLowerCase().includes(q) || q.includes(l.toLowerCase().substring(0, 8))
        );
        if (partial) { normalized.push(partial); continue; }
        // Nicht in DB â†’ Originaltext behalten (z.B. "Panoramadach elektrisch")
        normalized.push(raw);
      }

      result.equipment = [...new Set(normalized)];
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[scan-doc]', error);
    return NextResponse.json({ error: 'Scan fehlgeschlagen', details: msg }, { status: 500 });
  }
}

