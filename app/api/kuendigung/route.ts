import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sende, ausstellerAusUmgebung, huelle, absatz, ueberschrift, kasten, esc } from '../../../lib/email';

export const dynamic = 'force-dynamic';

/**
 * Kündigung entgegennehmen — ohne Anmeldung.
 *
 * § 312k BGB verlangt, dass die Kündigung ohne Anmeldung möglich ist.
 * Der Anlass für das Gesetz war genau der Fall, dass jemand sein Konto
 * nicht mehr erreicht und deshalb weiterzahlt.
 *
 * Daraus folgt eine unangenehme Eigenschaft: Jeder kann für jede
 * Adresse kündigen. Das ist so gewollt und lässt sich nicht durch eine
 * Prüfung heilen — jede Hürde wäre eine Hürde vor der Kündigung, und
 * genau die verbietet das Gesetz. Abgesichert wird stattdessen
 * nachgelagert: Die Bestätigung geht an die genannte Adresse, sodass
 * ihr Inhaber es erfährt, und der Eingang wird mit Zeitpunkt und
 * Herkunft festgehalten.
 */
export async function POST(req: NextRequest) {
  const daten = await req.json().catch(() => null);
  if (!daten?.email?.trim()) {
    return NextResponse.json({ error: 'Bitte gib deine E-Mail-Adresse an.' }, { status: 400 });
  }

  const art: 'ordentlich' | 'ausserordentlich' =
    daten.art === 'ausserordentlich' ? 'ausserordentlich' : 'ordentlich';

  // Bei ausserordentlicher Kündigung verlangt § 312k Abs. 2 einen Grund.
  if (art === 'ausserordentlich' && !daten.grund?.trim()) {
    return NextResponse.json(
      { error: 'Bei einer ausserordentlichen Kündigung ist der Grund anzugeben.' },
      { status: 400 },
    );
  }

  const dienst = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  /*
   * Herkunft aus dem Weiterleitungskopf, nicht aus dem Anfragekörper:
   * Sonst könnte ein Aufrufer eine fremde Adresse behaupten.
   */
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;

  const eingang = new Date();

  const { data: eintrag, error } = await dienst
    .from('kuendigungen')
    .insert({
      email:      String(daten.email).trim().toLowerCase(),
      name:       daten.name?.trim() || null,
      vertrag:    daten.vertrag?.trim() || null,
      art,
      grund:      daten.grund?.trim() || null,
      zum_datum:  daten.zumDatum?.trim() || null,
      ip_adresse: ip,
    })
    .select()
    .single();

  if (error) {
    console.error('[kuendigung] konnte nicht gespeichert werden:', error.message);
    /*
     * Hier NICHT stillschweigend weitergehen.
     *
     * Sonst bekäme jemand eine Bestätigung für eine Kündigung, die
     * nirgends steht — und würde in gutem Glauben weiterbezahlt.
     */
    return NextResponse.json(
      { error: 'Die Kündigung konnte nicht entgegengenommen werden. Bitte schreib uns direkt.' },
      { status: 500 },
    );
  }

  const a = ausstellerAusUmgebung();
  const zeitpunkt = eingang.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  /*
   * Die Bestätigung muss Inhalt, Datum und Uhrzeit nennen — § 312k Abs. 4.
   * Deshalb steht der eingegangene Text hier vollständig noch einmal.
   */
  const zeilen: [string, string][] = [
    ['Eingegangen am', `${zeitpunkt} Uhr`],
    ['E-Mail-Adresse', String(daten.email).trim()],
    ...(daten.name?.trim() ? [['Name', daten.name.trim()] as [string, string]] : []),
    ...(daten.vertrag?.trim() ? [['Vertrag', daten.vertrag.trim()] as [string, string]] : []),
    ['Art der Kündigung', art === 'ausserordentlich' ? 'Ausserordentlich' : 'Ordentlich'],
    ...(daten.grund?.trim() ? [['Grund', daten.grund.trim()] as [string, string]] : []),
    ...(daten.zumDatum?.trim() ? [['Zum', daten.zumDatum.trim()] as [string, string]] : []),
    ['Vorgangsnummer', eintrag.id],
  ];

  const tabelle = zeilen.map(([k, w]) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#64748b;width:42%;vertical-align:top;">${esc(k)}</td>
      <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(w)}</td>
    </tr>`).join('');

  const inhalt = `
    ${ueberschrift('Kündigung eingegangen', `${zeitpunkt} Uhr`)}
    ${absatz('Wir haben deine Kündigung erhalten. Diese E-Mail ist deine Bestätigung — bitte hebe sie auf.', 18)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">${tabelle}</table>
    ${kasten('Dein Zugang bleibt bis zum Ende des bezahlten Zeitraums bestehen. Bereits erstellte Inserate bleiben erhalten und abrufbar.')}
  `;

  const text = [
    'Kündigung eingegangen',
    '',
    'Wir haben deine Kündigung erhalten. Diese E-Mail ist deine Bestätigung — bitte hebe sie auf.',
    '',
    ...zeilen.map(([k, w]) => `${k}: ${w}`),
    '',
    'Dein Zugang bleibt bis zum Ende des bezahlten Zeitraums bestehen.',
    'Bereits erstellte Inserate bleiben erhalten.',
    '',
    '—',
    [a.name, a.anschrift].filter(Boolean).join(' · '),
    a.email,
  ].join('\n');

  const verschickt = await sende({
    an: String(daten.email).trim(),
    betreff: `Kündigung eingegangen — ${zeitpunkt} Uhr`,
    html: huelle(a, {
      marke: 'KÜNDIGUNG',
      vorschau: `Eingegangen am ${zeitpunkt} Uhr. Vorgangsnummer ${eintrag.id}.`,
      titel: 'Kündigung eingegangen',
      inhalt,
    }),
    text,
  });

  if (verschickt) {
    await dienst.from('kuendigungen')
      .update({ bestaetigt_am: new Date().toISOString() })
      .eq('id', eintrag.id);
  }

  return NextResponse.json({
    ok: true,
    vorgang: eintrag.id,
    zeitpunkt,
    /*
     * Ehrlich melden, wenn die Mail nicht rausging. Die Kündigung ist
     * trotzdem wirksam — sie ist eingegangen und festgehalten —, aber
     * der Kunde soll wissen, dass er keine Bestätigung im Postfach
     * findet, statt darauf zu warten.
     */
    bestaetigungVerschickt: verschickt,
  });
}
