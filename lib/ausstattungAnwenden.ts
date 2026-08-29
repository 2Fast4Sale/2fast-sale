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

import { ALL_EQUIPMENT } from './equipmentDatabase';
import { PORTAL_ZIELE, type PortalZiel } from './ausstattungPortale';
import { MOBILE_WERTE } from './mobileWerte';

const NACH_LABEL = new Map(ALL_EQUIPMENT.map(e => [e.label.toLowerCase(), e.id]));
const NACH_ID = new Map<string, PortalZiel>(PORTAL_ZIELE.map(z => [z.id, z]));

/** Angezeigte Bezeichnung -> Zuordnung, oder undefined. */
function ziel(label: string): PortalZiel | undefined {
  const id = NACH_LABEL.get((label || '').trim().toLowerCase());
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
