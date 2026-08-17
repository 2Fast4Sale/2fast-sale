/**
 * Rechnungen: Datenmodell, Beträge, PDF und E-Mail an einer Stelle.
 *
 * Vorher lagen PDF- und E-Mail-Aufbau als lokale Funktionen in der
 * Fulfill-Route, und die Beträge wurden dort nebenher mit toFixed(2)
 * ausgerechnet. Das hatte zwei Folgen: Die Summen standen im englischen
 * Zahlenformat ("12.58 €") auf einer deutschen Rechnung, und PDF und
 * E-Mail konnten auseinanderlaufen, weil beide ihre eigenen Strings
 * bekamen.
 *
 * Jetzt gibt es eine Rechnung als Objekt. Sie rechnet in Cent — mit
 * Fliesskommazahlen sind bei 19 % Umsatzsteuer Ein-Cent-Abweichungen
 * zwischen Positionssumme und Gesamtbetrag praktisch garantiert, und die
 * fallen in der Buchhaltung des Händlers auf.
 */

import PDFDocument from 'pdfkit';

/* ────────────────────────── Datenmodell ────────────────────────── */

export interface RechnungsPosition {
  bezeichnung: string;
  /** Ergänzende Zeile unter der Bezeichnung, optional. */
  beschreibung?: string;
  menge: number;
  /**
   * Einzelpreis brutto in Cent — also genau der Betrag, den Stripe
   * abbucht (4,99 € = 499).
   *
   * Bewusst brutto und nicht netto: Unsere Preise sind brutto
   * ausgezeichnet. Rechnet man sie erst je Position auf netto herunter
   * und dann wieder hoch, kommt ein anderer Gesamtbetrag heraus als
   * abgebucht wurde — bei 25 Credits waren es zehn Cent Differenz. Eine
   * Rechnung, die nicht auf den Cent zur Abbuchung passt, kostet den
   * Händler eine Rückfrage bei seinem Steuerberater.
   */
  einzelpreisBruttoCent: number;
}

export interface Anschrift {
  name: string;
  strasse?: string;
  /** PLZ und Ort in einer Zeile, z.B. "80333 München". */
  ort?: string;
  land?: string;
  ustId?: string;
}

export interface Rechnung {
  nummer: string;
  /** Rechnungsdatum als Date, nicht als vorformatierter String. */
  datum: Date;
  /**
   * Leistungsdatum. Pflichtangabe nach § 14 Abs. 4 Nr. 6 UStG — ohne sie
   * ist die Rechnung für den Kunden nicht ordnungsgemäss. Bei uns fällt
   * sie mit dem Rechnungsdatum zusammen, weil die Credits sofort
   * gutgeschrieben werden; sie muss trotzdem dastehen.
   */
  leistungsdatum: Date;
  empfaenger: Anschrift;
  positionen: RechnungsPosition[];
  /** Umsatzsteuersatz in Prozent. */
  steuersatz: number;
  bezahlt: boolean;
  /** Link auf die von Stripe erzeugte Rechnung, falls vorhanden. */
  stripePdfUrl?: string | null;
}

/** Angaben zum eigenen Unternehmen, aus der Umgebung. */
export interface Aussteller {
  name: string;
  anschrift: string;
  ustId?: string;
  steuernummer?: string;
  inhaber?: string;
  email: string;
  web?: string;
}

export function ausstellerAusUmgebung(): Aussteller {
  return {
    name: '2Fast4Sale',
    anschrift: process.env.COMPANY_ADDRESS || '',
    ustId: process.env.COMPANY_TAX_ID || '',
    steuernummer: process.env.COMPANY_STEUERNUMMER || '',
    inhaber: process.env.COMPANY_OWNER || '',
    email: process.env.SUPPORT_EMAIL || 'support@2fast4sale.com',
    web: process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || '2fast4sale.com',
  };
}

/* ────────────────────────── Beträge ────────────────────────── */

export interface Summen {
  nettoCent: number;
  steuerCent: number;
  bruttoCent: number;
}

/**
 * Summiert die Positionen.
 *
 * Der Bruttobetrag ist die feste Grösse — er muss auf den Cent dem
 * entsprechen, was abgebucht wurde. Netto und Steuer werden daraus
 * abgeleitet, nicht andersherum. Die Steuer ergibt sich als Differenz,
 * damit netto + steuer immer exakt brutto ergibt; würde man beide
 * einzeln runden, klaffte gelegentlich ein Cent.
 */
export function summen(positionen: RechnungsPosition[], steuersatz: number): Summen {
  const bruttoCent = positionen.reduce((s, p) => s + p.einzelpreisBruttoCent * p.menge, 0);
  const nettoCent = Math.round(bruttoCent / (1 + steuersatz / 100));
  return { nettoCent, steuerCent: bruttoCent - nettoCent, bruttoCent };
}

const EURO = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 125800 → "1.258,00" — ohne Währungszeichen, damit der Aufrufer es setzt. */
export function betrag(cent: number): string {
  return EURO.format(cent / 100);
}

export function datum(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ────────────────────────── Farben ────────────────────────── */

const FARBE = {
  text: '#0f172a',
  grau: '#64748b',
  hell: '#94a3b8',
  linie: '#e2e8f0',
  flaeche: '#f8fafc',
  akzent: '#4f46e5',
  gutGrund: '#dcfce7',
  gutText: '#166534',
} as const;

/* ────────────────────────── PDF ────────────────────────── */

const A4_BREITE = 595.28;
const A4_HOEHE = 841.89;
const RAND = 56;
const SATZ = A4_BREITE - RAND * 2;

/**
 * Baut das Rechnungs-PDF.
 *
 * Der Aufbau folgt grob DIN 5008: Absenderzeile über dem Anschriftenfeld,
 * Kommunikationsblock rechts daneben, dann Betreff und Inhalt. Das ist
 * das, was ein deutscher Buchhalter erwartet — eine mittig gesetzte
 * Rechnung mit farbigem Balken oben sieht nach Baukasten aus.
 */
export function rechnungPdf(r: Rechnung, a: Aussteller): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: RAND,
      info: {
        Title: `Rechnung ${r.nummer}`,
        Author: a.name,
        Subject: `Rechnung ${r.nummer} vom ${datum(r.datum)}`,
      },
    });

    const teile: Buffer[] = [];
    doc.on('data', (c: Buffer) => teile.push(c));
    doc.on('end', () => resolve(Buffer.concat(teile)));
    doc.on('error', reject);

    const s = summen(r.positionen, r.steuersatz);

    /* ── Kopf: Wortmarke links, Kennzeichnung rechts ── */
    doc.font('Helvetica-Bold').fontSize(17).fillColor(FARBE.text)
       .text(a.name, RAND, RAND);
    doc.font('Helvetica').fontSize(8).fillColor(FARBE.hell)
       .text('R E C H N U N G', RAND, RAND + 5, { width: SATZ, align: 'right', characterSpacing: 1 });

    doc.moveTo(RAND, RAND + 30).lineTo(RAND + SATZ, RAND + 30)
       .lineWidth(2).strokeColor(FARBE.text).stroke();

    /* ── Anschriftenfeld links, Eckdaten rechts ── */
    const anschriftY = RAND + 62;

    // Absenderzeile: klein und unterstrichen, wie im Fensterumschlag.
    doc.font('Helvetica').fontSize(7).fillColor(FARBE.hell)
       .text([a.name, a.anschrift].filter(Boolean).join(' · '), RAND, anschriftY, { width: 260, underline: true });

    let y = anschriftY + 18;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(FARBE.text)
       .text(r.empfaenger.name, RAND, y, { width: 260 });
    y = doc.y + 1;
    doc.font('Helvetica').fontSize(10).fillColor(FARBE.grau);
    for (const zeile of [r.empfaenger.strasse, r.empfaenger.ort, r.empfaenger.land]) {
      if (zeile) { doc.text(zeile, RAND, y, { width: 260 }); y = doc.y + 1; }
    }
    if (r.empfaenger.ustId) {
      doc.fontSize(9).fillColor(FARBE.hell)
         .text(`USt-IdNr. ${r.empfaenger.ustId}`, RAND, y + 4, { width: 260 });
    }

    // Eckdaten rechts. Zweispaltig, damit die Werte bündig stehen.
    const eckX = RAND + 300;
    const eckBreite = SATZ - 300;
    let eckY = anschriftY;
    const eckdaten: [string, string][] = [
      ['Rechnungsnummer', r.nummer],
      ['Rechnungsdatum', datum(r.datum)],
      ['Leistungsdatum', datum(r.leistungsdatum)],
    ];
    for (const [k, v] of eckdaten) {
      doc.font('Helvetica').fontSize(9).fillColor(FARBE.grau)
         .text(k, eckX, eckY, { width: eckBreite * 0.55 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(FARBE.text)
         .text(v, eckX, eckY, { width: eckBreite, align: 'right' });
      eckY += 15;
    }

    if (r.bezahlt) {
      doc.roundedRect(eckX + eckBreite - 74, eckY + 6, 74, 20, 4).fill(FARBE.gutGrund);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(FARBE.gutText)
         .text('BEZAHLT', eckX + eckBreite - 74, eckY + 12, { width: 74, align: 'center' });
    }

    /* ── Positionstabelle ── */
    let tabY = Math.max(doc.y, anschriftY + 128) + 22;

    // Spalten von rechts nach links festgelegt, damit die Zahlen nie
    // gegen den Rand laufen.
    const spBetrag = { x: RAND + SATZ - 90, b: 90 };
    const spEinzel = { x: spBetrag.x - 85, b: 85 };
    const spMenge = { x: spEinzel.x - 50, b: 50 };
    const spText = { x: RAND, b: spMenge.x - RAND - 10 };

    doc.rect(RAND, tabY, SATZ, 24).fill(FARBE.flaeche);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(FARBE.grau);
    const kopfY = tabY + 8.5;
    doc.text('BESCHREIBUNG', spText.x + 12, kopfY, { width: spText.b, characterSpacing: 0.6 });
    doc.text('MENGE', spMenge.x, kopfY, { width: spMenge.b, align: 'right', characterSpacing: 0.6 });
    doc.text('EINZELPREIS', spEinzel.x, kopfY, { width: spEinzel.b, align: 'right', characterSpacing: 0.6 });
    doc.text('BETRAG', spBetrag.x - 12, kopfY, { width: spBetrag.b, align: 'right', characterSpacing: 0.6 });
    tabY += 24;

    for (const p of r.positionen) {
      const zeileOben = tabY;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(FARBE.text)
         .text(p.bezeichnung, spText.x + 12, zeileOben + 12, { width: spText.b });
      let unten = doc.y;
      if (p.beschreibung) {
        doc.font('Helvetica').fontSize(8.5).fillColor(FARBE.grau)
           .text(p.beschreibung, spText.x + 12, unten + 2, { width: spText.b });
        unten = doc.y;
      }
      doc.font('Helvetica').fontSize(10).fillColor(FARBE.text);
      doc.text(String(p.menge), spMenge.x, zeileOben + 12, { width: spMenge.b, align: 'right' });
      doc.text(`${betrag(p.einzelpreisBruttoCent)} €`, spEinzel.x, zeileOben + 12, { width: spEinzel.b, align: 'right' });
      doc.text(`${betrag(p.einzelpreisBruttoCent * p.menge)} €`, spBetrag.x - 12, zeileOben + 12, { width: spBetrag.b, align: 'right' });

      tabY = unten + 12;
      doc.moveTo(RAND, tabY).lineTo(RAND + SATZ, tabY)
         .lineWidth(0.5).strokeColor(FARBE.linie).stroke();
    }

    /* ── Summen ── */
    const sumX = RAND + SATZ - 240;
    const sumB = 240;
    let sumY = tabY + 16;

    const summenZeile = (bez: string, wert: string, fett = false) => {
      doc.font(fett ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(fett ? 12 : 9.5)
         .fillColor(fett ? FARBE.text : FARBE.grau);
      doc.text(bez, sumX, sumY, { width: sumB * 0.6 });
      doc.fillColor(fett ? FARBE.akzent : FARBE.text)
         .text(wert, sumX, sumY, { width: sumB - 12, align: 'right' });
      sumY += fett ? 22 : 16;
    };

    summenZeile('Nettobetrag', `${betrag(s.nettoCent)} €`);
    summenZeile(`darin Umsatzsteuer ${r.steuersatz} %`, `${betrag(s.steuerCent)} €`);

    sumY += 4;
    doc.moveTo(sumX, sumY).lineTo(RAND + SATZ, sumY)
       .lineWidth(1.5).strokeColor(FARBE.text).stroke();
    sumY += 10;
    summenZeile('Gesamtbetrag', `${betrag(s.bruttoCent)} €`, true);

    /* ── Hinweis zur Zahlung ── */
    const hinweisY = sumY + 20;
    const hinweis = r.bezahlt
      ? `Der Betrag von ${betrag(s.bruttoCent)} € wurde am ${datum(r.datum)} über Stripe bezahlt. Diese Rechnung dient als Beleg, eine Überweisung ist nicht erforderlich.`
      : `Bitte überweisen Sie den Gesamtbetrag von ${betrag(s.bruttoCent)} € unter Angabe der Rechnungsnummer ${r.nummer}.`;

    doc.roundedRect(RAND, hinweisY, SATZ, 46, 6).fillAndStroke(FARBE.flaeche, FARBE.linie);
    doc.font('Helvetica').fontSize(9).fillColor(FARBE.grau)
       .text(hinweis, RAND + 14, hinweisY + 12, { width: SATZ - 28, lineGap: 2 });

    /* ── Fusszeile mit den Firmenangaben ── */
    /*
     * pdfkit bricht automatisch um, sobald Text den unteren Rand
     * erreicht. Die Fusszeile steht genau dort — die dritte Spalte
     * landete dadurch auf einer zweiten, ansonsten leeren Seite. Der
     * untere Rand wird deshalb für diesen Block aufgehoben.
     */
    doc.page.margins.bottom = 0;
    const fussY = A4_HOEHE - 82;
    doc.moveTo(RAND, fussY - 14).lineTo(RAND + SATZ, fussY - 14)
       .lineWidth(0.5).strokeColor(FARBE.linie).stroke();

    const spalte = SATZ / 3;
    const fussSpalten: string[][] = [
      [a.name, a.anschrift].filter(Boolean) as string[],
      [
        a.inhaber ? `Inhaber: ${a.inhaber}` : '',
        a.steuernummer ? `Steuernummer: ${a.steuernummer}` : '',
        a.ustId ? `USt-IdNr.: ${a.ustId}` : '',
      ].filter(Boolean),
      [a.email, a.web || ''].filter(Boolean),
    ];

    doc.font('Helvetica').fontSize(7.5).fillColor(FARBE.hell);
    fussSpalten.forEach((zeilen, i) => {
      doc.text(zeilen.join('\n'), RAND + i * spalte, fussY, {
        width: spalte - 10,
        align: i === 2 ? 'right' : 'left',
        lineGap: 2,
      });
    });

    doc.end();
  });
}

/* ────────────────────────── E-Mail ────────────────────────── */

const SCHRIFT = "-apple-system,'Segoe UI',Roboto,Arial,Helvetica,sans-serif";

/**
 * Textfassung der Rechnungsmail.
 *
 * Reine HTML-Mails ohne Textteil werden von Spamfiltern schlechter
 * bewertet, und manche Mailprogramme in Autohäusern zeigen ohnehin nur
 * Text an. Der Aufwand ist gering, der Effekt auf die Zustellung nicht.
 */
export function rechnungText(r: Rechnung, a: Aussteller): string {
  const s = summen(r.positionen, r.steuersatz);
  const zeilen = [
    `Rechnung ${r.nummer}`,
    '',
    `Rechnungsdatum: ${datum(r.datum)}`,
    `Leistungsdatum: ${datum(r.leistungsdatum)}`,
    '',
    ...r.positionen.map(p =>
      `${p.menge} x ${p.bezeichnung} zu ${betrag(p.einzelpreisBruttoCent)} EUR = ${betrag(p.einzelpreisBruttoCent * p.menge)} EUR`),
    '',
    `Nettobetrag:           ${betrag(s.nettoCent)} EUR`,
    `darin Umsatzsteuer ${r.steuersatz} %:  ${betrag(s.steuerCent)} EUR`,
    `Gesamtbetrag:          ${betrag(s.bruttoCent)} EUR`,
    '',
    r.bezahlt
      ? 'Der Betrag wurde bereits bezahlt. Die Rechnung liegt als PDF bei.'
      : `Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer ${r.nummer}.`,
    '',
    'Ihr Guthaben steht sofort zur Verfügung.',
    '',
    '—',
    [a.name, a.anschrift].filter(Boolean).join(' · '),
    a.ustId ? `USt-IdNr.: ${a.ustId}` : '',
    a.email,
  ];
  return zeilen.filter(z => z !== undefined).join('\n');
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * HTML-Fassung der Rechnungsmail.
 *
 * Tabellenlayout mit Inline-Styles, weil Outlook nichts anderes
 * zuverlässig darstellt. Das sieht im Quelltext altmodisch aus, ist bei
 * E-Mails aber der einzige Weg, der überall ankommt.
 */
export function rechnungEmail(r: Rechnung, a: Aussteller): string {
  const s = summen(r.positionen, r.steuersatz);

  // Vorschautext: die Zeile, die im Posteingang neben dem Betreff steht.
  // Ohne sie zeigt Gmail den Anfang des HTML-Gerüsts.
  const vorschau = `${betrag(s.bruttoCent)} € · ${r.positionen[0]?.bezeichnung ?? 'Rechnung'} · ${datum(r.datum)}`;

  const positionsZeilen = r.positionen.map(p => `
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;font-family:${SCHRIFT};">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">${esc(p.bezeichnung)}</div>
          ${p.beschreibung ? `<div style="font-size:12px;color:#64748b;margin-top:3px;line-height:1.5;">${esc(p.beschreibung)}</div>` : ''}
          <div style="font-size:12px;color:#94a3b8;margin-top:5px;">${p.menge} &times; ${betrag(p.einzelpreisBruttoCent)}&nbsp;&euro;</div>
        </td>
        <td align="right" valign="top" style="padding:14px 20px;border-bottom:1px solid #f1f5f9;font-family:${SCHRIFT};font-size:14px;color:#0f172a;white-space:nowrap;">
          ${betrag(p.einzelpreisBruttoCent * p.menge)}&nbsp;&euro;
        </td>
      </tr>`).join('');

  const pdfKnopf = r.stripePdfUrl ? `
      <tr><td align="center" style="padding:4px 32px 0;">
        <a href="${esc(r.stripePdfUrl)}" style="display:inline-block;padding:13px 30px;background-color:#4f46e5;color:#ffffff;font-family:${SCHRIFT};font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Rechnung online ansehen</a>
      </td></tr>` : '';

  const empfaengerZeilen = [r.empfaenger.strasse, r.empfaenger.ort, r.empfaenger.land]
    .filter(Boolean).map(z => esc(z as string)).join('<br />');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>Rechnung ${esc(r.nummer)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">

<div style="display:none;font-size:1px;color:#f1f5f9;max-height:0;overflow:hidden;">${esc(vorschau)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;border:1px solid #e2e8f0;">

  <tr>
    <td style="padding:26px 32px 0;font-family:${SCHRIFT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">${esc(a.name)}</td>
        <td align="right" style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:2px;">RECHNUNG</td>
      </tr></table>
      <div style="height:2px;background-color:#0f172a;margin-top:14px;"></div>
    </td>
  </tr>

  <tr>
    <td style="padding:26px 32px 0;font-family:${SCHRIFT};">
      <div style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${betrag(s.bruttoCent)}&nbsp;&euro;</div>
      <div style="font-size:14px;color:#64748b;margin-top:6px;">
        Rechnung ${esc(r.nummer)} &middot; ${datum(r.datum)}
        ${r.bezahlt ? '<span style="display:inline-block;margin-left:6px;padding:3px 10px;background-color:#dcfce7;color:#166534;font-size:11px;font-weight:700;border-radius:5px;">Bezahlt</span>' : ''}
      </div>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 32px 0;font-family:${SCHRIFT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="50%" valign="top" style="padding-right:14px;">
          <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;margin-bottom:7px;">RECHNUNGSSTELLER</div>
          <div style="font-size:13px;color:#0f172a;line-height:1.7;">
            <strong>${esc(a.name)}</strong>${a.anschrift ? '<br />' + esc(a.anschrift) : ''}${a.ustId ? '<br />USt-IdNr. ' + esc(a.ustId) : ''}
          </div>
        </td>
        <td width="50%" valign="top">
          <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;margin-bottom:7px;">RECHNUNGSEMPF&Auml;NGER</div>
          <div style="font-size:13px;color:#0f172a;line-height:1.7;">
            <strong>${esc(r.empfaenger.name)}</strong>${empfaengerZeilen ? '<br />' + empfaengerZeilen : ''}${r.empfaenger.ustId ? '<br />USt-IdNr. ' + esc(r.empfaenger.ustId) : ''}
          </div>
        </td>
      </tr></table>
      <div style="font-size:12px;color:#64748b;margin-top:16px;">Leistungsdatum: ${datum(r.leistungsdatum)}</div>
    </td>
  </tr>

  <tr>
    <td style="padding:22px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;">
        <tr>
          <td style="padding:9px 20px;background-color:#f8fafc;font-family:${SCHRIFT};font-size:10px;font-weight:700;color:#64748b;letter-spacing:1.2px;border-bottom:1px solid #e2e8f0;border-radius:10px 0 0 0;">POSITION</td>
          <td align="right" style="padding:9px 20px;background-color:#f8fafc;font-family:${SCHRIFT};font-size:10px;font-weight:700;color:#64748b;letter-spacing:1.2px;border-bottom:1px solid #e2e8f0;border-radius:0 10px 0 0;">BETRAG</td>
        </tr>${positionsZeilen}
        <tr>
          <td style="padding:12px 20px;font-family:${SCHRIFT};font-size:13px;color:#64748b;">Nettobetrag</td>
          <td align="right" style="padding:12px 20px;font-family:${SCHRIFT};font-size:13px;color:#64748b;white-space:nowrap;">${betrag(s.nettoCent)}&nbsp;&euro;</td>
        </tr>
        <tr>
          <td style="padding:0 20px 12px;font-family:${SCHRIFT};font-size:13px;color:#64748b;">darin Umsatzsteuer ${r.steuersatz}&nbsp;%</td>
          <td align="right" style="padding:0 20px 12px;font-family:${SCHRIFT};font-size:13px;color:#64748b;white-space:nowrap;">${betrag(s.steuerCent)}&nbsp;&euro;</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-family:${SCHRIFT};font-size:15px;font-weight:800;color:#0f172a;border-radius:0 0 0 10px;">Gesamtbetrag</td>
          <td align="right" style="padding:14px 20px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-family:${SCHRIFT};font-size:15px;font-weight:800;color:#4f46e5;white-space:nowrap;border-radius:0 0 10px 0;">${betrag(s.bruttoCent)}&nbsp;&euro;</td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 32px 0;font-family:${SCHRIFT};">
      <div style="padding:14px 18px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;color:#64748b;line-height:1.7;">
        ${r.bezahlt
          ? 'Der Betrag wurde bereits bezahlt &ndash; eine &Uuml;berweisung ist nicht n&ouml;tig. Ihr Guthaben steht sofort zur Verf&uuml;gung.'
          : `Bitte &uuml;berweisen Sie den Gesamtbetrag unter Angabe der Rechnungsnummer <strong>${esc(r.nummer)}</strong>.`}
        <br /><br />Die Rechnung liegt dieser E-Mail als PDF bei.
      </div>
    </td>
  </tr>

  ${pdfKnopf}

  <tr>
    <td style="padding:26px 32px 30px;font-family:${SCHRIFT};">
      <div style="border-top:1px solid #f1f5f9;padding-top:18px;font-size:11px;color:#94a3b8;line-height:1.8;">
        ${esc(a.name)}${a.anschrift ? ' &middot; ' + esc(a.anschrift) : ''}${a.inhaber ? '<br />Inhaber: ' + esc(a.inhaber) : ''}${a.steuernummer ? ' &middot; Steuernummer: ' + esc(a.steuernummer) : ''}${a.ustId ? ' &middot; USt-IdNr.: ' + esc(a.ustId) : ''}
        <br />Fragen zur Rechnung? <a href="mailto:${esc(a.email)}" style="color:#4f46e5;text-decoration:none;">${esc(a.email)}</a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
