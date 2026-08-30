import { NextRequest, NextResponse } from 'next/server';
import { mobileMarkenWert, mobileModellWert } from '../../../lib/carDatabase';
import {
  mobileKategorie, mobileKraftstoff, mobileGetriebe, mobileFarbe,
  mobileEuronorm, mobileTueren, mobileUmsatzsteuer,
  mobilePolsterung, mobileInnenfarbe, mobileAntrieb, mobileHu,
} from '../../../lib/mobileUebersetzung';
import { mobileAusstattung } from '../../../lib/ausstattungAnwenden';
import { mobileEnvkv } from '../../../lib/mobileEnvkv';
import { validateEnvkv, type EnvkvData } from '../../../lib/envkv';

export const dynamic = 'force-dynamic';

const BASIS = 'https://services.mobile.de/seller-api';

/** Erstzulassung im Format yyyyMM, wie mobile.de es erwartet. */
function erstzulassung(roh: string): string {
  const s = (roh || '').trim();
  const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}${ddmmyyyy[2].padStart(2, '0')}`;
  const mmyyyy = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}${mmyyyy[1].padStart(2, '0')}`;
  const yyyymm = s.match(/^(\d{4})-(\d{2})$/);
  if (yyyymm) return `${yyyymm[1]}${yyyymm[2]}`;
  if (/^\d{6}$/.test(s)) return s;
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
  doors?: string; vatType?: string; metallic?: boolean; previousOwners?: string;
  equipment?: string[];
  leermasseKg?: string; anhaengelastGebremstKg?: string; anhaengelastUngebremstKg?: string;
  envkv?: EnvkvData;
  huUntil?: string; interiorType?: string; interiorColor?: string;
  driveType?: string; warranty?: boolean;
}

/**
 * Baut das Inserat und sammelt dabei, was fehlt.
 *
 * Getrennt vom Versenden, damit sich beides einzeln betrachten
 * laesst -- und weil ohne Zugangsdaten das Bauen der einzige Teil
 * ist, den man ueberhaupt pruefen kann.
 */
function inseratBauen(formData: FormData, description?: string) {
  const fehlt: string[] = [];
  const inserat: Record<string, unknown> = { vehicleClass: 'Car' };

  const marke = (formData.brand || '').trim();
  if (marke) inserat.make = mobileMarkenWert(marke);
  else fehlt.push('Marke');

  /*
   * Fuer die Fahrzeugklasse Car ist model ein Pflichtfeld
   * ("model-empty"). Vorher zerlegte die Route das Markenfeld und
   * schrieb das Ergebnis in Grossbuchstaben -- also "GOLF" statt
   * "Golf", was mobile.de ablehnt. Fand sie gar nichts, schickte sie
   * das Wort "MODELL" als Modellnamen.
   */
  const modell = (formData.model || '').trim();
  if (modell) inserat.model = mobileModellWert(marke, modell);
  else fehlt.push('Modell');

  /*
   * modelDescription ist zugleich die Ueberschrift des Inserats.
   * Hoechstens 48 Zeichen, und weder Telefonnummer noch E-Mail noch
   * Adresse duerfen darin stehen -- sonst lehnt mobile.de ab
   * (modeldescription-contains-phone / -email / -url).
   */
  const titel = [marke, modell].filter(Boolean).join(' ').trim();
  if (titel) inserat.modelDescription = titel.slice(0, 48);

  const kategorie = mobileKategorie(formData.bodyType || '');
  if (kategorie) inserat.category = kategorie;
  else fehlt.push(formData.bodyType ? `Karosserieform "${formData.bodyType}" unbekannt` : 'Karosserieform');

  const kraftstoff = mobileKraftstoff(formData.fuelType || '');
  if (kraftstoff) inserat.fuel = kraftstoff;
  else fehlt.push(formData.fuelType ? `Kraftstoff "${formData.fuelType}" unbekannt` : 'Kraftstoff');

  const getriebe = mobileGetriebe(formData.gearbox || '');
  if (getriebe) inserat.gearbox = getriebe;
  else fehlt.push('Getriebe');

  /* Neu- oder Gebrauchtwagen. Ohne Erstzulassung gilt es als neu. */
  const km = ganzzahl(formData.km);
  const erst = erstzulassung(formData.firstRegistration || '');
  inserat.condition = !erst && km <= 1000 ? 'NEW' : 'USED';
  if (erst) inserat.firstRegistration = erst;
  else if (inserat.condition === 'USED') fehlt.push('Erstzulassung');

  if (km > 0) inserat.mileage = km;
  else if (inserat.condition === 'USED') fehlt.push('Kilometerstand');

  /* Pflichtfeld (damageunrepaired-empty), stand vorher fest auf false. */
  inserat.damageUnrepaired = Boolean(formData.damaged);

  const preis = zahl(formData.price);
  if (preis > 0) {
    inserat.price = {
      consumerPriceGross: preis.toFixed(2),
      type: 'FIXED',
      currency: 'EUR',
      ...mobileUmsatzsteuer(formData.vatType || ''),
    };
  } else fehlt.push('Preis');

  const kw = ganzzahl(formData.powerKw);
  if (kw > 0) inserat.power = kw;
  const ccm = ganzzahl(formData.displacementCcm);
  if (ccm > 0) inserat.cubicCapacity = ccm;
  const sitze = ganzzahl(formData.seats);
  if (sitze > 0) inserat.seats = sitze;
  const tueren = mobileTueren(ganzzahl(formData.doors));
  if (tueren) inserat.doors = tueren;
  const vorbesitzer = ganzzahl(formData.previousOwners);
  if (vorbesitzer > 0 && inserat.condition === 'USED') inserat.numberOfPreviousOwners = vorbesitzer;

  /*
   * Feld G und O.1/O.2 aus dem Fahrzeugschein.
   *
   * mobile.de nennt das Gewichtsfeld "weight". Gemeint ist die
   * Leermasse — dieselbe Zahl, die im Inserat unter "Gewicht" steht.
   */
  const leermasse = ganzzahl(formData.leermasseKg);
  if (leermasse > 0) inserat.weight = leermasse;
  const zugGebremst = ganzzahl(formData.anhaengelastGebremstKg);
  if (zugGebremst > 0) inserat.trailerLoadBraked = zugGebremst;
  const zugUngebremst = ganzzahl(formData.anhaengelastUngebremstKg);
  if (zugUngebremst > 0) inserat.trailerLoadUnbraked = zugUngebremst;

  /*
   * Fuenf Felder, die das Formular erfasst und die bisher weggeworfen
   * wurden. Drei davon stehen dort unter "Das traegst du selbst ein" —
   * der Haendler tippte sie ein, und sie landeten nirgends.
   */
  const hu = mobileHu(formData.huUntil || '');
  if (hu) inserat.generalInspection = hu;
  const polster = mobilePolsterung(formData.interiorType || '');
  if (polster) inserat.interiorType = polster;
  const innenfarbe = mobileInnenfarbe(formData.interiorColor || '');
  if (innenfarbe) inserat.interiorColor = innenfarbe;
  const antrieb = mobileAntrieb(formData.driveType || '');
  if (antrieb) inserat.driveType = antrieb;
  if (formData.warranty) inserat.warranty = true;

  if (formData.vin) inserat.vin = formData.vin.toUpperCase();
  const farbe = mobileFarbe(formData.color || '');
  if (farbe) inserat.exteriorColor = farbe;
  if (formData.metallic) inserat.metallic = true;
  const norm = mobileEuronorm(formData.emissionClass || '');
  if (norm) inserat.emissionClass = norm;

  /*
   * Ausstattung: bei mobile.de keine Liste, sondern einzelne Felder
   * des Inserats.
   *
   * Nur Felder setzen, die noch leer sind. Heute ueberschneidet sich
   * nichts — kein Ausstattungsmerkmal zielt auf ein Feld, das oben
   * schon gefuellt wird. Aber "heute nicht" ist kein Zustand, auf den
   * man baut: Kommt spaeter ein Merkmal dazu, das auf `metallic` oder
   * `interiorType` zeigt, gewinnt die ausdrueckliche Auswahl des
   * Haendlers und nicht das Haekchen.
   */
  for (const [feld, wert] of Object.entries(mobileAusstattung(formData.equipment || []))) {
    if (inserat[feld] === undefined) inserat[feld] = wert;
  }

  if (description) inserat.description = description.slice(0, 5000);

  /*
   * EnVKV: Bei Neuwagen sind Verbrauch, CO2-Wert und CO2-Klasse
   * gesetzlich vorgeschrieben; ohne sie lehnt mobile.de ab
   * ("envkv-values-required").
   *
   * Geprueft wird mit derselben Funktion wie im Formular, damit
   * "Weiter" und der Upload nicht verschiedener Meinung sein koennen.
   * Angegebene Werte werden immer uebertragen, auch bei einem
   * Gebrauchtwagen -- wer sie freiwillig einträgt, will sie im Inserat
   * sehen.
   */
  const envkv = formData.envkv;
  if (envkv) {
    const pruefung = validateEnvkv(envkv, formData.fuelType || '');
    if (pruefung.required && !pruefung.complete) {
      fehlt.push(`EnVKV: ${pruefung.missing.join(', ')}`);
    }
    Object.assign(inserat, mobileEnvkv(envkv, formData.fuelType || ''));
  } else if (inserat.condition === 'NEW') {
    fehlt.push('EnVKV-Angaben für Neuwagen');
  }

  return { inserat, fehlt };
}

export async function POST(req: NextRequest) {
  const username = process.env.MOBILEDE_API_USERNAME;
  const password = process.env.MOBILEDE_API_PASSWORD;
  const sellerId = process.env.MOBILEDE_SELLER_ID;

  const { formData, description, images, trockenlauf } = await req.json();
  const { inserat, fehlt } = inseratBauen(formData || {}, description);

  /* Ohne Zugangsdaten zeigen, was rausginge, statt nur zu meckern. */
  if (trockenlauf || !username || !password || !sellerId) {
    return NextResponse.json({
      trockenlauf: true,
      grund: trockenlauf ? 'angefordert' : 'MOBILEDE_API_USERNAME/PASSWORD/SELLER_ID nicht gesetzt',
      fehlendeAngaben: fehlt,
      wuerdeSenden: inserat,
    }, { status: trockenlauf ? 200 : 503 });
  }

  if (fehlt.length > 0) {
    return NextResponse.json(
      { error: 'Angaben unvollständig', fehlendeAngaben: fehlt },
      { status: 400 },
    );
  }

  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const kopf = { Authorization: authHeader, Accept: 'application/vnd.de.mobile.api+json' };

  /*
   * Bilder zuerst, dann das Inserat mit den Verweisen darin -- so
   * empfiehlt es die Dokumentation ausdruecklich.
   *
   * mobile.de nimmt nur JPG und hoechstens 2 MB je Bild. Das ist eng:
   * Ein Studio-Bild kann darueber liegen. Zu grosse Bilder werden
   * hier uebersprungen und gemeldet, statt den ganzen Aufruf
   * scheitern zu lassen.
   */
  const GRENZE = 2 * 1024 * 1024;
  const bildVerweise: Array<{ ref: string }> = [];
  const bildFehler: string[] = [];

  for (const [i, bild] of (((images as string[]) || [])).entries()) {
    try {
      if (/^data:image\/png/i.test(bild)) {
        bildFehler.push(`Bild ${i + 1}: PNG, mobile.de nimmt nur JPG`);
        continue;
      }
      const rumpf = Buffer.from(bild.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      if (rumpf.length > GRENZE) {
        bildFehler.push(`Bild ${i + 1}: ${Math.round(rumpf.length / 1024)} KB, Grenze sind 2048 KB`);
        continue;
      }
      const antwort = await fetch(`${BASIS}/images`, {
        method: 'POST',
        headers: { ...kopf, 'Content-Type': 'image/jpeg' },
        body: rumpf,
      });
      if (antwort.ok) {
        const daten = await antwort.json();
        if (daten.ref) bildVerweise.push({ ref: daten.ref });
      } else {
        bildFehler.push(`Bild ${i + 1}: abgelehnt (${antwort.status})`);
      }
    } catch {
      bildFehler.push(`Bild ${i + 1}: konnte nicht gelesen werden`);
    }
  }
  if (bildVerweise.length > 0) inserat.images = bildVerweise;

  /*
   * X-Mobile-Insertion-Request-Id macht das Anlegen wiederholbar:
   * Bricht die Verbindung ab, weiss man nicht, ob das Inserat
   * entstanden ist. Mit derselben Kennung antwortet mobile.de beim
   * zweiten Versuch mit 303 und verweist auf das bereits angelegte
   * Inserat, statt ein zweites zu erzeugen.
   */
  const antwort = await fetch(`${BASIS}/sellers/${sellerId}/ads`, {
    method: 'POST',
    headers: {
      ...kopf,
      'Content-Type': 'application/vnd.de.mobile.api+json',
      'X-Mobile-Insertion-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(inserat),
  });

  if (!antwort.ok && antwort.status !== 303) {
    const text = await antwort.text();
    let koerper: unknown;
    try { koerper = JSON.parse(text); } catch { koerper = text; }
    return NextResponse.json(
      { error: `mobile.de hat abgelehnt (${antwort.status})`, details: koerper, bildFehler },
      { status: antwort.status },
    );
  }

  const ort = antwort.headers.get('Location') || '';
  const mobileAdId = ort.split('/').pop() || '';

  return NextResponse.json({
    mobileAdId,
    bereitsVorhanden: antwort.status === 303,
    adUrl: `https://suchen.mobile.de/fahrzeuge/details.html?id=${mobileAdId}`,
    dealerUrl: `https://portal.mobile.de/insertions/${mobileAdId}`,
    imagesUploaded: bildVerweise.length,
    bildFehler,
  });
}
