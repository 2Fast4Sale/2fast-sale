import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://listing-creation.api.autoscout24.com';

// AS24 uses numeric IDs for fuel types (from /references?referenceType=FuelType)
const FUEL_MAP: Record<string, number> = {
  benzin: 1, petrol: 1, super: 1,
  diesel: 2,
  elektro: 3, electric: 3, strom: 3,
  lpg: 4, autogas: 4,
  erdgas: 5, cng: 5,
  hybrid: 6,
  'plug-in-hybrid': 6, 'plug-in hybrid': 6,
};

function parseFirstRegistration(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}`;
  const mmyyyy = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1].padStart(2, '0')}`;
  const yyyymm = s.match(/^(\d{4})-(\d{2})$/);
  if (yyyymm) return `${yyyymm[1]}-${yyyymm[2]}`;
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return '';
}

export async function POST(req: NextRequest) {
  const username = process.env.AS24_API_USERNAME;
  const password = process.env.AS24_API_PASSWORD;
  const customerId = process.env.AS24_CUSTOMER_ID;

  if (!username || !password || !customerId) {
    return NextResponse.json(
      { error: 'AutoScout24 API-Zugangsdaten nicht konfiguriert. Bitte AS24_API_USERNAME, AS24_API_PASSWORD und AS24_CUSTOMER_ID in .env.local eintragen.' },
      { status: 500 }
    );
  }

  const { formData, description, images } = await req.json();
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const jsonHeaders = { Authorization: authHeader, 'Content-Type': 'application/json' };

  // -- 1. Lookup make ID from /makes ----------------------------
  let makeId: number | undefined;
  try {
    const makesRes = await fetch(`${BASE_URL}/makes`, { headers: { Authorization: authHeader } });
    if (makesRes.ok) {
      const makesData = await makesRes.json();
      const brandFirst = (formData.brand || '').trim().split(/\s+/)[0].toLowerCase();
      const match = (makesData.makes as Array<{ id: number; name: string }>)?.find(
        m => m.name.toLowerCase() === brandFirst || m.name.toLowerCase().startsWith(brandFirst)
      );
      if (match) makeId = match.id;
    }
  } catch (err) {
    console.error('Make lookup error:', err);
  }

  // -- 2. Build listing payload ---------------------------------
  const priceRaw = parseFloat((formData.price || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  const kmRaw = parseInt((formData.km || '0').replace(/[^\d]/g, '')) || 0;
  const firstReg = parseFirstRegistration(formData.firstRegistration || '');
  const fuelId = FUEL_MAP[(formData.fuelType || '').toLowerCase()] ?? 1;
  const powerKw = parseInt(formData.powerKw) || undefined;
  const ccm = parseInt(formData.displacementCcm) || undefined;
  const brandParts = (formData.brand || '').trim().split(/\s+/);
  const modelVersion = brandParts.slice(1).join(' ') || undefined;

  const basePayload: Record<string, unknown> = {
    offerType: 'U',
    vehicleType: 'C',
    bodyType: 1,
    condition: { hadAccident: false },
    primaryFuelType: fuelId,
    prices: {
      public: { price: priceRaw, currency: 'EUR', isNegotiable: false, isTaxDeductible: false },
    },
  };

  if (makeId !== undefined) basePayload.make = makeId;
  if (modelVersion) basePayload.modelVersion = modelVersion;
  if (firstReg) basePayload.firstRegistrationDate = firstReg;
  if (kmRaw > 0) basePayload.mileage = kmRaw;
  if (powerKw) basePayload.power = powerKw;
  if (ccm) basePayload.cylinderCapacity = ccm;
  if (formData.vin) basePayload.vin = formData.vin;
  if (parseInt(formData.seats || '0') > 0) basePayload.seatCount = parseInt(formData.seats);
  if (description) basePayload.description = description.slice(0, 5000);

  // -- 3. Create listing (Inactive) -----------------------------
  const createRes = await fetch(`${BASE_URL}/customers/${customerId}/listings`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ ...basePayload, publication: { status: 'Inactive', channels: [{ id: 'AS24' }] } }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    let errBody: unknown;
    try { errBody = JSON.parse(errText); } catch { errBody = errText; }
    return NextResponse.json({ error: `AutoScout24 API Fehler (${createRes.status})`, details: errBody }, { status: createRes.status });
  }

  const listing = await createRes.json();
  const listingId: string = listing.id;

  // -- 4. Upload images ------------------------------------------
  const imageIds: string[] = [];
  for (const base64Image of (images as string[]).slice(0, 20)) {
    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadRes = await fetch(`${BASE_URL}/customers/${customerId}/images`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'image/jpeg' },
        body: buffer,
      });
      if (uploadRes.ok) {
        const imgData = await uploadRes.json();
        if (imgData.id) imageIds.push(imgData.id);
      } else {
        console.error('Image upload failed:', uploadRes.status, await uploadRes.text());
      }
    } catch (err) {
      console.error('Image upload error:', err);
    }
  }

  // -- 5. Update listing: images + Active -----------------------
  const updatePayload: Record<string, unknown> = {
    ...basePayload,
    publication: { status: 'Active', channels: [{ id: 'AS24' }] },
  };
  if (imageIds.length > 0) updatePayload.images = imageIds.map(id => ({ id }));

  const updateRes = await fetch(`${BASE_URL}/customers/${customerId}/listings/${listingId}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(updatePayload),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    let errBody: unknown;
    try { errBody = JSON.parse(errText); } catch { errBody = errText; }
    // Listing exists but activation failed � return partial success so dealer can activate manually
    return NextResponse.json({
      listingId,
      dealerUrl: `https://autoscout24.com/account/listings/${listingId}`,
      imagesUploaded: imageIds.length,
      warning: 'Inserat erstellt, aber Aktivierung fehlgeschlagen. Bitte im Portal manuell aktivieren.',
      details: errBody,
    }, { status: 207 });
  }

  return NextResponse.json({
    listingId,
    as24Url: `https://www.autoscout24.de/angebote/-${listingId}`,
    dealerUrl: `https://autoscout24.com/account/listings/${listingId}`,
    imagesUploaded: imageIds.length,
  });
}
