'use client';

/**
 * Vorschau auf Schritt 1 ohne Anmeldung — mit Stilwahl.
 *
 * Die Formularseiten liegen unter /dashboard und werden zur Anmeldung
 * umgeleitet. Beim Umbauen der Oberfläche heisst das: Man sieht das
 * Ergebnis nicht. Diese Seite rendert dieselbe Komponente ausserhalb des
 * geschützten Bereichs.
 *
 * Die Umschaltung oben rechts dient dazu, drei Handschriften
 * nebeneinander zu beurteilen, ohne dass man sie beschreiben muss. Beim
 * Aussehen führt Zeigen schneller zum Ziel als Reden.
 *
 * In der Produktion nicht erreichbar. Speichert nichts.
 */

import { useState } from 'react';
import Formular, { STILE, type Stil } from '../../dashboard/listing/step1/Formular';

const BESCHREIBUNG: Record<Stil, string> = {
  werkstatt: 'hell, dicht, sachlich',
  studio:    'dunkel wie Bildbearbeitung',
  marke:     'grosse Zahlen, viel Luft',
};

export default function Vorschau() {
  const [stil, setStil] = useState<Stil>('werkstatt');

  if (process.env.NODE_ENV === 'production') {
    return <p style={{ padding: 40, fontFamily: 'sans-serif' }}>Nicht verfügbar.</p>;
  }

  return (
    <>
      {/*
        Schwebt über der Seite statt darin zu stehen: Der Umschalter ist
        Werkzeug, nicht Teil des Entwurfs, den er zeigt.
      */}
      <div style={{
        position: 'fixed', right: 14, bottom: 14, zIndex: 200,
        display: 'flex', gap: 4, padding: 4,
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)',
        borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
        fontFamily: '"Inter", sans-serif',
      }}>
        {(Object.keys(STILE) as Stil[]).map(s => (
          <button
            key={s}
            onClick={() => setStil(s)}
            title={BESCHREIBUNG[s]}
            style={{
              padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: stil === s ? '#ffffff' : 'transparent',
              color: stil === s ? '#0f172a' : '#cbd5e1',
              fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
              textTransform: 'capitalize',
            }}
          >{s}</button>
        ))}
      </div>

      {/* key erzwingt einen Neuaufbau, damit der Stil auch die Zustaende zuruecksetzt. */}
      <Formular key={stil} stil={stil} />
    </>
  );
}
