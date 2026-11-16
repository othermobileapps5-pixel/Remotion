# Shisha ikonka — 20 s vertikal reklama (1080x1920, 30 fps, 600 kadr). Blender 4.2 LTS, Cycles (CPU).
# Uslub: premium-glassmorphism-3d skill'i — qora fon, tutunli shisha, neon-yashil 4 ta yaproq, studiya yorug'ligi, AgX.
# Ishga tushirish: blender -b -P blender/shisha-ikonka.py -- --start 1 --end 600 --out out/frames [--samples 20]
# Sahna:   0-3 s  qorong'idan paydo bo'lish (yuqoriga suzib, kattalashib) + yorug'lik o'tishi
#          3-15 s sekin aylanish, suzish, kamera orbitasi
#          15-20 s old tomonga qaytib to'xtaydi, yashil nur pulsatsiyasi
import bpy, bmesh, math, sys, argparse

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--start", type=int, default=1)
ap.add_argument("--end", type=int, default=600)
ap.add_argument("--out", default="out/frames")
ap.add_argument("--samples", type=int, default=20)
ap.add_argument("--still", type=int, default=0, help="faqat bitta kadr (sinov)")
a = ap.parse_args(argv)

FPS, N = 30, 600
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------- render ----------------
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = a.samples
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 10
scene.cycles.transmission_bounces = 10
scene.cycles.glossy_bounces = 6
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.render.use_persistent_data = True
scene.render.resolution_x, scene.render.resolution_y = 1080, 1920
scene.render.resolution_percentage = 100
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, N
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'

# ---------------- dunyo: chuqur qora ----------------
world = bpy.data.worlds.new("Dark Studio")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.004, 0.004, 0.006, 1)
bg.inputs["Strength"].default_value = 0.2

# ---------------- materiallar ----------------
def bsdf_mat(name, color, rough, metallic=0.0, transmission=0.0, ior=1.5, coat=0.0, emission=0.0):
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
    return m, b

glass, _ = bsdf_mat("Smoked Dark Glass", (0.07, 0.075, 0.09), 0.1, metallic=0.1, transmission=0.85, ior=1.48, coat=0.6)
frame_m, _ = bsdf_mat("Dark Glass Rim", (0.12, 0.125, 0.14), 0.16, metallic=0.2, transmission=0.6, ior=1.5, coat=0.8)
green, gb = bsdf_mat("Premium Neon Lime", (0.42, 0.78, 0.02), 0.12, metallic=0.05, transmission=0.45, ior=1.47, coat=1.0, emission=0.25)

# ---------------- yumaloq burchakli shisha plitka ----------------
def rounded_slab(name, w, h, t, r, mat, z):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, t), verts=bm.verts)
    vert_edges = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-4]
    bmesh.ops.bevel(bm, geom=vert_edges, offset=r, segments=16, affect='EDGES', profile=0.5)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.location.z = z
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    bev = ob.modifiers.new("Soft Edge", 'BEVEL'); bev.width = min(0.09, t * 0.45); bev.segments = 6
    ob.modifiers.new("Weighted Normals", 'WEIGHTED_NORMAL')
    return ob

rig = bpy.data.objects.new("Icon Rig", None)            # butun ikonka shu bilan harakatlanadi
scene.collection.objects.link(rig)
outer = rounded_slab("Glass Frame", 3.4, 3.4, 0.34, 0.75, frame_m, 0.0)
inner = rounded_slab("Glass Panel", 3.0, 3.0, 0.22, 0.6, glass, 0.12)
outer.parent = inner.parent = rig

# ---------------- 4 ta yaltiroq yashil yaproq ----------------
petals = []
for i in range(4):
    ang = i * math.pi / 2 + math.pi / 4
    me = bpy.data.meshes.new(f"Petal {i+1}")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=1.0)
    for v in bm.verts:                                   # tomchi shakli: markazga qarab torayadi
        y = v.co.y
        k = 0.62 + 0.38 * (y + 1) / 2
        v.co.x *= k
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(f"Petal {i+1}", me)
    scene.collection.objects.link(ob)
    ob.scale = (0.44, 0.62, 0.15)
    ob.rotation_euler = (0, 0, ang - math.pi / 2)
    ob.location = (math.cos(ang) * 0.66, math.sin(ang) * 0.66, 0.42)
    me.materials.append(green)
    for p in me.polygons: p.use_smooth = True
    ob.modifiers.new("Smooth", 'SUBSURF').levels = 1
    ob.parent = rig
    petals.append(ob)

# ---------------- kamera (perspektiva, orbit uchun nishon) ----------------
target = bpy.data.objects.new("Cam Target", None)
scene.collection.objects.link(target)
cam_d = bpy.data.cameras.new("Product Camera")
cam_d.lens = 60
cam_d.dof.use_dof = True
cam_d.dof.focus_object = target
cam_d.dof.aperture_fstop = 4.0
cam = bpy.data.objects.new("Product Camera", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
trk = cam.constraints.new('TRACK_TO'); trk.target = target; trk.track_axis = 'TRACK_NEGATIVE_Z'; trk.up_axis = 'UP_Y'

# ---------------- studiya yorug'ligi ----------------
def area(name, loc, power, color, size):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = power; d.color = color; d.shape = 'DISK'; d.size = size
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o); o.location = loc
    c = o.constraints.new('TRACK_TO'); c.target = target; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return o, d
area("Top Softbox", (0, 3.5, 6), 900, (0.85, 1.0, 0.8), 4)
area("Left Rim", (-5, 1, 3), 1100, (0.55, 0.8, 1.0), 3)
area("Right Green Rim", (5, 1.5, 3), 1300, (0.5, 1.0, 0.25), 3)
sweep, sweep_d = area("Light Sweep", (-7, -2, 4), 0, (1.0, 1.0, 1.0), 1.2)
sweep_d.shape = 'RECTANGLE'; sweep_d.size = 0.4; sweep_d.size_y = 8

# ---------------- animatsiya (har kadr matematik, kalit kadrlar) ----------------
def smooth(u):
    u = max(0.0, min(1.0, u)); return u * u * u * (u * (6 * u - 15) + 10)

def pose(f):
    t = (f - 1) / FPS
    rev = smooth(t / 3.0)                                 # paydo bo'lish
    settle = smooth((t - 15) / 4.0)                       # oxirida old tomonga qaytish
    spin = (math.tau * smooth((t - 1.5) / 13.5)) * (1 - settle) + math.tau * settle
    float_z = 0.08 * math.sin(t * 1.6) * (1 - settle)
    rig.location = (0, 0, -1.2 * (1 - rev) + float_z)
    s = 0.6 + 0.4 * rev
    rig.scale = (s, s, s)
    tilt = 0.35 * math.sin(t * 0.7) * rev * (1 - settle)
    # turntable: ekran vertikali (Y) atrofida — shisha qalinligi ko'rinadi
    rig.rotation_euler = (math.radians(-12) * (1 - settle) + tilt * 0.3, spin, tilt * 0.4)
    # kamera: old tomondan sekin orbit, oxirida yaqinlashish
    orb = math.radians(28) * math.sin(t * 0.35) * (1 - settle)
    dist = 13.5 - 1.5 * rev - 1.8 * settle
    cam.location = (dist * math.sin(orb), -dist * math.cos(orb) * 0.35, dist * math.cos(orb))
    target.location = (0, 0, 0.15)
    # yorug'lik o'tishi (2-4 s) va oxirgi pulsatsiya
    u = (t - 1.8) / 2.0
    sweep.location = (-7 + 14 * max(0, min(1, u)), -2, 4)
    sweep_d.energy = 1800 * math.sin(math.pi * max(0, min(1, u)))
    pulse = 0.25 + 1.4 * smooth((t - 16) / 1.0) * (0.6 + 0.4 * math.sin((t - 16) * 5))
    gb.inputs["Emission Strength"].default_value = pulse * (0.3 + 0.7 * rev)

for f in range(1, N + 1):
    pose(f)
    for o in (rig, cam, target, sweep):
        o.keyframe_insert("location", frame=f)
    rig.keyframe_insert("scale", frame=f)
    rig.keyframe_insert("rotation_euler", frame=f)
    sweep_d.keyframe_insert("energy", frame=f)
    gb.inputs["Emission Strength"].keyframe_insert("default_value", frame=f)

# ---------------- render ----------------
import os
os.makedirs(a.out, exist_ok=True)
frames = [a.still] if a.still else range(a.start, a.end + 1)
for f in frames:
    scene.frame_set(f)
    scene.render.filepath = os.path.join(os.path.abspath(a.out), f"f{f:04d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"✓ kadr {f}", flush=True)
