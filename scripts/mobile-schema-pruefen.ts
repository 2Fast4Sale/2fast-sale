/**
 * Prueft unser Inserat gegen die Schnittstellenbeschreibung von mobile.de.
 *
 *   npx tsx scripts/mobile-schema-pruefen.ts
 *
 * Hintergrund: mobile.de veroeffentlicht eine maschinenlesbare Beschreibung
 * ihrer Seller-API (OpenAPI 3). Darin steht, welche Felder es gibt, welchen
 * Typ sie haben und welche Werte erlaubt sind. Damit laesst sich vor jedem
 * Aufruf pruefen, was sonst erst eine Ablehnung zeigt — und Ablehnungen
 * sind bei mobile.de wortkarg: "invalid-reference-data-value" nennt nicht
 * einmal das Feld.
 *
 * Geprueft wird:
 *   1. Gibt es jedes Feld, das wir senden, ueberhaupt?
 *   2. Stimmt der Typ?
 *   3. Bei Aufzaehlungen: ist unser Wert einer der erlaubten?
 *
 * Die Beschreibung wird dabei NICHT ins Repo gelegt, sondern bei jedem
 * Lauf geholt. Eine Kopie veraltet, und eine veraltete Pruefung ist
 * schlimmer als keine.
 */

import {
  mobileKategorie, mobileKraftstoff, mobileGetriebe, mobileFarbe, mobileEuronorm,
  mobilePolsterung, mobileInnenfarbe, mobileAntrieb, laenderCode,
} from '../lib/mobileUebersetzung';
import {
  KAROSSERIE, KRAFTSTOFFE, GETRIEBE, EURONORM, POLSTERUNG, INNENFARBE, ANTRIEB,
  LAENDERVERSION,
} from '../app/dashboard/listing/step1/useEntwurf';

const QUELLE = 'https://services.sandbox.mobile.de/seller-api/openapi.json';

/* Ein vollstaendig ausgefuelltes Inserat, wie die Route es baut. */
const INSERAT: Record<string, unknown> = {
  vehicleClass: 'Car',
  make: 'VW',
  model: 'Golf',
  modelDescription: 'Volkswagen Golf',
  category: 'Limousine',
  condition: 'USED',
  fuel: 'DIESEL',
  gearbox: 'MANUAL_GEAR',
  mileage: 181268,
  firstRegistration: '201611',
  damageUnrepaired: false,
  price: {
    consumerPriceGross: '8999.00',
    type: 'FIXED',
    currency: 'EUR',
  },
  power: 81,
  cubicCapacity: 1598,
  seats: 5,
  doors: 'FOUR_OR_FIVE',
  numberOfPreviousOwners: 2,
  weight: 1320,
  trailerLoadBraked: 1500,
  trailerLoadUnbraked: 640,
  generalInspection: '202711',
  interiorType: 'CLOTH',
  interiorColor: 'BLACK',
  driveType: 'FRONT',
  warranty: true,
  countryVersion: 'DE',
  vin: 'WVWZZZAUZHW123456',
  exteriorColor: 'GREY',
  metallic: true,
  cylinder: 4,
  fuelTankVolume: 50,
  manufacturerColorName: 'Uranograu',
  lastMaintenanceDate: '202505',
  lastMaintenanceMileage: 170000,
  emissionClass: 'EURO6',
  description: 'Beispieltext.',
  images: [{ ref: 'https://example.invalid/bild.jpg' }],
  emissions: { combined: { co2: 129, co2Class: 'D' } },
  consumptions: { fuel: { combined: 4.9 } },
  alloyWheels: true,
  navigationSystem: true,
  electricHeatedSeats: true,
  trailerCouplingType: 'TRAILER_COUPLING_FIX',
  climatisation: 'AUTOMATIC_CLIMATISATION',
};

interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: string[];
  $ref?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  format?: string;
}

async function main() {
  const antwort = await fetch(QUELLE);
  if (!antwort.ok) throw new Error(`Beschreibung nicht erreichbar: ${antwort.status}`);
  const doku = await antwort.json() as {
    paths: Record<string, Record<string, { requestBody?: { content: Record<string, { schema: Schema }> } }>>;
    components: { schemas: Record<string, Schema> };
  };

  const aufloesen = (s?: Schema): Schema => {
    if (!s) return {};
    if (s.$ref) {
      const name = s.$ref.split('/').pop()!;
      return aufloesen(doku.components.schemas[name]);
    }
    if (s.allOf) return s.allOf.map(aufloesen).reduce((a, b) => ({
      ...a, ...b,
      properties: { ...(a.properties ?? {}), ...(b.properties ?? {}) },
    }), {});
    return s;
  };

  const anlegen = doku.paths['/sellers/{sellerId}/ads']?.post;
  const rumpf = anlegen?.requestBody?.content;
  const schemaRoh = rumpf ? Object.values(rumpf)[0]?.schema : undefined;
  const schema = aufloesen(schemaRoh);

  if (!schema.properties) {
    console.log('Kein Schema fuer POST /sellers/{sellerId}/ads gefunden.');
    return;
  }

  console.log(`Beschreibung geladen: ${Object.keys(schema.properties).length} Felder kennt mobile.de.\n`);

  const probleme: string[] = [];

  const pruefen = (wert: unknown, feldSchema: Schema, pfad: string) => {
    const s = aufloesen(feldSchema);

    if (s.enum && typeof wert === 'string' && !s.enum.includes(wert)) {
      probleme.push(`${pfad}: "${wert}" ist kein erlaubter Wert. Erlaubt: ${s.enum.slice(0, 12).join(', ')}${s.enum.length > 12 ? ' …' : ''}`);
      return;
    }
    if (s.type === 'object' && s.properties && wert && typeof wert === 'object') {
      for (const [k, v] of Object.entries(wert as Record<string, unknown>)) {
        if (!s.properties[k]) { probleme.push(`${pfad}.${k}: kennt mobile.de nicht`); continue; }
        pruefen(v, s.properties[k], `${pfad}.${k}`);
      }
      return;
    }
    if (s.type === 'array' && Array.isArray(wert) && s.items) {
      wert.forEach((e, i) => pruefen(e, s.items!, `${pfad}[${i}]`));
      return;
    }
    if (s.type === 'integer' && typeof wert === 'number' && !Number.isInteger(wert)) {
      probleme.push(`${pfad}: ganze Zahl erwartet, ist ${wert}`);
    }
    if (s.type === 'boolean' && typeof wert !== 'boolean') {
      probleme.push(`${pfad}: Ja/Nein erwartet, ist ${typeof wert}`);
    }
    if (s.type === 'string' && typeof wert !== 'string') {
      probleme.push(`${pfad}: Text erwartet, ist ${typeof wert}`);
    }
  };

  for (const [feld, wert] of Object.entries(INSERAT)) {
    const fs = schema.properties[feld];
    if (!fs) { probleme.push(`${feld}: kennt mobile.de nicht`); continue; }
    pruefen(wert, fs, feld);
  }

  /*
   * Der zweite, wichtigere Teil: Jeder Wert, den unsere Uebersetzung
   * ueberhaupt erzeugen kann, gegen die Aufzaehlung von mobile.de.
   *
   * Die erste Pruefung oben sagt nur, dass EIN Inserat durchgeht. Hier
   * geht es um alle Werte, die das Formular anbietet — ein einziger,
   * den mobile.de nicht kennt, kippt genau die Inserate, in denen er
   * vorkommt. Und die Meldung dazu nennt nicht einmal das Feld.
   */
  const auswahl: Array<[string, string, (w: string) => unknown]> = [
    ['category', 'Karosserieform', mobileKategorie],
    ['fuel', 'Kraftstoff', mobileKraftstoff],
    ['gearbox', 'Getriebe', mobileGetriebe],
    ['exteriorColor', 'Farbe', mobileFarbe],
    ['emissionClass', 'Schadstoffklasse', mobileEuronorm],
    ['interiorType', 'Polsterung', mobilePolsterung],
    ['interiorColor', 'Innenfarbe', mobileInnenfarbe],
    ['driveType', 'Antrieb', mobileAntrieb],
    ['countryVersion', 'Laendervariante', laenderCode],
  ];
  const LISTEN: Record<string, readonly string[]> = {
    Karosserieform: KAROSSERIE, Kraftstoff: KRAFTSTOFFE, Getriebe: GETRIEBE,
    Schadstoffklasse: EURONORM, Polsterung: POLSTERUNG, Innenfarbe: INNENFARBE,
    Antrieb: ANTRIEB, Laendervariante: LAENDERVERSION,
    Farbe: ['Schwarz', 'Tiefschwarz', 'Weiß', 'Reflexsilber', 'Uranograu', 'Grau',
            'Atlantikblau', 'Tornadorot', 'Grün', 'Beige', 'Braun', 'Gelb', 'Orange', 'Gold'],
  };

  for (const [feld, listenName, uebersetzen] of auswahl) {
    const fs2 = aufloesen(schema.properties[feld]);
    const erlaubt = fs2.enum;
    for (const eingabe of LISTEN[listenName] ?? []) {
      const wert = uebersetzen(eingabe);
      if (wert === undefined || wert === null) {
        probleme.push(`${feld}: "${eingabe}" ergibt keinen Wert`);
        continue;
      }
      if (erlaubt && typeof wert === 'string' && !erlaubt.includes(wert)) {
        probleme.push(`${feld}: "${eingabe}" wird zu "${wert}" — das kennt mobile.de nicht. Erlaubt: ${erlaubt.slice(0, 10).join(', ')}…`);
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  if (probleme.length === 0) {
    console.log('Jedes Feld unseres Inserats steht so in der Beschreibung von mobile.de.');
  } else {
    console.log(`${probleme.length} Punkte:\n`);
    for (const p of probleme) console.log('  • ' + p);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
