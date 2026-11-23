# Premium glassmorphism iPhone-inspired product reveal — Blender 4.2 LTS
# 15 s / 1080x1080 / 30 fps / Cycles. Render via Blender 3D workflow.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import glasskit as gk

FPS = 30
SECONDS = 15
FORMAT = "square"
ACCENT = "#39FF14"


def rounded_box(name, dims, radius, material, loc=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Precision_Rounded_Edges", "BEVEL")
    bevel.width = radius
    bevel.segments = 10
    bevel.limit_method = "ANGLE"
    normal = obj.modifiers.new("Weighted_Corner_Normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    return obj


def cylinder_y(name, radius, depth, material, loc, parent, bevel=0.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth, location=loc, rotation=(math.pi / 2, 0, 0))
    obj = bpy.context.object
    obj.name = name
    if bevel:
        mod = obj.modifiers.new("Lens_Edge", "BEVEL")
        mod.width = bevel
        mod.segments = 4
    obj.modifiers.new("Lens_Normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(material)
    obj.parent = parent
    return obj


a = gk.args()
gk.scene_setup(FORMAT, fps=FPS, seconds=SECONDS, samples=a.samples)
gk.world_dark()
gk.floor(z=-2.35, rough=0.18)

titanium, _ = gk.material("metal_glass")
black_glass, _ = gk.material("smoked")
screen_glass, _ = gk.material("crystal")
silver, _ = gk.material("metal_glass", color="#C8CDD2")
neon, _ = gk.material("neon", color=ACCENT)
lens_mat, _ = gk.material("smoked")
white, _ = gk.material("frosted")

rig = gk.empty("IPHONE_TITANIUM_RIG")

# Titanium chassis and front display. Phone lies in the X-Z plane; camera looks from -Y.
rounded_box("Titanium_Unibody", (1.58, 0.19, 3.28), 0.19, titanium, parent=rig)
rounded_box("Front_Black_Glass", (1.49, 0.035, 3.18), 0.17, black_glass, (0, -0.108, 0), rig)
rounded_box("OLED_Display", (1.445, 0.012, 3.12), 0.15, screen_glass, (0, -0.132, 0), rig)

# Minimal luminous wallpaper lines beneath the transparent display.
for i, z in enumerate((-0.62, -0.32, -0.02, 0.28, 0.58)):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.40 + i * 0.035, minor_radius=0.008, major_segments=96, minor_segments=10, location=(0, -0.148, z), rotation=(math.pi / 2, 0, 0))
    line = bpy.context.object
    line.name = f"Emerald_Wallpaper_Ring_{i+1}"
    line.data.materials.append(neon if i in (1, 3) else silver)
    line.parent = rig

# Dynamic Island / earpiece detail.
rounded_box("Dynamic_Island", (0.48, 0.018, 0.105), 0.052, lens_mat, (0, -0.154, 1.39), rig)
rounded_box("Speaker_Slit", (0.16, 0.008, 0.012), 0.006, silver, (0, -0.168, 1.39), rig)

# Side buttons and antenna seams.
for z in (0.82, 0.42, -0.58):
    rounded_box(f"Left_Button_{z}", (0.045, 0.075, 0.24 if z != -0.58 else 0.34), 0.02, silver, (-0.805, 0, z), rig)
for z in (0.64, 0.25):
    rounded_box(f"Right_Button_{z}", (0.045, 0.075, 0.38), 0.02, silver, (0.805, 0, z), rig)

# Rear camera island and three precision lens stacks.
rounded_box("Rear_Camera_Island", (0.88, 0.105, 1.02), 0.17, titanium, (-0.30, 0.145, 1.02), rig)
for x, z in ((-0.54, 1.31), (-0.10, 1.31), (-0.54, 0.82)):
    cylinder_y("Camera_Lens_Rim", 0.175, 0.035, silver, (x, 0.213, z), rig, 0.012)
    cylinder_y("Camera_Optic", 0.142, 0.025, lens_mat, (x, 0.239, z), rig, 0.008)
    cylinder_y("Optic_Glass", 0.105, 0.012, screen_glass, (x, 0.258, z), rig, 0.004)
cylinder_y("Flash", 0.052, 0.025, white, (-0.10, 0.218, 0.82), rig, 0.008)
cylinder_y("Microphone", 0.025, 0.025, lens_mat, (-0.10, 0.218, 0.63), rig, 0.004)

# Bottom port and speaker perforations.
rounded_box("USB_C_Port", (0.34, 0.012, 0.065), 0.03, lens_mat, (0, -0.102, -1.63), rig)
for side in (-1, 1):
    for i in range(5):
        cylinder_y("Speaker_Perforation", 0.018, 0.018, lens_mat, (side * (0.43 + i * 0.065), -0.105, -1.63), rig, 0.003)

# Floating emerald halo around the product.
bpy.ops.mesh.primitive_torus_add(major_radius=2.05, minor_radius=0.018, major_segments=128, minor_segments=12, location=(0, 0.2, 0), rotation=(math.pi / 2.0, 0, 0))
halo = bpy.context.object
halo.name = "Emerald_Halo"
halo.data.materials.append(neon)

caption_mat, _ = gk.material("frosted")
caption = gk.glass_text("PURE TITANIUM", caption_mat, size=0.30, depth=0.055, bevel=0.008, loc=(0, -0.05, -2.05))
sub = gk.glass_text("PRECISION  /  REDEFINED", white, size=0.105, depth=0.02, bevel=0.003, loc=(0, -0.05, -2.30))

target = gk.empty("Camera_Target", (0, 0, -0.12))
cam = gk.camera(target, lens=48, loc=(0, -9.6, 0.28))
gk.studio(target, "cool", accent=ACCENT)
sweep, sweep_data = gk.light_sweep(target)
dust_root, dust = gk.particles(64, color=ACCENT, spread=(5, 3, 5), size=0.014)

def pose(frame):
    t = (frame - 1) / FPS
    # Reveal, slow 360-degree turntable, then settle into the front hero angle.
    reveal_k, dz, scale = gk.reveal(t, 0.0, 1.25)
    turn = gk.turntable(t, 1.4, 12.8, 1.0)
    rig.location = (0, 0, dz + gk.float_z(t, 0.035, 4.2))
    rig.scale = (scale, scale, scale)
    rig.rotation_euler = (0.035 * math.sin(t * 0.8), 0.10 * math.sin(t * 0.5), turn)
    halo.rotation_euler = (math.pi / 2, 0, -turn * 0.35 + t * 0.12)
    cam.location = (0.65 * math.sin(t * 0.28), -9.6, 0.25 + 0.18 * math.sin(t * 0.42))
    gk.sweep_at(sweep, sweep_data, t, 5.0, 1.8, 1300)
    gk.float_particles(dust, t)

gk.bake(
    pose,
    objs_loc=(rig, cam, *dust),
    objs_rot=(rig, halo),
    objs_scale=(rig,),
    lights=(sweep_data,),
    cams=(),
)
gk.render(a)
