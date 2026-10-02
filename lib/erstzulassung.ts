/**
 * Erstzulassung lesen — in jeder Schreibweise, die im Formular vorkommt.
 *
 * ── Warum diese Datei existiert ──────────────────────────────────────
 *
 * Beim ersten echten Test in Schritt 4 meldete mobile.de „Erstzulassung
 * fehlt", obwohl im Formular sichtbar **11/2016** stand. Der Grund: Die
 * Prüfung kannte nur den Punkt als Trenner (11.2016), nicht den
 * Schrägstrich. Genau so schreibt es aber jeder, der ein Datum aus dem
 * Fahrzeugschein abtippt, und genau so liefert es der Scan.
 *
 * Derselbe Fehler lag doppelt im Haus: einmal in der mobile.de-Route,
 * einmal in der AutoScout24-Route, jede mit eigener Kopie der Funktion.
 * Deshalb steht sie jetzt an einer Stelle — eine Schreibweise, die eine
 * Route versteht und die andere nicht, wäre der nächste Fehler dieser
 * Art.
 *
 * Eine Monatsangabe ohne Tag ist Absicht: Beide Portale wollen Monat und
 * Jahr, nicht den Tag. Ein mitgelieferter Tag wird weggeworfen.
 */

export interface MonatJahr {
  jahr: number;
  /** 1 bis 12. */
  monat: number;
}

/**
 * Zerlegt die Eingabe. `null`, wenn daraus kein plausibler Monat wird.
 *
 * Erkannt werden:
 *   11/2016, 11.2016, 11-2016, 112016 → November 2016
 *   15.11.2016, 15/11/2016           → November 2016 (Tag fällt weg)
 *   2016-11, 2016/11, 201611         → November 2016
 *   11/16, 11.16                     → November 2016 (zweistelliges Jahr)
 *   2016                             → null; ein Jahr allein ist kein Monat
 */
export function monatJahrLesen(roh: unknown): MonatJahr | null {
  const s = String(roh ?? '').trim();
  if (!s) return null;

  /* Alle gängigen Trenner auf einen bringen, dann nur noch Zahlen ansehen. */
  const teile = s.split(/[\s./\-]+/).filter(Boolean);

  const plausibel = (jahr: number, monat: number): MonatJahr | null => {
    if (monat < 1 || monat > 12) return null;
    /*
     * Grenzen mit Absicht weit: Ein Oldtimer von 1950 ist ein echter
     * Fall, ein Tippfehler wie 1066 nicht. Nach oben ein Jahr Luft, weil
     * Neuwagen mit Erstzulassung im Folgemonat vorkommen.
     */
    const jetzt = new Date();
    if (jahr < 1900 || jahr > jetzt.getFullYear() + 1) return null;
    return { jahr, monat };
  };

  /** Zweistelliges Jahr: 16 → 2016, 95 → 1995. */
  const jahrVoll = (n: number): number => {
    if (n >= 100) return n;
    const jetzt = new Date().getFullYear();
    return 2000 + n <= jetzt + 1 ? 2000 + n : 1900 + n;
  };

  if (teile.length === 3) {
    /* Tag, Monat, Jahr — oder Jahr, Monat, Tag. */
    const [a, b, c] = teile.map(Number);
    if ([a, b, c].some(Number.isNaN)) return null;
    if (teile[0].length === 4) return plausibel(a, b);      // 2016-11-15
    return plausibel(jahrVoll(c), b);                        // 15.11.2016
  }

  if (teile.length === 2) {
    const [a, b] = teile.map(Number);
    if ([a, b].some(Number.isNaN)) return null;
    if (teile[0].length === 4) return plausibel(a, b);      // 2016-11
    return plausibel(jahrVoll(b), a);                        // 11/2016, 11/16
  }

  if (teile.length === 1) {
    const nur = teile[0];
    if (!/^\d+$/.test(nur)) return null;
    if (nur.length === 6) {
      /*
       * Sechs Ziffern sind zweideutig: 201611 ist yyyyMM, 112016 ist
       * MMyyyy. Entschieden wird daran, was einen gültigen Monat ergibt
       * — und wenn beides passt, gewinnt yyyyMM, weil es die Schreibweise
       * der Schnittstellen ist.
       */
      const alsYyyyMm = plausibel(Number(nur.slice(0, 4)), Number(nur.slice(4)));
      if (alsYyyyMm) return alsYyyyMm;
      return plausibel(Number(nur.slice(2)), Number(nur.slice(0, 2)));
    }
    if (nur.length === 4) {
      /*
       * Ein Jahr allein ist KEINE Erstzulassung. Den Monat zu erfinden —
       * etwa Januar — wäre eine Angabe, die niemand gemacht hat, und sie
       * stünde danach im Inserat.
       */
      return null;
    }
    return null;
  }

  return null;
}

/** Für mobile.de: yyyyMM, zum Beispiel "201611". Leer, wenn unlesbar. */
export function alsYyyyMM(roh: unknown): string {
  const d = monatJahrLesen(roh);
  return d ? `${d.jahr}${String(d.monat).padStart(2, '0')}` : '';
}

/** Für AutoScout24: yyyy-MM, zum Beispiel "2016-11". Leer, wenn unlesbar. */
export function alsYyyyBindestrichMM(roh: unknown): string {
  const d = monatJahrLesen(roh);
  return d ? `${d.jahr}-${String(d.monat).padStart(2, '0')}` : '';
}
