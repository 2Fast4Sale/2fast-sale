import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAKE_MAP: Record<string, string> = {
  volkswagen: 'VW', vw: 'VW',
  bmw: 'BMW',
  mercedes: 'MERCEDES', 'mercedes-benz': 'MERCEDES',
  audi: 'AUDI',
  ford: 'FORD',
  opel: 'OPEL',
  toyota: 'TOYOTA',
  hyundai: 'HYUNDAI',
  kia: 'KIA',
  skoda: 'SKODA', 
  seat: 'SEAT',
  renault: 'RENAULT',
  peugeot: 'PEUGEOT',
  citroen: 'CITROEN',
  nissan: 'NISSAN',
  honda: 'HONDA',
  mazda: 'MAZDA',
  volvo: 'VOLVO',
  fiat: 'FIAT',
  mitsubishi: 'MITSUBISHI',
  suzuki: 'SUZUKI',
  subaru: 'SUBARU',
  jeep: 'JEEP',
  tesla: 'TESLA',
  porsche: 'PORSCHE',
  mini: 'MINI',
  dacia: 'DACIA',
  alfa: 'ALFA ROMEO', 'alfa romeo': 'ALFA ROMEO',
  smart: 'SMART',
  land: 'LAND ROVER', 'land rover': 'LAND ROVER',
  jaguar: 'JAGUAR',
  chrysler: 'CHRYSLER',
  dodge: 'DODGE',
};

const FUEL_MAP: Record<string, string> = {
  benzin: 'PETROL', petrol: 'PETROL', super: 'PETROL',
  diesel: 'DIESEL',
  elektro: 'ELECTRICITY', electric: 'ELECTRICITY', strom: 'ELECTRICITY',
  hybrid: 'HYBRID',
  lpg: 'LPG', autogas: 'LPG',
  erdgas: 'CNG', cng: 'CNG',
  'plug-in-hybrid': 'HYBRID',
  'plug-in hybrid': 'HYBRID',
};

function parseMake(brand: string): { make: string; model: string; modelDescription: string } {
  const parts = brand.trim().split(/\s+/);
  const firstWord = parts[0].toLowerCase();
  const twoWords = (parts.slice(0, 2).join(' ')).toLowerCase();

  let make = MAKE_MAP[twoWords] || MAKE_MAP[firstWord] || parts[0].toUpperCase();
  let modelParts: string[];

  if (MAKE_MAP[twoWords]) {
    modelParts = parts.slice(2);
  } else {
    modelParts = parts.slice(1);
  }

  const model = modelParts[0]?.toUpperCase() || 'MODELL';
  const modelDescription = brand.slice(0, 48);

  return { make, model, modelDescription };
}

function parseFirstRegistration(raw: string): string {
  // Expects "TT.MM.JJJJ", "MM.JJJJ", "JJJJ-MM", "JJJJMM"
  if (!raw) return '';
  const s = raw.trim();
  // DD.MM.YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}${ddmmyyyy[2].padStart(2, '0')}`;
  // MM.YYYY
  const mmyyyy = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}${mmyyyy[1].padStart(2, '0')}`;
  // YYYY-MM
  const yyyymm = s.match(/^(\d{4})-(\d{2})$/);
  if (yyyymm) return `${yyyymm[1]}${yyyymm[2]}`;
  // Already YYYYMM
  if (/^\d{6}$/.test(s)) return s;
  return '';
}

export async function POST(req: NextRequest) {
  const username = process.env.MOBILEDE_API_USERNAME;
  const password = process.env.MOBILEDE_API_PASSWORD;
  const sellerId = process.env.MOBILEDE_SELLER_ID;

  if (!username || !password || !sellerId) {
    return NextResponse.json(
      { error: 'mobile.de API-Zugangsdaten nicht konfiguriert. Bitte MOBILEDE_API_USERNAME, MOBILEDE_API_PASSWORD und MOBILEDE_SELLER_ID in .env.local eintragen.' },
      { status: 500 }
    );
  }

  const { formData, description, images } = await req.json();

  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const baseHeaders = {
    Authorization: authHeader,
    Accept: 'application/vnd.de.mobile.api+json',
  };

  // -- 1. Upload images ------------------------------------------
  const imageRefs: Array<{ ref: string }> = [];

  for (const base64Image of (images as string[]).slice(0, 15)) {
    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const uploadRes = await fetch('https://services.mobile.de/seller-api/images', {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'image/jpeg' },
        body: buffer,
      });

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageRefs.push({ ref: data.ref });
      } else {
        console.error('Image upload failed:', uploadRes.status, await uploadRes.text());
      }
    } catch (err) {
      console.error('Image upload error:', err);
    }
  }

  // -- 2. Build ad payload ---------------------------------------
  const { make, model, modelDescription } = parseMake(formData.brand || 'Fahrzeug');
  const firstReg = parseFirstRegistration(formData.firstRegistration || '');
  const priceRaw = parseFloat((formData.price || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  const kmRaw = parseInt((formData.km || '0').replace(/[^\d]/g, '')) || 0;
  const fuel = FUEL_MAP[(formData.fuelType || '').toLowerCase()] || 'PETROL';
  const powerKw = parseInt(formData.powerKw) || undefined;
  const ccm = parseInt(formData.displacementCcm) || undefined;

  const adPayload: Record<string, unknown> = {
    vehicleClass: 'Car',
    category: 'Limousine',
    make,
    model,
    modelDescription,
    condition: 'USED',
    fuel,
    damageUnrepaired: false,
    price: {
      consumerPriceGross: priceRaw.toFixed(2),
      vatRate: '19.00',
      type: 'FIXED',
      currency: 'EUR',
    },
  };

  if (firstReg) adPayload.firstRegistration = firstReg;
  if (kmRaw > 0) adPayload.mileage = kmRaw;
  if (powerKw) adPayload.power = powerKw;
  if (ccm) adPayload.cubicCapacity = ccm;
  if (formData.vin) adPayload.vin = formData.vin;
  if (parseInt(formData.seats || '0') > 0) adPayload.seats = parseInt(formData.seats);
  if (description) adPayload.description = description.slice(0, 5000);
  if (imageRefs.length > 0) adPayload.images = imageRefs;

  // -- 3. Create ad ----------------------------------------------
  const createRes = await fetch(
    `https://services.mobile.de/seller-api/sellers/${sellerId}/ads`,
    {
      method: 'POST',
      headers: { ...baseHeaders, 'Content-Type': 'application/vnd.de.mobile.api+json' },
      body: JSON.stringify(adPayload),
    }
  );

  if (!createRes.ok) {
    const errorText = await createRes.text();
    let errorBody: unknown;
    try { errorBody = JSON.parse(errorText); } catch { errorBody = errorText; }
    return NextResponse.json(
      { error: `mobile.de API Fehler (${createRes.status})`, details: errorBody },
      { status: createRes.status }
    );
  }

  // Extract mobileAdId from Location header
  const location = createRes.headers.get('Location') || '';
  const mobileAdId = location.split('/').pop() || '';
  const adUrl = `https://suchen.mobile.de/fahrzeuge/details.html?id=${mobileAdId}`;
  const dealerUrl = `https://portal.mobile.de/insertions/${mobileAdId}`;

  return NextResponse.json({ mobileAdId, adUrl, dealerUrl, imagesUploaded: imageRefs.length });
}
