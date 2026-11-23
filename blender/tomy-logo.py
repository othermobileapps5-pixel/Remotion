# Namuna: shisha «TOMY» logosi — 6 s Shorts (1080×1920). glasskit bilan.
# Beatlar: 0–1.2 s matn pastdan ko'tariladi · 1.2–4 s sekin aylanish + yorug'lik o'tishi · 4–6 s pulse va neon.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glasskit as gk  # noqa: E402

TITLE = "TOMY"
ACCENT = "#39FF14"
FPS, SECONDS = 30, 6

a = gk.args()
gk.scene_setup("shorts", fps=FPS, seconds=SECONDS, samples=a.samples)
gk.world_dark()
gk.floor(z=-1.6)

glass, bsdf = gk.material("smoked")
neon, nb = gk.material("neon", color=ACCENT)

rig = gk.empty("Rig")
txt = gk.glass_text(TITLE, glass, size=1.35, depth=0.45, bevel=0.05, parent=rig)
plate = gk.rounded_slab("Plate", 3.6, 0.22, 0.22, 0.1, neon, z=-1.05, parent=rig)
# ingichka neon halqa — matn orqasida, kameraga qaragan
import bpy  # noqa: E402
bpy.ops.mesh.primitive_torus_add(major_radius=2.2, minor_radius=0.035, major_segments=128, minor_segments=16, location=(0, 1.6, 0.05))
ring = bpy.context.object
ring.rotation_euler[0] = 1.5708
ring.data.materials.append(neon)

root, dust = gk.particles(60, color=ACCENT)
target = gk.empty("Target", (0, 0, 0))
cam = gk.camera(target, lens=50, loc=(0, -11, 0.8))
gk.studio(target, "neon_green", accent=ACCENT)
sweep, sd = gk.light_sweep(target)


def pose(f):
    t = (f - 1) / FPS
    k, dz, s = gk.reveal(t, 0.0, 1.2)
    p = gk.pulse(t, 4.2, 0.6)
    rig.location = (0, 0, dz + gk.float_z(t, 0.06))
    rig.scale = (s * p, s * p, s * p)
    rig.rotation_euler = (0, 0, -0.5 * (1 - k) + 0.35 * gk.ease(gk.window(t, 1.2, 4.0)) - 0.35 * gk.ease(gk.window(t, 4.0, 6.0)) * 0.5)
    ring.rotation_euler = (1.5708, 0.12 * gk.float_z(t, 1.0, 5.0), 0)
    gk.sweep_at(sweep, sd, t, 1.6, 1.4)
    nb.inputs["Emission Strength"].default_value = 0.8 + 1.6 * gk.ease(gk.window(t, 4.0, 4.6))
    cam.location = gk.orbit(t, 11, 0.05, 0.8)
    gk.float_particles(dust, t)


gk.bake(pose, objs_loc=(rig, cam, *dust), objs_rot=(rig, ring), objs_scale=(rig,), sockets=(nb.inputs["Emission Strength"],), lights=(sd,))
gk.render(a)
