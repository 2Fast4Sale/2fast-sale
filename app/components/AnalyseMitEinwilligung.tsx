'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';

/**
 * Vercel Analytics erst nach Einwilligung laden.
 *
 * Vorher stand <Analytics /> fest im Layout. Der Cookie-Banner fragte
 * zwar nach Zustimmung, aber die Messung lief in beiden Faellen — auch
 * bei "Nur notwendige". Damit war der Banner reine Zierde, und genau das
 * ist der Vorwurf, der in Abmahnungen steht: Eine Einwilligung, die
 * nichts bewirkt, ist keine.
 *
 * § 25 TDDDG verlangt die Zustimmung VOR dem Zugriff auf das Geraet,
 * ausser fuer das, was fuer den Dienst unbedingt noetig ist. Reichweiten-
 * messung gehoert nicht dazu.
 */
export const EINWILLIGUNG_EREIGNIS = 'cookie-einwilligung';

export default function AnalyseMitEinwilligung() {
  const [erlaubt, setErlaubt] = useState(false);

  useEffect(() => {
    const lesen = () => {
      try {
        setErlaubt(localStorage.getItem('cookie_consent') === 'accepted');
      } catch {
        /* Privates Fenster ohne Speicher: dann eben keine Messung. */
        setErlaubt(false);
      }
    };
    lesen();
    window.addEventListener(EINWILLIGUNG_EREIGNIS, lesen);
    /* Auch, wenn die Entscheidung in einem anderen Tab faellt. */
    window.addEventListener('storage', lesen);
    return () => {
      window.removeEventListener(EINWILLIGUNG_EREIGNIS, lesen);
      window.removeEventListener('storage', lesen);
    };
  }, []);

  if (!erlaubt) return null;
  return <Analytics />;
}
