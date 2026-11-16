# glasskit — premium glassmorphism 3D uchun umumiy asboblar (Blender 4.2 LTS, bpy).
# Reklama va Shorts: format, shisha materiallar, yumaloq plitka, 3D matn, SVG logo, model import,
# studiya yorug'ligi, kamera, harakat shablonlari (paydo bo'lish, aylanish, suzish, orbit, puls),
# porlovchi zarralar va bo'laklab render. Har bir video skripti shu faylni import qiladi:
#   import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import glasskit as gk
import bpy, bmesh, math, os, sys, argparse

FORMATS = {"shorts": (1080, 1920), "square": (1080, 1080), "wide": (1920, 1080), "portrait45": (1080, 1350)}


# ---------------- argumentlar va sahna ----------------
def args():
    """--start/--end (bo'lak), --out, --samples, --still (bitta kadr sinovi)"""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=0)
    ap.add_argument("--out", default="out/frames")
    ap.add_argument("--samples", type=int, default=20)
    ap.add_argument("--still", type=int, default=0)
    ap.add_argument("--part", type=int, default=0, help="sinov: 4 bo'lakdan qaysi biri (1-4) — o'rtasidagi bitta kadr")
    return ap.parse_args(argv)


def scene_setup(fmt="shorts", fps=30, seconds=20, samples=20, look="AgX - Punchy"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    sc.cycles.max_bounces = 10
    sc.cycles.transmission_bounces = 10
    sc.cycles.glossy_bounces = 6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.render.use_persistent_data = True
    sc.render.resolution_x, sc.render.resolution_y = FORMATS[fmt]
    sc.render.resolution_percentage = 100
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 1, int(fps * seconds)
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = look
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    return sc


def world_dark(color=(0.004, 0.004, 0.006), strength=0.2):
    w = bpy.data.worlds.new("Dark Studio")
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*color, 1)
    bg.inputs["Strength"].default_value = strength
    return w


# ---------------- materiallar ----------------
def _bsdf(name, color, rough, metallic=0.0, transmission=0.0, ior=1.5, coat=0.0, emission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Emission Color"].default_value = (*color, 1)
    b.inputs["Emission Strength"].default_value = emission
    return m


def material(kind="smoked", color=None, name=None):
    """kind: smoked | crystal | frosted | colored | neon | metal_glass | rim. color — (r, g, b) chiziqli 0..1.
    Natija: (material, Principled BSDF) — BSDF puls/rang animatsiyasi uchun."""
    c = color
    presets = {
        "smoked": dict(color=c or (0.07, 0.075, 0.09), rough=0.1, metallic=0.1, transmission=0.85, ior=1.48, coat=0.6),
        "rim": dict(color=c or (0.12, 0.125, 0.14), rough=0.16, metallic=0.2, transmission=0.6, ior=1.5, coat=0.8),
        "crystal": dict(color=c or (0.95, 0.97, 1.0), rough=0.05, transmission=1.0, ior=1.5, coat=0.3),
        "frosted": dict(color=c or (0.85, 0.88, 0.92), rough=0.22, transmission=0.95, ior=1.47, coat=0.2),
        "colored": dict(color=c or (0.2, 0.62, 0.0), rough=0.14, metallic=0.05, transmission=0.3, ior=1.47, coat=0.4, emission=0.12),
        "neon": dict(color=c or (0.2, 0.9, 0.05), rough=0.15, transmission=0.7, ior=1.45, coat=0.5, emission=2.5),
        "metal_glass": dict(color=c or (0.6, 0.62, 0.66), rough=0.08, metallic=0.7, transmission=0.4, ior=1.52, coat=1.0),
    }
    p = presets[kind]
    m = _bsdf(name or f"{kind}", p["color"], p["rough"], p.get("metallic", 0), p.get("transmission", 0), p.get("ior", 1.5), p.get("coat", 0), p.get("emission", 0))
    return m, m.node_tree.nodes["Principled BSDF"]


# ---------------- obyektlar ----------------
def _link(ob, parent=None):
    bpy.context.scene.collection.objects.link(ob)
    if parent: ob.parent = parent
    return ob


def empty(name="Rig", parent=None):
    return _link(bpy.data.objects.new(name, None), parent)


def rounded_slab(name, w, h, t, r, mat, z=0.0, parent=None, edge=0.09):
    """Burchaklari yumaloq qalin shisha plitka (ikonka, karta, tugma)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, t), verts=bm.verts)
    vert = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-4]
    bmesh.ops.bevel(bm, geom=vert, offset=min(r, w / 2 - 1e-3, h / 2 - 1e-3), segments=16, affect='EDGES', profile=0.5)
    bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me), parent)
    ob.location.z = z
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    bev = ob.modifiers.new("Soft Edge", 'BEVEL'); bev.width = min(edge, t * 0.45); bev.segments = 6
    ob.modifiers.new("Weighted Normals", 'WEIGHTED_NORMAL')
    return ob


def blob(name, scale, mat, loc=(0, 0, 0), rot_z=0.0, taper=0.38, parent=None):
    """Yaltiroq tomchi/yaproq shakli (ikonka elementlari, bezaklar)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=1.0)
    for v in bm.verts:
        v.co.x *= (1 - taper) + taper * (v.co.y + 1) / 2
    bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me), parent)
    ob.scale = scale; ob.rotation_euler = (0, 0, rot_z); ob.location = loc
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    ob.modifiers.new("Smooth", 'SUBSURF').levels = 1
    return ob


def glass_text(text, mat, size=1.0, depth=0.12, bevel=0.03, loc=(0, 0, 0), parent=None, font_path=None, align="CENTER"):
    """Qalin shisha 3D matn (sarlavha, narx, chaqiriq). Lotin harflari; o'zbekcha ʻ o'rniga ' ishlating."""
    cu = bpy.data.curves.new("Text", 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = depth
    cu.bevel_depth = bevel
    cu.bevel_resolution = 4
    cu.align_x = align; cu.align_y = 'CENTER'
    if font_path and os.path.exists(font_path):
        cu.font = bpy.data.fonts.load(font_path)
    ob = _link(bpy.data.objects.new("Text", cu), parent)
    ob.location = loc
    cu.materials.append(mat)
    return ob


def svg_logo(path, mat, width=2.5, depth=0.12, bevel=0.02, parent=None):
    """SVG logoni import qilib, qalinlik beradi va kenglikka moslaydi."""
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=path)
    parts = [o for o in bpy.data.objects if o not in before and o.type == 'CURVE']
    root = empty("Logo", parent)
    for o in parts:
        o.data.extrude = depth / 100; o.data.bevel_depth = bevel / 100
        o.data.materials.clear(); o.data.materials.append(mat)
        o.parent = root
    xs = [v[0] for o in parts for v in o.bound_box]
    if xs:
        s = width / max(1e-6, (max(xs) - min(xs)))
        root.scale = (s, s, s * 100)
    return root


def import_model(path, parent=None):
    """.glb/.gltf/.obj/.fbx mahsulot modelini import qiladi; ildiz bo'sh obyektni qaytaradi."""
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".glb", ".gltf"): bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".obj": bpy.ops.wm.obj_import(filepath=path)
    elif ext == ".fbx": bpy.ops.import_scene.fbx(filepath=path)
    root = empty("Model", parent)
    for o in bpy.data.objects:
        if o not in before and o.parent is None and o is not root: o.parent = root
    return root


def particles(n=60, area=(6, 10, 4), color=(0.3, 1.0, 0.1), strength=6.0, size=0.025, seed=1):
    """Porlovchi chang zarralari (fon chuqurligi uchun). Animatsiya: float_particles()."""
    import random
    random.seed(seed)
    m = _bsdf("Glow Dust", color, 0.5, emission=strength)
    root = empty("Particles")
    obs = []
    for i in range(n):
        me = bpy.data.meshes.new(f"p{i}")
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=size * (0.5 + random.random())); bm.to_mesh(me); bm.free()
        me.materials.append(m)
        o = _link(bpy.data.objects.new(f"p{i}", me), root)
        o.location = ((random.random() - 0.5) * area[0], (random.random() - 0.5) * area[1], -random.random() * area[2])
        o["ph"] = random.random() * math.tau
        o["base"] = tuple(o.location)
        obs.append(o)
    return root, obs


# ---------------- yorug'lik va kamera ----------------
LIGHT_PRESETS = {
    "neon_green": [("Top Softbox", (0, 3.5, 6), 900, (0.85, 1.0, 0.8), 4), ("Left Rim", (-5, 1, 3), 1100, (0.55, 0.8, 1.0), 3), ("Right Accent", (5, 1.5, 3), 1300, (0.5, 1.0, 0.25), 3)],
    "cool": [("Top Softbox", (0, 3.5, 6), 900, (0.85, 0.92, 1.0), 4), ("Left Rim", (-5, 1, 3), 1100, (0.5, 0.7, 1.0), 3), ("Right Accent", (5, 1.5, 3), 1200, (0.7, 0.5, 1.0), 3)],
    "warm": [("Top Softbox", (0, 3.5, 6), 900, (1.0, 0.92, 0.8), 4), ("Left Rim", (-5, 1, 3), 1000, (1.0, 0.7, 0.45), 3), ("Right Accent", (5, 1.5, 3), 1100, (1.0, 0.55, 0.3), 3)],
}


def area_light(name, loc, power, color, size, target):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = power; d.color = color; d.shape = 'DISK'; d.size = size
    o = _link(bpy.data.objects.new(name, d))
    o.location = loc
    c = o.constraints.new('TRACK_TO'); c.target = target; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return o, d


def studio(target, preset="neon_green", accent=None):
    """3 ta studiya chirog'i; accent — o'ng chiroq rangi (brend rangi)."""
    out = []
    for name, loc, p, col, size in LIGHT_PRESETS[preset]:
        out.append(area_light(name, loc, p, accent if (accent and name == "Right Accent") else col, size, target))
    return out


def light_sweep(target):
    """Ustidan o'tadigan yorug'lik chizig'i (reveal uchun). sweep_at() bilan animatsiya."""
    o, d = area_light("Light Sweep", (-7, -2, 4), 0, (1, 1, 1), 1.2, target)
    d.shape = 'RECTANGLE'; d.size = 0.4; d.size_y = 8
    return o, d


def camera(target, lens=60, fstop=4.0):
    cd = bpy.data.cameras.new("Camera"); cd.lens = lens
    cd.dof.use_dof = True; cd.dof.focus_object = target; cd.dof.aperture_fstop = fstop
    cam = _link(bpy.data.objects.new("Camera", cd))
    bpy.context.scene.camera = cam
    c = cam.constraints.new('TRACK_TO'); c.target = target; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return cam


# ---------------- harakat shablonlari (t — sekund) ----------------
def smooth(u):
    u = max(0.0, min(1.0, u)); return u * u * u * (u * (6 * u - 15) + 10)


def window(t, a, b):
    """a..b oralig'ida 0->1 silliq o'sish"""
    return smooth((t - a) / max(1e-6, b - a))


def reveal(t, a=0.0, dur=3.0):
    """paydo bo'lish: (k, z_siljish, masshtab) — qorong'idan suzib, kattalashib chiqadi"""
    k = window(t, a, a + dur)
    return k, -1.2 * (1 - k), 0.6 + 0.4 * k


def turntable(t, a, b, turns=1.0):
    """a..b orasida silliq aylanish burchagi (radian)"""
    return math.tau * turns * window(t, a, b)


def float_z(t, amp=0.08, speed=1.6):
    return amp * math.sin(t * speed)


def orbit(t, dist, swing_deg=28, speed=0.35, height=0.35):
    """kamera: old tomondan chapga-o'ngga sekin orbit (ob'ekt XY tekisligida, kamera +Z da)"""
    o = math.radians(swing_deg) * math.sin(t * speed)
    return (dist * math.sin(o), -dist * math.cos(o) * height, dist * math.cos(o))


def sweep_at(sweep, d, t, a=1.8, dur=2.0, power=1800):
    u = max(0.0, min(1.0, (t - a) / dur))
    sweep.location = (-7 + 14 * u, -2, 4)
    d.energy = power * math.sin(math.pi * u)


def pulse(t, a, base=0.15, peak=1.1, speed=5.0):
    return base + peak * window(t, a, a + 1.0) * (0.6 + 0.4 * math.sin((t - a) * speed))


def float_particles(obs, t, speed=0.25, amp=0.3):
    for o in obs:
        ph = o["ph"]
        bx, by, bz = o["base"]
        o.location = (bx + amp * math.sin(t * speed + ph), by + amp * 2 * math.sin(t * speed * 0.7 + ph * 1.3), bz)


def bake(pose, objs_loc=(), objs_rot=(), objs_scale=(), sockets=(), lights=()):
    """pose(f) har kadr uchun holatni hisoblaydi; bu yerda kalit kadrlarga yoziladi"""
    sc = bpy.context.scene
    for f in range(sc.frame_start, sc.frame_end + 1):
        pose(f)
        for o in objs_loc: o.keyframe_insert("location", frame=f)
        for o in objs_rot: o.keyframe_insert("rotation_euler", frame=f)
        for o in objs_scale: o.keyframe_insert("scale", frame=f)
        for s in sockets: s.keyframe_insert("default_value", frame=f)
        for d in lights: d.keyframe_insert("energy", frame=f)


# ---------------- render ----------------
def render(a):
    """a — args(): --still N bo'lsa bitta kadr; aks holda --start..--end (bo'lak) PNG ketma-ketlik"""
    sc = bpy.context.scene
    if a.still == -1:                    # workflow: kadrlar sonini so'raydi
        print(f"KADRLAR={sc.frame_end}", flush=True); return
    os.makedirs(a.out, exist_ok=True)
    end = a.end or sc.frame_end
    if a.part:
        frames = [max(1, round(sc.frame_end * (a.part - 0.5) / 4))]
    else:
        frames = [a.still] if a.still else range(a.start, end + 1)
    for f in frames:
        sc.frame_set(f)
        sc.render.filepath = os.path.join(os.path.abspath(a.out), f"f{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"✓ kadr {f}", flush=True)
