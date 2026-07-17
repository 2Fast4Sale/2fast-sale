import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicleData, dealerInfo } = body;

    const listings = {
      autoscout24: {
        title: `${vehicleData.marke} ${vehicleData.modell} | ${vehicleData.baujahr}`,
        description: `${vehicleData.marke} ${vehicleData.modell}\nBaujahr: ${vehicleData.baujahr}\nKilometerstand: ${vehicleData.kilometerstand} km\nFarbe: ${vehicleData.farbe}\nKraftstoff: ${vehicleData.kraftstoff}`,
        price: 0,
      },
      ebayMotors: {
        title: `${vehicleData.marke} ${vehicleData.modell} ${vehicleData.baujahr}`,
        description: 'Professionell fotografiert mit Virtual Studio Engine',
        specifications: {
          make: vehicleData.marke,
          model: vehicleData.modell,
          year: vehicleData.baujahr,
          mileage: vehicleData.kilometerstand,
          fuel: vehicleData.kraftstoff,
        },
      },
      customApi: {
        vehicle: vehicleData,
        dealer: dealerInfo,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Listing Generation Error:', error);
    return NextResponse.json(
      { error: 'Listing-Generierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
