/**
 * Die einzelnen E-Mails der Plattform.
 *
 * Jede Mail liefert HTML und Textfassung. Das Gerüst kommt aus
 * lib/email.ts, die Rechnung aus lib/rechnung.ts.
 *
 * Grundsatz für den Ton: Der Empfänger ist Autohändler, kein Nutzer einer
 * App. Er hat wenig Zeit und will wissen, was er jetzt tun soll. Deshalb
 * kurze Sätze, kein "Willkommen an Bord!", keine Ausrufezeichen, und in
 * jeder Mail genau ein Knopf.
 */

import {
  huelle, absatz, ueberschrift, knopf, kasten, esc,
  SCHRIFT, FARBE, type Aussteller,
} from './email';

/**
 * Anredezeile. Ohne hinterlegten Namen bleibt es beim blossen
 * "Guten Tag," — ein leerer Name darf nicht als "Guten Tag ," mit
 * Leerzeichen vor dem Komma herauskommen.
 */
function gruss(anrede: string): string {
  const name = anrede.trim();
  return name ? `Guten Tag ${name},` : 'Guten Tag,';
}

/* ────────────────────────── Begrüssung ────────────────────────── */

export interface Begruessung {
  /** Vorname oder Firma — was auch immer beim Konto hinterlegt ist. */
  anrede: string;
  /** Gratis-Credits, die dem Konto gutgeschrieben wurden. */
  startCredits: number;
}

/**
 * Erklärt in drei Schritten, wie aus einem Fahrzeugschein ein Inserat
 * wird. Bewusst die drei Schritte und nicht die Funktionsliste: Wer sich
 * gerade registriert hat, will das erste Inserat sehen, nicht wissen was
 * die Plattform alles kann.
 */
export function begruessungEmail(b: Begruessung, a: Aussteller) {
  const schritte: [string, string][] = [
    ['Fahrzeugschein abfotografieren',
     'Marke, Modell, Leistung, Erstzulassung und Hubraum werden ausgelesen. Nachtragen müssen Sie nur Preis und Kilometerstand.'],
    ['Fotos hochladen',
     'Die Fahrzeugfotos werden freigestellt und vor einen Studiohintergrund gesetzt. Ein Parkplatz im Hintergrund verschwindet.'],
    ['Beschreibung und Export',
     'Der Beschreibungstext wird aus den Fahrzeugdaten erzeugt. Anschliessend laden Sie das fertige Inserat herunter.'],
  ];

  const schritteHtml = schritte.map(([titel, text], i) => `
    <tr>
      <td valign="top" width="34" style="padding-top:16px;">
        <div style="width:24px;height:24px;border-radius:12px;background-color:${FARBE.flaeche};border:1px solid ${FARBE.linie};font-family:${SCHRIFT};font-size:12px;font-weight:700;color:${FARBE.text};text-align:center;line-height:24px;">${i + 1}</div>
      </td>
      <td valign="top" style="padding-top:16px;font-family:${SCHRIFT};">
        <div style="font-size:14px;font-weight:700;color:${FARBE.text};">${titel}</div>
        <div style="font-size:13px;color:${FARBE.grau};line-height:1.65;margin-top:3px;">${text}</div>
      </td>
    </tr>`).join('');

  const inhalt = `
    ${ueberschrift(
      esc(gruss(b.anrede)),
      'Ihr Konto ist eingerichtet. So erstellen Sie Ihr erstes Inserat:'
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${schritteHtml}</table>
    ${b.startCredits > 0
      ? kasten(`Auf Ihrem Konto liegen <strong>${b.startCredits} Inserat-Credits</strong> zum Ausprobieren. Ein Credit deckt ein vollständiges Inserat ab — Beschreibung, Studiofotos und Export.`)
      : ''}
    ${knopf('Erstes Inserat erstellen', `${a.seite}/dashboard/listing/step1`)}
    ${absatz(`Wenn etwas nicht funktioniert oder Sie eine Funktion vermissen, antworten Sie einfach auf diese Mail. Sie landet direkt bei mir.`, 24)}
  `;

  /*
   * Absaetze als Bloecke und nicht als flache Zeilenliste: Bei einer
   * flachen Liste muss man leere Eintraege wieder herausfiltern, und
   * dabei verschwinden die Leerzeilen zwischen den Absaetzen gleich mit
   * — die Mail wird zur Textwand.
   */
  const bloecke = [
    gruss(b.anrede),
    'Ihr Konto ist eingerichtet. So erstellen Sie Ihr erstes Inserat:',
    schritte.map(([t, x], i) => `${i + 1}. ${t}\n   ${x}`).join('\n\n'),
    b.startCredits > 0
      ? `Auf Ihrem Konto liegen ${b.startCredits} Inserat-Credits zum Ausprobieren. Ein Credit deckt ein vollstaendiges Inserat ab.`
      : null,
    `Erstes Inserat erstellen: ${a.seite}/dashboard/listing/step1`,
    'Wenn etwas nicht funktioniert oder Sie eine Funktion vermissen, antworten Sie einfach auf diese Mail.',
    ['—', [a.name, a.anschrift].filter(Boolean).join(' · '), a.email].join('\n'),
  ];
  const text = bloecke.filter(Boolean).join('\n\n');

  return {
    betreff: 'Ihr Konto bei 2Fast4Sale ist bereit',
    html: huelle(a, {
      vorschau: 'In drei Schritten zum ersten Inserat — Fahrzeugschein, Fotos, fertig.',
      titel: 'Willkommen bei 2Fast4Sale',
      inhalt,
    }),
    text,
  };
}

/* ────────────────────────── Guthaben knapp ────────────────────────── */

export interface GuthabenHinweis {
  anrede: string;
  /** Verbleibende Credits nach dem gerade erstellten Inserat. */
  rest: number;
}

/**
 * Hinweis, dass das Guthaben zur Neige geht.
 *
 * Der Ton ist bewusst sachlich und nicht drängend. Der Händler bemerkt
 * sonst, dass die Mail eine Verkaufsmail ist, und stellt sie ab — dann
 * steht er beim nächsten Inserat unangekündigt vor einer Bezahlseite.
 * Das ist der Fall, den diese Mail verhindern soll.
 */
export function guthabenNiedrigEmail(g: GuthabenHinweis, a: Aussteller) {
  const leer = g.rest === 0;

  const inhalt = `
    ${ueberschrift(
      leer ? 'Ihr Guthaben ist aufgebraucht' : `Noch ${g.rest} ${g.rest === 1 ? 'Inserat-Credit' : 'Inserat-Credits'}`,
      leer
        ? 'Für das nächste Inserat brauchen Sie neues Guthaben.'
        : 'Danach ist für ein weiteres Inserat neues Guthaben nötig.'
    )}
    ${absatz(
      leer
        ? 'Ihre bereits erstellten Inserate bleiben selbstverständlich erhalten und weiterhin abrufbar.'
        : 'Damit Sie beim nächsten Fahrzeug nicht mitten in der Bearbeitung aufgehalten werden, hier die Vorwarnung.',
      18
    )}
    ${kasten(
      'Wenn Sie regelmässig inserieren, lohnt sich die nachträgliche Abrechnung: Sie erstellen Inserate ohne Guthaben zu kaufen und bekommen am Monatsende eine Rechnung über die tatsächlich erstellten Inserate.',
      leer ? 'warnung' : 'neutral'
    )}
    ${knopf('Guthaben aufladen', `${a.seite}/dashboard/pricing`)}
  `;

  const text = [
    gruss(g.anrede),
    '',
    leer
      ? 'Ihr Guthaben bei 2Fast4Sale ist aufgebraucht. Fuer das naechste Inserat brauchen Sie neues Guthaben.'
      : `Sie haben noch ${g.rest} Inserat-Credit${g.rest === 1 ? '' : 's'}. Danach ist fuer ein weiteres Inserat neues Guthaben noetig.`,
    '',
    leer
      ? 'Ihre bereits erstellten Inserate bleiben erhalten und weiterhin abrufbar.'
      : 'Damit Sie beim naechsten Fahrzeug nicht mitten in der Bearbeitung aufgehalten werden, hier die Vorwarnung.',
    '',
    'Wenn Sie regelmaessig inserieren, lohnt sich die nachtraegliche Abrechnung: Inserate ohne Guthabenkauf, Rechnung am Monatsende.',
    '',
    `Guthaben aufladen: ${a.seite}/dashboard/pricing`,
    '',
    '—',
    [a.name, a.anschrift].filter(Boolean).join(' · '),
    a.email,
  ].join('\n');

  return {
    betreff: leer ? 'Ihr Inserat-Guthaben ist aufgebraucht' : `Noch ${g.rest} Inserat-Credit${g.rest === 1 ? '' : 's'} übrig`,
    html: huelle(a, {
      vorschau: leer
        ? 'Für das nächste Inserat brauchen Sie neues Guthaben.'
        : `Noch ${g.rest} Inserate möglich, danach ist neues Guthaben nötig.`,
      titel: 'Guthaben geht zur Neige',
      inhalt,
    }),
    text,
  };
}
