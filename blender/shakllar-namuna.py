# Shakllar namunasi — 10 s vertikal: 10 ta tayyor shakl turli shishada, sekin aylanadi (glasskit sinovi va katalog).
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glasskit as gk

a = gk.args()
sc = gk.scene_setup("shorts", fps=30, seconds=10, samples=a.samples)
gk.world_dark()
kinds = ["smoked", "crystal", "colored", "frosted", "neon", "metal_glass", "colored", "smoked", "crystal", "colored"]
cols = [None, None, (0.2, 0.62, 0.0), None, (0.1, 0.5, 1.0), None, (0.8, 0.15, 0.05), None, None, (0.55, 0.2, 0.8)]
objs = []
for i, sh in enumerate(gk.SHAPES):
    m, _ = gk.material(kinds[i], cols[i], name=f"m{i}")
    x, y = (i % 2) * 2.2 - 1.1, 3.6 - (i // 2) * 1.8
    objs.append(gk.shape(sh, m, size=1.2, loc=(x, y, 0)))
target = gk.empty("Target")
cam = gk.camera(target, lens=40, fstop=8)
cam.location = (0, -2.5, 15)
gk.studio(target, "cool")
_, dust = gk.particles(40, area=(6, 10, 4))

def pose(f):
    t = (f - 1) / 30
    for i, o in enumerate(objs):
        o.rotation_euler = (0.5 + 0.3 * math.sin(t + i), gk.turntable(t, 0, 10) + i, 0.2 * i)
    gk.float_particles(dust, t)

gk.bake(pose, objs_rot=tuple(objs), objs_loc=tuple(dust))
gk.render(a)
