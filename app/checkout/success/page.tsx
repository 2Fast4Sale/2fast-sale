'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * /checkout/success leitet auf /payment-success weiter — mit allen
 * Parametern.
 *
 * Hier lag eine zweite Erfolgsseite aus dem alten Abo-Modell. Sie las die
 * Stripe-Kennung aus der Adresse und tat damit nichts: kein Einlösen,
 * keine Rechnung. Heute zeigt kein success_url mehr hierher, aber ein
 * alter Link in einem Postfach oder eine Einstellung im Stripe-Dashboard
 * reicht — und dann waere die Zahlung eingegangen, ohne dass eine
 * Rechnung verschickt wird.
 *
 * Die alte Fassung liegt als page.alt.tsx.bak daneben.
 */
function Weiter() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const ziel = params.toString();
    router.replace(ziel ? `/payment-success?${ziel}` : '/payment-success');
  }, [router, params]);

  return null;
}

export default function CheckoutErfolgWeiterleitung() {
  return <Suspense fallback={null}><Weiter /></Suspense>;
}
