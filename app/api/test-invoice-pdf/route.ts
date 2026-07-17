import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const doc = new PDFDocument({ size: 'A4', margin: 60 });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', resolve);
    doc.on('error', reject);

    const W = 595 - 120;
    const DARK = '#0f172a';
    const GRAY = '#64748b';
    const LGRAY = '#94a3b8';
    const PURPLE = '#6366f1';
    const BORDER = '#e2e8f0';

    doc.rect(0, 0, 595, 90).fill('#0f172a');
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text('2Fast4Sale', 60, 32);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('RECHNUNG', 60, 60, { align: 'right', width: W });

    doc.moveDown(3);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK).text('Rechnung R-TEST-001', 60);
    doc.fontSize(10).font('Helvetica').fillColor(GRAY).text('Rechnungsdatum: 15.07.2026', 60);

    doc.roundedRect(595 - 60 - 80, 100, 80, 22, 4).fill('#dcfce7');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#166534').text('Bezahlt', 595 - 60 - 80, 107, { width: 80, align: 'center' });

    doc.moveDown(1.2);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
    doc.moveDown(1);

    const addrY = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(LGRAY).text('VON', 60, addrY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('2Fast4Sale', 60, addrY + 14);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text('Musterstrasse 1, 80333 Muenchen', 60);
    doc.text('USt-IdNr.: DE123456789', 60);

    doc.fontSize(8).font('Helvetica-Bold').fillColor(LGRAY).text('AN', 300, addrY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Autohaus Mustermann GmbH', 300, addrY + 14);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text('Beispielstr. 42', 300);
    doc.text('12345 Musterstadt', 300);
    doc.text('Deutschland', 300);

    doc.y = addrY + 120;
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();

    doc.rect(60, doc.y, W, 28).fill('#f8fafc');
    const tableY = doc.y + 8;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(GRAY);
    doc.text('BESCHREIBUNG', 72, tableY);
    doc.text('MENGE', 370, tableY, { width: 60, align: 'center' });
    doc.text('NETTO', 440, tableY, { width: 83, align: 'right' });
    doc.y += 28;

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();

    const rowY = doc.y + 12;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Inserat-Credit', 72, rowY);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('KI-Fahrzeugbeschreibung, Studio-Fotos, Plattform-Export', 72, rowY + 16);
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text('1', 370, rowY + 4, { width: 60, align: 'center' });
    doc.text('4,19 EUR', 440, rowY + 4, { width: 83, align: 'right' });
    doc.y = rowY + 48;

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
    doc.moveDown(1);

    const sumX = 360;
    const sumW = 163;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text('Nettobetrag', sumX, doc.y, { width: 100 });
    doc.text('4,19 EUR', sumX, doc.y - 12, { width: sumW, align: 'right' });
    doc.moveDown(0.6);
    doc.text('Umsatzsteuer 19 %', sumX, doc.y, { width: 100 });
    doc.text('0,80 EUR', sumX, doc.y - 12, { width: sumW, align: 'right' });
    doc.moveDown(0.8);

    doc.moveTo(sumX, doc.y).lineTo(535, doc.y).strokeColor(BORDER).lineWidth(1).stroke();
    doc.moveDown(0.6);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(DARK).text('Gesamtbetrag', sumX, doc.y, { width: 100 });
    doc.fillColor(PURPLE).text('4,99 EUR', sumX, doc.y - 16, { width: sumW, align: 'right' });

    doc.moveDown(3);
    doc.rect(60, doc.y, W, 50).fill('#f8fafc').stroke(BORDER);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
      .text('Vielen Dank fuer Ihren Kauf! Ihr Inserat-Credit wurde Ihrem Konto gutgeschrieben.', 72, doc.y + 10, { width: W - 24 });

    doc.fontSize(8).font('Helvetica').fillColor(LGRAY)
      .text('2Fast4Sale  |  support@2fast4sale.com', 60, 750, { width: W, align: 'center' });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);

  // Auch per Mail schicken
  await resend.emails.send({
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: '2fast4sale@gmail.com',
    subject: 'Test-Rechnung mit PDF-Anhang',
    html: '<p>Im Anhang befindet sich eine Test-Rechnung als PDF.</p>',
    attachments: [{ filename: 'Rechnung-TEST-001.pdf', content: pdfBuffer }],
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Rechnung-TEST-001.pdf"',
    },
  });
}
