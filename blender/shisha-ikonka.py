# Shisha ikonka — 20 s vertikal (1080x1920, 30 fps). glasskit asosida.
# 0-3 s paydo bo'lish + yorug'lik o'tishi; 3-15 s turntable, suzish, kamera orbiti; 15-20 s old tomonda to'xtab, yashil puls.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glasskit as gk

a = gk.args()
sc = gk.scene_setup("shorts", fps=30, seconds=20, samples=a.samples)
gk.world_dark()
frame_m, _ = gk.material("rim")
glass, _ = gk.material("smoked")
green, gb = gk.material("colored", (0.2, 0.62, 0.0), name="Premium Neon Lime")

rig = gk.empty("Icon Rig")
gk.rounded_slab("Glass Frame", 3.4, 3.4, 0.34, 0.75, frame_m, 0.0, rig)
gk.rounded_slab("Glass Panel", 3.0, 3.0, 0.22, 0.6, glass, 0.12, rig)
for i in range(4):
    ang = i * math.pi / 2 + math.pi / 4
    gk.blob(f"Petal {i+1}", (0.44, 0.62, 0.15), green, (math.cos(ang) * 0.66, math.sin(ang) * 0.66, 0.42), ang - math.pi / 2, parent=rig)

target = gk.empty("Cam Target")
target.location = (0, 0, 0.15)
cam = gk.camera(target, lens=60)
gk.studio(target, "neon_green")
sweep, sweep_d = gk.light_sweep(target)
emis = gb.inputs["Emission Strength"]

def pose(f):
    t = (f - 1) / 30
    k, dz, s = gk.reveal(t, 0, 3)
    settle = gk.window(t, 15, 19)
    spin = gk.turntable(t, 1.5, 15) * (1 - settle) + math.tau * settle
    tilt = 0.35 * math.sin(t * 0.7) * k * (1 - settle)
    rig.location = (0, 0, dz + gk.float_z(t) * (1 - settle))
    rig.scale = (s, s, s)
    rig.rotation_euler = (math.radians(-12) * (1 - settle) + tilt * 0.3, spin, tilt * 0.4)
    o = gk.orbit(t, 13.5 - 1.5 * k - 1.8 * settle)
    cam.location = (o[0] * (1 - settle), o[1] * (1 - settle), o[2])
    gk.sweep_at(sweep, sweep_d, t)
    emis.default_value = gk.pulse(t, 16) * (0.3 + 0.7 * k)

gk.bake(pose, objs_loc=(rig, cam, sweep), objs_rot=(rig,), objs_scale=(rig,), sockets=(emis,), lights=(sweep_d,))
gk.render(a)
