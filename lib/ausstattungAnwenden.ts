/**
 * Setzt die angekreuzte Ausstattung in das um, was die Portale
 * erwarten.
 *
 * Die Zuordnung selbst steht in ausstattungPortale.ts und ist erzeugt.
 * Hier steht, was man mit ihr tut — und das ist bei den beiden
 * Portalen so verschieden, dass es sich nicht in eine Funktion
 * zusammenfassen laesst:
 *
 *   AutoScout24  eine Liste von Zahlen:  equipment: [1, 15, 30]
 *   mobile.de    einzelne Felder:        { abs: true, sunroof: true,
 *                                          climatisation: '…' }
 *
 * Merkmale, die der Haendler selbst eingetippt hat und die in keiner
 * Liste stehen, werden hier still uebergangen. Sie sind nicht verloren
 * — sie stehen im Beschreibungstext. Ein Portal nimmt nur, was es
 * kennt.
 */

import { ALL_EQUIPMENT, normalizeEquipment } from './equipmentDatabase';
import { PORTAL_ZIELE, type PortalZiel } from './ausstattungPortale';
import { MOBILE_WERTE } from './mobileWerte';

const NACH_LABEL = new Map(ALL_EQUIPMENT.map(e => [e.label.toLowerCase(), e.id]));
const NACH_ID = new Map<string, PortalZiel>(PORTAL_ZIELE.map(z => [z.id, z]));

/**
 * Angezeigte Bezeichnung -> Zuordnung, oder undefined.
 *
 * Erst normalisieren. Verglichen wurde vorher nur der Anzeigename, und
 * der steht selten genau so da: Die Fotoerkennung meldet "Alufelgen",
 * die Liste fuehrt "Leichtmetallfelgen", der Haendler tippt "Alu
 * Felgen". Alle drei meinen dasselbe und keines davon erreichte ein
 * Portal.
 */
function ziel(label: string): PortalZiel | undefined {
  const roh = (label || '').trim().toLowerCase();
  const id = NACH_LABEL.get(roh)
    ?? NACH_LABEL.get(normalizeEquipment(label).trim().toLowerCase());
  return id ? NACH_ID.get(id) : undefined;
}

/**
 * Die vier Klimaautomatik-Kennungen von AutoScout24.
 *
 * Aus der Schnittstellenbeschreibung: "You are only allowed to send one
 * Automatic Climate Control equipment for a given listing." Kreuzt der
 * Haendler Klimaautomatik UND Vierzonen an — was naheliegt, das eine
 * ist ja das andere —, waere das Inserat ungueltig. Es gewinnt die
 * genauere Angabe.
 */
const AS24_KLIMA_GENAUER_ZUERST = ['243', '242', '241', '30'];

/** Ausstattung fuer AutoScout24: Liste von Kennungen. */
export function as24Ausstattung(labels: string[]): number[] {
  const kennungen = new Set<string>();
  for (const l of labels || []) {
    const z = ziel(l);
    if (z?.as24) kennungen.add(z.as24);
  }

  const klima = AS24_KLIMA_GENAUER_ZUERST.filter(k => kennungen.has(k));
  if (klima.length > 1) {
    for (const k of klima.slice(1)) kennungen.delete(k);
  }

  return [...kennungen].map(Number).sort((a, b) => a - b);
}

/**
 * Ausstattung fuer mobile.de: einzelne Felder des Inserats.
 *
 * Drei Arten, drei Regeln:
 *
 *   schalter  wird auf true gesetzt
 *   liste     sammelt alle Werte ein (parkingAssistants, radio)
 *   auswahl   nimmt den WEITESTGEHENDEN Wert
 *
 * Die letzte Regel braucht eine Erklaerung. Kreuzt jemand Klimaanlage
 * und Klimaautomatik an, kann nur eines im Feld stehen. Die
 * Referenzlisten von mobile.de sind aufsteigend geordnet — von
 * NO_CLIMATISATION bis AUTOMATIC_CLIMATISATION_4_ZONES, von
 * DRIVER_AIRBAG bis FRONT_AND_SIDE_AND_MORE_AIRBAGS. Also gewinnt der
 * Wert, der weiter hinten steht.
 *
 * Bei interiorType stimmt diese Ordnung NICHT — Leder, Teilleder und
 * Stoff sind nebeneinander, nicht aufeinander aufbauend. Dort ist die
 * Regel bedeutungslos, aber auch harmlos: Der Haendler kreuzt nur eine
 * Polsterung an.
 */
export function mobileAusstattung(labels: string[]): Record<string, unknown> {
  const felder: Record<string, unknown> = {};
  const listen: Record<string, Set<string>> = {};
  const auswahl: Record<string, string> = {};

  for (const l of labels || []) {
    const z = ziel(l);
    if (!z?.mobile) continue;
    const m = z.mobile;

    if (m.art === 'schalter') {
      felder[m.feld] = true;
    } else if (m.art === 'liste') {
      listen[m.feld] ??= new Set();
      for (const w of m.werte) listen[m.feld].add(w);
    } else {
      const reihe = MOBILE_WERTE[m.feld]?.map(([w]) => w) ?? [];
      const bisher = auswahl[m.feld];
      if (!bisher || reihe.indexOf(m.wert) > reihe.indexOf(bisher)) {
        auswahl[m.feld] = m.wert;
      }
    }
  }

  for (const [feld, werte] of Object.entries(listen)) felder[feld] = [...werte];
  for (const [feld, wert] of Object.entries(auswahl)) felder[feld] = wert;

  return felder;
}

/* ────────────────── Merkmale, die woanders hingehoeren ────────────────── */

/**
 * Angekreuzte Merkmale, die KEIN Portal als Ausstattung kennt.
 *
 * Gebraucht fuer eine ehrliche Auskunft vor dem Uebertragen: Der
 * Haendler kreuzt "7 Sitze" und "Automatikgetriebe" an und darf
 * erwarten, dass beides im Inserat landet. Als Ausstattungsmerkmal tut
 * es das nicht — die Portale fuehren das in eigenen Feldern oder gar
 * nicht. Still uebergehen waere das Schlimmste: Es sieht aus, als waere
 * es uebertragen worden.
 */
export function ohnePortalEntsprechung(labels: string[]): string[] {
  return (labels || []).filter(l => {
    const z = ziel(l);
    return !z?.mobile && !z?.as24;
  });
}

/**
 * Merkmale, die in Wahrheit ein anderes Feld fuellen.
 *
 * "Automatikgetriebe" ist keine Ausstattung, sondern das Getriebe.
 * "7 Sitze" ist die Sitzzahl, "Allradantrieb" die Antriebsart,
 * "Lederausstattung" die Polsterung. Beide Portale fuehren dafuer
 * eigene Felder, und wer dort nichts stehen hat, verliert die Angabe —
 * obwohl der Haendler sie gemacht hat.
 *
 * Gefuellt wird NUR, was leer ist. Steht im Formular "Manuell" und in
 * der Ausstattung "Automatikgetriebe", gewinnt das Formular: Es ist die
 * genauere Angabe, und widersprechen darf sich ein Inserat nicht.
 */
export function ausAusstattungErgaenzen(
  labels: string[],
  vorhanden: Record<string, unknown>,
): Record<string, string> {
  const ergaenzt: Record<string, string> = {};
  const hat = (feld: string) => {
    const w = vorhanden[feld];
    return w !== undefined && w !== null && String(w).trim() !== '';
  };
  const setz = (feld: string, wert: string) => {
    if (!hat(feld) && !ergaenzt[feld]) ergaenzt[feld] = wert;
  };

  for (const roh of labels || []) {
    const l = (roh || '').toLowerCase();

    if (l.includes('automatikgetriebe')) setz('gearbox', 'Automatik');
    else if (l.includes('schaltgetriebe')) setz('gearbox', 'Manuell');

    if (l.includes('allradantrieb')) setz('driveType', 'Allrad');
    else if (l.includes('hinterradantrieb')) setz('driveType', 'Heckantrieb');
    else if (l.includes('frontantrieb')) setz('driveType', 'Frontantrieb');

    const sitze = l.match(/^(\d)\s*sitze$/);
    if (sitze) setz('seats', sitze[1]);

    if (l.includes('lederausstattung')) setz('interiorType', 'Leder');
    else if (l.includes('kunstleder') || l.includes('alcantara')) setz('interiorType', 'Alcantara');
    else if (l.includes('stoffausstattung')) setz('interiorType', 'Stoff');

    if (l.includes('plug-in')) setz('fuelType', 'Plug-in Hybrid');
    else if (l.includes('vollhybrid') || l.includes('mild-hybrid')) setz('fuelType', 'Hybrid');
    else if (l.includes('elektroantrieb')) setz('fuelType', 'Elektro');
  }

  return ergaenzt;
}
