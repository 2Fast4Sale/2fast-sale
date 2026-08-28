import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeEquipmentList } from '../../../lib/equipmentDatabase';
import { logLlmCost, currentUserId } from '../../../lib/apiCosts';

export const dynamic = 'force-dynamic';

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

const SYSTEM_PROMPT = `Du bist der weltweit beste KI-Experte für deutsche Fahrzeugscheine (Zulassungsbescheinigung Teil I).
Du erkennst jeden Code, jedes Feld und jede Abkürzung präzise.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt. Kein Text, kein Markdown, kein Code-Block. Direkt mit { beginnen.`;

const USER_PROMPT = `Analysiere diesen deutschen Fahrzeugschein (Zulassungsbescheinigung Teil I) mit maximaler Präzision.

═══ FELDER DES FAHRZEUGSCHEINS ═══

PFLICHTFELDER (immer ausfüllen):
• D.1: Marke (Hersteller)
• D.3: Handelsbezeichnung / Modell (vollständig inkl. Variante/Trim)
• E: FIN / VIN (17 Zeichen, exakt wie abgedruckt)
• B: Datum der Erstzulassung → Format MM/JJJJ
• P.1: Hubraum in cm³ (nur Zahl)
• P.2: Nennleistung in kW — EXAKT so ablesen wie abgedruckt, NICHT umrechnen
• P.3: Kraftstoffart → "Benzin" | "Diesel" | "Elektro" | "Hybrid" | "Plug-in Hybrid" | "LPG" | "CNG"
• R: Farbe des Fahrzeugs (auf Deutsch, z.B. "Schwarz", "Silber Metallic", "Perlweiß")
• S.1: Anzahl Sitzplätze gesamt (inkl. Fahrer)
• G: Leermasse in kg
• Anzahl Türen (2, 3, 4 oder 5) — steht in keinem nummerierten Feld. Nur
  angeben, wenn eine Zeile "Anzahl der Türen" oder "Türen" ausdrücklich
  vorhanden ist. NICHT aus Feld 22 ableiten: Dort stehen die
  Ausstattungscodes, keine Türenzahl.
• Feld 14 / 14.1 ("Emissionsklasse" oder "zu 14"): Schadstoffklasse → "Euro 4" | "Euro 5" | "Euro 6" | "Euro 6d-Temp" | "Euro 6d"
• Antriebsart, falls erkennbar → "Frontantrieb" | "Heckantrieb" | "Allrad"
• Feld 4 ("Fahrzeugklasse und Aufbau"): Gib den Aufbau GENAU SO zurueck,
  wie er dort steht — Buchstabencode und/oder Text, z.B. "AC", "AC0002",
  "AA LIMOUSINE", "KOMBILIMOUSINE". Nicht deuten, nicht uebersetzen,
  nicht auf eine Verkaufskategorie umrechnen. Das macht die Anwendung.
  Steht dort nichts Lesbares: null.

ZUSATZFELDER (wenn sichtbar):
• T: Höchstgeschwindigkeit km/h
• V.7: CO2-Emission g/km
• O.1: Zul. Anhängelast gebremst kg

═══ FELD 22 — SCHLÜSSELNUMMERN (KERN DER AUSSTATTUNG) ═══

Lies ALLE Codes aus Feld 22 vollständig ab und übersetze jeden einzelnen.

── VW / AUDI / SEAT / SKODA (VAG-Gruppe) ──
0E3=Sitzheizung vorne+hinten | 1E1=Sportfahrwerk | 1Z7=Anhängerkupplung | 2C1=Dachreling | 3C4=Fensterheber elektrisch | 3KA=Parkpilot hinten | 3KG=Parkpilot vorne+hinten | 4A3=Ambientebeleuchtung | 4K1=Klimaautomatik 4-Zonen | 4L2=Dachreling Alu | 5DF=Nebelscheinwerfer | 5G0=DAB-Radio | 5IT=Innenraumbeleuchtung LED | 5MG=Digitales Cockpit | 5NA=Verkehrszeichenerkennung | 5TG=Display Radio 8" | 6FA=Sitzheizung hinten | 6K8=Standheizung | 7X2=Einparkhilfe hinten | 8IT=Einparkhilfe hinten | 8IU=Rückfahrkamera | 8IY=Einparkhilfe vorne+hinten | 9S1=App-Connect CarPlay/Android | AU3=Einparkhilfe Automatik | EC1=Sitzheizung vorne | GX3=Tempomat | GW1=Klimaautomatik | GW5=Klimaanlage | IQ4=Totwinkelassistent | IW3=Müdigkeitswarner | IW7=Notbremsassistent | IW9=Spurhalteassistent | JA1=Adaptiver Tempomat | KA2=LED-Scheinwerfer vorne | KA5=Matrix-LED-Scheinwerfer | KH2=Xenon-Scheinwerfer | MFL=Multifunktionslenkrad | N1U=Lederausstattung | N2H=Kunstleder/Alcantara | NN2=Stoffausstattung | NW1=Sportsitze | QC5=Sitz-Memory | QG0=Schalensitze | QQ6=Sitzheizung | RFK=Rückfahrkamera | RNS=Navigationssystem | RNS2=Navigation Plus | R0A=Online-Navigation | UL6=Head-up Display

── BMW / MINI ──
205=Tempomat | 302=Klimaautomatik | 351=Reserveradmulde | 403=Lederausstattung | 410=Lederlenkrad | 416=Sportsitze | 420=Sitz-Memory Fahrer | 422=Sitzheizung vorne | 428=Sitzheizung hinten | 431=Sitzlüftung | 442=Elektrische Sitzverstellung | 490=Komfortzugang/Keyless | 508=Navigationssystem Professional | 514=DAB+ | 521=Bluetooth | 534=Bluetooth Handyvorbereitung | 544=USB | 552=Apple CarPlay | 563=Harman-Kardon Sound | 609=Xenon-Scheinwerfer | 610=LED-Scheinwerfer | 612=LED-Nebelscheinwerfer | 676=Panoramadach | 710=Rückfahrkamera | 760=Head-up Display | 775=Adaptiver Tempomat | 801=Spurhalteassistent | 817=Totwinkelassistent | 851=Einparkhilfe hinten | 853=Einparkhilfe vorne+hinten | 8TH=360°-Kamera | 875=Verkehrszeichenerkennung | 877=Notbremsassistent | 879=Aktiver Spurhalte-Assistent | 945=Anhängerkupplung | 982=Fernlichtassistent | 1CB=Ambientebeleuchtung | 1CA=Ambientebeleuchtung erweiterbar | 2PA=M-Sportpaket | 3AG=Standheizung

── MERCEDES-BENZ ──
H04=Sportsitze | H05=7-Sitzer | H15=Artico-Kunstleder | H16=Lederausstattung Nappa | H60=Lederlenkrad | H65=Sitzheizung vorne | H66=Sitzheizung vorne+hinten | H82=Elektrische Sitzverstellung | H89=Klimaautomatik 2-Zonen | H90=Klimaautomatik 4-Zonen | J25=AMG-Paket | J53=Panoramadach | J88=Schiebedach | L09=DAB+ | M04=Bluetooth | M13=Einparkhilfe hinten | M17=Einparkhilfe vorne+hinten | M29=Aktiver Park-Assistent | M30=Rückfahrkamera | M55=360°-Kamera | M66=Totwinkelassistent | M71=Fernlichtassistent | M79=Verkehrszeichenerkennung | M8U=Keyless-Go | N06=Navigationssystem | M78=Spurhalteassistent | N36=Head-up Display | N68=Apple CarPlay | P81=Adaptiver Tempomat | P84=Tempomat | R70=USB | U60=Multifunktionslenkrad | U28=LED-Scheinwerfer | X63=Anhängerkupplung

── OPEL / VAUXHALL ──
A01=Klimaanlage | A34=Klimaautomatik 2-Zonen | B20=Sitzheizung vorne | E35=Sitzheizung vorne+hinten | F01=Lederausstattung | J31=Panoramadach | K03=Rückfahrkamera | K44=Einparkhilfe hinten | K45=Einparkhilfe vorne+hinten | L00=Navigationssystem | M88=Digitales Cockpit | N40=Totwinkelassistent | P01=Tempomat | P61=Adaptiver Tempomat | S52=Navigationssystem | S67=Bluetooth | T38=DAB+ | W60=Einparkhilfe hinten

── FORD ──
AAS=Navigationssystem | ACE=Rückfahrkamera | ACL=Einparkhilfe hinten | ACP=Einparkhilfe vorne+hinten | AGN=Sitzheizung | AHV=Klimaautomatik | AHX=Klimaanlage | APX=DAB+ | ATR=Tempomat | AUP=Adaptiver Tempomat | AUT=Spurhalteassistent | AUV=Notbremsassistent | CUE=LED-Scheinwerfer | DGE=Bluetooth | FPO=Lederausstattung | FSC=Panoramadach

── RENAULT / NISSAN / DACIA ──
7711=Klimaautomatik | 7714=Sitzheizung | 7718=Navigationssystem | 7720=Bluetooth | 7723=Einparkhilfe hinten | 7724=Rückfahrkamera | 7727=DAB+ | 7730=LED-Scheinwerfer | 7731=Totwinkelassistent | 7740=Tempomat | 7745=Adaptiver Tempomat

── UNIVERSELLE KBA-SCHLÜSSEL & ABKÜRZUNGEN ──
ACC=Adaptiver Tempomat | AHK=Anhängerkupplung | AHV=Anhängerkupplung abnehmbar | ALU=Leichtmetallfelgen | AMB=Ambientebeleuchtung | BT=Bluetooth | CAM=Rückfahrkamera | CARPLAY=Apple CarPlay | DAB=DAB+ Digitalradio | DSG=DSG-Getriebe | ESP=ESP | GSD=Glasdach/Schiebedach | HEAD-UP=Head-up Display | HUD=Head-up Display | IQ=LED-Matrix | ISOFIX=ISOFIX | KEYLESS=Keyless Entry/Go | KLA=Klimaautomatik | KLIMA=Klimaanlage | LEDER=Lederausstattung | LED=LED-Scheinwerfer | LHZ=Lenkradheizung | LMF=Leichtmetallfelgen | MFL=Multifunktionslenkrad | NAVI=Navigationssystem | P2W=Einparkhilfe hinten | PDC=Einparkhilfe | PDCV=Einparkhilfe vorne | RFK=Rückfahrkamera | SH=Standheizung | SHA=Schaltgetriebe | SHZ=Sitzheizung | STHZ=Standheizung | TEMP=Tempomat | XENON=Xenon-Scheinwerfer | WINTER=Winterräder

═══ SCHRITT 3 — TRIM-LEVEL AUSSTATTUNG ═══

Erkennst du Ausstattungsnamen → füge typische Merkmale dieser Linie hinzu:
• VW: Comfortline, Highline, R-Line, GTI, GTD, GTE, Allstar, Move
• Audi: Sport, S line, S-Tronic, quattro, Ambition, Attraction
• BMW: Sport, M Sport, xDrive, Luxury, M-Paket
• Mercedes: Avantgarde, Exclusive, AMG-Line, AMG, Night, Progressive
• Opel: Edition, Elegance, GS Line, OPC, Business
• Ford: Titanium, ST-Line, Vignale, Active
• Renault: Life, Zen, Business, Intens, RS

═══ AUSGABE ═══

Gibt es Codes die du nicht kennst → übersetze sie bestmöglich aus dem Kontext.
Füge ALLE erkannten Merkmale ein. Lieber 5 zu viel als 1 zu wenig.
powerKw = der Wert aus Feld P.2, unveraendert. Fuehrende Nullen weglassen (0081 wird zu 81).
Rechne NICHT in PS um — das macht die Anwendung.

WICHTIG zu doors, emissionClass und driveType: Diese drei stehen NICHT auf
jedem Fahrzeugschein. Wenn du sie nicht ablesen kannst, gib null zurück.
NICHT raten und NICHT aus dem Modell ableiten — eine erfundene
Schadstoffklasse im Inserat ist eine falsche Zusicherung, und der
Händler haftet dafür.

Gib exakt dieses JSON zurück (keine anderen Felder, keine Kommentare):
{
  "brand": "Marke Modell Variante",
  "vin": "XXXXXXXXXXXXXXXXX",
  "firstRegistration": "MM/JJJJ",
  "displacementCcm": 1968,
  "powerKw": 110,
  "fuelType": "Diesel",
  "color": "Farbe",
  "seats": 5,
  "grossWeightKg": 2100,
  "doors": 5,
  "emissionClass": "Euro 6d",
  "driveType": "Frontantrieb",
  "aufbau": "AC KOMBILIMOUSINE",
  "equipment": ["alle erkannten Merkmale auf Deutsch, mind. 15 wenn irgendwie möglich"]
}`;

// ── Labels aus der Datenbank für Normalisierung ──────────────────────────────
const DB_LABELS = [
  'ABS','ESP','Fahrerairbag','Beifahrerairbag','Seitenairbags','Kopfairbags','Knieairbags','ISOFIX','Reifendruckkontrolle',
  'Einparkhilfe hinten','Einparkhilfe vorne','Einparkhilfe vorne & hinten','Rückfahrkamera','360°-Kamera',
  'Notbremsassistent','Spurhalteassistent','Totwinkel-Assistent','Müdigkeitswarner','Kollisionswarner',
  'Bergabfahrhilfe','Berganfahrhilfe','Tempomat','Adaptiver Tempomat (ACC)','Verkehrszeichenerkennung',
  'Einparkassistent','Spurführungsassistent','Fernlichtassistent','Nachtsichtkamera','Head-up Display',
  'Klimaanlage','Klimaautomatik','Vierzonen-Klimaautomatik','Sitzheizung','Sitzbelüftung','Lenkradheizung',
  'Sitz-Massage','Elektrisch verstellbare Sitze','Sitz-Memory','Panoramadach','Schiebedach',
  'Standheizung','Standklimatisierung','Elektrische Heckklappe','Keyless Entry','Start-Stopp-Automatik',
  'Multifunktionslenkrad','Sprachsteuerung','Elektrisch einstell- und klappbare Außenspiegel',
  'Automatisch abblendende Spiegel','Ambientebeleuchtung',
  'Navigationssystem','Online-Navigation','Apple CarPlay','Android Auto','Bluetooth','DAB+ Digitalradio',
  'USB-Anschluss','WLAN / WiFi Hotspot','Kabelloses Laden','Premium-Soundsystem','Touchscreen',
  'Digitales Cockpit','Connected Services / App Connect',
  'LED-Scheinwerfer','Xenon-Scheinwerfer','Matrix-LED / Laser-Scheinwerfer','LED-Tagfahrlicht',
  'Kurvenlicht / adaptives Licht','LED-Rückleuchten','Lichtsensor','Nebelscheinwerfer',
  'Lederausstattung','Kunstleder / Alcantara','Stoffausstattung','Sportsitze',
  'Holzdekor','Aluminiumdekor','Dachhimmel schwarz','Veloursfußmatten',
  '16-Zoll-Leichtmetallfelgen','17-Zoll-Leichtmetallfelgen','18-Zoll-Leichtmetallfelgen',
  '19-Zoll-Leichtmetallfelgen','20-Zoll-Leichtmetallfelgen','21-Zoll-Leichtmetallfelgen',
  'Winterräder inklusive','Sportfahrwerk','Luftfederung','Anhängerkupplung','Dachreling',
  'Spoiler','Metallic-Lackierung','Allradantrieb','Hinterradantrieb','Frontantrieb',
  'Automatikgetriebe','Schaltgetriebe','Mild-Hybrid','Vollhybrid (HEV)','Plug-in-Hybrid (PHEV)',
  'Elektroantrieb (BEV)','Scheckheftgepflegt','Neuwertig / 1. Hand','Herstellergarantie',
];

export async function POST(req: Request) {
  try {
    const { image, draftId } = await req.json();
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

    await logLlmCost({
      userId: await currentUserId(),
      draftId: draftId ?? null,
      operation: 'scan-doc',
      model: 'claude-opus-4-8',
      usage: response.usage,
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

    /*
     * Leistung: Der Fahrzeugschein nennt in Feld P.2 immer kW. Die Umrechnung
     * in PS macht die Anwendung, nicht das Modell — ein Sprachmodell soll
     * ablesen, nicht rechnen. Vorher stand die Multiplikation im Prompt, und
     * ein Rechenfehler landete ungeprueft im Formular (ein 1.6 TDI mit 81 kW
     * erschien als 490 PS).
     *
     * Plausibilitaetspruefung dazu: Leistung je Liter Hubraum. Serienfahrzeuge
     * liegen bei 40 bis 150 PS/l, extreme Sportwagen bei etwa 200. Alles
     * darueber ist ein Lesefehler und wird verworfen — ein leeres Feld ist
     * besser als eine falsche Zahl, die der Haendler ungeprueft uebernimmt.
     */
    /*
     * Karosserieform aus Feld 4 — aber nur, wo sie eindeutig ist.
     *
     * Der Fahrzeugschein kennt die EU-Aufbauarten AA bis AG. Sie sind
     * groeber als die Kategorien der Verkaufsportale, und an einer
     * Stelle gehen sie gar nicht auf: Ein SUV hat keinen eigenen Code.
     * Ein Tiguan ist als AC (Kombi) oder AF (Mehrzweckfahrzeug)
     * eingetragen — genau wie ein Passat Variant oder ein Touran.
     *
     * Deshalb werden nur die vier eindeutigen Faelle uebernommen. Bei
     * AB, AC und AF bleibt das Feld leer und der Haendler waehlt
     * selbst. Das ist unbequemer als eine Vorbelegung, aber eine
     * falsche Karosserieform im Inserat faellt niemandem auf und steht
     * am Ende trotzdem drin.
     */
    /*
     * `\bAA\d*\b` statt `\bAA\b`: In Feld 4 steht der Code oft mit
     * angehaengter Ziffernfolge ("AA0002"). Zwischen Buchstabe und
     * Ziffer liegt keine Wortgrenze, ein blosses `\bAA\b` findet ihn
     * dort also nicht.
     *
     * "Pritsche" steht bewusst nicht dabei, obwohl es zu AG passt: Ein
     * Pritschenwagen ist im Verkauf eher ein Transporter als ein
     * Gelaendewagen. Im Zweifel lieber leer.
     */
    const AUFBAU: Array<[RegExp, string]> = [
      [/\bAE\d*\b|kabrio|cabrio|roadster/i,        'Cabrio / Roadster'],
      [/\bAD\d*\b|coup[ée]/i,                      'Coupé'],
      [/\bAG\d*\b|pick.?up/i,                      'SUV / Geländewagen'],
      [/\bAA\d*\b|stufenheck|(?<!kombi)limousine/i,'Limousine'],
    ];
    const aufbau = typeof result.aufbau === 'string' ? result.aufbau.trim() : '';
    delete result.aufbau;
    if (aufbau) {
      const treffer = AUFBAU.find(([muster]) => muster.test(aufbau));
      if (treffer) result.bodyType = treffer[1];
      else console.log('[scan-doc] Aufbau nicht eindeutig, Feld bleibt leer:', aufbau);
    }

    const kw = Number(result.powerKw);
    const ccm = Number(result.displacementCcm);

    if (Number.isFinite(kw) && kw > 0) {
      const ps = Math.round(kw * 1.3596);
      const psProLiter = Number.isFinite(ccm) && ccm > 0 ? ps / (ccm / 1000) : null;

      if (ps < 15 || ps > 2000 || (psProLiter !== null && psProLiter > 250)) {
        console.error('[scan-doc] Leistung unplausibel, verworfen:',
          { kw, ccm, ps, psProLiter: psProLiter?.toFixed(0) });
        delete result.powerPs;
        delete result.powerKw;
      } else {
        result.powerPs = ps;
        delete result.powerKw;
      }
    } else if (result.powerPs) {
      // Aeltere Antwortform: das Modell hat schon PS geliefert
      const ps = Number(result.powerPs);
      const psProLiter = Number.isFinite(ccm) && ccm > 0 ? ps / (ccm / 1000) : null;
      if (!Number.isFinite(ps) || ps < 15 || ps > 2000 || (psProLiter !== null && psProLiter > 250)) {
        console.error('[scan-doc] Leistung unplausibel, verworfen:', { ps, ccm });
        delete result.powerPs;
      }
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
        // Nicht in DB → Originaltext behalten (z.B. "Panoramadach elektrisch")
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

