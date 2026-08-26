/**
 * Aussehen der Inseratsstrecke — für alle vier Schritte.
 *
 * Vorher hatte jeder Schritt seine eigenen Farben im Kopf der Datei
 * stehen: Schritt 1 dunkel, Schritt 2 dunkelblau, Schritt 4 mit einem
 * Farbverlauf. Wer die Strecke durchläuft, hat dreimal das Gefühl, die
 * Anwendung gewechselt zu haben.
 *
 * ── Hell, mit einer Ausnahme ──
 *
 * Die Anwendung ist durchgehend hell: heller Seitengrund, weisse Karten,
 * dunkle Schrift. Der Händler arbeitet tagsüber an einem Datenblatt, und
 * die Portale, auf denen sein Inserat landet, sind ebenfalls hell.
 *
 * Die Ausnahme ist der Startbildschirm von Schritt 1 — "Schein
 * fotografieren. Den Rest machen wir." Der ist dunkel und soll es
 * bleiben. Dort wird nichts gelesen und nichts getippt; dort steht ein
 * Satz und ein Knopf. Ein dunkles Bild wirkt an dieser einen Stelle wie
 * ein Vorhang, der aufgeht, und kostet nichts an Lesbarkeit.
 *
 * ── Drei Sätze Farben ──
 *
 *   Ohne Vorsilbe  → für die weisse Karte. Der häufige Fall, darum die
 *                    kurzen Namen.
 *   rahmen…        → für den hellen Seitengrund und die Leisten:
 *                    Seitenleiste, Kopfzeile, Fortschrittsanzeige.
 *   buehne…        → nur für den dunklen Startbildschirm.
 *
 * Die ersten beiden liegen dicht beieinander — beide Untergründe sind
 * hell, der eine weiss, der andere eine Spur grau. Getrennt bleiben sie,
 * weil ein Ton, der auf Weiss knapp durchgeht, auf dem grauen Grund
 * durchfallen kann.
 *
 * ── Die Werte sind gemessen, nicht geschätzt ──
 *
 * Alle Verhältnisse unten stammen aus `farben-messen.mjs` und erfüllen
 * WCAG: 4,5:1 für Text, 3:1 für Begrenzungen (1.4.11).
 *
 * `rahmenLinie` kam ursprünglich auf 1,38:1 gegen den Grund. Trennlinien
 * waren praktisch unsichtbar, und weil auf einem Datenblatt die Linien
 * die Struktur SIND, verschwamm die ganze Seite. Das wurde zunächst für
 * ein Problem der dunklen Farbe gehalten und mit einer Umstellung auf
 * hell beantwortet — die falsche Ursache.
 */

export const G = {
  schrift: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  ziffern: 'ui-monospace, "SF Mono", Menlo, monospace',

  /**
   * Wie breit der Inhalt einer Seite höchstens wird.
   *
   * Jede Seite hatte ihren eigenen Wert — 720, 880, 960, 1240 —, und
   * beim Händlerprofil standen dadurch auf einem breiten Bildschirm
   * links und rechts je 500 Pixel leer, während die Felder sich in der
   * Mitte drängten.
   *
   * 1320 ist die Obergrenze, nicht die Vorgabe: Die Formulare stehen
   * darin zwei- und dreispaltig, jede Spalte bekommt gut 400 Pixel.
   * Ganz ohne Grenze wären es auf einem breiten Schirm einzelne Zeilen
   * über die volle Breite — die liest niemand gern.
   */
  breite: 1320,

  /* ── Der Rahmen: Seitengrund und Leisten ── */

  /**
   * Der Seitengrund. Eine Spur grau, nicht reines Weiss — sonst
   * verschwimmen die weissen Karten damit und die Seite wird zu einer
   * einzigen Fläche ohne Gliederung.
   */
  grund:       '#f1f4f9',
  /** Seitenleiste, Kopf- und Fussleisten: weiss, damit sie sich absetzen. */
  rahmenFlaeche: '#ffffff',
  /** 19,1:1 auf dem Grund. */
  rahmenText:  '#000000',
  /** 9,4:1 auf dem Grund. */
  rahmenLeise: '#334155',
  /** 3,0:1 auf dem Grund und 3,4:1 auf den weissen Leisten. */
  rahmenLinie: '#868d95',
  /** 5,7:1 auf dem Grund. */
  rahmenAkzent: '#4f46e5',
  /*
   * Signalfarben für den Rahmen — dieselben Töne wie auf der Karte.
   * Sie stehen getrennt, weil der graue Grund dunkler ist als Weiss
   * und ein knapp bestandener Ton hier durchfallen kann.
   */
  /** 6,7:1 auf dem Grund. */
  rahmenGut:    '#166534',
  /** 6,7:1 auf dem Grund. */
  rahmenLuecke: '#92400e',
  /** 5,7:1 auf dem Grund. */
  rahmenFehler: '#be123c',

  /* ── Die Bühne: nur der Startbildschirm von Schritt 1 ── */

  /**
   * Die einzige dunkle Fläche der Anwendung.
   *
   * Eigener Satz statt der Rahmenfarben, damit dieser Bildschirm nicht
   * mitkippt, wenn am Rest gedreht wird — und damit niemand aus
   * Versehen eine dunkle Farbe auf eine helle Seite trägt.
   */
  buehneGrund:  '#0a0c11',
  /** 18,7:1 auf der Bühne. */
  buehneText:   '#f8fafc',
  /** 6,8:1 auf der Bühne. */
  buehneLeise:  '#8d99ad',
  /** 3,6:1 auf der Bühne — als Begrenzung sichtbar. */
  buehneLinie:  '#5c6a82',
  /** 6,5:1 auf der Bühne. */
  buehneAkzent: '#7c8aff',

  /* ── Die weisse Karte ── */

  /** Das Blatt selbst. */
  flaeche: '#ffffff',
  /**
   * Abgesetzter Bereich INNERHALB der Karte, etwa ein Vorschaukasten.
   *
   * Bewusst nur eine Spur dunkler als Weiss. Jeder kräftigere Ton drückt
   * `leise` und `linie` darauf unter die Schwelle — und die stehen
   * gerade in solchen Kästen oft.
   */
  erhoben: '#f6f8fb',

  /**
   * 3,3:1 auf Weiss und 3,1:1 auf `erhoben` — auf beiden Untergründen
   * als Begrenzung sichtbar. Ein hellerer Ton schafft das nicht mehr.
   */
  linie:      '#888f97',
  /**
   * Nur Zierrat: der Rand einer weissen Karte auf dunklem Grund, wo die
   * Karte sich schon durch ihre Helligkeit abhebt. Solche Ränder trägt
   * WCAG 1.4.11 nicht, deshalb steht hier ein Ton weit unter 3:1 --
   * kräftiger würde jede Gruppe wie ein Kasten wirken statt wie ein Blatt.
   */
  linieLeise: '#e2e8f0',

  /*
   * Schwarz, und die Nebentöne dicht dahinter.
   *
   * Vorher lag hier die übliche Grauabstufung: Haupttext in einem
   * dunklen Blaugrau, Nebentext zwei, drei Stufen heller. Sie erfüllt
   * die Kontrastwerte und sieht auf einer Bildschirmvorlage gut aus —
   * am Arbeitsplatz eines Händlers nicht. Der sitzt bei Tageslicht,
   * oft an einem älteren Bildschirm, und liest ein Datenblatt, kein
   * Magazin. Da wirkt jedes Grau blasser als gedacht.
   *
   * Die Abstufung bleibt erhalten, nur eng: Man erkennt weiter, was
   * Haupt- und was Nebensache ist, aber nichts wirkt mehr ausgegraut.
   */
  /** 21,0:1 auf Weiss. */
  text:     '#000000',
  /** 14,6:1 auf Weiss. */
  gedämpft: '#1e293b',
  /** 10,4:1 auf Weiss, 9,7:1 auf `erhoben`. */
  leise:    '#334155',
  /**
   * Platzhalter. 7,6:1 — auch ein Platzhalter ist Text und muss lesbar
   * sein; das übliche hellere Grau kommt auf 2,6:1 und fällt durch.
   * Vom Eingetragenen unterscheidet er sich durch "z. B." und Kursiv,
   * nicht durch Blässe.
   */
  blass:    '#475569',

  /*
   * Die Signalfarben sind dunklere Töne als auf dunklem Grund üblich.
   * Ein leuchtendes Grün auf Weiss kommt auf 1,8:1 und ist als Schrift
   * nicht zu lesen, obwohl es auf Schwarz gut aussieht.
   */
  /** 6,3:1 auf Weiss. */
  akzent:  '#4f46e5',
  /** 7,1:1 auf Weiss, 6,5:1 auf dem eigenen Schleier. */
  gut:     '#166534',
  /** 7,1:1 auf Weiss, 6,4:1 auf dem eigenen Schleier. */
  luecke:  '#92400e',
  /** 6,3:1 auf Weiss. */
  fehler:  '#be123c',

  /** Schleier für ausgewählte Schaltflächen auf der weissen Karte. */
  akzentSchleier: 'rgba(79,70,229,0.08)',
  luekeSchleier:  'rgba(180,83,9,0.08)',
} as const;

/**
 * Die vier Schritte, für die Fortschrittsanzeige im Kopf.
 *
 * An einer Stelle, damit nicht jeder Schritt seine eigene Vorstellung
 * davon hat, wie viele es sind und wie sie heissen.
 */
export const SCHRITTE = [
  { nummer: 1, name: 'Fahrzeug', pfad: '/dashboard/listing/step1' },
  { nummer: 2, name: 'Fotos',    pfad: '/dashboard/listing/step2' },
  { nummer: 3, name: 'Text',     pfad: '/dashboard/listing/step3' },
  { nummer: 4, name: 'Fertig',   pfad: '/dashboard/listing/step4' },
] as const;
