/**
 * Behauptet die Beschreibung etwas, das in den Daten nicht steht?
 *
 * ── Warum es diese Prüfung gibt ────────────────────────────────────
 *
 * Jede andere Stelle im Projekt verbietet dem Modell das Erfinden —
 * scan-doc, detect-equipment, scan-equipment-doc, die Nahaufnahmen.
 * Überall steht derselbe Satz: ablesen, nicht ableiten, im Zweifel
 * weglassen.
 *
 * Die Beschreibung tat das Gegenteil. Sie forderte „überzeugend,
 * kaufmotivierend" und gab dem Modell die Rolle eines Händlers, der
 * „überzeugende Inserate schreibt" — ohne ein einziges Verbot. Nichts
 * hielt es davon ab, „unfallfrei", „scheckheftgepflegt", „1. Hand",
 * „technisch einwandfrei" oder „TÜV neu" zu schreiben, weil es gut
 * klingt.
 *
 * Das ist der teuerste Satz, den diese Software schreiben kann. Ein
 * Fahrzeug im Inserat als unfallfrei zu bezeichnen, ist eine
 * Eigenschaftszusicherung: Stimmt sie nicht, kann der Käufer den Kauf
 * rückabwickeln und Schadensersatz verlangen — und zwar beim Händler,
 * der dafür 7,50 € bezahlt hat.
 *
 * Eine Ausstattungsliste kann man als Händler in zehn Sekunden prüfen.
 * Einen flüssigen Werbetext liest man einmal durch und nickt. Genau
 * deshalb braucht die Beschreibung die härteste Prüfung von allen, und
 * nicht die lockerste.
 *
 * Geprüft wird hier und nicht in der Route, damit
 * scripts/beschreibung-probe.ts jeden Fall ohne Modellaufruf
 * durchspielen kann.
 */

/** Was der Text über das Fahrzeug wissen darf. */
export type Belegt = {
  /** Händler hat „unfallfrei" ausdrücklich gesetzt (damaged === false). */
  unfallfrei?: boolean;
  /** Händler hat Garantie zugesagt. */
  garantie?: boolean;
  /** Merkmale aus der Ausstattungsliste, kleingeschrieben. */
  ausstattung?: string[];
  /** Anzahl Vorbesitzer, wie vom Händler angegeben. */
  vorbesitzer?: string;
  /** HU gültig bis, MM/JJJJ. */
  huBis?: string;
};

type Regel = {
  /** Kurzname für die Meldung. */
  name: string;
  muster: RegExp;
  /** Ist die Behauptung durch die Daten gedeckt? */
  gedeckt: (b: Belegt) => boolean;
  /** Was der Händler stattdessen tun muss. */
  hinweis: string;
};

const hat = (b: Belegt, wort: string) =>
  (b.ausstattung ?? []).some(m => m.toLowerCase().includes(wort));

export const REGELN: Regel[] = [
  {
    name: 'unfallfrei',
    /* Auch die Umschreibungen: "keine Unfallschäden", "unbeschädigt". */
    muster: /unfallfrei|unfallschadenfrei|keine\s+unfall|ohne\s+unfall|unbeschädigt/i,
    gedeckt: b => b.unfallfrei === true,
    hinweis: 'Nur wenn der Händler „unfallfrei" selbst gesetzt hat. Die Zusicherung mit der höchsten Haftung von allen.',
  },
  {
    name: 'Scheckheft',
    /*
     * "lückenlos" steht allein, weil die Wortstellung wechselt: "lückenlose
     * Wartung" und "die Wartung erfolgte lückenlos" sind dieselbe
     * Behauptung. Die erste Fassung verlangte Wartung/Service DIREKT
     * hinter dem Wort und liess die zweite durch — gefunden von
     * scripts/beschreibung-probe.ts, nicht im Betrieb.
     */
    muster: /scheckheft|serviceheft|lückenlos/i,
    gedeckt: b => hat(b, 'scheckheft'),
    hinweis: 'Nur wenn „Scheckheftgepflegt" in der Ausstattungsliste steht.',
  },
  {
    name: 'erste Hand',
    muster: /\b1\.\s*hand\b|erste[rn]?\s+hand|einem?\s+vorbesitzer\b|nur\s+ein\s+vorbesitzer/i,
    gedeckt: b => (b.vorbesitzer ?? '').trim() === '1',
    hinweis: 'Nur wenn der Händler 1 Vorbesitzer angegeben hat. Steht nicht im Fahrzeugschein Teil I.',
  },
  {
    name: 'TÜV/HU neu',
    muster: /tüv\s*(neu|frisch)|hu\s*(neu|frisch)|frische[rn]?\s+(tüv|hu)|neue\s+hu/i,
    gedeckt: b => Boolean((b.huBis ?? '').trim()),
    hinweis: 'Nur mit eingetragenem HU-Datum. „Neu" ergibt sich daraus, nicht aus dem Gefühl.',
  },
  {
    name: 'Garantie',
    muster: /garantie|gewährleistung|garantiert\b/i,
    gedeckt: b => b.garantie === true,
    hinweis: 'Nur wenn der Händler Garantie zugesagt hat. Eine zugesagte Garantie ist ein Vertrag.',
  },
  {
    name: 'Nichtraucher',
    muster: /nichtraucher|rauchfrei/i,
    gedeckt: b => hat(b, 'nichtraucher'),
    hinweis: 'Nur wenn „Nichtraucher-Fahrzeug" in der Ausstattungsliste steht.',
  },
  /*
   * Die folgenden lassen sich aus KEINEN Daten belegen — es gibt kein
   * Feld dafür, und es wird auch keines geben. Ein Zustandsurteil
   * gehört dem Händler, nicht der Software.
   */
  {
    name: 'Zustandsurteil',
    /*
     * "gepflegt" steht allein — das ist das haeufigste Zustandsurteil
     * ueberhaupt, und die erste Fassung verlangte "sehr gut gepflegt".
     * "Dieser gepflegte Golf" rutschte damit durch.
     *
     * Der Rueckblick schliesst "scheckheftgepflegt" aus: Das ist eine
     * belegbare Angabe und hat eine eigene Regel. Ohne diese Ausnahme
     * wuerde eine wahre Aussage blockiert — und eine Pruefung, die auch
     * Wahres wegnimmt, wird abgeschaltet.
     */
    muster: /technisch\s+einwandfrei|einwandfreie[rm]?\s+zustand|top\s*zustand|bestzustand|tadellos|makellos|neuwertig|wie\s+neu|(?<!scheckheft)gepflegt|gut\s+erhalten|hervorragende[rm]?\s+zustand/i,
    gedeckt: () => false,
    hinweis: 'Ein Zustandsurteil darf nur der Händler abgeben. Es steht in keinem Feld und ist nachprüfbar.',
  },
  {
    name: 'Rost',
    muster: /rostfrei|kein\s+rost|ohne\s+rost/i,
    gedeckt: () => false,
    hinweis: 'Nicht belegbar. Rost sieht man am Fahrzeug, nicht in den Daten.',
  },
  {
    name: 'Mängelfreiheit',
    muster: /mängelfrei|ohne\s+mängel|keine\s+mängel|fehlerfrei|funktioniert\s+alles|alles\s+funktioniert/i,
    gedeckt: () => false,
    hinweis: 'Nicht belegbar und im Streitfall die zweitteuerste Zusicherung nach „unfallfrei".',
  },
  {
    name: 'Wartung versprochen',
    muster: /frisch\s+gewartet|neu\s+gewartet|service\s+(neu|frisch\s+gemacht)|inspektion\s+neu|zahnriemen\s+neu|neue\s+bremsen|neuer\s+zahnriemen/i,
    gedeckt: () => false,
    hinweis: 'Durchgeführte Arbeiten gehören in die Händler-Notizen, nicht in einen erzeugten Text.',
  },
];

export type Verstoss = { name: string; stelle: string; hinweis: string };

/**
 * Findet jede Behauptung im Text, die die Daten nicht decken.
 * Leeres Ergebnis heißt: Der Text sagt nichts, was nicht belegt ist.
 */
export function beschreibungPruefen(text: string, belegt: Belegt): Verstoss[] {
  const verstoesse: Verstoss[] = [];
  for (const regel of REGELN) {
    const treffer = (text || '').match(regel.muster);
    if (!treffer) continue;
    if (regel.gedeckt(belegt)) continue;
    verstoesse.push({ name: regel.name, stelle: treffer[0], hinweis: regel.hinweis });
  }
  return verstoesse;
}
