'use client';

/**
 * Vorschau auf Schritt 1 ohne Anmeldung.
 *
 * Die Formularseiten liegen unter /dashboard und werden zur Anmeldung
 * umgeleitet — beim Umbauen der Oberfläche sieht man das Ergebnis sonst
 * nicht. Diese Seite rendert dieselben Komponenten ausserhalb des
 * geschützten Bereichs.
 *
 * Sie zeigt zuerst den Showroom, weil das der neue Entwurf ist. Die
 * älteren bleiben zum Vergleich erreichbar: Beim Aussehen führt
 * Nebeneinanderstellen schneller zum Ziel als Beschreiben.
 *
 * In der Produktion nicht erreichbar. Speichert nichts.
 */

import { useState } from 'react';
import Showroom from '../../dashboard/listing/step1/Showroom';
import Formular, { STILE, type Stil } from '../../dashboard/listing/step1/Formular';

type Ansicht = 'showroom' | Stil;

const BESCHREIBUNG: Record<Ansicht, string> = {
  showroom:  'das Inserat entsteht sichtbar',
  werkstatt: 'hell, dicht, sachlich',
  studio:    'dunkles Datenblatt',
  marke:     'grosse Zahlen, viel Luft',
};

export default function Vorschau() {
  const [ansicht, setAnsicht] = useState<Ansicht>('showroom');

  if (process.env.NODE_ENV === 'production') {
    return <p style={{ padding: 40, fontFamily: 'sans-serif' }}>Nicht verfügbar.</p>;
  }

  const alle: Ansicht[] = ['showroom', ...(Object.keys(STILE) as Stil[])];

  return (
    <>
      {/*
        Schwebt über der Seite statt darin zu stehen: Der Umschalter ist
        Werkzeug, nicht Teil des Entwurfs, den er zeigt.
      */}
      <div style={{
        position: 'fixed', right: 14, bottom: 76, zIndex: 200,
        display: 'flex', gap: 3, padding: 4,
        background: 'rgba(30,35,48,0.94)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, boxShadow: '0 10px 34px rgba(0,0,0,0.45)',
        fontFamily: '"Inter", sans-serif',
      }}>
        {alle.map(a => (
          <button
            key={a}
            onClick={() => setAnsicht(a)}
            title={BESCHREIBUNG[a]}
            style={{
              padding: '7px 11px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: ansicht === a ? '#ffffff' : 'transparent',
              color: ansicht === a ? '#0f172a' : '#a8b3c5',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              textTransform: 'capitalize',
            }}
          >{a}</button>
        ))}
      </div>

      {/* key erzwingt einen Neuaufbau, damit auch die Zustaende zuruecksetzen. */}
      {ansicht === 'showroom'
        ? <Showroom key="showroom" />
        : <Formular key={ansicht} stil={ansicht} />}
    </>
  );
}
