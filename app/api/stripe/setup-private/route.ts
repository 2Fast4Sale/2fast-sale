import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

export async function POST() {
  try {
    // Produkt erstellen
    const product = await stripe.products.create({
      name: '2Fast4Sale Inserat-Credit',
      description: 'Einmaliges Inserat auf 2Fast4Sale — KI-Beschreibung, Studio-Fotos, mobile.de & AutoScout24 Export.',
      metadata: { type: 'listing_credit' },
    });

    // Einmalzahlung €4,99
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 499,
      currency: 'eur',
      metadata: { type: 'listing_credit' },
      nickname: 'Privatperson Inserat-Credit',
    });

    // In .env.local eintragen
    const envPath = join(process.cwd(), '.env.local');
    let env = readFileSync(envPath, 'utf-8');
    env = env.replace(
      /STRIPE_PRIVATE_LISTING_PRICE_ID=.*/,
      `STRIPE_PRIVATE_LISTING_PRICE_ID=${price.id}`,
    );
    writeFileSync(envPath, env, 'utf-8');

    return NextResponse.json({
      success: true,
      priceId: price.id,
      productId: product.id,
      note: '.env.local wurde automatisch aktualisiert — bitte Server neu starten!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fehler';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
