# Reklama / Shorts shabloni — 15 s vertikal (1080x1920, 30 fps). glasskit asosida. Matn va ranglarni tepada o'zgartiring.
# 0-3.5 s HOOK (shisha sarlavha uchib keladi) -> 3.5-11 s MAHSULOT (shisha karta: logo/matn, turntable, zarralar)
# -> 11-15 s CHAQIRIQ (narx/tugma, yashil puls). Mahsulot modeli bo'lsa: MODEL = "assets/mahsulot.glb".
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glasskit as gk

HOOK = "YANGI"
TITLE = "Connect UZ"
CTA = "Yuklab oling"
ACCENT = (0.2, 0.75, 0.05)          # brend rangi (chiziqli RGB)
MODEL = ""                           # bo'sh — karta ishlatiladi
FONT = ""                            # .ttf yo'li (bo'sh — Blender standarti)

a = gk.args()
sc = gk.scene_setup("shorts", fps=30, seconds=15, samples=a.samples)
gk.world_dark()
smoked, _ = gk.material("smoked")
rim, _ = gk.material("rim")
accent, ab = gk.material("colored", ACCENT, name="Accent")
neon, nb = gk.material("neon", ACCENT, name="Neon")

target = gk.empty("Cam Target")
cam = gk.camera(target, lens=55)
gk.studio(target, "neon_green", accent=ACCENT)
sweep, sweep_d = gk.light_sweep(target)
_, dust = gk.particles(70, area=(7, 12, 5), color=ACCENT, strength=5.0)

# 1) HOOK
hook = gk.glass_text(HOOK, accent, size=1.5, depth=0.25, bevel=0.04, font_path=FONT)
# 2) MAHSULOT: karta (yoki model) + nom
prod = gk.empty("Product")
if MODEL and os.path.exists(MODEL):
    gk.import_model(MODEL, prod)
else:
    gk.rounded_slab("Card", 3.2, 4.2, 0.3, 0.6, rim, 0.0, prod)
    gk.rounded_slab("Card Glass", 2.8, 3.8, 0.2, 0.5, smoked, 0.1, prod)
    gk.blob("Mark", (0.7, 0.9, 0.2), accent, (0, 0.5, 0.35), parent=prod)
    gk.glass_text(TITLE, neon, size=0.42, depth=0.06, bevel=0.01, loc=(0, -1.1, 0.25), parent=prod, font_path=FONT)
# 3) CHAQIRIQ
cta_rig = gk.empty("CTA")
gk.rounded_slab("CTA Button", 3.0, 0.9, 0.22, 0.45, accent, 0.0, cta_rig)
gk.glass_text(CTA, smoked, size=0.42, depth=0.05, bevel=0.01, loc=(0, 0, 0.16), parent=cta_rig, font_path=FONT)

emis = nb.inputs["Emission Strength"]
OFF = (500, 0, 0)                    # kadrdan tashqarida (yashirish)

def pose(f):
    t = (f - 1) / 30
    # hook: chapdan uchib keladi, 3-3.5 s da yuqoriga ketadi
    hk = gk.window(t, 0.2, 1.4); out = gk.window(t, 3.0, 3.6)
    hook.location = ((-6 * (1 - hk)), 0.4 + 7 * out, 0.3) if t < 3.8 else OFF
    hook.rotation_euler = (0, math.radians(-30) * (1 - hk), math.radians(6) * math.sin(t * 2) * (1 - out))
    # mahsulot: 3.4 s dan paydo bo'lib aylanadi, 11 s da tepaga suriladi
    k, dz, s = gk.reveal(t, 3.4, 1.8)
    up = gk.window(t, 10.6, 11.6)
    prod.location = (0, 1.6 * up, dz + gk.float_z(t)) if t > 3.2 else OFF
    prod.scale = (s * (1 - 0.35 * up),) * 3
    prod.rotation_euler = (math.radians(-10), gk.turntable(t, 4.5, 10.5), 0.2 * math.sin(t * 0.8) * (1 - up))
    # chaqiriq: 11 s dan pastdan chiqadi
    c = gk.window(t, 11.0, 12.0)
    cta_rig.location = (0, -2.6 - 3 * (1 - c), 0.2) if t > 10.8 else OFF
    cam.location = gk.orbit(t, 12.5 - 1.0 * gk.window(t, 0, 3), swing_deg=18)
    target.location = (0, 0, 0)
    gk.sweep_at(sweep, sweep_d, t, a=3.8)
    emis.default_value = 2.0 + gk.pulse(t, 12, base=0, peak=3)
    gk.float_particles(dust, t)

gk.bake(pose, objs_loc=(hook, prod, cta_rig, cam, target, sweep) + tuple(dust), objs_rot=(hook, prod), objs_scale=(prod,), sockets=(emis,), lights=(sweep_d,))
gk.render(a)
