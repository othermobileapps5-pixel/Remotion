# glasskit — Blender 4.2 LTS uchun shisha 3D asboblari (bpy). Har bir blender/<nom>.py shuni import qiladi.
# Ishga tushirish: blender -b -P blender/<nom>.py -- --out out/frames [--start 1 --end 150 --samples 20 --still 75]
# Qoida: har kadr holati faqat vaqtdan (t) — pose(f) funksiyasi, keyin bake() kalit kadrlarni yozadi.
import argparse
import math
import os
import random
import sys

import bpy

# ---------------------------------------------------------------- argumentlar
def args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="out/frames")
    p.add_argument("--start", type=int, default=0)
    p.add_argument("--end", type=int, default=0)
    p.add_argument("--samples", type=int, default=20)
    p.add_argument("--still", type=int, default=0, help="faqat shu kadrni PNG qilib chiqarish")
    p.add_argument("--stills", default="", help="vergul bilan kadrlar: sinov uchun (masalan 1,40,80)")
    p.add_argument("--part", default="", help="bo'lak: 2/4 — kadrlar oralig'ining 2-choragi")
    p.add_argument("--scale", type=int, default=100, help="o'lcham foizi (sinov uchun 50)")
    p.add_argument("--info", action="store_true", help="faqat kadrlar sonini chiqarish (KADRLAR n)")
    return p.parse_args(argv)


# ---------------------------------------------------------------- sahna
FORMATLAR = {"shorts": (1080, 1920), "square": (1080, 1080), "wide": (1920, 1080), "portrait45": (1080, 1350)}


def scene_setup(fmt="shorts", fps=30, seconds=10, samples=20):
    # bo'sh sahna
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    w, h = FORMATLAR[fmt]
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 1, int(round(fps * seconds))
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.max_bounces = 10
    sc.cycles.transmission_bounces = 10
    sc.cycles.glossy_bounces = 6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Punchy"
    except Exception:
        pass
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.film_transparent = False
    if sc.world is None:
        sc.world = bpy.data.worlds.new("World")
    return sc


def world_dark(color=(0.008, 0.009, 0.011), strength=1.0):
    w = bpy.context.scene.world
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background") or w.node_tree.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (*color, 1)
    bg.inputs["Strength"].default_value = strength
    return bg


# ---------------------------------------------------------------- materiallar
def _hex(c):
    if isinstance(c, str):
        c = c.lstrip("#")
        rgb = [int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        return tuple(x ** 2.2 for x in rgb)  # sRGB → chiziqli
    return tuple(c[:3])


def material(kind="smoked", color=None):
    """smoked | rim | crystal | frosted | colored | neon | metal_glass"""
    m = bpy.data.materials.new(f"{kind}")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    s = lambda k, v: b.inputs[k].__setattr__("default_value", v) if k in b.inputs else None
    col = _hex(color) if color is not None else None
    preset = {
        "smoked": dict(base=(0.03, 0.035, 0.04), rough=0.08, trans=0.92, ior=1.5, coat=0.6),
        "rim": dict(base=(0.06, 0.07, 0.08), rough=0.05, trans=0.85, ior=1.5, coat=1.0),
        "crystal": dict(base=(0.95, 0.97, 1.0), rough=0.02, trans=1.0, ior=1.52, coat=0.3),
        "frosted": dict(base=(0.85, 0.9, 0.95), rough=0.22, trans=0.95, ior=1.45, coat=0.2),
        "colored": dict(base=col or (0.05, 0.4, 0.02), rough=0.06, trans=0.9, ior=1.48, coat=0.5),
        "neon": dict(base=tuple(c * 0.55 for c in col) if col else (0.03, 0.35, 0.01), rough=0.1, trans=0.6, ior=1.45, coat=0.2),
        "metal_glass": dict(base=(0.6, 0.62, 0.65), rough=0.12, trans=0.5, ior=1.5, coat=0.8, metal=0.5),
    }[kind]
    s("Base Color", (*preset["base"], 1))
    s("Roughness", preset["rough"])
    s("Transmission Weight", preset["trans"])
    s("IOR", preset["ior"])
    s("Coat Weight", preset["coat"])
    s("Coat Roughness", 0.03)
    s("Metallic", preset.get("metal", 0.0))
    if kind == "neon":
        s("Emission Color", (*(col or preset["base"]), 1))
        s("Emission Strength", 1.2)
    return m, b


def emission(color, strength=5.0):
    m = bpy.data.materials.new("emit")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*_hex(color), 1)
    e.inputs["Strength"].default_value = strength
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs[0], o.inputs[0])
    return m, e


def floor(color=(0.01, 0.011, 0.013), z=-1.2, rough=0.25):
    """aks beradigan qora pol"""
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, z))
    o = bpy.context.object
    m = bpy.data.materials.new("floor")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    o.data.materials.append(m)
    return o


# ---------------------------------------------------------------- obyektlar
def _link(o, parent=None):
    if parent is not None:
        o.parent = parent
    return o


def empty(name="Empty", loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return o


def _smooth(o, bevel=0.0, segments=6):
    if bevel > 0:
        md = o.modifiers.new("Bevel", "BEVEL")
        md.width = bevel
        md.segments = segments
        md.limit_method = "ANGLE"
    for p in getattr(o.data, "polygons", []):
        p.use_smooth = True
    return o


def rounded_slab(name, w, h, t, radius, mat, z=0.0, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, z))
    o = bpy.context.object
    o.name = name
    o.scale = (w, t, h)
    bpy.ops.object.transform_apply(scale=True)
    _smooth(o, bevel=min(radius, t / 2.05, w / 2.05, h / 2.05), segments=8)
    o.data.materials.append(mat)
    return _link(o, parent)


def blob(name, size, mat, loc=(0, 0, 0), rot_z=0.0, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler[2] = rot_z
    _smooth(o)
    o.data.materials.append(mat)
    return _link(o, parent)


SHAPES = ["sphere", "cube", "torus", "cylinder", "capsule", "cone", "star", "heart", "pill", "diamond"]


def shape(kind, mat, size=1.0, loc=(0, 0, 0), parent=None):
    s = size
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(radius=s, segments=64, ring_count=32, location=loc)
    elif kind == "cube":
        bpy.ops.mesh.primitive_cube_add(size=s * 1.6, location=loc)
        _smooth(bpy.context.object, bevel=s * 0.18)
    elif kind == "torus":
        bpy.ops.mesh.primitive_torus_add(major_radius=s, minor_radius=s * 0.35, major_segments=96, minor_segments=32, location=loc)
    elif kind == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(radius=s * 0.8, depth=s * 1.6, vertices=96, location=loc)
        _smooth(bpy.context.object, bevel=s * 0.12)
    elif kind in ("capsule", "pill"):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=s * 0.6, segments=64, ring_count=32, location=loc)
        o = bpy.context.object
        o.scale = (1, 1, 1.8) if kind == "capsule" else (1.9, 1, 1)
        bpy.ops.object.transform_apply(scale=True)
    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(radius1=s * 0.9, depth=s * 1.8, vertices=96, location=loc)
        _smooth(bpy.context.object, bevel=s * 0.08)
    elif kind == "diamond":
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=s, depth=s * 1.4, location=loc)
        o = bpy.context.object
        o.rotation_euler[0] = math.pi
        _smooth(o, bevel=s * 0.03, segments=2)
    elif kind in ("star", "heart"):
        o = _profile_extrude(kind, s, loc)
    else:
        raise ValueError(f"noma'lum shakl: {kind}")
    o = bpy.context.object
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.materials.append(mat)
    return _link(o, parent)


def _profile_extrude(kind, s, loc):
    import bmesh
    pts = []
    if kind == "star":
        for i in range(10):
            r = s if i % 2 == 0 else s * 0.45
            a = math.pi / 2 + i * math.pi / 5
            pts.append((r * math.cos(a), r * math.sin(a)))
    else:
        for i in range(80):
            t = i / 80 * 2 * math.pi
            x = 16 * math.sin(t) ** 3
            y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
            pts.append((x * s / 17, y * s / 17))
    me = bpy.data.meshes.new(kind)
    bm = bmesh.new()
    vs = [bm.verts.new((x, 0, y)) for x, y in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.y += s * 0.4
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(kind, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = (loc[0], loc[1] - s * 0.2, loc[2])
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    _smooth(o, bevel=s * 0.06, segments=6)
    return o


def glass_text(text, mat, size=1.5, depth=0.25, font_path="", bevel=0.04, loc=(0, 0, 0), parent=None):
    cu = bpy.data.curves.new("txt", type="FONT")
    cu.body = text
    cu.size = size
    cu.extrude = depth / 2
    cu.bevel_depth = bevel
    cu.bevel_resolution = 6
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    if font_path and os.path.exists(font_path):
        cu.font = bpy.data.fonts.load(font_path)
    o = bpy.data.objects.new(text, cu)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler[0] = math.pi / 2  # kameraga qaraydi (−Y tomondan)
    o.data.materials.append(mat)
    return _link(o, parent)


def svg_logo(path, mat, width=2.5, depth=0.2, parent=None):
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=path)
    curves = [o for o in bpy.data.objects if o not in before and o.type == "CURVE"]
    root = empty("Logo")
    for c in curves:
        c.data.extrude = depth / 2
        c.data.bevel_depth = depth * 0.15
        c.data.materials.clear()
        c.data.materials.append(mat)
        c.parent = root
    # o'lchamni moslash
    xs = [v[0] for c in curves for v in c.bound_box]
    k = width / max(1e-6, (max(xs) - min(xs))) if xs else 1
    root.scale = (k, k, k)
    root.rotation_euler[0] = math.pi / 2
    return _link(root, parent)


def import_model(path, parent=None):
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        raise ValueError(f"model formati: {ext}")
    new = [o for o in bpy.data.objects if o not in before]
    root = empty("Model")
    for o in new:
        if o.parent is None:
            o.parent = root
    return _link(root, parent)


def glassify(root, mat, bevel=0.0):
    """root ostidagi hamma mesh/curve'ni shu materialga o'tkazadi"""
    stack = [root]
    while stack:
        o = stack.pop()
        stack.extend(o.children)
        if o.type in ("MESH", "CURVE", "FONT"):
            o.data.materials.clear()
            o.data.materials.append(mat)
            if bevel and o.type == "MESH":
                _smooth(o, bevel=bevel)
    return root


def particles(n=60, color="#39FF14", spread=(6, 4, 8), size=0.025, seed=7):
    rnd = random.Random(seed)
    m, _ = emission(color, 6)
    root = empty("Dust")
    dust = []
    for i in range(n):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=size * rnd.uniform(0.5, 1.4))
        o = bpy.context.object
        o.data.materials.append(m)
        base = (rnd.uniform(-1, 1) * spread[0], rnd.uniform(-0.5, 1) * spread[1], rnd.uniform(-1, 1) * spread[2] / 2)
        o["base"] = base
        o["ph"] = rnd.uniform(0, 6.28)
        o.parent = root
        o.location = base
        dust.append(o)
    return root, dust


# ---------------------------------------------------------------- kamera va yorug'lik
def camera(target, lens=55, loc=(0, -9, 0.6)):
    cd = bpy.data.cameras.new("Cam")
    cd.lens = lens
    cam = bpy.data.objects.new("Cam", cd)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    c = cam.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    bpy.context.scene.camera = cam
    return cam


def area(name, loc, energy, color=(1, 1, 1), size=3.0, target=None):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.color = color
    ld.size = size
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if target is not None:
        c = o.constraints.new("TRACK_TO")
        c.target = target
        c.track_axis = "TRACK_NEGATIVE_Z"
        c.up_axis = "UP_Y"
    return o


def studio(target, preset="neon_green", accent=None):
    acc = _hex(accent) if accent is not None else {"neon_green": (0.2, 1.0, 0.1), "cool": (0.3, 0.6, 1.0), "warm": (1.0, 0.55, 0.2)}[preset]
    key = area("Key", (-4, -5, 4), 900, (1, 0.98, 0.95), 4, target)
    rim1 = area("RimL", (-5, 3, 1.5), 700, acc, 2.5, target)
    rim2 = area("RimR", (5, 3, 1.5), 700, acc, 2.5, target)
    top = area("Top", (0, 0, 7), 400, (0.9, 0.95, 1), 6, target)
    return key, rim1, rim2, top


def light_sweep(target, energy=1500):
    o = area("Sweep", (-8, -3, 2), 0, (1, 1, 1), 0.6, target)
    o.data.shape = "RECTANGLE"
    o.data.size, o.data.size_y = 0.25, 6
    return o, o.data


# ---------------------------------------------------------------- harakat (faqat t dan)
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def window(t, a, b):
    return clamp((t - a) / max(1e-6, b - a))


def reveal(t, a, dur=1.0):
    """(k, dz, scale): k 0→1, pastdan ko'tarilish, kattalashish"""
    k = ease_out(window(t, a, a + dur))
    return k, (1 - k) * -1.2, 0.6 + 0.4 * k


def turntable(t, a=0.0, b=None, turns=1.0):
    if b is None:
        return t * 2 * math.pi * turns / 6.0
    return ease(window(t, a, b)) * 2 * math.pi * turns


def float_z(t, amp=0.08, period=3.0):
    return amp * math.sin(2 * math.pi * t / period)


def orbit(t, dist=9.0, speed=0.08, height=0.6):
    a = -math.pi / 2 + math.sin(t * speed * 2 * math.pi) * 0.35
    return (dist * math.cos(a), dist * math.sin(a), height)


def sweep_at(sweep, sd, t, a, dur=1.2, energy=1500):
    k = window(t, a, a + dur)
    sweep.location = (-8 + 16 * ease(k), -3, 2)
    sd.energy = energy * math.sin(math.pi * k) if 0 < k < 1 else 0


def pulse(t, a, dur=0.5):
    k = window(t, a, a + dur)
    return 1 + 0.12 * math.sin(math.pi * k)


def float_particles(dust, t):
    for o in dust:
        bx, by, bz = o["base"]
        ph = o["ph"]
        o.location = (bx + 0.15 * math.sin(t * 0.7 + ph), by, bz + ((t * 0.25 + ph) % 3.0) - 1.5)


# ---------------------------------------------------------------- bake va render
def bake(pose, objs_loc=(), objs_rot=(), objs_scale=(), sockets=(), lights=(), cams=()):
    """pose(f) har kadr uchun holatni o'rnatadi; bu yerda kalit kadrlar yoziladi (render deterministik)"""
    sc = bpy.context.scene
    for f in range(sc.frame_start, sc.frame_end + 1):
        pose(f)
        for o in objs_loc:
            o.keyframe_insert("location", frame=f)
        for o in objs_rot:
            o.keyframe_insert("rotation_euler", frame=f)
        for o in objs_scale:
            o.keyframe_insert("scale", frame=f)
        for s in sockets:
            s.keyframe_insert("default_value", frame=f)
        for ld in lights:
            ld.keyframe_insert("energy", frame=f)
        for c in cams:
            c.keyframe_insert("location", frame=f)
    # kalitlar orasida sakrash bo'lmasin
    for o in list(objs_loc) + list(objs_rot) + list(objs_scale) + list(cams):
        ad = o.animation_data
        if ad and ad.action:
            for fc in ad.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"


def render(a):
    sc = bpy.context.scene
    print("KADRLAR", sc.frame_end, flush=True)
    if a.info:
        return
    sc.render.resolution_percentage = a.scale
    sc.cycles.samples = a.samples
    os.makedirs(a.out, exist_ok=True)
    if a.stills or a.still:
        kadrlar = [int(x) for x in a.stills.split(",") if x.strip()] if a.stills else [a.still]
        for f in kadrlar:
            sc.frame_set(f)
            sc.render.filepath = os.path.join(os.path.abspath(a.out), f"{f:04d}.png")
            bpy.ops.render.render(write_still=True)
        return
    s, e = sc.frame_start, sc.frame_end
    if a.part:
        i, n = (int(x) for x in a.part.split("/"))
        total = e - s + 1
        step = math.ceil(total / n)
        s, e = s + (i - 1) * step, min(e, s + i * step - 1)
    if a.start:
        s = a.start
    if a.end:
        e = a.end
    sc.frame_start, sc.frame_end = s, e
    sc.render.filepath = os.path.join(os.path.abspath(a.out), "")
    bpy.ops.render.render(animation=True)
