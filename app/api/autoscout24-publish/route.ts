import { NextRequest, NextResponse } from 'next/server';
import {
  as24MarkenId, as24ModellId, as24KarosserieId, as24Kraftstoff,
  as24Getriebe, as24FarbeId, as24EuronormId,
  as24PolsterungId, as24InnenfarbeId, as24AntriebId, as24Hu,
} from '../../../lib/as24Uebersetzung';
import { istAusgewiesen, laenderCode, farbnameSauber, monatJahr } from '../../../lib/mobileUebersetzung';
import { as24Ausstattung, ohnePortalEntsprechung, ausAusstattungErgaenzen } from '../../../lib/ausstattungAnwenden';
import { as24Envkv } from '../../../lib/as24Envkv';
import { validateEnvkv, type EnvkvData } from '../../../lib/envkv';
import { bildHolen, alsJpeg } from '../../../lib/bildHolen';
import { createClient } from '../../../lib/supabase/server';
import { zugangLesen } from '../../../lib/portalZugang';
import { alsYyyyBindestrichMM } from '../../../lib/erstzulassung';
import { istHerstellerName } from '../../../lib/farbe';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://listing-creation.api.autoscout24.com';

/**
 * Wandelt "03.2019", "3.2019", "2019-03" oder "201903" in "2019-03".
 * Alles andere gilt als nicht angegeben.
 */
/*
 * Die Erstzulassung liest lib/erstzulassung.ts — dieselbe Funktion wie
 * bei mobile.de. Hier lag eine zweite Kopie, die denselben Fehler hatte:
 * 11/2016 mit Schraegstrich wurde nicht erkannt.
 */

const zahl = (roh: unknown): number =>
  parseFloat(String(roh ?? '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

const ganzzahl = (roh: unknown): number =>
  parseInt(String(roh ?? '').replace(/[^\d]/g, ''), 10) || 0;

/*
 * AutoScout24 verbietet in JEDEM Textfeld die Zeichen < und >
 * ("Forbidden characters are < or >"). Ein einziges davon — etwa in
 * einer Beschreibung wie "Reifen <2 Jahre" — laesst das ganze Inserat
 * durchfallen. Deshalb werden sie ersetzt, nicht das Inserat verworfen.
 */
const ohneKlammern = (s: string): string => s.replace(/[<>]/g, ' ');

interface FormData {
  brand?: string; model?: string; vin?: string; firstRegistration?: string;
  km?: string; price?: string; fuelType?: string; gearbox?: string;
  powerKw?: string; displacementCcm?: string; color?: string; seats?: string;
  bodyType?: string; damaged?: boolean; emissionClass?: string;
  doors?: string; vatType?: string; equipment?: string[];
  leermasseKg?: string;
  envkv?: EnvkvData;
  huUntil?: string; interiorType?: string; interiorColor?: string;
  driveType?: string; warranty?: boolean; countryVersion?: string;
  cylinders?: string; manufacturerColorName?: string; lastServiceDate?: string;
  previousOwners?: string;
}

/**
 * Baut die Nutzlast fuer AutoScout24 und sammelt dabei, was fehlt.
 *
 * Getrennt vom Versenden, damit sich beides einzeln betrachten laesst.
 * Das ist nicht nur Ordnung: Ohne Zugangsdaten ist das Bauen der
 * einzige Teil, den man ueberhaupt pruefen kann.
 */
function nutzlastBauen(formData: FormData, description?: string, imageIds: string[] = []) {
  const fehlt: string[] = [];
  /*
   * Angaben, die AutoScout24 so nicht annimmt, die aber nichts
   * Pflichtiges sind: Sie werden weggelassen und hier vermerkt. Ohne
   * diese Liste faehrt der Haendler entweder gegen eine Ablehnung des
   * ganzen Inserats oder bekommt still ein Inserat ohne die Angabe.
   */
  const uebersprungen: string[] = [];
  const nutzlast: Record<string, unknown> = {
    vehicleType: 'C',
    /*
     * Pflichtfeld, und es fehlte hier bisher vollstaendig — deshalb
     * haette jeder Versuch mit 400 geendet, auch mit gueltigen
     * Zugangsdaten. 1 = "Immediately": Das Auto steht beim Haendler
     * auf dem Hof. Bei einem Bestellfahrzeug waere es 2 oder 3, aber
     * dafuer hat das Formular bisher kein Feld.
     */
    availability: { availabilityType: 1 },
  };

  /*
   * Neu- oder Gebrauchtwagen. Ohne Erstzulassung gilt es als neu.
   *
   * Die Grenze ist "kleiner als 1.000", nicht "bis 1.000": In der
   * Feldbeschreibung steht "Mileage must be less than 1000 when
   * offerType is N (new)". Bei genau 1.000 km hat die Route vorher N
   * gesetzt und gleichzeitig mileage=1000 gesendet — die eine Zeile,
   * die sich selbst widerspricht, und AutoScout24 haette abgelehnt.
   */
  const km = ganzzahl(formData.km);
  const erst = alsYyyyBindestrichMM(formData.firstRegistration);
  nutzlast.offerType = !erst && km < 1000 ? 'N' : 'U';
  if (erst) nutzlast.firstRegistrationDate = erst;
  else if (nutzlast.offerType === 'U') fehlt.push('Erstzulassung');

  const markeId = as24MarkenId(formData.brand || '');
  if (markeId !== undefined) nutzlast.make = markeId;
  else fehlt.push(formData.brand ? `Marke "${formData.brand}" unbekannt` : 'Marke');

  /*
   * model ist eine Zahl aus der Liste des Portals, modelVersion der
   * freie Text daneben ("Avant", "2.0 TDI"). Vorher wurde das
   * Markenfeld zerlegt, um das Modell zu finden — ein Rest aus der
   * Zeit, als beides in einem Feld stand. Seit splitBrandModel
   * existiert, war dieses Feld immer leer.
   */
  const modellId = as24ModellId(formData.brand || '', formData.model || '');
  if (modellId !== undefined) nutzlast.model = modellId;
  else if (formData.model) nutzlast.modelVersion = ohneKlammern(formData.model).slice(0, 121);
  else fehlt.push('Modell');

  const karosserie = as24KarosserieId(formData.bodyType || '');
  if (karosserie !== undefined) nutzlast.bodyType = karosserie;
  else fehlt.push(formData.bodyType ? `Karosserieform "${formData.bodyType}" unbekannt` : 'Karosserieform');

  const kraftstoff = as24Kraftstoff(formData.fuelType || '');
  if (kraftstoff) Object.assign(nutzlast, kraftstoff);
  else fehlt.push(formData.fuelType ? `Kraftstoff "${formData.fuelType}" unbekannt` : 'Kraftstoff');

  const getriebe = as24Getriebe(formData.gearbox || '');
  if (getriebe) nutzlast.transmission = getriebe;
  else fehlt.push('Getriebe');

  const preis = zahl(formData.price);
  if (preis > 0) {
    nutzlast.prices = {
      public: {
        price: preis, currency: 'EUR', isNegotiable: false,
        /* § 25a: Differenzbesteuert, also fuer den Kaeufer nicht absetzbar.
         * Der gespeicherte Wert heisst 'ausgewiesen'; "ausweisbar" ist nur
         * die Beschriftung im Formular. Vergleich deshalb ueber
         * istAusgewiesen(), gemeinsam mit der mobile.de-Seite. */
        isTaxDeductible: istAusgewiesen(formData.vatType || ''),
      },
    };
  } else fehlt.push('Preis');

  /* Der Unfallschaden stand fest auf "nein" — bei einem Unfallwagen
   * waere das eine Falschangabe im Inserat gewesen. */
  nutzlast.condition = { hadAccident: Boolean(formData.damaged) };

  if (km > 0) nutzlast.mileage = km;
  else if (nutzlast.offerType === 'U') fehlt.push('Kilometerstand');

  /*
   * Zahlenfelder mit den Grenzen aus der Feldbeschreibung.
   *
   * Ein Wert ausserhalb der Grenzen wird WEGGELASSEN und gemeldet,
   * nicht zurechtgebogen: 99999 kW ist ein Tippfehler, und ein
   * stillschweigend gekuerzter Wert waere eine Falschangabe im
   * Inserat des Haendlers. Vorher ging jeder Wert > 0 raus — und
   * AutoScout24 lehnt dann das GANZE Inserat ab
   * (maximum-value-exceeded), wegen einer freiwilligen Angabe.
   */
  const zahlFeld = (feld: string, roh: unknown, min: number, max: number, name: string) => {
    const w = ganzzahl(roh);
    if (w <= 0) return;
    if (w < min || w > max) {
      uebersprungen.push(`${name}: ${w} liegt ausserhalb von ${min}–${max}`);
      return;
    }
    nutzlast[feld] = w;
  };

  zahlFeld('power', formData.powerKw, 1, 9999, 'Leistung (kW)');
  zahlFeld('cylinderCapacity', formData.displacementCcm, 1, 99999, 'Hubraum (ccm)');
  zahlFeld('seatCount', formData.seats, 1, 99, 'Sitzplätze');
  zahlFeld('doorCount', formData.doors, 1, 9, 'Türen');
  /*
   * Vorbesitzer gingen bisher nur an mobile.de. Das Formular erfasst
   * sie, AutoScout24 hat das Feld (previousOwnerCount, 0 bis 99) —
   * die Angabe fiel einfach weg.
   */
  zahlFeld('previousOwnerCount', formData.previousOwners, 1, 99, 'Vorbesitzer');
  /*
   * Leermasse. AutoScout24 nennt es "emptyWeight" und sagt in der
   * Beschreibung ausdruecklich, was gemeint ist: "without driver,
   * passengers or liquids". Also Feld G im Schein.
   *
   * Die Anhaengelasten fehlen hier bewusst — AutoScout24 hat fuer
   * Personenwagen kein Feld dafuer. Sie gehen nur an mobile.de.
   */
  zahlFeld('emptyWeight', formData.leermasseKg, 1, 99999, 'Leermasse (kg)');

  /*
   * Fuenf Felder, die das Formular erfasst und die bisher weggeworfen
   * wurden.
   *
   * warranty ist bei AutoScout24 eine ZAHL in Monaten, unser Formular
   * kennt nur ja/nein. Deshalb hasWarranty statt warranty — die
   * Monatszahl bleibt leer, weil wir sie nicht kennen und nicht
   * erfinden.
   */
  const hu = as24Hu(formData.huUntil || '');
  if (hu) nutzlast.nextInspectionDate = hu;
  const polster = as24PolsterungId(formData.interiorType || '');
  if (polster) nutzlast.upholsteryType = polster;
  const innenfarbe = as24InnenfarbeId(formData.interiorColor || '');
  if (innenfarbe !== undefined) nutzlast.upholsteryColor = innenfarbe;
  const antrieb = as24AntriebId(formData.driveType || '');
  if (antrieb) nutzlast.drivetrain = antrieb;
  if (formData.warranty) nutzlast.hasWarranty = true;
  /* Gleicher Feldname, gleicher ISO-Code — hier aber nirgends Pflicht. */
  const land = laenderCode(formData.countryVersion || '');
  if (land) nutzlast.countryVersion = land;

  /*
   * Fahrgestellnummer: genau 17 Zeichen, sonst lehnt AutoScout24 das
   * ganze Inserat ab ("Min. length: 17, Max. length: 17"). Vorher ging
   * durch, was im Feld stand — eine abgetippte 16-stellige Nummer hat
   * damit das Inserat gekippt, und in der Meldung stand nur
   * "invalid-field-length".
   */
  const fin = String(formData.vin ?? '').trim().toUpperCase();
  if (fin) {
    if (/^[A-Z0-9]{17}$/.test(fin)) nutzlast.vin = fin;
    else uebersprungen.push(`Fahrgestellnummer: "${fin}" hat nicht 17 Stellen`);
  }

  const farbe = as24FarbeId(formData.color || '');
  if (farbe) nutzlast.bodyColor = Number(farbe);
  /* Tankgroesse fehlt hier bewusst — AutoScout24 hat fuer
     Personenwagen kein Feld dafuer. */
  zahlFeld('cylinderCount', formData.cylinders, 1, 99, 'Zylinder');
  /*
   * Wie bei mobile.de: Der Herstellername steht im freien Farbfeld,
   * nicht im eigenen Feld, das niemand ausfuellt.
   */
  const farbQuelle = formData.manufacturerColorName
    || (istHerstellerName(formData.color || '') ? formData.color : '');
  const farbname = farbnameSauber(farbQuelle || '', 30);
  if (farbname) nutzlast.bodyColorName = farbname;
  /* Nur das Datum — einen Kilometerstand zur Wartung kennt
     AutoScout24 nicht. */
  const wartung = monatJahr(formData.lastServiceDate || '', 'yyyy-MM');
  if (wartung) nutzlast.lastTechnicalServiceDate = wartung;

  const norm = as24EuronormId(formData.emissionClass || '');
  if (norm) nutzlast.euEmissionStandard = Number(norm);

  /*
   * Ausstattung: eine Liste von Kennungen. Was der Haendler selbst
   * eingetippt hat und in keiner Liste steht, faellt hier weg — es
   * steht im Beschreibungstext.
   */
  const ausstattung = as24Ausstattung(formData.equipment || []);
  if (ausstattung.length > 0) nutzlast.equipment = ausstattung;

  /*
   * EnVKV. AutoScout24 legt alles unter "wltp" und will die CO2-Klasse
   * als Zahl. Ohne die Werte lehnt es Neuwagen ab — oder versucht,
   * sie selbst aus der Fahrgestellnummer nachzutragen (siehe die
   * Behandlung von 202 weiter unten).
   */
  const envkv = formData.envkv;
  if (envkv) {
    const pruefung = validateEnvkv(envkv, formData.fuelType || '');
    if (!pruefung.complete) {
      fehlt.push(`EnVKV: ${pruefung.missing.join(', ')}`);
    }
    Object.assign(nutzlast, as24Envkv(envkv, formData.fuelType || ''));
  }

  if (description) nutzlast.description = ohneKlammern(description).slice(0, 5000);
  if (imageIds.length > 0) nutzlast.images = imageIds.map(id => ({ id }));

  return { nutzlast, fehlt, uebersprungen };
}

export async function POST(req: NextRequest) {
  /*
   * Zugangsdaten des HAENDLERS, nicht meine. Vorher kamen sie aus der
   * Umgebung — damit waere jedes Inserat in meinem Konto gelandet.
   */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 });

  const { formData, description, images, testmodus: testmodusWunsch, trockenlauf } = await req.json();
  /*
   * Merkmale, die in Wahrheit ein anderes Feld fuellen.
   *
   * Wer "Automatikgetriebe" ankreuzt und das Getriebefeld leer laesst,
   * hat die Angabe gemacht — sie ging aber verloren, weil die Portale
   * das Getriebe nicht als Ausstattung fuehren. Ergaenzt wird nur, was
   * leer ist: Steht im Formular "Manuell", gewinnt das Formular.
   */
  const ergaenzungen = ausAusstattungErgaenzen(formData?.equipment || [], formData || {});
  const angereichert = { ...(formData || {}), ...ergaenzungen };

  /* Was kein Portal als Merkmal kennt — fuer die ehrliche Auskunft. */
  const nichtUebertragen = ohnePortalEntsprechung(formData?.equipment || []);

  const { nutzlast, fehlt, uebersprungen } = nutzlastBauen(angereichert, description);

  const zugang = await zugangLesen(user.id, 'as24');
  const username = zugang?.benutzer ?? null;
  const password = zugang?.geheim ?? null;
  const customerId = zugang?.kontoNummer ?? null;
  /*
   * Testmodus: Der gespeicherte Zugang entscheidet. Ein Aufrufer darf
   * ihn EINSCHALTEN, aber nicht ausschalten — sonst genuegt ein
   * veraenderter Aufruf aus dem Browser, um aus einem Testzugang ein
   * oeffentliches Inserat zu machen.
   */
  const testmodus = Boolean(testmodusWunsch) || Boolean(zugang?.testmodus);

  /*
   * Trockenlauf: zeigen, was rausginge, ohne etwas zu senden.
   *
   * Ohne Zugangsdaten laeuft die Route ohnehin ins Leere. Statt nur
   * einen Fehler zu melden, gibt sie die fertige Nutzlast zurueck —
   * dann sieht man wenigstens, ob die Uebersetzung stimmt, bevor
   * AutoScout24 den Zugang freischaltet.
   */
  if (trockenlauf || !password || !customerId) {
    return NextResponse.json({
      trockenlauf: true,
      grund: trockenlauf ? 'angefordert'
        : !zugang ? 'Fuer AutoScout24 sind keine Zugangsdaten gespeichert (Einstellungen → Portale)'
        : 'Die gespeicherten Zugangsdaten sind unvollstaendig',
      fehlendeAngaben: fehlt,
      nichtUebertragen,
      uebersprungen: uebersprungen.length ? uebersprungen : undefined,
      ergaenzt: Object.keys(ergaenzungen).length ? ergaenzungen : undefined,
      wuerdeSenden: {
        ...nutzlast,
        publication: { status: 'Active', channels: [{ id: 'AS24' }] },
      },
    }, { status: trockenlauf ? 200 : 409 });
  }

  if (fehlt.length > 0) {
    return NextResponse.json(
      { error: 'Angaben unvollständig', fehlendeAngaben: fehlt },
      { status: 400 },
    );
  }

  const authHeader = 'Basic ' + Buffer.from(`${username ?? ''}:${password}`).toString('base64');
  const kopf: Record<string, string> = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  };
  /* Testinserate sind auf AutoScout24 nie sichtbar und kosten nichts. */
  if (testmodus) kopf['X-Testmode'] = 'true';

  /*
   * Bilder zuerst, dann das Inserat mit den Kennungen darin — so
   * empfiehlt es die Dokumentation. Vorher lief es andersherum: erst
   * anlegen, dann Bilder, dann noch einmal aendern. Das waren drei
   * Anfragen statt zwei, und zwischendurch stand ein Inserat ohne
   * Bilder in der Liste.
   */
  /*
   * Die Fotos kommen als Adressen aus dem Speicher (seit Schritt 2 sie
   * dort ablegt) oder als Data-URL aus einer alten Sitzung. bildHolen
   * nimmt beides — vorher wurde nur Base64 erwartet, und mit Adressen
   * waere das Inserat ohne ein einziges Foto rausgegangen.
   *
   * Umgewandelt wird nach JPEG mit hoechstens 4 MB. AutoScout24 nennt
   * keine so enge Grenze wie mobile.de, aber ein 12-MB-PNG durch eine
   * Mobilfunkleitung zu schicken ist auch ohne Grenze eine schlechte
   * Idee.
   */
  const imageIds: string[] = [];
  const bildFehler: string[] = [];
  for (const [i, bild] of ((images as unknown[]) || []).slice(0, 30).entries()) {
    try {
      const geholt = await bildHolen(bild);
      if (!geholt) { bildFehler.push(`Bild ${i + 1}: nicht ladbar`); continue; }
      const jpeg = await alsJpeg(geholt, 4 * 1024 * 1024);
      if (!jpeg) { bildFehler.push(`Bild ${i + 1}: nicht umwandelbar`); continue; }

      const kopfBild: Record<string, string> = { Authorization: authHeader, 'Content-Type': 'image/jpeg' };
      if (testmodus) kopfBild['X-Testmode'] = 'true';
      const antwort = await fetch(`${BASE_URL}/customers/${customerId}/images`, {
        method: 'POST', headers: kopfBild, body: new Uint8Array(jpeg),
      });
      if (antwort.ok) {
        const daten = await antwort.json();
        if (daten.id) imageIds.push(daten.id);
      } else {
        const text = await antwort.text();
        console.error('Bild abgelehnt:', antwort.status, text.slice(0, 200));
        bildFehler.push(`Bild ${i + 1}: abgelehnt (${antwort.status})`);
      }
    } catch (fehler) {
      console.error('Bild konnte nicht hochgeladen werden:', fehler);
      bildFehler.push(`Bild ${i + 1}: Fehler beim Hochladen`);
    }
  }
  if (imageIds.length > 0) nutzlast.images = imageIds.map(id => ({ id }));

  const antwort = await fetch(`${BASE_URL}/customers/${customerId}/listings`, {
    method: 'POST',
    headers: kopf,
    body: JSON.stringify({
      ...nutzlast,
      publication: { status: 'Active', channels: [{ id: 'AS24' }] },
    }),
  });

  if (!antwort.ok) {
    const text = await antwort.text();
    let koerper: unknown;
    try { koerper = JSON.parse(text); } catch { koerper = text; }
    return NextResponse.json(
      { error: `AutoScout24 hat abgelehnt (${antwort.status})`, details: koerper },
      { status: antwort.status },
    );
  }

  const inserat = await antwort.json();

  /*
   * 202 heisst NICHT "veroeffentlicht".
   *
   * Aus der Dokumentation: "If a listing is invalid but might be
   * enriched by AutoScout24, then the API will now reply with 202
   * Accepted. This means the listing could not be activated as is."
   *
   * AutoScout24 versucht dann, die fehlenden EnVKV-Werte selbst aus
   * der Fahrgestellnummer nachzutragen — hoechstens fuenf Minuten,
   * nur bei Neuwagen unter 1.000 km. Klappt es nicht, bleibt das
   * Inserat inaktiv.
   *
   * Ohne diese Unterscheidung haette die Route "veroeffentlicht"
   * gemeldet, waehrend beim Haendler nichts online ist. 202 ist ein
   * Erfolgscode, also faellt es durch jede Pruefung auf antwort.ok.
   */
  const inArbeit = antwort.status === 202;

  return NextResponse.json({
    listingId: inserat.id,
    nochNichtAktiv: inArbeit,
    hinweis: inArbeit
      ? 'AutoScout24 ergänzt fehlende Verbrauchswerte aus der Fahrgestellnummer. '
        + 'Das dauert bis zu fünf Minuten. Gelingt es nicht, bleibt das Inserat inaktiv '
        + 'und die Werte müssen nachgetragen werden.'
      : undefined,
    testmodus: Boolean(testmodus),
    as24Url: testmodus ? null : `https://www.autoscout24.de/angebote/-${inserat.id}`,
    /*
     * Auch der Haendlerportal-Link nur im Betrieb: Ein Testinserat ist
     * dort nicht zu finden, und ein Link, der ins Leere fuehrt, sieht aus
     * wie ein Fehler in der Uebertragung.
     */
    dealerUrl: testmodus ? null : `https://autoscout24.com/account/listings/${inserat.id}`,
    nichtUebertragen,
    uebersprungen: uebersprungen.length ? uebersprungen : undefined,
    ergaenzt: Object.keys(ergaenzungen).length ? ergaenzungen : undefined,
    imagesUploaded: imageIds.length,
    // Welche Fotos nicht durchkamen — vorher stand das nur im Log des
    // Servers, und der Haendler sah ein Inserat mit halb so vielen Bildern.
    bildFehler,
  });
}
