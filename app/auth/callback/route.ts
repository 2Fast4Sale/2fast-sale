import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { begruessungSenden } from '../../../lib/emailAusloeser';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    /*
     * Begruessung erst hier, nicht bei der Registrierung: An dieser
     * Stelle ist die Adresse bestaetigt. Wer sich vertippt hat, bekommt
     * sonst Post an ein fremdes Postfach, und die Zustellrate der
     * eigenen Domain leidet mit jeder solchen Mail.
     *
     * Bewusst mit await — ohne es beendet Vercel die Funktion mit der
     * Weiterleitung, und der Versand wird mitten drin abgebrochen. Die
     * Funktion faengt alles selbst ab und wirft nicht.
     */
    if (data.user?.email) {
      await begruessungSenden(data.user.id, data.user.email);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
