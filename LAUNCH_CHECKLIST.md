# Launch Checklist — 2Fast4Sale

## ✅ Settings System (fertig)
- [x] Settings Hub — übersichtliche Navigation
- [x] Händler-Profil — Firmendaten, KI-Templates, Hintergründe
- [x] Mein Abo — Plan-Vergleich, Stripe Checkout, Kündigung
- [x] Abrechnung — Rechnungsadresse, Zahlungsmethoden, Rechnungshistorie
- [x] 2FA — TOTP Authenticator Setup (Supabase MFA)
- [x] Passwort ändern
- [x] Account löschen

## ✅ Stripe (fertig, Konfiguration nötig)
- [x] Multi-Plan Checkout (Basic/Premium/Business/Enterprise)
- [x] Webhook Handler — alle Plan-Übergänge
- [x] Stripe Kundenportal Integration
- [x] Abo-Kündigung (cancel at period end)
- [x] 7 Tage kostenloser Test für alle Pläne

## ⚠ Noch zu erledigen (vor Launch)

### Stripe Konfiguration (PFLICHT)
- [ ] Migration 009 in Supabase ausführen (SQL Editor)
- [ ] Stripe Produkte erstellen (POST /api/stripe/setup aufrufen)
- [ ] Price IDs in .env.local eintragen
- [ ] Webhook in Stripe Dashboard konfigurieren
- [ ] STRIPE_WEBHOOK_SECRET in .env.local eintragen
- [ ] Stripe Customer Portal aktivieren
- [ ] NEXT_PUBLIC_APP_URL auf Produktions-URL setzen

### Umgebungsvariablen Produktion
- [ ] Alle .env.local Variablen ins Hosting (Vercel/etc.) übertragen
- [ ] NEXT_PUBLIC_APP_URL=https://deine-domain.de
- [ ] PhotoRoom API Key — echten Key (kein sandbox_) kaufen
- [ ] REMOVE_BG_API_KEY eintragen (optional, Fallback)

### Rechtliches
- [ ] /impressum Seite erstellen
- [ ] /datenschutz Seite erstellen
- [ ] AGB Seite erstellen
- [ ] Cookie Banner

### Sonstiges
- [ ] VINDECODER_API_KEY testen (aktueller Key gibt 404)
- [ ] mobile.de API Zugangsdaten (für Premium+)
- [ ] AutoScout24 API Zugangsdaten (für Premium+)

## Technische Schulden (nach Launch)
- [ ] mobile.de XML Export implementieren
- [ ] AutoScout24 XML Export implementieren
- [ ] Team-Accounts für Business Plan
- [ ] API-Zugang für Business Plan
