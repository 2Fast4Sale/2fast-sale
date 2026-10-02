import { redirect } from 'next/navigation';

/**
 * /checkout leitet auf die Preisseite weiter.
 *
 * Hier lag eine vollständige Bezahlseite aus dem abgelösten Abo-Modell:
 * Basic 99,49 € im Monat, Premium 249,99 €, Business 699,99 €, dazu
 * Merkmale, die es nicht gibt — API-Zugang, White-Label, eigene Domain,
 * zehn Nutzerkonten, "3 Inserate einmalig gratis".
 *
 * Das Gefährliche war nicht der alte Text, sondern die Kombination: Der
 * Knopf schickte `plan=premium` an /api/checkout, und dort zeigt
 * "premium" auf die Preis-ID von Paket M. Der Kunde hätte also 249,99 €
 * gelesen und 845 € bezahlt. Verlinkt war die Seite von nirgends — sie
 * war nur über die Adresse erreichbar und niemandem aufgefallen.
 *
 * Die alte Fassung liegt als page.alt.tsx.bak daneben, falls davon noch
 * etwas gebraucht wird; Next.js nimmt nur page.tsx.
 */
export default function CheckoutWeiterleitung() {
  redirect('/dashboard/pricing');
}
