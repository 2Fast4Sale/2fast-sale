/**
 * Gemeinsame Hülle und Versand für alle E-Mails der Plattform.
 *
 * Die Rechnungsmail war lange die einzige Mail und brachte ihr komplettes
 * HTML selbst mit. Sobald eine zweite dazukommt, driften die beiden
 * auseinander — andere Kopfzeile, anderer Blauton, anderer Abstand. Wer
 * erst die Begrüssung und zwei Wochen später die Rechnung bekommt, sieht
 * dann zwei verschiedene Firmen.
 *
 * Deshalb: Kopf, Fuss, Farben und Bausteine liegen hier, jede Mail
 * liefert nur ihren Inhalt.
 */

import { Resend } from 'resend';

export const SCHRIFT = "-apple-system,'Segoe UI',Roboto,Arial,Helvetica,sans-serif";

export const FARBE = {
  text: '#0f172a',
  grau: '#64748b',
  hell: '#94a3b8',
  linie: '#e2e8f0',
  flaeche: '#f8fafc',
  akzent: '#4f46e5',
  gutGrund: '#dcfce7',
  gutText: '#166534',
  warnGrund: '#fef3c7',
  warnText: '#92400e',
} as const;

/* ────────────────────────── Absender ────────────────────────── */

export interface Aussteller {
  name: string;
  anschrift: string;
  ustId?: string;
  steuernummer?: string;
  inhaber?: string;
  email: string;
  web?: string;
  /** Basis-URL der Plattform, für Links in den Mails. */
  seite: string;
}

/**
 * Angaben, ohne die eine Rechnung nach § 14 UStG unvollständig ist.
 *
 * Sie kommen aus der Umgebung und können dort schlicht fehlen. Ohne
 * Hinweis merkt das niemand: Die Rechnung wird trotzdem erzeugt, sieht
 * auf den ersten Blick vollständig aus, und der Fehler fällt erst auf,
 * wenn der Steuerberater des Händlers sie zurückweist.
 */
const PFLICHTANGABEN: [keyof Aussteller, string][] = [
  ['anschrift', 'COMPANY_ADDRESS'],
  ['steuernummer', 'COMPANY_STEUERNUMMER'],
];

export function ausstellerAusUmgebung(): Aussteller {
  const seite = process.env.NEXT_PUBLIC_SITE_URL || 'https://2fast4sale.com';
  const a = bauen(seite);

  const fehlend = PFLICHTANGABEN
    .filter(([feld]) => !String(a[feld] ?? '').trim())
    .map(([, variable]) => variable);

  // USt-IdNr. ODER Steuernummer genügt; nur wenn beide fehlen, ist es ein Mangel.
  if (a.ustId?.trim()) {
    const i = fehlend.indexOf('COMPANY_STEUERNUMMER');
    if (i >= 0) fehlend.splice(i, 1);
  }

  if (fehlend.length) {
    console.warn(
      `[email] Rechnung ohne Pflichtangaben: ${fehlend.join(', ')} nicht gesetzt. ` +
      'Der Kunde kann die Rechnung so nicht verbuchen.'
    );
  }

  return a;
}

function bauen(seite: string): Aussteller {
  return {
    name: '2Fast4Sale',
    anschrift: process.env.COMPANY_ADDRESS || '',
    ustId: process.env.COMPANY_TAX_ID || '',
    steuernummer: process.env.COMPANY_STEUERNUMMER || '',
    inhaber: process.env.COMPANY_OWNER || '',
    email: process.env.SUPPORT_EMAIL || 'support@2fast4sale.com',
    web: seite.replace(/^https?:\/\//, ''),
    seite,
  };
}

/* ────────────────────────── Bausteine ────────────────────────── */

export const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fliesstext-Absatz. */
export function absatz(html: string, oben = 0): string {
  return `<p style="margin:${oben}px 0 0;font-family:${SCHRIFT};font-size:14px;line-height:1.75;color:#334155;">${html}</p>`;
}

/** Grosse Zeile ganz oben im Inhalt, z.B. Betrag oder Begrüssung. */
export function ueberschrift(text: string, unterzeile?: string): string {
  return `<div style="font-family:${SCHRIFT};">
    <div style="font-size:22px;font-weight:800;color:${FARBE.text};letter-spacing:-0.4px;line-height:1.3;">${text}</div>
    ${unterzeile ? `<div style="font-size:14px;color:${FARBE.grau};margin-top:7px;">${unterzeile}</div>` : ''}
  </div>`;
}

/**
 * Handlungsknopf.
 *
 * Als Tabelle gebaut, nicht als einzelnes <a>: Outlook ignoriert das
 * Innenabstands-Padding auf Links, der Knopf sieht dort sonst aus wie
 * ein blauer Textschnipsel.
 */
export function knopf(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
    <tr><td bgcolor="${FARBE.akzent}" style="border-radius:8px;">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 28px;font-family:${SCHRIFT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${text}</a>
    </td></tr>
  </table>`;
}

/** Abgesetzter Kasten für Hinweise. */
export function kasten(html: string, ton: 'neutral' | 'warnung' = 'neutral'): string {
  const grund = ton === 'warnung' ? FARBE.warnGrund : FARBE.flaeche;
  const rand = ton === 'warnung' ? '#fde68a' : FARBE.linie;
  const schrift = ton === 'warnung' ? FARBE.warnText : FARBE.grau;
  return `<div style="margin-top:20px;padding:14px 18px;background-color:${grund};border:1px solid ${rand};border-radius:10px;font-family:${SCHRIFT};font-size:13px;line-height:1.7;color:${schrift};">${html}</div>`;
}

/* ────────────────────────── Hülle ────────────────────────── */

interface HuelleOptionen {
  /** Kennzeichnung oben rechts, z.B. "RECHNUNG". Leer lassen für keine. */
  marke?: string;
  /**
   * Zeile, die im Posteingang neben dem Betreff steht. Ohne sie zeigt
   * Gmail den Anfang des HTML-Gerüsts.
   */
  vorschau: string;
  titel: string;
  inhalt: string;
}

/**
 * Setzt den Inhalt in das gemeinsame Gerüst.
 *
 * Tabellenlayout mit Inline-Styles, weil Outlook nichts anderes
 * zuverlässig darstellt. Sieht im Quelltext altmodisch aus, ist bei
 * E-Mails aber der einzige Weg, der überall ankommt.
 */
export function huelle(a: Aussteller, o: HuelleOptionen): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${esc(o.titel)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">

<div style="display:none;font-size:1px;color:#f1f5f9;max-height:0;overflow:hidden;">${esc(o.vorschau)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;border:1px solid ${FARBE.linie};">

  <tr>
    <td style="padding:26px 32px 0;font-family:${SCHRIFT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-size:17px;font-weight:800;color:${FARBE.text};letter-spacing:-0.3px;">${esc(a.name)}</td>
        ${o.marke ? `<td align="right" style="font-size:10px;font-weight:700;color:${FARBE.hell};letter-spacing:2px;">${esc(o.marke)}</td>` : ''}
      </tr></table>
      <div style="height:2px;background-color:${FARBE.text};margin-top:14px;"></div>
    </td>
  </tr>

  <tr><td style="padding:26px 32px 0;">${o.inhalt}</td></tr>

  <tr>
    <td style="padding:26px 32px 30px;font-family:${SCHRIFT};">
      <div style="border-top:1px solid #f1f5f9;padding-top:18px;font-size:11px;color:${FARBE.hell};line-height:1.8;">
        ${esc(a.name)}${a.anschrift ? ' &middot; ' + esc(a.anschrift) : ''}${a.inhaber ? '<br />Inhaber: ' + esc(a.inhaber) : ''}${a.steuernummer ? ' &middot; Steuernummer: ' + esc(a.steuernummer) : ''}${a.ustId ? ' &middot; USt-IdNr.: ' + esc(a.ustId) : ''}
        <br />Fragen? <a href="mailto:${esc(a.email)}" style="color:${FARBE.akzent};text-decoration:none;">${esc(a.email)}</a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ────────────────────────── Versand ────────────────────────── */

export interface Nachricht {
  an: string;
  betreff: string;
  html: string;
  /**
   * Textfassung. Pflicht, nicht optional: Reine HTML-Mails werden von
   * Spamfiltern schlechter bewertet, und in Autohäusern laufen Postfächer,
   * die kein HTML anzeigen.
   */
  text: string;
  anhaenge?: { filename: string; content: Buffer }[];
}

/**
 * Verschickt eine Mail, sofern Resend konfiguriert ist.
 *
 * Wirft nie. Eine fehlgeschlagene Begrüssungsmail darf die Registrierung
 * nicht scheitern lassen, und ein Versandfehler beim Guthaben-Hinweis darf
 * nicht das Anlegen des Inserats verhindern.
 *
 * Solange keine eigene Domain bei Resend verifiziert ist, darf nur an die
 * eigene Adresse verschickt werden — sonst lehnt Resend jede Mail an
 * Kunden ab. In dem Fall geht sie an den Betreiber, damit man sie
 * trotzdem zu Gesicht bekommt.
 */
export async function sende(n: Nachricht): Promise<boolean> {
  const schluessel = process.env.RESEND_API_KEY;
  if (!schluessel || schluessel.startsWith('re_...')) return false;

  const absender = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const domainVerifiziert = !absender.includes('onboarding@resend.dev');
  const empfaenger = domainVerifiziert
    ? n.an
    : (process.env.RESEND_OWNER_EMAIL || '2fast4sale@gmail.com');

  if (!empfaenger) return false;

  try {
    await new Resend(schluessel).emails.send({
      from: absender,
      to: empfaenger,
      subject: n.betreff,
      html: n.html,
      text: n.text,
      ...(n.anhaenge?.length ? { attachments: n.anhaenge } : {}),
    });
    return true;
  } catch (fehler) {
    console.error('[email] Versand fehlgeschlagen:', n.betreff, fehler);
    return false;
  }
}
