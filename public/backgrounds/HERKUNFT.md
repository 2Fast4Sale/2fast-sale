# Herkunft der Studiohintergründe

Die Bilder unter `raum/` sind **eigene Renders**. Sie entstehen aus
`tools/raum_render.py` (Blender) und gehören damit vollständig zu
2Fast4Sale — es ist kein gekauftes oder gefundenes Bildmaterial darin.

Verwendet werden lediglich **Materialkarten von ambientCG** unter der
**Creative Commons CC0 1.0 Universal License**.

Wortlaut der Lizenz (docs.ambientcg.com/license, abgerufen 09.09.2026):

> You can copy, modify, distribute and perform the assets, even for commercial
> purposes, all without asking permission.

Namensnennung ist **nicht erforderlich**, wird von ambientCG aber erbeten.
Diese Datei erfüllt das.

## Warum das hier steht

Bildmaterial ohne geklärte Herkunft ist in einem Produkt, mit dem Geld verdient
wird, ein Risiko — und zwar eines, das erst auffällt, wenn es teuer wird.

Der Anlass war konkret: Als Vorbild diente zunächst ein Hintergrund von
CARMERA. Der sah gut aus, gehörte aber CARMERA. Ein Händler, der damit auf
mobile.de inseriert, hinge an einer Lizenz, die wir nicht haben — und die
Rechnung dafür käme bei uns an. Das Bild wurde deshalb nur angesehen und
wieder gelöscht.

Was bleibt, ist der eigene Nachbau. Er hat nebenbei einen Vorteil, den
gekauftes Material nicht bieten kann: Wir kennen die Kamera. Neben jedem
Bild liegt eine `.json` mit Kamerahöhe, Brennweite, Horizontlage und
Bodenglanz. Der Kompositor liest diese Werte, statt sie zu schätzen.

## Die verwendeten Materialsätze

| ambientCG-Kennung | verwendet als |
|---|---|
| PaintedPlaster017 | gestrichener Putz, Wand |
| Plaster001 | feiner Rauputz, Wand |
| Concrete046 | Sichtbeton, Wand und Boden |
| Concrete034 | glatter Estrich, Boden |
| Asphalt033 | Asphalt, Boden |
| Tiles141 | Großfliesen, Boden |

Aus jedem Paket werden Farb-, Rauheits- und Normalenkarte benutzt — anders als
beim früheren Ansatz, der nur die Farbkarte flach auflegte. Blender beleuchtet
die Fläche, deshalb braucht es die anderen Karten.

Die Rohpakete liegen unter `tools/texturen/` und sind bewusst **nicht im
Repository** (siehe `.gitignore`): rund 20 MB, jederzeit neu ladbar, und im
Repo gehört das Ergebnis, nicht das Ausgangsmaterial.

## Was hier früher stand

Bis zum 10.09.2026 lagen unter `boden/` und `wand/` sechzehn Kachelbilder, die
der Kompositor selbst perspektivisch auf den Boden legte. Der Weg ist
aufgegeben: sharp beherrscht keine projektive Verzerrung, und die Krücke aus
sechzehn waagerechten Bändern kostete entweder die Perspektive oder die
Struktur. Blender rechnet beides richtig.
