/**
 * Die Ausstattung, die man NICHT sehen kann.
 *
 * ── Warum es diese Liste gibt ──────────────────────────────────────
 *
 * Erkennung hat eine harte Grenze, und die liegt nicht an der Technik:
 * Ein Luftfahrwerk, ein Spurhalteassistent oder ein Totwinkelwarner
 * sind auf keinem Foto zu sehen. Sie stehen in keinem Fahrzeugschein.
 * Ohne Datenlizenz und ohne Bestellbestaetigung gibt es dafuer genau
 * eine Quelle: den Haendler. Er hat das Auto gekauft, er ist damit
 * gefahren, er verkauft es.
 *
 * Das ist kein Notbehelf und kein Raten. Ein Inserat IST die Erklaerung
 * des Verkaeufers darueber, was er verkauft — er haftet dafuer, ob die
 * Angabe aus einer Datenbank kommt oder aus seinem Kopf.
 *
 * Das eigentliche Problem ist nicht, dass er es nicht weiss. Es ist,
 * dass er beim Tippen die Haelfte vergisst. Ein Suchfeld hilft dabei
 * nicht: Man muss "Luftfederung" erst eingeben koennen, um sie zu
 * finden. Deshalb diese Liste — er tippt nicht, er geht sie durch.
 *
 * ── Zwei Regeln, die hier nicht verhandelbar sind ──────────────────
 *
 * 1. NICHTS ist vorangekreuzt. Ein Vorschlag "ist bei diesem Modell
 *    ueblich" waere genau die Ableitung, die nicht ins Inserat darf —
 *    und ein voreingestelltes Ja wird ueberklickt.
 * 2. KEINE Filterung nach Modell. Es waere verlockend, einem Dacia
 *    kein Luftfahrwerk anzubieten. Dafuer muesste die Software wissen,
 *    was es fuer dieses Modell gab — weiss sie nicht, und ein falsches
 *    Ausblenden nimmt dem Haendler Ausstattung weg, die er verkauft
 *    hat. Lieber eine Zeile zu viel zum Durchschauen.
 *
 * Aufgenommen ist nur, was BEIDES ist: unsichtbar auf Fotos UND
 * preisrelevant. Airbags und ABS hat jedes Auto seit zwanzig Jahren;
 * die kosten nur Zeit beim Durchgehen. Die Reihenfolge geht nach
 * Gewicht im Preis, nicht nach Alphabet.
 *
 * Die Bezeichnungen kommen aus EQUIPMENT_DB, damit Portal-Schreibweise
 * und Normalisierung dieselben bleiben. Hier stehen nur die IDs.
 */

export type AbfrageGruppe = {
  titel: string;
  /** Was der Haendler sich beim Durchgehen fragen soll. */
  frage: string;
  ids: string[];
};

export const ABFRAGE: AbfrageGruppe[] = [
  {
    titel: 'Fahrwerk und Antrieb',
    frage: 'Was unter dem Auto steckt — auf Fotos nie zu sehen, im Preis am stärksten.',
    ids: [
      'luftfederung',
      'allrad',
      'automatik',
      'sportfahrwerk',
      'mild_hybrid',
      'vollhybrid',
      'plug_in_hybrid',
    ],
  },
  {
    titel: 'Assistenzsysteme',
    frage: 'Was das Auto selbst tut. Steht meist nur im Menü oder im Prospekt.',
    ids: [
      'acc',
      'spurhalte',
      'totwinkel',
      'notbremse',
      'verkehrszeichen',
      'einparkassistent',
      'muedigkeits',
      'fernlicht_auto',
      'tempomat',
      'tempo_limiter',
      'berganfahrhilfe',
    ],
  },
  {
    titel: 'Komfort, der sich nicht fotografieren lässt',
    frage: 'Funktionen, die man erst merkt, wenn man sie benutzt.',
    ids: [
      'standheizung',
      'sitzmassage',
      'keyless',
      'el_heckklappe',
      'klima_4zone',
      'lenkradheizung',
      'sitzlueftung',
      'memory_sitze',
      'el_sitze',
      'standkuehlung',
    ],
  },
  {
    titel: 'Licht',
    frage: 'Die Technik im Scheinwerfer, nicht seine Form.',
    ids: [
      'matrix_led',
      'blendfrei_fernlicht',
      'kurven_licht',
      'led',
      'xenon',
    ],
  },
  {
    titel: 'Technik im Innenraum',
    frage: 'Was erst bei eingeschalteter Zündung sichtbar wäre.',
    ids: [
      'soundsystem',
      'navi_online',
      'kabellos_laden',
      'head_up',
      'digital_cockpit',
      'carplay',
      'android_auto',
      'dab',
      'rear_entertainment',
      'nachtsicht',
    ],
  },
  {
    titel: 'Papiere und Zustand',
    frage: 'Gehört ins Inserat, steht aber auf keinem Foto und in keinem Schein.',
    ids: [
      'scheckh',
      'garantie',
      'nichtraucher',
      'winterraeder',
      'anhaengerkupplung',
    ],
  },
];

/** Alle IDs der Abfrage, in Reihenfolge — fuer Proben und Pruefungen. */
export const ABFRAGE_IDS: string[] = ABFRAGE.flatMap(g => g.ids);
