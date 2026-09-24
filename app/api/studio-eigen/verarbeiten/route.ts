import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { logApiCost, imageCostMicros, currentUserId } from '../../../../lib/apiCosts';
import { budget, istSandbox, reservieren, freigeben } from '../../../../lib/photoroomBudget';
import { komponieren, STANDARD, type KompositorEinstellungen } from '../../../../lib/studio/kompositor';
import { schattenMitGemini } from '../../../../lib/studio/geminiSchatten';
import { studioHintergrund, raumAusCode, type StudioHintergrund } from '../../../../lib/studio/hintergrund';
import { raum, raumBild } from '../../../../lib/studio/raeume';
import { ersetzeKennzeichen, ersetzeKennzeichenImKasten, type KennzeichenKasten } from '../../../../lib/studio/kennzeichen';
import { kennzeichenAufServerFinden, fahrzeugKastenFinden } from '../../../../lib/studio/kennzeichenModell';
import { freistellGuete } from '../../../../lib/studio/freistellGuete';
import { studioVerfeinernMitGemini } from '../../../../lib/studio/geminiStudio';

export const dynamic = 'force-dynamic';
/*
 * Beim ersten Bild nach einem Kaltstart laedt die Kennzeichen-Erkennung
 * ihr Modell (151 MB). Das braucht Zeit; ohne hoeheres Limit brach die
 * Funktion vorher ab.
 */
export const maxDuration = 120;

/**
 * Ein Fahrzeugfoto zum fertigen Studiobild — der Weg fuer Schritt 2.
 *
 * Loest /api/pixelcut ab. Der Unterschied steht in der Rechnung:
 *
 *   pixelcut       PhotoRoom Plus   0,10 EUR   alles bei PhotoRoom
 *   diese Route    PhotoRoom Basic  0,02 EUR   nur Freistellen gekauft
 *
 * Bei zwoelf Bildern je Inserat sind das 1,20 EUR gegen 0,24 EUR.
 * Hintergrund, Schatten und Spiegelung rechnet der Server selbst; das
 * kostet Rechenzeit, aber kein Geld.
 *
 * KEIN Rueckfall auf pixelcut, wenn hier etwas schiefgeht. Ein stiller
 * Rueckfall waere bequem und teuer: Der Haendler bekaeme sein Bild und
 * niemand merkte, dass jedes einzelne das Fuenffache kostet. Lieber
 * eine sichtbare Fehlermeldung.
 *
 * Nur der eigene Supabase-Speicher ist als Hallenfoto erlaubt — sonst
 * liesse sich der Server ueber eine untergeschobene Adresse dazu
 * bringen, beliebige Ziele abzurufen.
 */
const SEGMENT = 'https://sdk.photoroom.com/v1/segment';

/**
 * Fehlermeldung zu einer abgelehnten PhotoRoom-Anfrage.
 *
 * Vorher hiess es bei jedem Fehler "gerade nicht verfuegbar, bitte gleich
 * nochmal versuchen". Als die kostenlosen Bilder aufgebraucht waren, stand
 * das unter jedem Foto — und "nochmal versuchen" half nie, weil es kein
 * voruebergehender Fehler war. 402, 403 und 429 heissen bei PhotoRoom:
 * Kontingent leer, Tarif fehlt oder zu viele Anfragen.
 */
function photoroomFehler(status: number): { error: string; kontingentErschoepft?: boolean } {
  if (status === 402 || status === 403) {
    return {
      error: 'Das Bildkontingent bei PhotoRoom ist aufgebraucht. Studio-Fotos sind wieder möglich, sobald der Tarif aktiv ist.',
      kontingentErschoepft: true,
    };
  }
  if (status === 429) {
    return { error: 'Zu viele Bilder auf einmal. Bitte in einer Minute noch einmal versuchen.' };
  }
  return { error: 'Studio-Bearbeitung gerade nicht verfügbar. Bitte gleich nochmal versuchen.' };
}

function hintergrundErlaubt(adresse: string): boolean {
  try {
    const ziel = new URL(adresse);
    if (ziel.protocol !== 'https:') return false;
    const erlaubt = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!erlaubt) return false;
    return ziel.host === new URL(erlaubt).host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { image, draftId, code, raum: raumName, firma, kompositor, hintergrund, hintergrundUrl, hallenHorizont, freigestellt: reqFreigestellt, breite, kennzeichen: reqKennzeichen } =
      await req.json() as {
        /** Bodenlinie im eigenen Hallenfoto, Anteil der Bildhoehe von oben. */
        hallenHorizont?: number;
        /**
         * Schon freigestelltes Fahrzeug vom eigenen Freistell-Server
         * (server/freisteller), als Data-URL mit Alphakanal. Ist es da,
         * wird PhotoRoom gar nicht angefragt.
         */
        freigestellt?: string;
        image?: string;
        draftId?: string | null;
        code?: string;
        raum?: string;
        /** Firmenname des Haendlers — kommt auf das Ersatzschild. */
        firma?: string;
        kompositor?: Partial<KompositorEinstellungen>;
        hintergrund?: Partial<StudioHintergrund>;
        hintergrundUrl?: string;
        breite?: number;
        /** Kasten um das Kennzeichen vom Browser-Modell, relativ (0 bis 1). */
        kennzeichen?: unknown;
      };

    if (!image && !reqFreigestellt) return NextResponse.json({ error: 'Kein Bild geliefert' }, { status: 400 });

    /*
     * Vom eigenen Freistell-Server geliefert? Dann entfaellt PhotoRoom
     * vollstaendig: kein Schluessel noetig, nichts zu buchen, kein
     * Kontingent. Eingefuehrt, als die kostenlosen PhotoRoom-Bilder
     * aufgebraucht waren und Schritt 2 unter jedem Foto "Fehler" zeigte.
     */
    const vorab = typeof reqFreigestellt === 'string' && reqFreigestellt.startsWith('data:image/')
      ? Buffer.from(reqFreigestellt.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : null;

    const roherKey = process.env.PHOTOROOM_API_KEY;
    const apiKey = roherKey && process.env.PHOTOROOM_SANDBOX === 'true'
      ? `sandbox_${roherKey}`
      : roherKey;
    if (!apiKey && !vorab) {
      return NextResponse.json({ error: 'Studio-Bearbeitung ist nicht konfiguriert.' }, { status: 503 });
    }

    // Ein Schluessel mit sandbox_ kann keinen produktiven Aufruf
    // erzeugen — dann wird auch nichts gebucht. Siehe pixelcut/route.ts.
    const sandbox = istSandbox() || (apiKey ?? '').startsWith('sandbox_');

    /*
     * ── Welcher Weg ────────────────────────────────────────────────
     *
     * "plus"     PhotoRoom macht alles: freistellen, Hintergrund,
     *            KI-Schatten. 0,10 EUR je Bild.
     * "eigenbau" PhotoRoom stellt nur frei (Basic, 0,02 EUR), Schatten
     *            und Hintergrund rechnet der Server selbst.
     *
     * Plus ist der Standard, und das ist eine bewusste Entscheidung
     * gegen die guenstigere Variante. Der Eigenbau war fertig und
     * funktioniert — sein Schatten ist nur sichtbar schlechter. Beide
     * wurden am selben Foto vermessen: PhotoRooms Schatten endet
     * innerhalb von zehn Pixeln, der eigene laeuft ueber vierzig aus,
     * und der Wagen sieht dadurch aufgesetzt aus.
     *
     * Die Kontingente in studioQuota.ts sind ohnehin gegen 10 Cent je
     * Bild gerechnet; der Eigenbau war ein Bonus, keine Grundlage.
     *
     * Ueber STUDIO_WEG=eigenbau laesst sich zurueckschalten, falls der
     * Schatten spaeter besser wird oder PhotoRoom die Preise anhebt.
     */
    /*
     * Standard ist der EIGENBAU. Plus nur, wenn STUDIO_WEG=plus gesetzt ist.
     *
     * Hier stand es andersherum: Ohne Variable lief alles ueber Plus zu
     * 0,10 EUR je Bild — obwohl der Eigenbau als Standard gedacht und so
     * auch angekuendigt war. Aufgefallen ist es an einem Testbild, auf dem
     * das Fahrzeug mit PhotoRooms Raendern fast das ganze Bild fuellte.
     * Ein teurer Weg darf nie der sein, auf den man ohne Einstellung faellt.
     */
    // Mit vorab freigestelltem Bild gibt es nur den Eigenbau — Plus braucht
    // das Originalfoto und kostet, beides soll hier gerade nicht passieren.
    const weg = process.env.STUDIO_WEG === 'plus' && !vorab ? 'plus' : 'eigenbau';
    const tarif = weg === 'plus' ? 'photoroom' : 'photoroom_basic';

    let buchung: string | null = null;
    if (!sandbox && !vorab) {
      const stand = await budget();
      if (stand.erschoepft) {
        return NextResponse.json({
          error: `Das Kontingent für Studio-Bilder ist aufgebraucht (${stand.verbraucht} von ${stand.limit} in diesem Monat). `
               + 'Es füllt sich zum Monatsersten wieder auf.',
          kontingentErschoepft: true,
        }, { status: 429 });
      }
      buchung = await reservieren(
        await currentUserId(), draftId ?? null, imageCostMicros(tarif),
      );
      if (!buchung) {
        return NextResponse.json({
          error: 'Das Kontingent für Studio-Bilder ist aufgebraucht.',
          kontingentErschoepft: true,
        }, { status: 429 });
      }
    }

    /*
     * Mit vorab freigestelltem Bild kommt KEIN Originalfoto mehr mit. Beide
     * zusammen lagen ueber den 4,5 MB, die Vercel je Anfrage annimmt — und
     * jedes Foto endete in Schritt 2 als "Fehler". Das Original wird dann
     * auch nicht gebraucht: Das Kennzeichen wird am freigestellten Auto
     * ersetzt.
     */
    let roh: Buffer = image
      ? Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : Buffer.alloc(0);

    /*
     * Kennzeichen ersetzen — VOR allem anderen.
     *
     * Ein Kennzeichen ist ein personenbezogenes Datum des Halters. Wer
     * es im Inserat stehen laesst, veroeffentlicht es; das ist der
     * Haendler, und wir liefern ihm das Problem mit, wenn unser Werkzeug
     * es stehen laesst.
     *
     * Hier und nicht am fertigen Bild, aus zwei Gruenden: Das
     * Originalfoto hat die volle Aufloesung, das Schild ist also
     * groesser und sicherer zu finden. Und alles, was danach kommt —
     * Freistellen, Skalieren, Schatten — traegt den Ersatz automatisch
     * mit, ohne dass ihn ein Pfad vergessen kann.
     */
    /*
     * Laeuft der Gemini-Weg, setzt GEMINI das Haendlerschild — so steht
     * es in seiner Anweisung. Dann darf es hier nicht vorher gesetzt
     * werden, sonst malt Gemini ein Schild auf ein Schild.
     *
     * Lehnt Gemini spaeter ab, wird es weiter unten nachgeholt. Ein
     * echtes Kennzeichen darf unter keinen Umstaenden im Inserat landen.
     */
    /*
     * Verfeinern laeuft, sobald ein Schluessel hinterlegt ist.
     *
     * Vorher musste zusaetzlich STUDIO_WEG=gemini gesetzt sein. Genau
     * daran ist es zweimal gescheitert: Der Schluessel lag bereit, die
     * Variable stand aber auf dem alten Wert, und im Bild blieben die
     * Spiegelungen stehen — ohne dass man es dem Ergebnis ansah.
     *
     * Abschalten geht weiterhin, mit STUDIO_WEG=aus.
     */
    const geminiWeg = !!process.env.GEMINI_API_KEY && process.env.STUDIO_WEG !== 'aus';

    let kennzeichenErsetzt = false;
    // Welcher Weg das Schild gesetzt hat — zur Fehlersuche im Browser.
    let kennzeichenQuelle: 'modell' | 'farbregel' | 'gemini' | null = null;
    try {
      if (roh.length > 0) {
        const fund = gueltigerKasten(reqKennzeichen) ?? await kennzeichenAufServerFinden(roh);
        const kasten = fund && fund !== 'keins' ? fund : null;
        /*
         * 'keins' heisst: Das Modell hat sauber gesucht und nichts gefunden.
         * Dann NICHT die Farbregel — die klebte beim Urus einen Balken auf
         * den Kotfluegel. Nur wenn das Modell gar nicht lief, bleibt sie.
         */
        const kz = kasten
          ? await ersetzeKennzeichenImKasten(roh, kasten, firma ?? null)
          : fund === 'keins'
            ? { bild: roh, ersetzt: false }
            : await ersetzeKennzeichen(roh, firma ?? null);
        roh = kz.bild;
        kennzeichenErsetzt = kz.ersetzt;
        kennzeichenQuelle = kz.ersetzt ? (kasten ? 'modell' : 'farbregel') : null;
      }
    } catch (err) {
      /*
       * Ein Fehler beim Ersetzen darf das Bild nicht kosten. Dann bleibt
       * das Kennzeichen stehen — und `kennzeichenErsetzt: false` in der
       * Antwort sagt der Oberflaeche, dass sie warnen muss.
       */
      console.error('[verarbeiten] Kennzeichenersatz fehlgeschlagen:', err);
    }

    const zielBreite = Math.max(600, Math.min(2400, Math.round(breite ?? 2000)));
    const zielHoehe  = Math.round(zielBreite / 1.5);

    /*
     * Der Raum. Er geht in BEIDE Wege ein — beim Eigenbau als
     * Hintergrund fuer den Kompositor, bei Plus als Datei, die
     * PhotoRoom hinter das Fahrzeug legt.
     *
     * Das ist der Grund, warum die eigenen Renders auch bei Plus
     * bleiben: Wir kaufen Freistellung und Schatten, nicht den Raum.
     * Die acht Hallen gehoeren uns, sind lizenzsauber und sehen bei
     * allen Fahrzeugen eines Haendlers gleich aus.
     */
    const halle = raum(raumName);

    /* ── Weg 1: PhotoRoom Plus macht alles ── */
    if (weg === 'plus' && halle && !hintergrundUrl) {
      const plus = new FormData();
      // new Uint8Array(...) statt des Buffers direkt: TypeScript nimmt
      // Buffer nicht als BlobPart an, obwohl es zur Laufzeit ginge.
      plus.append('imageFile', new Blob([new Uint8Array(roh)], { type: 'image/jpeg' }), 'auto.jpg');
      plus.append(
        'background.imageFile',
        new Blob([new Uint8Array(raumBild(halle))], { type: 'image/jpeg' }),
        'raum.jpg',
      );
      plus.append('background.scaling', 'fill');
      /*
       * Gueltig sind nur ai.soft, ai.hard, ai.floating und
       * ai.auto-with-overrides; alles andere quittiert die API mit 400.
       * ai.floating waere hier falsch — das laesst das Fahrzeug schweben.
       */
      plus.append('shadow.mode', process.env.PHOTOROOM_SHADOW_MODE || 'ai.soft');
      plus.append('outputSize', `${zielBreite}x${zielHoehe}`);
      plus.append('paddingTop', '0.12');
      plus.append('paddingRight', '0.10');
      plus.append('paddingBottom', '0.08');
      plus.append('paddingLeft', '0.10');
      plus.append('verticalAlignment', 'bottom');
      plus.append('horizontalAlignment', 'center');

      const a = await fetch('https://image-api.photoroom.com/v2/edit', {
        // Plus laeuft nur ohne Vorab-Bild, und dann ist der Schluessel oben geprueft.
        method: 'POST', headers: { 'x-api-key': apiKey! }, body: plus,
      });
      if (!a.ok) {
        const text = await a.text();
        console.error('[verarbeiten] PhotoRoom Plus fehlgeschlagen:', a.status, text.slice(0, 300));
        await freigeben(buchung);
        return NextResponse.json(photoroomFehler(a.status), { status: 503 });
      }
      const fertig = Buffer.from(await a.arrayBuffer());

      if (sandbox) {
        await logApiCost({
          userId: await currentUserId(), draftId: draftId ?? null,
          service: 'photoroom', operation: 'studio-plus-sandbox',
          unitsIn: 1, costMicros: imageCostMicros('photoroom'),
        });
      }

      return NextResponse.json({
        result: `data:image/jpeg;base64,${fertig.toString('base64')}`,
        kennzeichenErsetzt,
        kennzeichenQuelle,
        weg: 'plus',
        raum: halle.name,
        sandbox,
      });
    }

    /* ── Weg 2: nur freistellen, Rest selbst rechnen ── */
    const form = new FormData();
    form.append('image_file', new Blob([new Uint8Array(roh)], { type: 'image/jpeg' }), 'auto.jpg');
    // PNG, weil nur PNG einen Alphakanal hat. Der Kompositor braucht die
    // Freistellungskante als Teiltransparenz, sonst harte Raender.
    form.append('format', 'png');

    let freigestellt: Buffer;
    if (vorab) {
      /*
       * Erst pruefen, ob die Freistellung ueberhaupt etwas taugt.
       *
       * Das kostenlose Freistellen im Browser scheitert an manchen Fotos,
       * besonders an dunklen Autos auf dunklem Pflaster: Dann bleibt ein
       * Rechteck Originalfoto stehen, und aus dessen Unterkante wird ein
       * schwarzer Schattenbalken quer durchs Bild. Im Live-Test an einem
       * schwarzen Golf genau so passiert.
       *
       * Ein Haendler zahlt fuer dieses Bild. Eine ehrliche Meldung ist
       * besser als ein sichtbar falsches Ergebnis.
       */
      /*
       * Ist ueberhaupt ein Fahrzeug auf dem Foto?
       *
       * Im Stapel ueber 64 Fotos lief ein Portraitfoto eines Mannes
       * klaglos durch die ganze Kette: freigestellt, in die Halle
       * gesetzt, Schatten darunter. So etwas darf ein Haendler nie
       * geliefert bekommen — und im Alltag passiert es, wenn jemand
       * versehentlich das falsche Bild hochlaedt.
       */
      const fahrzeug = await fahrzeugKastenFinden(vorab);
      if (fahrzeug === 'keins') {
        console.warn('[verarbeiten] Kein Fahrzeug auf dem Foto erkannt');
        return NextResponse.json({
          error: 'Auf diesem Foto ist kein Fahrzeug zu erkennen. Bitte ein Foto des Autos hochladen.',
          keinFahrzeug: true,
        }, { status: 422 });
      }

      const guete = await freistellGuete(vorab);
      if (!guete.brauchbar) {
        console.warn('[verarbeiten] Freistellung unbrauchbar:',
          guete.grund, JSON.stringify(guete));
        return NextResponse.json({
          error: `${guete.grund} Bitte ein anderes Foto nehmen — am besten mit hellem, ruhigem Untergrund und etwas Abstand zum Fahrzeug.`,
          freistellenGescheitert: true,
        }, { status: 422 });
      }

      /*
       * Das Kennzeichen wurde oben am Originalfoto ersetzt — der
       * Freistell-Server hat aber das unveraenderte Foto bekommen. Deshalb
       * hier noch einmal am freigestellten Fahrzeug.
       */
      try {
        /*
         * Mit Kasten aus dem Browser-Modell: das Schild dort, schraeg
         * eingepasst. Ohne Kasten die Farbregel — die findet schraege
         * Schilder aber nicht zuverlaessig. Ohne Kasten vom Browser sucht
         * der Server selbst (kennzeichenModell.ts) — im Browser laeuft das
         * Modell nicht.
         */
        const fund = gueltigerKasten(reqKennzeichen) ?? await kennzeichenAufServerFinden(vorab);
        const kasten = fund && fund !== 'keins' ? fund : null;
        /*
         * 'keins' heisst: Das Modell hat sauber gesucht und nichts gefunden.
         * Dann NICHT die Farbregel — die klebte beim Urus einen Balken auf
         * den Kotfluegel. Nur wenn das Modell gar nicht lief, bleibt sie.
         */
        const kz = kasten
          ? await ersetzeKennzeichenImKasten(vorab, kasten, firma ?? null)
          : fund === 'keins'
            ? { bild: vorab, ersetzt: false }
            : await ersetzeKennzeichen(vorab, firma ?? null);
        freigestellt = kz.bild;
        kennzeichenErsetzt = kz.ersetzt;
        kennzeichenQuelle = kz.ersetzt ? (kasten ? 'modell' : 'farbregel') : null;
      } catch (err) {
        console.error('[verarbeiten] Kennzeichenersatz am Vorab-Bild fehlgeschlagen:', err);
        freigestellt = vorab;
      }
    } else {
      const antwort = await fetch(SEGMENT, { method: 'POST', headers: { 'x-api-key': apiKey! }, body: form });
      if (!antwort.ok) {
        const text = await antwort.text();
        console.error('[verarbeiten] Freistellen fehlgeschlagen:', antwort.status, text.slice(0, 300));
        await freigeben(buchung);
        return NextResponse.json(photoroomFehler(antwort.status), { status: 503 });
      }
      freigestellt = Buffer.from(await antwort.arrayBuffer());
    }

    /* ── In den Raum setzen (kostet nichts) ── */
    const gerechnet: StudioHintergrund = { ...raumAusCode(code ?? 'W02B02'), ...(hintergrund ?? {}) };

    /*
     * Die Kameradaten des Raums gehen in die Schattenrechnung ein —
     * Horizontlage, Kamerahoehe und Brennweite. Ohne sie greifen
     * Standardwerte, die zu keinem bestimmten Raum passen: Der
     * gerechnete Verlaufshintergrund hat seinen Horizont bei 0,74 statt
     * 0,50, und ein gegen 0,45 gerechneter Schatten liegt darin
     * sichtbar falsch.
     */
    const eigeneHalle = !!hintergrundUrl && hintergrundErlaubt(hintergrundUrl);

    let ausRaum: Partial<KompositorEinstellungen> = halle ? {
      horizont:          halle.horizont,
      wandlinie:         halle.wandlinie,
      kameraHoehe:       halle.kameraHoehe,
      brennweite:        halle.brennweite,
      spiegelungStaerke: halle.bodenglanz,
    } : {};

    /*
     * Eigenes Hallenfoto des Haendlers.
     *
     * Hier galten bisher die Kameradaten des GEWAEHLTEN gerenderten
     * Raums — also Werte, die mit dem hochgeladenen Foto nichts zu tun
     * haben. Der Schatten wurde gegen eine fremde Bodenlinie gerechnet,
     * und das Auto schwebte oder steckte im Boden.
     *
     * Die Bodenlinie markiert der Haendler jetzt selbst mit einem Klick
     * auf der Hintergrundseite. Kamerahoehe und Brennweite sind fuer ein
     * Handyfoto auf Kotfluegelhoehe geschaetzt; die Linie ist der Wert,
     * der den Unterschied macht. Spiegelung aus: Ein fremder Boden
     * koennte alles sein.
     */
    if (eigeneHalle) {
      const h = typeof hallenHorizont === 'number' && hallenHorizont > 0.1 && hallenHorizont < 0.9
        ? hallenHorizont : 0.5;
      ausRaum = { horizont: h, kameraHoehe: 1.2, brennweite: 30, spiegelungStaerke: 0 };
    }

    let hg: Buffer;
    if (eigeneHalle) {
      try {
        const eigenes = await fetch(hintergrundUrl);
        if (!eigenes.ok) throw new Error('HTTP ' + eigenes.status);
        hg = await sharp(Buffer.from(await eigenes.arrayBuffer()))
          .resize(zielBreite, zielHoehe, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 92 }).toBuffer();
      } catch (err) {
        console.warn('[verarbeiten] Hallenfoto nicht ladbar, nehme gerenderten Raum:', err);
        hg = halle
          ? await sharp(raumBild(halle)).resize(zielBreite, zielHoehe, { fit: 'cover' }).jpeg({ quality: 92 }).toBuffer()
          : await studioHintergrund(gerechnet, zielBreite, zielHoehe);
      }
    } else if (halle) {
      hg = await sharp(raumBild(halle))
        .resize(zielBreite, zielHoehe, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 92 })
        .toBuffer();
    } else {
      hg = await studioHintergrund(gerechnet, zielBreite, zielHoehe);
    }

    let ergebnis = await komponieren(freigestellt, hg, {
      ...STANDARD, ...ausRaum, ...(kompositor ?? {}),
    });

    /*
     * ── Gemini verfeinert das fertige Bild ─────────────────────────
     *
     * Nur mit STUDIO_WEG=gemini. Gemini bekommt das Bild, in dem der
     * Wagen schon an der richtigen Stelle und in der richtigen Groesse
     * steht, und verbessert daran Schatten, Licht und die Spiegelungen
     * in den Scheiben.
     *
     * Der Weg davor liess Gemini das ganze Bild bauen. Das Ergebnis war
     * unbrauchbar: Das Auto fuellte fast das ganze Bild, die Halle sah
     * winzig aus, und zweimal wurde der Wagen sogar gespiegelt. An
     * Groessenangaben im Text haelt sich das Modell nicht.
     */
    let verfeinert: false | number = false;
    if (geminiWeg) {
      const fein = await studioVerfeinernMitGemini(ergebnis.bild);
      if (fein) {
        await logApiCost({
          userId: await currentUserId(),
          draftId: draftId ?? null,
          service: 'gemini_bild',
          operation: 'studio-verfeinern',
          unitsIn: 1,
          costMicros: imageCostMicros('gemini_bild'),
        });
        ergebnis = { ...ergebnis, bild: fein.bild };
        verfeinert = Number(fein.aehnlich.toFixed(3));
      }
    }

    /*
     * Schatten von Gemini, falls ein Schluessel gesetzt ist. Gemini bekommt
     * das Bild ohne eigenen Schatten; das Originalfahrzeug wird danach
     * wieder obenauf gelegt (geminiSchatten.ts). Geht es schief, bleibt
     * das Ergebnis oben mit dem eigenen Schatten.
     */
    let geminiSchatten = false;
    if (process.env.GEMINI_API_KEY && process.env.STUDIO_SCHATTEN !== 'eigen') {
      const ohne = await komponieren(freigestellt, hg, {
        ...STANDARD, ...ausRaum, ...(kompositor ?? {}),
        schattenStaerke: 0, kontaktStaerke: 0, spiegelungStaerke: 0,
      });
      const ki = await schattenMitGemini(ohne.bild, ohne.fahrzeugEbene, ohne.breite, ohne.hoehe);
      if (ki) {
        ergebnis = { ...ergebnis, bild: ki };
        geminiSchatten = true;
      }
    }

    /*
     * Im Sandbox-Betrieb ist oben nichts reserviert worden, deshalb hier
     * nachtragen — mit dem Tarif, der zum gewaehlten Weg gehoert.
     */
    if (sandbox) {
      await logApiCost({
        userId: await currentUserId(),
        draftId: draftId ?? null,
        service: tarif,
        operation: 'studio-sandbox',
        unitsIn: 1,
        costMicros: imageCostMicros(tarif),
      });
    }

    return NextResponse.json({
      result: `data:image/jpeg;base64,${ergebnis.bild.toString('base64')}`,
      kennzeichenErsetzt,
      kennzeichenQuelle,
      eigenbau: true,
      /* false: Gemini lief nicht oder wurde verworfen. Sonst die Aehnlichkeit. */
      verfeinert,
      geminiSchatten,
      sandbox,
    });
  } catch (err) {
    console.error('[verarbeiten] Fehler:', err);
    return NextResponse.json({ error: 'Unerwarteter Fehler bei der Studio-Bearbeitung.' }, { status: 500 });
  }
}

/**
 * Prueft den Kennzeichen-Kasten aus dem Browser. Er kommt vom Client und
 * wird deshalb nicht blind uebernommen: nur Zahlen zwischen 0 und 1, in
 * der richtigen Reihenfolge, und nicht groesser als ein Kennzeichen sein
 * kann.
 */
function gueltigerKasten(k: unknown): KennzeichenKasten | null {
  if (!k || typeof k !== 'object') return null;
  const { x0, y0, x1, y1 } = k as Record<string, unknown>;
  const zahlen = [x0, y0, x1, y1];
  if (!zahlen.every((z) => typeof z === 'number' && Number.isFinite(z) && z >= 0 && z <= 1)) return null;
  const [a, b, c, d] = zahlen as number[];
  if (c <= a || d <= b || c - a > 0.35 || d - b > 0.2) return null;
  return { x0: a, y0: b, x1: c, y1: d };
}
