"""
Baut einen leeren Studioraum und rendert ihn — ohne Blender-Oberflaeche.

    blender -b -P tools/raum_render.py -- --ziel public/backgrounds/raum/x.jpg

Warum eigene Renders statt gekaufter Bilder:

Gekaufte Hintergruende sind fremdes Material, und ein Haendler, der damit
auf mobile.de inseriert, haengt an einer Lizenz, die nicht uns gehoert.
Ein Render aus dieser Datei gehoert uns vollstaendig.

Der zweite Grund ist wichtiger und faellt erst beim Zusammensetzen auf:
Bei einem gekauften Bild muss der Kompositor raten, wo die Bodenebene
liegt und wie gross ein 4,80 m langes Auto an dieser Stelle sein muesste.
Hier wissen wir es — Kamerahoehe, Brennweite und Abstand stehen unten als
Zahlen. Die Datei schreibt sie neben das Bild in eine .json, damit der
Kompositor sie lesen kann statt zu schaetzen.
"""

import bpy
import json
import math
import sys
import os
from mathutils import Vector

# ── Kamera ─────────────────────────────────────────────────────────────
# Diese vier Zahlen bestimmen, wie das Auto spaeter sitzt. Sie sind
# bewusst Konstanten und keine Parameter: Alle Raeume muessen dieselbe
# Kamera haben, sonst springt das Auto beim Hintergrundwechsel.
KAMERA_POS   = Vector((0.0, -9.0, 1.55))   # Meter, Augenhoehe leicht erhoeht
KAMERA_ZIEL  = Vector((0.0,  0.5, 0.55))   # knapp ueber Bodenhoehe
BRENNWEITE   = 55.0                        # mm, Kleinbild
BREITE, HOEHE = 1920, 1280                 # 3:2, wie die Inserate


def leeren():
    """Startszene ausraeumen. Blender startet mit Wuerfel, Licht, Kamera."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


TEXTUREN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'texturen')


def material(name, farbe, rauheit, satz=None, kachel_m=2.0):
    """
    Ein Oberflaechenmaterial, wahlweise mit fotografiertem Material.

    `satz` ist der Ordnername unter tools/texturen — ein Satz von
    ambientCG mit Color, Roughness und NormalGL. `kachel_m` sagt, wie
    viele Meter eine Kachel breit ist; 2,0 heisst, das Foto wiederholt
    sich alle zwei Meter.

    Ohne `satz` bleibt die Flaeche einfarbig. Das war der erste Versuch
    und sah sofort nach Computer aus: eine Wand ohne Struktur gibt es in
    der Wirklichkeit nicht, und das Auge merkt das, bevor der Verstand
    sagen kann warum. Ein Rauschmuster half auch nicht — bei 1920 Pixeln
    auf 12 Meter Wand verschwindet es einfach.

    `farbe` bleibt trotzdem wirksam: Sie wird ueber das Foto multipliziert.
    So gibt derselbe Putz eine weisse, eine graue und eine anthrazitfarbene
    Wand, ohne dass ich drei Fotos brauche.
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rauheit

    ordner = os.path.join(TEXTUREN, satz) if satz else None
    if not ordner or not os.path.isdir(ordner):
        bsdf.inputs["Base Color"].default_value = (*farbe, 1.0)
        return mat

    def karte(endung, farbraum):
        treffer = [f for f in os.listdir(ordner) if f.endswith(endung)]
        if not treffer:
            return None
        knoten = nt.nodes.new("ShaderNodeTexImage")
        knoten.image = bpy.data.images.load(os.path.join(ordner, treffer[0]))
        knoten.image.colorspace_settings.name = farbraum
        knoten.extension = 'REPEAT'
        nt.links.new(abbildung.outputs["Vector"], knoten.inputs["Vector"])
        return knoten

    # Objektkoordinaten, nicht UV: Die Ebenen sind 40 m gross und haben
    # nur eine UV-Kachel darauf. Ueber Objektkoordinaten entspricht eine
    # Einheit einem Meter, und die Kachelgroesse wird eine echte Laenge.
    koord = nt.nodes.new("ShaderNodeTexCoord")
    abbildung = nt.nodes.new("ShaderNodeMapping")
    abbildung.inputs["Scale"].default_value = (1 / kachel_m, 1 / kachel_m, 1 / kachel_m)
    nt.links.new(koord.outputs["Object"], abbildung.inputs["Vector"])

    farb = karte("_Color.jpg", 'sRGB')
    if farb:
        tint = nt.nodes.new("ShaderNodeMixRGB")
        tint.blend_type = 'MULTIPLY'
        tint.inputs["Fac"].default_value = 1.0
        nt.links.new(farb.outputs["Color"], tint.inputs["Color1"])
        tint.inputs["Color2"].default_value = (*farbe, 1.0)
        nt.links.new(tint.outputs["Color"], bsdf.inputs["Base Color"])

    rau = karte("_Roughness.jpg", 'Non-Color')
    if rau:
        nt.links.new(rau.outputs["Color"], bsdf.inputs["Roughness"])

    norm = karte("_NormalGL.jpg", 'Non-Color')
    if norm:
        nk = nt.nodes.new("ShaderNodeNormalMap")
        nk.inputs["Strength"].default_value = 1.0
        nt.links.new(norm.outputs["Color"], nk.inputs["Color"])
        nt.links.new(nk.outputs["Normal"], bsdf.inputs["Normal"])

    return mat


def flaeche(name, groesse, ort, drehung, mat):
    bpy.ops.mesh.primitive_plane_add(size=groesse, location=ort, rotation=drehung)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    return ob


def hohlkehle(mat, radius=2.2, tiefe=20.0, hoehe=10.0, halbbreite=20.0):
    """
    Boden, der ohne Kante in die Wand uebergeht — die Hohlkehle.

    Das ist der Aufbau, in dem Hersteller ihre Fahrzeuge fotografieren:
    Ohne Fussleiste und ohne Fuge hat der Blick nichts, woran er haengen
    bleibt, und das Auto steht scheinbar im Nichts. Genau deshalb ist es
    auch die schwierigere Bauart — ein falscher Schatten faellt hier
    sofort auf, weil es keine Kante gibt, die ihn erklaeren koennte.

    Gebaut wird ein Profil aus Boden, Viertelkreis und Wand, das entlang
    der Bildbreite gezogen wird. Blenders Grundkoerper geben so etwas
    nicht her, deshalb die Punkte von Hand.
    """
    profil = [(-tiefe, 0.0)]
    ecken = 12
    for i in range(ecken + 1):
        a = math.radians(90.0 * i / ecken)
        profil.append((radius * math.sin(a), radius * (1.0 - math.cos(a))))
    profil.append((radius, hoehe))

    punkte, flaechen = [], []
    for y, z in profil:
        punkte.append((-halbbreite, y, z))
        punkte.append(( halbbreite, y, z))
    for i in range(len(profil) - 1):
        a = i * 2
        flaechen.append((a, a + 1, a + 3, a + 2))

    netz = bpy.data.meshes.new("Kehle")
    netz.from_pydata(punkte, [], flaechen)
    netz.update()
    # Ohne weiche Schattierung waeren die zwoelf Segmente des Viertelkreises
    # als Facetten zu sehen, und die Kehle saehe aus wie gefaltetes Blech.
    for p in netz.polygons:
        p.use_smooth = True

    ob = bpy.data.objects.new("Hohlkehle", netz)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def hallentore(mat_tor, mat_rahmen):
    """
    Zwei Sektionaltore in der Rueckwand, dazu ein Stahlstuetze davor.

    Eine reine Putzwand ist ruhig, aber austauschbar. Ein Haendler, der
    seine Halle zeigen will, braucht etwas, das nach Werkstatt aussieht —
    ohne dass es vom Fahrzeug ablenkt. Deshalb dunkle, flache Tore ohne
    Beschriftung: erkennbar als Halle, aber ohne eigenes Motiv.
    """
    for x in (-6.2, 6.2):
        bpy.ops.mesh.primitive_cube_add(location=(x, 5.93, 1.9))
        tor = bpy.context.active_object
        tor.scale = (2.3, 0.04, 1.9)
        tor.data.materials.append(mat_tor)

        bpy.ops.mesh.primitive_cube_add(location=(x, 5.88, 3.86))
        sturz = bpy.context.active_object
        sturz.scale = (2.45, 0.06, 0.09)
        sturz.data.materials.append(mat_rahmen)


def raum(wandfarbe, bodenfarbe, sockel, wandsatz, bodensatz, bauart='ecke'):
    """
    Boden, Rueckwand, Seitenwand rechts, dunkler Sockel.

    Die Seitenwand steht rechts und nicht mittig — eine Ecke genau hinter
    dem Auto teilt das Bild in zwei Haelften und zieht den Blick weg vom
    Fahrzeug. Rechts aussen gibt sie dem Raum Tiefe, ohne zu stoeren.
    """
    m_wand  = material("Wand",  wandfarbe,  0.85, wandsatz,  kachel_m=2.5)
    m_boden = material("Boden", bodenfarbe, 0.55, bodensatz, kachel_m=3.0)
    m_sock  = material("Sockel", sockel,    0.40)

    if bauart == 'kehle':
        # Eine Hohlkehle hat weder Ecke noch Sockelleiste — das ist ihr
        # ganzer Sinn. Boden und Wand sind ein Stueck; deshalb bekommt sie
        # auch das Bodenmaterial, nicht zwei verschiedene.
        hohlkehle(m_boden)
        return

    flaeche("Boden", 40, (0, 0, 0), (0, 0, 0), m_boden)
    flaeche("Rueckwand", 40, (0, 6.0, 0), (math.radians(90), 0, 0), m_wand)

    sockelkanten = [((0, 5.97, 0.055), (20, 0.06, 0.055))]

    if bauart == 'halle':
        # Keine Seitenwand: Die Tore brauchen die volle Breite, und eine
        # Ecke daneben macht das Bild unruhig.
        hallentore(material("Tor", (0.055, 0.058, 0.062), 0.55),
                   material("Rahmen", (0.10, 0.10, 0.11), 0.35))
    else:
        # Die Ecke stand zuerst bei x=4,2 und lag damit fast ausserhalb
        # des Bildes — der Raum wirkte wie eine einzelne Wand ohne Tiefe.
        flaeche("Seitenwand", 40, (3.2, 0, 0), (0, math.radians(90), 0), m_wand)
        sockelkanten.append(((3.17, 0, 0.055), (0.06, 20, 0.055)))

    # Sockelleiste: flache Quader entlang der Wandfuesse.
    for ort, mass in sockelkanten:
        bpy.ops.mesh.primitive_cube_add(location=ort)
        ob = bpy.context.active_object
        ob.scale = mass
        ob.data.materials.append(m_sock)


def licht():
    """
    Drei weiche Quellen von oben — wie eine Halle mit Deckenfeldern.
    Keine harten Schatten: Der Schatten des Autos kommt spaeter aus dem
    Kompositor, und zwei sich widersprechende Schattenrichtungen sind
    das Erste, was einem Betrachter auffaellt.
    """
    # Die Werte standen zuerst bei 900 bis 1100 W. Das Ergebnis war ein
    # vollstaendig weisses Bild — bei einer 6x4-m-Flaeche in 7 m Hoehe
    # kommt davon so viel an, dass Wand und Boden beide ins Ausbrennen
    # laufen und der Raum verschwindet.
    for x, y, kraft in ((-6, -2, 220), (0, 2, 260), (6, -2, 220)):
        bpy.ops.object.light_add(type='AREA', location=(x, y, 7.0))
        l = bpy.context.active_object.data
        l.shape = 'RECTANGLE'
        l.size, l.size_y = 6.0, 4.0
        l.energy = kraft

    welt = bpy.data.worlds.new("Welt")
    welt.use_nodes = True
    welt.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.56, 0.58, 1)
    welt.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    bpy.context.scene.world = welt


def kamera():
    bpy.ops.object.camera_add(location=KAMERA_POS)
    cam = bpy.context.active_object
    cam.data.lens = BRENNWEITE
    richtung = KAMERA_ZIEL - KAMERA_POS
    cam.rotation_euler = richtung.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    return cam


def rendern(ziel, proben, maschine):
    """
    `maschine` ist 'cycles' oder 'eevee'.

    Cycles rechnet Licht physikalisch und braucht auf der CPU fuer diesen
    Raum knapp acht Minuten. Fuer den Endstand ist das richtig — die
    Bilder entstehen einmal und liegen dann als Datei da. Zum Ausprobieren
    ist es unbrauchbar, deshalb EEVEE als schneller Zweitweg.
    """
    s = bpy.context.scene

    if maschine == 'eevee':
        s.render.engine = next(
            e for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE')
            if e in [i.identifier for i in
                     s.render.bl_rna.properties['engine'].enum_items]
        )
    else:
        s.render.engine = 'CYCLES'
        # CPU, nicht GPU: Der Renderknecht laeuft spaeter vielleicht auf
        # einem Server ohne Grafikkarte.
        s.cycles.device = 'CPU'
        s.cycles.samples = proben
        s.cycles.use_denoising = True
    s.render.resolution_x, s.render.resolution_y = BREITE, HOEHE
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = 'JPEG'
    s.render.image_settings.quality = 92
    s.render.filepath = ziel

    # Farbkurve. 'Standard' schneidet helle Stellen hart ab — eine
    # angeleuchtete weisse Wand wird dann zu einer Flaeche ohne jede
    # Struktur. AgX rollt die Lichter weich aus und laesst den Putz
    # sichtbar. Blender 5 kennt Filmic nicht mehr, deshalb die Kette.
    moeglich = [v.identifier for v in
                s.view_settings.bl_rna.properties['view_transform'].enum_items]
    for wunsch in ('AgX', 'Filmic', 'Standard'):
        if wunsch in moeglich:
            s.view_settings.view_transform = wunsch
            break

    bpy.ops.render.render(write_still=True)


def horizont_in_prozent(cam, bauart='ecke'):
    """
    Wo die Bodenkante der Rueckwand im fertigen Bild liegt, 0 bis 1.

    Diese Zahl ist der ganze Grund, warum wir selbst rendern. Der
    Kompositor stellt das Auto darauf ab; schaetzt er sie falsch,
    schwebt das Fahrzeug oder steckt im Boden.
    """
    from bpy_extras.object_utils import world_to_camera_view
    # Bei der Hohlkehle gibt es keine Wandkante. Massgeblich ist dort der
    # Punkt, an dem der Boden zu steigen beginnt — weiter hinten kann kein
    # Fahrzeug mehr stehen.
    y = 0.0 if bauart == 'kehle' else 6.0
    p = world_to_camera_view(bpy.context.scene, cam, Vector((0.0, y, 0.0)))
    return round(1.0 - p.y, 4)   # Blender zaehlt von unten, Bilder von oben


def hexfarbe(s):
    s = s.lstrip('#')
    r, g, b = (int(s[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    # sRGB → linear, sonst kommt jede Farbe zu hell heraus.
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opt = {}
    for i in range(0, len(argv) - 1, 2):
        opt[argv[i].lstrip('-')] = argv[i + 1]

    ziel   = opt.get('ziel', 'raum.jpg')
    wand   = hexfarbe(opt.get('wand', 'EDEDEF'))
    boden  = hexfarbe(opt.get('boden', '9A9791'))
    sockel = hexfarbe(opt.get('sockel', '141414'))
    proben = int(opt.get('proben', '48'))
    glanz  = float(opt.get('glanz', '0.08'))

    leeren()
    raum(wand, boden, sockel,
         opt.get('wandsatz', 'PaintedPlaster017_1K-JPG'),
         opt.get('bodensatz', 'Concrete046_1K-JPG'),
         opt.get('bauart', 'ecke'))
    licht()
    cam = kamera()
    rendern(ziel, proben, opt.get('maschine', 'cycles'))

    daten = {
        'kameraHoehe': KAMERA_POS.z,
        'brennweite': BRENNWEITE,
        'horizont': horizont_in_prozent(cam, opt.get('bauart', 'ecke')),
        'bauart': opt.get('bauart', 'ecke'),
        'breite': BREITE, 'hoehe': HOEHE,
        # Wie stark sich das Fahrzeug in diesem Boden spiegeln soll.
        #
        # Das gehoert zum Raum und nicht zum Kompositor: Polierter Beton
        # spiegelt, matter Estrich kaum, Asphalt gar nicht. Im Urus-Test
        # stand fest 0,22 im Kompositor, und der matte Beton sah damit
        # aus wie nass — das war das Einzige, woran man dem Bild ansah,
        # dass es gebaut ist.
        'bodenglanz': glanz,
    }
    with open(os.path.splitext(ziel)[0] + '.json', 'w', encoding='utf-8') as f:
        json.dump(daten, f, indent=2)
    print("[raum_render] fertig:", ziel, daten)


main()
