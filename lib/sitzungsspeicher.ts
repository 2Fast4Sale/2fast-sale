'use client';

import { useSyncExternalStore } from 'react';

/**
 * Liest einen Wert aus dem Sitzungsspeicher, ohne einen zweiten Render
 * auszulösen.
 *
 * Der naheliegende Weg ist ein Effekt beim Einhängen, der den Wert
 * liest und in den Zustand schreibt. Er funktioniert, hat aber zwei
 * Haken: Die Seite rendert zweimal — einmal leer, einmal mit Daten —
 * und React beanstandet das inzwischen ausdrücklich ("Calling setState
 * synchronously within an effect can trigger cascading renders").
 *
 * Der Zustandsinitialisierer wäre der zweite Gedanke und ist noch
 * schlechter: Er liefe auch beim Vorrendern auf dem Server, wo es
 * keinen Sitzungsspeicher gibt. Und selbst mit einer Prüfung auf das
 * Browserfenster unterschiede sich der erste Render im Browser vom
 * gelieferten HTML — genau das, was React beim Hydrieren bemängelt.
 *
 * `useSyncExternalStore` ist für diesen Fall gebaut: Es kennt einen
 * eigenen Wert für den Server und stellt sicher, dass Client und
 * Server beim ersten Render übereinstimmen.
 *
 * Gibt bewusst den ROHEN Text zurück, nicht das ausgewertete Objekt.
 * `JSON.parse` erzeugt bei jedem Aufruf ein neues Objekt; React würde
 * das für eine Änderung halten und endlos weiterrendern. Zeichenketten
 * dagegen vergleicht es dem Wert nach. Das Auswerten gehört deshalb
 * hinter ein `useMemo` beim Aufrufer.
 */
export function useSitzungsText(schluessel: string): string | null {
  return useSyncExternalStore(
    /*
     * Kein Abonnement: Was hier steht, hat der vorherige Schritt
     * abgelegt und ändert sich während dieser Seite nicht mehr.
     */
    () => () => {},
    () => {
      try { return sessionStorage.getItem(schluessel); } catch { return null; }
    },
    /* Auf dem Server gibt es keinen Sitzungsspeicher. */
    () => null,
  );
}

/**
 * Dasselbe für den dauerhaften Speicher des Browsers.
 *
 * Auch hier ohne Abonnement, und das ist kein Versehen: Ein
 * `storage`-Ereignis lösen nur ANDERE Tabs aus. Wenn dieselbe Seite den
 * Wert schreibt, erfährt sie es nie — das war schon vorher so, als hier
 * ein Effekt beim Einhängen stand. Die Lesart bleibt also gleich, nur
 * ohne den zweiten Render.
 */
export function useDauerText(schluessel: string, fallback: string): string {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try { return localStorage.getItem(schluessel) ?? fallback; } catch { return fallback; }
    },
    () => fallback,
  );
}
