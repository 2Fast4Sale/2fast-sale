import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });
const getResend = () => new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: 'sessionId fehlt' }, { status: 400 });

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: existing } = await service
    .from('stripe_fulfillments')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyFulfilled: true });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['invoice', 'customer'],
    });
  } catch {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
  }

  const userId   = session.metadata?.user_id;
  const quantity = parseInt(session.metadata?.quantity || '1', 10);

  if (!userId) {
    return NextResponse.json({ error: 'user_id fehlt in Stripe-Metadata' }, { status: 400 });
  }

  const { data: profile } = await service
    .from('profiles')
    .select('listing_credits, full_name, company, billing_address')
    .eq('id', userId)
    .single();

  const current = (profile as { listing_credits: number | null } | null)?.listing_credits ?? 0;

  const { error: updateErr } = await service
    .from('profiles')
    .update({ listing_credits: current + quantity })
    .eq('id', userId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await service.from('stripe_fulfillments').insert({ id: sessionId, user_id: userId, quantity });

  // E-Mail versenden
  const customerEmail =
    (session.customer as Stripe.Customer)?.email ||
    session.customer_details?.email || '';

  const invoice        = session.invoice as Stripe.Invoice | null;
  const invoiceNumber  = invoice?.number || sessionId.slice(-8).toUpperCase();
  const invoicePdfUrl  = invoice?.invoice_pdf || null;
  const invoiceDate    = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const unitPrice      = 4.99;
  const netPrice       = (unitPrice / 1.19).toFixed(2);
  const vatAmount      = (unitPrice - parseFloat(netPrice)).toFixed(2);
  const totalPrice     = (unitPrice * quantity).toFixed(2);
  const totalNet       = (parseFloat(netPrice) * quantity).toFixed(2);
  const totalVat       = (parseFloat(vatAmount) * quantity).toFixed(2);

  const billingAddr  = profile?.billing_address
    ? (typeof profile.billing_address === 'string'
        ? JSON.parse(profile.billing_address)
        : profile.billing_address)
    : null;

  const buyerName    = billingAddr?.company || billingAddr?.name || (profile as {full_name?: string} | null)?.full_name || 'Kunde';
  const buyerStreet  = billingAddr?.street || '';
  const buyerCity    = billingAddr?.zip ? `${billingAddr.zip} ${billingAddr.city}` : '';
  const buyerCountry = billingAddr?.country || '';
  const buyerVat     = billingAddr?.vat || '';
  const companyTaxId = process.env.COMPANY_TAX_ID || '';
  const companyAddr  = process.env.COMPANY_ADDRESS || '';
  const fromEmail    = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const isDomainVerified = fromEmail && !fromEmail.includes('onboarding@resend.dev');
  const toEmail      = isDomainVerified ? customerEmail : (process.env.RESEND_OWNER_EMAIL || '2fast4sale@gmail.com');

  if (toEmail && process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_...')) {
    const emailParams = {
      invoiceNumber, invoiceDate, invoicePdfUrl,
      buyerName, buyerStreet, buyerCity, buyerCountry, buyerVat,
      quantity, netPrice, vatAmount, unitPrice: unitPrice.toFixed(2),
      totalNet, totalVat, totalPrice, companyTaxId, companyAddr,
    };

    // PDF generieren
    const pdfBuffer = await buildInvoicePdf(emailParams);

    await getResend().emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Rechnung ${invoiceNumber} - 2Fast4Sale`,
      html: buildInvoiceEmail(emailParams),
      attachments: [{
        filename: `Rechnung-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      }],
    }).catch(err => console.error('[fulfill] E-Mail-Fehler:', err));
  }

  return NextResponse.json({ ok: true, added: quantity, total: current + quantity });
}

function buildInvoiceEmail(p: {
  invoiceNumber: string; invoiceDate: string; invoicePdfUrl: string | null;
  buyerName: string; buyerStreet: string; buyerCity: string; buyerCountry: string; buyerVat: string;
  quantity: number; netPrice: string; vatAmount: string; unitPrice: string;
  totalNet: string; totalVat: string; totalPrice: string;
  companyTaxId: string; companyAddr: string;
}) {
  const pdfRow = p.invoicePdfUrl
    ? `<tr><td align="center" style="padding:28px 40px 0;"><a href="${p.invoicePdfUrl}" style="display:inline-block;padding:14px 32px;background-color:#6366f1;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Rechnung als PDF herunterladen</a></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rechnung ${p.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f2f5">
<tr><td align="center" style="padding:40px 20px;">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;">

  <!-- HEADER -->
  <tr>
    <td bgcolor="#0f172a" style="padding:28px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td><span style="font-size:22px;font-weight:900;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">2Fast4Sale</span></td>
          <td align="right"><span style="font-size:11px;color:#64748b;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;">RECHNUNG</span></td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TITEL -->
  <tr>
    <td style="padding:32px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 6px 0;font-size:22px;font-weight:800;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">Rechnung ${p.invoiceNumber}</p>
            <p style="margin:0;font-size:14px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Rechnungsdatum: ${p.invoiceDate}</p>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block;padding:6px 14px;background-color:#dcfce7;color:#166534;font-size:12px;font-weight:700;font-family:Arial,Helvetica,sans-serif;border-radius:6px;">Bezahlt</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TRENNLINIE -->
  <tr><td style="padding:20px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td></tr></table></td></tr>

  <!-- ADRESSEN -->
  <tr>
    <td style="padding:0 40px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" valign="top" style="padding-right:20px;">
            <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;">VON</p>
            <p style="margin:0;font-size:14px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.9;">
              <strong>2Fast4Sale</strong><br />${p.companyAddr}${p.companyTaxId ? '<br />USt-IdNr.: ' + p.companyTaxId : ''}
            </p>
          </td>
          <td width="50%" valign="top">
            <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:2px;">AN</p>
            <p style="margin:0;font-size:14px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.9;">
              <strong>${p.buyerName}</strong><br />${p.buyerStreet ? p.buyerStreet + '<br />' : ''}${p.buyerCity ? p.buyerCity + '<br />' : ''}${p.buyerCountry}${p.buyerVat ? '<br />USt-IdNr.: ' + p.buyerVat : ''}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TABELLE -->
  <tr>
    <td style="padding:0 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr bgcolor="#f8fafc">
          <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Beschreibung</td>
          <td align="center" style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Menge</td>
          <td align="right" style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Netto</td>
        </tr>
        <tr>
          <td style="padding:16px;font-size:14px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
            <strong>Inserat-Credit</strong><br />
            <span style="font-size:12px;color:#64748b;">KI-Fahrzeugbeschreibung, Studio-Fotos, Plattform-Export</span>
          </td>
          <td align="center" style="padding:16px;font-size:14px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">${p.quantity}</td>
          <td align="right" style="padding:16px;font-size:14px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">${p.totalNet} &euro;</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SUMMEN -->
  <tr>
    <td style="padding:20px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:5px 0;font-size:14px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Nettobetrag</td>
          <td align="right" style="padding:5px 0;font-size:14px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">${p.totalNet} &euro;</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:14px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Umsatzsteuer 19&nbsp;%</td>
          <td align="right" style="padding:5px 0;font-size:14px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">${p.totalVat} &euro;</td>
        </tr>
        <tr>
          <td style="padding:16px 0 6px;font-size:18px;font-weight:800;color:#0f172a;font-family:Arial,Helvetica,sans-serif;border-top:2px solid #e2e8f0;">Gesamtbetrag</td>
          <td align="right" style="padding:16px 0 6px;font-size:18px;font-weight:800;color:#6366f1;font-family:Arial,Helvetica,sans-serif;border-top:2px solid #e2e8f0;">${p.totalPrice} &euro;</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- INFO -->
  <tr>
    <td style="padding:24px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="border:1px solid #e2e8f0;border-radius:10px;">
        <tr>
          <td style="padding:16px 20px;font-size:13px;color:#64748b;font-family:Arial,Helvetica,sans-serif;line-height:1.7;">
            Vielen Dank fuer Ihren Kauf! Ihr Inserat-Credit wurde Ihrem Konto gutgeschrieben und steht sofort zur Verfuegung.${p.companyTaxId ? '<br /><br />USt-IdNr. des Leistungserbringers: <strong>' + p.companyTaxId + '</strong>' : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${pdfRow}

  <!-- FOOTER -->
  <tr>
    <td style="padding:32px 40px;border-top:1px solid #f1f5f9;margin-top:32px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;line-height:1.8;">
        2Fast4Sale &middot; ${p.companyAddr}<br />
        Bei Fragen: <a href="mailto:support@2fast4sale.com" style="color:#6366f1;text-decoration:none;">support@2fast4sale.com</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

async function buildInvoicePdf(p: {
  invoiceNumber: string; invoiceDate: string;
  buyerName: string; buyerStreet: string; buyerCity: string; buyerCountry: string; buyerVat: string;
  quantity: number; totalNet: string; totalVat: string; totalPrice: string;
  companyTaxId: string; companyAddr: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595 - 120; // Breite minus Margins
    const DARK = '#0f172a';
    const GRAY = '#64748b';
    const LGRAY = '#94a3b8';
    const PURPLE = '#6366f1';
    const BORDER = '#e2e8f0';

    // â”€â”€ Header-Block â”€â”€
    doc.rect(0, 0, 595, 90).fill('#0f172a');
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text('2Fast4Sale', 60, 32);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('RECHNUNG', 60, 60, { align: 'right', width: W });

    // â”€â”€ Rechnungstitel â”€â”€
    doc.moveDown(3);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK).text(`Rechnung ${p.invoiceNumber}`, 60);
    doc.fontSize(10).font('Helvetica').fillColor(GRAY).text(`Rechnungsdatum: ${p.invoiceDate}`, 60);

    // Bezahlt-Badge
    doc.roundedRect(595 - 60 - 80, 100, 80, 22, 4).fill('#dcfce7');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#166534').text('Bezahlt', 595 - 60 - 80, 107, { width: 80, align: 'center' });

    // â”€â”€ Trennlinie â”€â”€
    doc.moveDown(1.2);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
    doc.moveDown(1);

    // â”€â”€ Adressen â”€â”€
    const addrY = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(LGRAY).text('VON', 60, addrY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('2Fast4Sale', 60, addrY + 14);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    if (p.companyAddr) doc.text(p.companyAddr, 60);
    if (p.companyTaxId) doc.text(`USt-IdNr.: ${p.companyTaxId}`, 60);

    doc.fontSize(8).font('Helvetica-Bold').fillColor(LGRAY).text('AN', 300, addrY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(p.buyerName, 300, addrY + 14);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    if (p.buyerStreet) doc.text(p.buyerStreet, 300);
    if (p.buyerCity) doc.text(p.buyerCity, 300);
    if (p.buyerCountry) doc.text(p.buyerCountry, 300);
    if (p.buyerVat) doc.text(`USt-IdNr.: ${p.buyerVat}`, 300);

    // â”€â”€ Positions-Tabelle â”€â”€
    doc.y = addrY + 120;
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();

    // Tabellen-Header
    doc.rect(60, doc.y, W, 28).fill('#f8fafc');
    const tableY = doc.y + 8;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY);
    doc.text('BESCHREIBUNG', 72, tableY);
    doc.text('MENGE', 370, tableY, { width: 60, align: 'center' });
    doc.text('NETTO', 440, tableY, { width: 83, align: 'right' });
    doc.y += 28;

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();

    // Tabellenzeile
    const rowY = doc.y + 12;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Inserat-Credit', 72, rowY);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('KI-Fahrzeugbeschreibung, Studio-Fotos, Plattform-Export', 72, rowY + 16);
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text(String(p.quantity), 370, rowY + 4, { width: 60, align: 'center' });
    doc.text(`${p.totalNet} EUR`, 440, rowY + 4, { width: 83, align: 'right' });
    doc.y = rowY + 48;

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
    doc.moveDown(1);

    // â”€â”€ Summen â”€â”€
    const sumX = 360;
    const sumW = 163;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text('Nettobetrag', sumX, doc.y, { width: 100 });
    doc.text(`${p.totalNet} EUR`, sumX, doc.y - 12, { width: sumW, align: 'right' });
    doc.moveDown(0.6);
    doc.text('Umsatzsteuer 19 %', sumX, doc.y, { width: 100 });
    doc.text(`${p.totalVat} EUR`, sumX, doc.y - 12, { width: sumW, align: 'right' });
    doc.moveDown(0.8);

    doc.moveTo(sumX, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
    doc.moveDown(0.6);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(DARK).text('Gesamtbetrag', sumX, doc.y, { width: 100 });
    doc.fillColor(PURPLE).text(`${p.totalPrice} EUR`, sumX, doc.y - 16, { width: sumW, align: 'right' });

    // â”€â”€ Hinweis â”€â”€
    doc.moveDown(3);
    doc.rect(60, doc.y, W, 50).fill('#f8fafc').stroke(BORDER);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
      .text('Vielen Dank fuer Ihren Kauf! Ihr Inserat-Credit wurde Ihrem Konto gutgeschrieben.', 72, doc.y + 10, { width: W - 24 });

    // â”€â”€ Footer â”€â”€
    doc.fontSize(8).font('Helvetica').fillColor(LGRAY)
      .text(`2Fast4Sale  |  ${p.companyAddr}  |  support@2fast4sale.com`, 60, 750, { width: W, align: 'center' });

    doc.end();
  });
}



