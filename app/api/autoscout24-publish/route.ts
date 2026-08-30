import { NextRequest, NextResponse } from 'next/server';
import {
  as24MarkenId, as24ModellId, as24KarosserieId, as24Kraftstoff,
  as24Getriebe, as24FarbeId, as24EuronormId,
} from '../../../lib/as24Uebersetzung';
import { istAusgewiesen } from '../../../lib/mobileUebersetzung';
import { as24Ausstattung } from '../../../lib/ausstattungAnwenden';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://listing-creation.api.autoscout24.com';

/**
 * Wandelt "03.2019", "3.2019", "2019-03" oder "201903" in "2019-03".
 * Alles andere gilt als nicht angegeben.
 */
function erstzulassung(roh: string): string {
  const s = (roh || '').trim();
  const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}`;
  const mmyyyy = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1].padStart(2, '0')}`;
  const yyyymm = s.match(/^(\d{4})-(\d{2})$/);
  if (yyyymm) return `${yyyymm[1]}-${yyyymm[2]}`;
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return '';
}

const zahl = (roh: unknown): number =>
  parseFloat(String(roh ?? '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

const ganzzahl = (roh: unknown): number =>
  parseInt(String(roh ?? '').replace(/[^\d]/g, ''), 10) || 0;

interface FormData {
  brand?: string; model?: string; vin?: string; firstRegistration?: string;
  km?: string; price?: string; fuelType?: string; gearbox?: string;
  powerKw?: string; displacementCcm?: string; color?: string; seats?: string;
  bodyType?: string; damaged?: boolean; emissionClass?: string;
  doors?: string; vatType?: string; equipment?: string[];
  leermasseKg?: string;
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

  /* Neu- oder Gebrauchtwagen. Ohne Erstzulassung gilt es als neu. */
  const km = ganzzahl(formData.km);
  const erst = erstzulassung(formData.firstRegistration || '');
  nutzlast.offerType = !erst && km <= 1000 ? 'N' : 'U';
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
  else if (formData.model) nutzlast.modelVersion = formData.model.slice(0, 50);
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

  const kw = ganzzahl(formData.powerKw);
  if (kw > 0) nutzlast.power = kw;
  const ccm = ganzzahl(formData.displacementCcm);
  if (ccm > 0) nutzlast.cylinderCapacity = ccm;
  const sitze = ganzzahl(formData.seats);
  if (sitze > 0) nutzlast.seatCount = sitze;
  const tueren = ganzzahl(formData.doors);
  if (tueren > 0) nutzlast.doorCount = tueren;
  /*
   * Leermasse. AutoScout24 nennt es "emptyWeight" und sagt in der
   * Beschreibung ausdruecklich, was gemeint ist: "without driver,
   * passengers or liquids". Also Feld G im Schein.
   *
   * Die Anhaengelasten fehlen hier bewusst — AutoScout24 hat fuer
   * Personenwagen kein Feld dafuer. Sie gehen nur an mobile.de.
   */
  const leermasse = ganzzahl(formData.leermasseKg);
  if (leermasse > 0) nutzlast.emptyWeight = leermasse;

  if (formData.vin) nutzlast.vin = formData.vin;

  const farbe = as24FarbeId(formData.color || '');
  if (farbe) nutzlast.bodyColor = Number(farbe);
  const norm = as24EuronormId(formData.emissionClass || '');
  if (norm) nutzlast.euEmissionStandard = Number(norm);

  /*
   * Ausstattung: eine Liste von Kennungen. Was der Haendler selbst
   * eingetippt hat und in keiner Liste steht, faellt hier weg — es
   * steht im Beschreibungstext.
   */
  const ausstattung = as24Ausstattung(formData.equipment || []);
  if (ausstattung.length > 0) nutzlast.equipment = ausstattung;

  if (description) nutzlast.description = description.slice(0, 5000);
  if (imageIds.length > 0) nutzlast.images = imageIds.map(id => ({ id }));

  return { nutzlast, fehlt };
}

export async function POST(req: NextRequest) {
  const username = process.env.AS24_API_USERNAME;
  const password = process.env.AS24_API_PASSWORD;
  const customerId = process.env.AS24_CUSTOMER_ID;

  const { formData, description, images, testmodus, trockenlauf } = await req.json();
  const { nutzlast, fehlt } = nutzlastBauen(formData || {}, description);

  /*
   * Trockenlauf: zeigen, was rausginge, ohne etwas zu senden.
   *
   * Ohne Zugangsdaten laeuft die Route ohnehin ins Leere. Statt nur
   * einen Fehler zu melden, gibt sie die fertige Nutzlast zurueck —
   * dann sieht man wenigstens, ob die Uebersetzung stimmt, bevor
   * AutoScout24 den Zugang freischaltet.
   */
  if (trockenlauf || !username || !password || !customerId) {
    return NextResponse.json({
      trockenlauf: true,
      grund: trockenlauf ? 'angefordert' : 'AS24_API_USERNAME/PASSWORD/CUSTOMER_ID nicht gesetzt',
      fehlendeAngaben: fehlt,
      wuerdeSenden: {
        ...nutzlast,
        publication: { status: 'Active', channels: [{ id: 'AS24' }] },
      },
    }, { status: trockenlauf ? 200 : 503 });
  }

  if (fehlt.length > 0) {
    return NextResponse.json(
      { error: 'Angaben unvollständig', fehlendeAngaben: fehlt },
      { status: 400 },
    );
  }

  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
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
  const imageIds: string[] = [];
  for (const bild of ((images as string[]) || []).slice(0, 30)) {
    try {
      const typ = /^data:image\/png/i.test(bild) ? 'image/png' : 'image/jpeg';
      const rumpf = Buffer.from(bild.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const kopfBild: Record<string, string> = { Authorization: authHeader, 'Content-Type': typ };
      if (testmodus) kopfBild['X-Testmode'] = 'true';
      const antwort = await fetch(`${BASE_URL}/customers/${customerId}/images`, {
        method: 'POST', headers: kopfBild, body: rumpf,
      });
      if (antwort.ok) {
        const daten = await antwort.json();
        if (daten.id) imageIds.push(daten.id);
      } else {
        console.error('Bild abgelehnt:', antwort.status, await antwort.text());
      }
    } catch (fehler) {
      console.error('Bild konnte nicht hochgeladen werden:', fehler);
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
  return NextResponse.json({
    listingId: inserat.id,
    testmodus: Boolean(testmodus),
    as24Url: testmodus ? null : `https://www.autoscout24.de/angebote/-${inserat.id}`,
    dealerUrl: `https://autoscout24.com/account/listings/${inserat.id}`,
    imagesUploaded: imageIds.length,
  });
}
