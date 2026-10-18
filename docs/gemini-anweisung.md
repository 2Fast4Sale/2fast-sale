# Die Anweisung an Gemini (Nano Banana 2)

Das ist der vollstaendige Text, der mit jedem Studiobild rausgeht.
Quelle: `lib/studio/geminiStudio.ts`, Funktion `anweisung()`. Gemini
bekommt dazu zwei Bilder: **Bild 1** das Foto des Haendlers, **Bild 2**
den leeren Raum aus `public/backgrounds/raum`.

Englisch, weil das Modell darin genauer arbeitet. Die kursiven Zeilen
darunter sind nur die Uebersetzung fuer dich, sie gehen nicht mit raus.

---

## 1. Aufgabe

> You are preparing a photograph for a professional car dealership listing.
> Image 1 is the original photograph of a car, taken outdoors or in a yard.
> Image 2 is the empty showroom the car must end up in.
> Produce one single photorealistic image: the car from image 1, standing
> inside the showroom from image 2, looking as if it had really been
> photographed there.

*Du bereitest ein Foto fuer ein Haendlerinserat vor. Bild 1 ist das
Original, Bild 2 der leere Showroom. Mach ein einziges fotorealistisches
Bild: das Auto aus Bild 1, stehend im Raum aus Bild 2, als waere es
wirklich dort fotografiert worden.*

## 2. Freistellen

> First cut the car out of image 1 completely and cleanly.
> Follow its real outline: mirrors, antenna, spoiler, tow bar and the gap
> under the bumpers belong to the car, the ground under the tyres does not.
> Nothing of the original surroundings may survive anywhere in the result:
> no asphalt, no kerb, no grass, no buildings, no other cars, no people,
> not even as a thin edge along the body.

*Spiegel, Antenne, Spoiler, Anhaengerkupplung und der Spalt unter den
Stossstangen gehoeren zum Auto, der Boden unter den Reifen nicht. Vom
alten Umfeld darf nichts uebrig bleiben, auch kein schmaler Rand.*

## 3. Hinstellen

> Place the car on the floor of the showroom with every visible wheel
> resting exactly on the ground, so that it neither floats above the floor
> nor sinks into it.
> You may move, scale and very slightly rotate the car to achieve that, but
> never mirror it: the side facing the camera in image 1 must face the
> camera in the result, and the steering wheel stays on the same side.
> You are free to move the car anywhere on the floor and to make it larger
> or smaller as much as you need: keeping its original size matters far less
> than standing correctly in the room.
> Size the car so that it covers about half of the image width and never
> more than 60 percent, and leave clear empty floor in front of it, behind
> it and on both sides.
> The car must stand level on the floor: its wheel contact points must
> follow the perspective of that floor, so the car looks neither tilted to
> one side nor leaning forwards or backwards, and the line between floor and
> wall must run behind the car, never through it.
> Think of the floor as a flat horizontal plane that continues under the
> whole car; place all four wheels on that same plane, not one wheel higher
> than the other.
> Keep the room exactly as it is in image 2: same walls, same floor, same
> lights, same camera position, same framing, and do not make the hall look
> smaller or narrower.
> The whole car must be inside the picture with clear margin to every edge,
> and the roof must stay below the middle height of the picture.

*Jedes sichtbare Rad steht auf dem Boden, nichts schwebt, nichts
versinkt. Spiegeln ist verboten — das Lenkrad bleibt auf derselben
Seite. Rund die halbe Bildbreite, hoechstens 60 Prozent. Die Kante
zwischen Boden und Wand laeuft hinter dem Auto, nie hindurch. **Der Raum
bleibt genau wie in Bild 2**: gleiche Waende, gleicher Boden, gleiches
Licht, gleiche Kamera. Genau deshalb lohnt sich die Arbeit an den
Raeumen: Gemini malt den Raum nicht neu, es uebernimmt ihn.*

## 4. Schatten und Licht

> Add a realistic soft ground shadow under the car, darkest directly under
> the tyres and the underbody, fading out softly a short distance beyond the
> outline, lying only on the floor and never on the walls.
> Match brightness, contrast and white balance of the car to the light of
> this hall, without repainting the car.
> The finished picture must be at least as bright as image 2: do not darken
> the room, not even slightly, because a dark showroom looks cheap in a
> listing.

*Weicher Bodenschatten, am dunkelsten unter Reifen und Unterboden, nur
auf dem Boden. Helligkeit und Weissabgleich angleichen, ohne das Auto
neu zu lackieren. Nicht dunkler machen als Bild 2 — ein dunkler
Showroom sieht im Inserat billig aus.*

## 5. Durch die Scheiben

> Look carefully through the windscreen, the side windows and the rear
> window.
> Everything visible through that glass belongs to the place where the car
> was photographed, so every other car, fence, tree, building, street and
> person behind the glass must be painted over with the calm reflections and
> surfaces of this showroom.
> Keep the glass as glass: transparent where it was transparent, the seats
> and the interior still visible, and the tint exactly as dark as in image 1.

*Was durch die Scheiben zu sehen ist, gehoert zum alten Ort und muss
weg. Glas bleibt Glas: durchsichtig wo es durchsichtig war, Sitze
sichtbar, Toenung genau so dunkel wie vorher.*

## 6. Kennzeichen — mit Haendlernamen

> Cover the number plate completely with a plain dark rectangular dealer
> sign, in the same place, at the same angle and with the same size and shape
> as the plate, so that not one character of the original plate stays
> readable.
> On that sign write this text and nothing else, in clean white letters,
> centred: "FIRMA".
> Spell it exactly like this, letter by letter, with no letter added,
> removed or exchanged: F-I-R-M-A.
> Read your own result back before you finish and compare it letter by
> letter with that spelling; a dealer name with one wrong letter would stand
> on every photo of the listing.

*Das Kennzeichen wird vollstaendig von einem dunklen Schild verdeckt,
an derselben Stelle, im selben Winkel, in derselben Groesse. Darauf der
Haendlername in weissen Buchstaben. Die Buchstabierung Zeichen fuer
Zeichen steht ausdruecklich dabei und soll am Ende nachgelesen werden —
ein Schreibfehler stuende sonst auf jedem Foto des Inserats.*

## 6b. Kennzeichen — ohne Haendlernamen

> Cover the number plate completely with a plain dark rectangular sign, in
> the same place and at the same angle as the plate, so that not one
> character of it stays readable, and write no text on that sign.

## 7. Das Fahrzeug bleibt, wie es ist

> The car itself must stay exactly as photographed: same shape, same colour,
> same wheels, same rims, same badges, same trim, same mirrors, same windows.
> Never hide, smooth or repair a scratch, a dent, rust, dirt, a sticker, a
> chip or a crack, neither in the paint nor in the glass, because the dealer
> is liable for every defect that a listing conceals.
> Do not add parts the car does not have, and do not add people, other
> vehicles, plants, text, logos or watermarks anywhere in the image.

*Der wichtigste Absatz. Kein Kratzer, keine Delle, kein Rost, kein
Dreck, kein Aufkleber, kein Steinschlag wird geglaettet oder
wegretuschiert — der Haendler haftet fuer jeden Mangel, den ein Inserat
verschweigt. Nichts hinzuerfinden, was das Auto nicht hat.*

## 8. Selbstkontrolle

> Before you finish, check your result once more: does every visible wheel
> touch the floor, is the whole car inside the picture, is any piece of the
> old surroundings still visible anywhere including through the glass, and is
> the dealer name spelled exactly as given?
> Correct whatever fails that check, then return exactly one photorealistic
> image with the same dimensions as image 2.

*Vor dem Abgeben selbst nachpruefen und korrigieren.*

---

## Was danach noch passiert

Die Anweisung ist nicht die ganze Sicherung. Nach der Antwort
vergleicht `geminiStudio.ts` das Ergebnis mit dem Original
(Graustufen-Miniaturen, `AEHNLICH_MIN`). Weicht es zu stark ab, wird das
Bild verworfen und der eigene Weg genommen — lieber ein schlichteres
Bild als ein geschoentes Auto.

Modell: `gemini-3.1-flash-image` (Nano Banana 2). Das kleinere "lite"
hielt sich in der Vorschau nicht an die Anweisung: Kennzeichen nicht
ueberdeckt, Scheiben nicht gesaeubert.
