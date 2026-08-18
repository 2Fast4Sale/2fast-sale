/**
 * Prüfung der Stripe-Preis-IDs aus der Umgebung.
 *
 * Die Routen prüften bisher nur mit `if (!priceId)`. Das fängt eine
 * fehlende Variable ab, aber nicht den Platzhalter "price_..." aus der
 * Beispieldatei — der ist ein nicht-leerer String und läuft durch. Alle
 * zehn Abo-Preise standen monatelang auf diesem Platzhalter, und statt
 * des vorbereiteten Hinweises bekam der Händler den rohen Stripe-Fehler
 * "No such price: 'price_...'" zu sehen.
 */

/**
 * Sieht der Wert wie eine echte Stripe-Preis-ID aus?
 *
 * Stripe vergibt "price_" plus eine Zufallskennung. Die Länge ist nicht
 * vertraglich zugesichert, deshalb wird nur grob geprüft: Präfix und
 * mindestens 16 weitere Zeichen aus dem Zeichenvorrat. Das reicht, um
 * Platzhalter, Leerstrings und abgeschnittene Copy-Paste-Reste zu
 * erkennen, ohne bei einer künftigen Formatänderung falsch Alarm zu
 * schlagen.
 */
export function istPreisId(wert: string | undefined | null): boolean {
  return typeof wert === 'string' && /^price_[A-Za-z0-9]{16,}$/.test(wert.trim());
}

/**
 * Liest eine Preis-ID und meldet, was fehlt.
 *
 * Gibt entweder die ID oder eine Meldung zurück, die dem Betreiber sagt,
 * welche Variable er setzen muss. Die Meldung ist bewusst konkret: "Bitte
 * konfigurieren" hilft niemandem, der Variablenname schon.
 */
export function preisIdLesen(variable: string): { id: string } | { fehler: string } {
  const wert = process.env[variable];

  if (!wert || !wert.trim()) {
    return { fehler: `${variable} ist nicht gesetzt.` };
  }
  if (!istPreisId(wert)) {
    return {
      fehler: `${variable} enthält keine gültige Stripe-Preis-ID, sondern "${wert.trim()}". ` +
              'Der Wert stammt vermutlich noch aus der Beispieldatei.',
    };
  }
  return { id: wert.trim() };
}
