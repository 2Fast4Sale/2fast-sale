/**
 * Bodenmuster — in Perspektive gezeichnet, nicht aufgelegt.
 *
 * Ein flach gezeichnetes Muster auf einen schraegen Boden zu legen
 * sieht immer falsch aus: Fliesen bleiben gleich gross bis zum
 * Horizont, Dielen laufen parallel statt zusammen. Deshalb wird hier
 * jede Fliese, jede Diele und jeder Terrazzosplitter einzeln an der
 * Stelle gezeichnet, an der er in der Perspektive liegt.
 *
 * Zwei Regeln gelten dabei ueberall:
 *
 *   Nach hinten wird alles kleiner und dichter.
 *   Nach hinten wird alles blasser — Luft zwischen Auge und Boden.
 *
 * ── Fester Zufall ──────────────────────────────────────────────────
 *
 * Terrazzo, Flussstein und Maserung brauchen Zufall, duerfen aber
 * nicht bei jedem Aufruf anders aussehen: Ein Haendler mit zwoelf
 * Bildern desselben Fahrzeugs bekaeme sonst zwoelf verschiedene
 * Boeden. Deshalb ein eigener Zufallsgenerator mit festem Startwert
 * statt Math.random().
 */

/** Zufall mit festem Startwert — gleicher Boden bei jedem Aufruf. */
function wuerfel(start: number) {
  let s = start >>> 0;
  return () => {
    // xorshift32: kurz, schnell, und fuer Muster voellig ausreichend.
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Perspektive des Bodens.
 *
 * `t` laeuft von 0 (Horizont) bis 1 (Bildunterkante). Die Hochachse
 * waechst mit t hoch 1.9 — dadurch draengen sich die hinteren Reihen,
 * so wie beim Blick ueber einen Boden.
 */
function perspektive(hoehe: number, hY: number, breite: number) {
  const tiefe = hoehe - hY;
  return {
    y: (t: number) => hY + tiefe * Math.pow(Math.max(0, Math.min(1, t)), 1.9),
    /** Wie weit ein Punkt seitlich vom Mittelpunkt weg liegt. */
    x: (t: number, seitlich: number) => breite / 2 + seitlich * breite * (0.28 + t * 1.9),
    /** Groessenfaktor in dieser Tiefe. */
    m: (t: number) => 0.18 + t * 1.5,
  };
}

export type MusterId =
  | 'keine' | 'terrazzo' | 'marmor' | 'diele_dunkel' | 'diele_grau'
  | 'geriffelt' | 'textil' | 'geometrisch' | 'travertin' | 'flussstein';

/**
 * Erzeugt das Muster als SVG-Bruchstueck.
 *
 * Kommt in den Bodenbereich des Hintergrunds und wird dort ueber die
 * Grundfarbe gelegt. Gibt einen leeren String zurueck, wenn es nichts
 * zu zeichnen gibt.
 */
export function bodenMuster(
  id: MusterId,
  breite: number,
  hoehe: number,
  hY: number,
  staerke = 1,
): string {
  if (id === 'keine' || staerke <= 0) return '';
  const p = perspektive(hoehe, hY, breite);
  const z = wuerfel(0x2f45a1e);
  const d = Math.max(0, Math.min(1, staerke));

  /** Blasser nach hinten — Luft zwischen Auge und Boden. */
  const luft = (t: number, grund: number) => (grund * (0.25 + t * 0.75) * d).toFixed(3);

  switch (id) {

    /* ── Fugenraster: Grundlage fuer Fliesen, Platten, Travertin ── */
    case 'travertin':
    case 'geometrisch': {
      let s = '';
      const reihen = 9;
      const spalten = 8;
      const fugeFarbe = id === 'travertin' ? '#8a8175' : '#5b6068';

      for (let r = 0; r <= reihen; r++) {
        const t = r / reihen;
        const y = p.y(t);
        s += `<line x1="0" y1="${y.toFixed(1)}" x2="${breite}" y2="${y.toFixed(1)}"
                stroke="${fugeFarbe}" stroke-opacity="${luft(t, 0.42)}" stroke-width="${(0.6 + t * 2).toFixed(1)}"/>`;
      }
      for (let c = -spalten; c <= spalten; c++) {
        const seitlich = c / (spalten * 1.6);
        s += `<line x1="${p.x(0, seitlich).toFixed(1)}" y1="${hY}"
                    x2="${p.x(1, seitlich).toFixed(1)}" y2="${hoehe}"
                stroke="${fugeFarbe}" stroke-opacity="${(0.34 * d).toFixed(3)}" stroke-width="1.6"/>`;
      }

      /*
       * Travertin bekommt zusaetzlich Wolken in den Platten — der
       * Stein ist nie einfarbig. Beim geometrischen Muster stattdessen
       * Rauten in jeder zweiten Zelle, das ergibt den Wuerfeleindruck.
       */
      if (id === 'travertin') {
        for (let i = 0; i < 90; i++) {
          const t = 0.12 + z() * 0.88;
          const x = p.x(t, (z() - 0.5) * 1.1);
          const m = p.m(t);
          s += `<ellipse cx="${x.toFixed(0)}" cy="${p.y(t).toFixed(0)}"
                  rx="${(28 * m).toFixed(1)}" ry="${(9 * m).toFixed(1)}"
                  fill="#6f6659" opacity="${luft(t, 0.14)}"/>`;
        }
      } else {
        for (let r = 0; r < reihen; r++) {
          for (let c = -spalten; c < spalten; c++) {
            if ((r + c) % 2) continue;
            const t0 = r / reihen, t1 = (r + 1) / reihen;
            const s0 = c / (spalten * 1.6), s1 = (c + 1) / (spalten * 1.6);
            s += `<polygon points="${p.x(t0, s0).toFixed(0)},${p.y(t0).toFixed(0)}
                      ${p.x(t0, s1).toFixed(0)},${p.y(t0).toFixed(0)}
                      ${p.x(t1, s1).toFixed(0)},${p.y(t1).toFixed(0)}
                      ${p.x(t1, s0).toFixed(0)},${p.y(t1).toFixed(0)}"
                    fill="#2f343b" opacity="${luft(t0, 0.20)}"/>`;
          }
        }
      }
      return s;
    }

    /* ── Terrazzo: hunderte Splitter, klein und dicht nach hinten ── */
    case 'terrazzo': {
      const farben = ['#4a4a48', '#8d8b86', '#c3bdb2', '#6e6a63', '#a9a29a', '#d8d2c6', '#7a6f60'];
      let s = '';
      for (let i = 0; i < 1400; i++) {
        const t = Math.pow(z(), 0.55);           // hinten dichter
        const x = p.x(t, (z() - 0.5) * 1.15);
        if (x < -20 || x > breite + 20) continue;
        const m = p.m(t);
        const gr = (1.6 + z() * 4.2) * m;
        s += `<ellipse cx="${x.toFixed(0)}" cy="${p.y(t).toFixed(0)}"
                rx="${gr.toFixed(1)}" ry="${(gr * 0.62).toFixed(1)}"
                fill="${farben[(z() * farben.length) | 0]}" opacity="${luft(t, 0.72)}"
                transform="rotate(${(z() * 180).toFixed(0)} ${x.toFixed(0)} ${p.y(t).toFixed(0)})"/>`;
      }
      return s;
    }

    /* ── Flussstein: wenige, grosse, runde Steine ── */
    case 'flussstein': {
      const farben = ['#6b6459', '#8b8377', '#4f4a42', '#a39a8c', '#736c60'];
      let s = '';
      for (let i = 0; i < 190; i++) {
        const t = Math.pow(z(), 0.5);
        const x = p.x(t, (z() - 0.5) * 1.2);
        if (x < -30 || x > breite + 30) continue;
        const m = p.m(t);
        const gr = (6 + z() * 10) * m;
        const y = p.y(t);
        s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}"
                rx="${gr.toFixed(1)}" ry="${(gr * 0.55).toFixed(1)}"
                fill="${farben[(z() * farben.length) | 0]}" opacity="${luft(t, 0.62)}"/>`;
        // Ein Glanzlicht macht aus dem Fleck einen Stein.
        s += `<ellipse cx="${(x - gr * 0.25).toFixed(0)}" cy="${(y - gr * 0.18).toFixed(0)}"
                rx="${(gr * 0.42).toFixed(1)}" ry="${(gr * 0.20).toFixed(1)}"
                fill="#ffffff" opacity="${luft(t, 0.22)}"/>`;
      }
      return s;
    }

    /* ── Dielen: Fugen laengs, Stossfugen quer, Maserung dazwischen ── */
    case 'diele_dunkel':
    case 'diele_grau': {
      const fuge = id === 'diele_dunkel' ? '#1b120b' : '#5f5b55';
      const maser = id === 'diele_dunkel' ? '#3b2a1c' : '#8a857d';
      let s = '';
      const dielen = 11;

      for (let c = -dielen; c <= dielen; c++) {
        const seitlich = c / (dielen * 1.5);
        s += `<line x1="${p.x(0, seitlich).toFixed(1)}" y1="${hY}"
                    x2="${p.x(1, seitlich).toFixed(1)}" y2="${hoehe}"
                stroke="${fuge}" stroke-opacity="${(0.46 * d).toFixed(3)}" stroke-width="2"/>`;

        // Maserung: feine Linien innerhalb jeder Diele.
        for (let k = 0; k < 3; k++) {
          const versatz = seitlich + (0.3 + k * 0.22) / (dielen * 1.5);
          s += `<line x1="${p.x(0, versatz).toFixed(1)}" y1="${hY}"
                      x2="${p.x(1, versatz).toFixed(1)}" y2="${hoehe}"
                  stroke="${maser}" stroke-opacity="${(0.10 * d).toFixed(3)}" stroke-width="1"/>`;
        }
      }

      /*
       * Stossfugen versetzt, nicht auf einer Linie — echte Dielenboeden
       * sind im Verband verlegt. Eine durchgehende Querfuge sieht aus
       * wie Laminat aus dem Baumarktprospekt.
       */
      for (let r = 1; r < 7; r++) {
        for (let c = -dielen; c < dielen; c++) {
          if ((c + r) % 3) continue;
          const t = (r + (c % 2) * 0.4) / 7;
          const s0 = c / (dielen * 1.5), s1 = (c + 1) / (dielen * 1.5);
          s += `<line x1="${p.x(t, s0).toFixed(1)}" y1="${p.y(t).toFixed(1)}"
                      x2="${p.x(t, s1).toFixed(1)}" y2="${p.y(t).toFixed(1)}"
                  stroke="${fuge}" stroke-opacity="${luft(t, 0.40)}" stroke-width="${(1 + t * 2).toFixed(1)}"/>`;
        }
      }
      return s;
    }

    /* ── Geriffelt: viele enge Rillen, je zwei Linien fuer Tiefe ── */
    case 'geriffelt': {
      let s = '';
      const rillen = 46;
      for (let c = -rillen; c <= rillen; c++) {
        const seitlich = c / (rillen * 1.3);
        const x0 = p.x(0, seitlich), x1 = p.x(1, seitlich);
        s += `<line x1="${x0.toFixed(1)}" y1="${hY}" x2="${x1.toFixed(1)}" y2="${hoehe}"
                stroke="#000000" stroke-opacity="${(0.30 * d).toFixed(3)}" stroke-width="1.4"/>`;
        s += `<line x1="${(x0 + 1.5).toFixed(1)}" y1="${hY}" x2="${(x1 + 3).toFixed(1)}" y2="${hoehe}"
                stroke="#ffffff" stroke-opacity="${(0.09 * d).toFixed(3)}" stroke-width="1"/>`;
      }
      return s;
    }

    /* ── Textil: Kreuzgewebe aus zwei Linienscharen ── */
    case 'textil': {
      let s = '';
      for (let r = 0; r <= 64; r++) {
        const t = r / 64;
        const y = p.y(t);
        s += `<line x1="0" y1="${y.toFixed(1)}" x2="${breite}" y2="${y.toFixed(1)}"
                stroke="#ffffff" stroke-opacity="${luft(t, 0.10)}" stroke-width="1"/>`;
      }
      for (let c = -70; c <= 70; c++) {
        const seitlich = c / 90;
        s += `<line x1="${p.x(0, seitlich).toFixed(1)}" y1="${hY}"
                    x2="${p.x(1, seitlich).toFixed(1)}" y2="${hoehe}"
                stroke="#000000" stroke-opacity="${(0.09 * d).toFixed(3)}" stroke-width="1"/>`;
      }
      return s;
    }

    /* ── Marmor: Adern als Bezierkurven ── */
    case 'marmor': {
      /*
       * Der schwerste Fall, und das Ergebnis ist eine Annaeherung.
       * Echte Marmoraederung verzweigt sich fraktal; hier sind es
       * Kurven mit Zufallsknicken. Aus zwei Metern Entfernung auf
       * einem Inseratsfoto geht das durch — als Grossaufnahme nicht.
       */
      let s = '';
      for (let i = 0; i < 26; i++) {
        const t0 = z() * 0.9;
        let x = p.x(t0, (z() - 0.5) * 1.4);
        let y = p.y(t0);
        let pfad = `M${x.toFixed(0)},${y.toFixed(0)}`;
        const glieder = 3 + ((z() * 4) | 0);
        for (let k = 0; k < glieder; k++) {
          const nx = x + (z() - 0.5) * breite * 0.34;
          const ny = y + (z() - 0.5) * (hoehe - hY) * 0.30;
          const kx = (x + nx) / 2 + (z() - 0.5) * 90;
          const ky = (y + ny) / 2 + (z() - 0.5) * 40;
          pfad += ` Q${kx.toFixed(0)},${ky.toFixed(0)} ${nx.toFixed(0)},${ny.toFixed(0)}`;
          x = nx; y = ny;
        }
        const tm = Math.max(0, Math.min(1, (y - hY) / Math.max(1, hoehe - hY)));
        s += `<path d="${pfad}" fill="none" stroke="#8d8a86"
                stroke-opacity="${luft(tm, 0.34)}" stroke-width="${(0.8 + tm * 2.4).toFixed(1)}"
                stroke-linecap="round"/>`;
        s += `<path d="${pfad}" fill="none" stroke="#ffffff"
                stroke-opacity="${luft(tm, 0.12)}" stroke-width="${(2.4 + tm * 5).toFixed(1)}"
                stroke-linecap="round"/>`;
      }
      return s;
    }

    default:
      return '';
  }
}
