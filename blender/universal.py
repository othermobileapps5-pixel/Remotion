# Universal Blender generator — parametrlar GitHub Actions inputlaridan keladi.
# Bir marta yoziladi; keyingi videolar uchun yangi .py fayl kerak emas.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import glasskit as gk

FPS = 30
TITLE = os.environ.get("UNIVERSAL_TITLE", "PREMIUM 3D").strip()[:36] or "PREMIUM 3D"
SHAPE = os.environ.get("UNIVERSAL_SHAPE", "cube").strip().lower()
COLOR = os.environ.get("UNIVERSAL_COLOR", "#39FF14").strip()
FORMAT = os.environ.get("UNIVERSAL_FORMAT", "square").strip().lower()
SECONDS = int(os.environ.get("UNIVERSAL_SECONDS", "10"))

ALLOWED_SHAPES = {"sphere", "cube", "torus", "cylinder", "capsule", "cone", "star", "heart", "pill", "diamond"}
if SHAPE not in ALLOWED_SHAPES:
    raise ValueError(f"Noma'lum shakl: {SHAPE}")
if not (len(COLOR) == 7 and COLOR.startswith("#")):
    raise ValueError("Rang #RRGGBB formatida bo'lishi kerak")
if FORMAT not in {"shorts", "square", "wide", "portrait45"}:
    raise ValueError(f"Noma'lum format: {FORMAT}")
if not 3 <= SECONDS <= 60:
    raise ValueError("Davomiylik 3–60 sekund oralig'ida bo'lishi kerak")

a = gk.args()
gk.scene_setup(FORMAT, fps=FPS, seconds=SECONDS, samples=a.samples)
gk.world_dark()
gk.floor(z=-1.85)

accent, _ = gk.material("neon", color=COLOR)
body, _ = gk.material("metal_glass")
text_mat, _ = gk.material("frosted")

rig = gk.empty("Universal_Object")
obj = gk.shape(SHAPE, body, size=1.25, loc=(0, 0, 0), parent=rig)
# Accent ring gives every generated object a consistent premium product-shot identity.
bpy.ops.mesh.primitive_torus_add(major_radius=1.75, minor_radius=0.025, major_segments=96, minor_segments=12, location=(0, 0, -0.05))
ring = bpy.context.object
ring.name = "Accent_Ring"
ring.data.materials.append(accent)
ring.parent = rig

caption = gk.glass_text(TITLE, text_mat, size=0.42, depth=0.08, bevel=0.012, loc=(0, -0.1, -1.45))
target = gk.empty("Camera_Target", (0, 0, -0.1))
cam = gk.camera(target, lens=52, loc=(0, -9.5, 0.45))
lights = gk.studio(target, "cool", accent=COLOR)
sweep, sweep_data = gk.light_sweep(target)
dust_root, dust = gk.particles(48, color=COLOR, spread=(5, 3, 5), size=0.018)

def pose(frame):
    t = (frame - 1) / FPS
    k, dz, scale = gk.reveal(t, 0.0, 1.2)
    pulse = gk.pulse(t, max(0.0, SECONDS - 2.0), 0.7)
    rig.location = (0, 0, dz + gk.float_z(t, 0.045, 3.2))
    rig.scale = (scale * pulse, scale * pulse, scale * pulse)
    rig.rotation_euler = (0.12 * math.sin(t * 0.7), 0.22 * math.sin(t * 0.45), gk.turntable(t, 0, SECONDS, 1.0))
    ring.rotation_euler = (0, 0, -gk.turntable(t, 0, SECONDS, 1.0) * 0.7)
    cam.location = gk.orbit(t, 9.5, 0.035, 0.45)
    gk.sweep_at(sweep, sweep_data, t, max(0.5, SECONDS * 0.45), 1.4, 1100)
    gk.float_particles(dust, t)

gk.bake(
    pose,
    objs_loc=(rig, cam, *dust),
    objs_rot=(rig, ring),
    objs_scale=(rig,),
    lights=(sweep_data,),
    cams=(),
)
gk.render(a)
