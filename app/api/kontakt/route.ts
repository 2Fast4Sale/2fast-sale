import { NextResponse } from 'next/server';
import { sende } from '../../../lib/email';

/**
 * Nimmt das Kontaktformular entgegen und schickt es an den Betreiber.
 *
 * ── Warum es diese Route gibt ──────────────────────────────────────
 *
 * Das Formular auf /kontakt hat vorher NICHTS verschickt: Es wartete
 * 1,2 Sekunden und zeigte dann "Nachricht gesendet" samt "Wir melden uns
 * innerhalb von 24 Stunden bei dir". Wer geschrieben hat, wartete also
 * auf eine Antwort, die niemand geben konnte, weil die Nachricht nirgends
 * ankam. Fuer eine Seite, die von Vertrauen lebt, ist das der
 * schlimmstmoegliche erste Kontakt.
 *
 * Solange bei Resend keine eigene Domain verifiziert ist, geht die Mail
 * an die Betreiberadresse (siehe lib/email.ts) — das genuegt, denn genau
 * dort soll sie gelesen werden.
 */
export const dynamic = 'force-dynamic';

/** Schuetzt vor eingeschleustem HTML in der Mail. */
function sicher(text: string): string {
  return String(text ?? '')
    .slice(0, 5000)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  try {
    const { name, email, company, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, E-Mail und Nachricht werden gebraucht.' },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Die E-Mail-Adresse sieht nicht gültig aus.' }, { status: 400 });
    }

    const zeilen = [
      ['Name', name],
      ['E-Mail', email],
      ['Firma', company || '—'],
      ['Thema', subject || '—'],
    ];

    const verschickt = await sende({
      an: process.env.RESEND_OWNER_EMAIL || '2fast4sale@gmail.com',
      betreff: `Kontaktformular: ${sicher(String(subject || 'Nachricht'))} — ${sicher(String(name))}`,
      html: `
        <h2>Nachricht über das Kontaktformular</h2>
        <table cellpadding="6">
          ${zeilen.map(([k, w]) => `<tr><td><b>${sicher(String(k))}</b></td><td>${sicher(String(w))}</td></tr>`).join('')}
        </table>
        <p style="white-space:pre-wrap">${sicher(String(message))}</p>
      `,
      text: [...zeilen.map(([k, w]) => `${k}: ${w}`), '', String(message)].join('\n'),
    });

    /*
     * Kein stilles Scheitern: Geht die Mail nicht raus (kein Schluessel
     * hinterlegt, Resend lehnt ab), erfaehrt der Absender das und kann
     * stattdessen direkt schreiben. Besser eine ehrliche Fehlermeldung
     * als ein Haken, hinter dem nichts passiert.
     */
    if (!verschickt) {
      return NextResponse.json({
        error: 'Die Nachricht konnte gerade nicht zugestellt werden. Bitte schreib direkt an info@2fast4sale.com.',
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[kontakt]', err);
    return NextResponse.json({
      error: 'Da ist etwas schiefgegangen. Bitte schreib direkt an info@2fast4sale.com.',
    }, { status: 500 });
  }
}
