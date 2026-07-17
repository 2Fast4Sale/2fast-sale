# Stripe Setup für Launch

## 1. Stripe Produkte & Preise erstellen

Nach dem Start der App rufe folgende URL auf (einmalig):
```
POST /api/stripe/setup
```
Das erstellt automatisch alle 4 Produkte (Basic, Premium, Business, Enterprise) mit monatlichen und jährlichen Preisen in Stripe und gibt die Price IDs zurück.

**Oder manuell im Stripe Dashboard:**
- https://dashboard.stripe.com/products

## 2. Price IDs in .env.local eintragen

```env
STRIPE_BASIC_MONTHLY_PRICE_ID=price_xxx
STRIPE_BASIC_YEARLY_PRICE_ID=price_xxx
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx
```

## 3. Webhook einrichten

### Lokal (Entwicklung):
```bash
stripe listen --forward-to localhost:3000/api/webhook
```
Den angezeigten `whsec_...` Key in `.env.local` als `STRIPE_WEBHOOK_SECRET` eintragen.

### Produktion:
1. https://dashboard.stripe.com/webhooks → "Add endpoint"
2. URL: `https://deine-domain.de/api/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Webhook Secret in `.env.local` / Hosting-Umgebungsvariablen eintragen

## 4. Stripe Customer Portal aktivieren

https://dashboard.stripe.com/settings/billing/portal → aktivieren + konfigurieren

## 5. App URL für Production

```env
NEXT_PUBLIC_APP_URL=https://deine-domain.de
```

## Plan-Preise

| Plan       | Monatlich | Jährlich  | Inserate/Monat |
|------------|-----------|-----------|----------------|
| Basic      | €29       | €290      | 30             |
| Premium    | €79       | €790      | 150            |
| Business   | €199      | €1990     | 550            |
| Enterprise | €499      | €4990     | Unbegrenzt     |

Alle Pläne: 7 Tage kostenlos testen.
