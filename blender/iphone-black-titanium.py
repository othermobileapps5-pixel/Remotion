"""iPhone Black Titanium — premium 3D product reveal (15s, square). Blender 4.2 LTS."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glasskit as gk

a = gk.args()
sc = gk.scene_setup("square", fps=30, seconds=15, samples=a.samples)
gk.world_dark((0.004, 0.005, 0.008), 0.35)

# Titanium frame and smoked-glass rear panel
titanium, _ = gk.material("metal_glass", "#777D86")
black, _ = gk.material("smoked")
lens_glass, _ = gk.material("crystal")
steel, _ = gk.material("metal_glass", "#B9BEC7")
white, _ = gk.emission("#E8EDF4", 1.4)
soft_white, _ = gk.emission("#9AA6B7", 0.65)

rig = gk.empty("iPhone_Rig")
body = gk.rounded_slab("Titanium_Unibody", 1.48, 2.98, 0.16, 0.19, titanium, parent=rig)
back = gk.rounded_slab("Smoked_Glass_Back", 1.405, 2.905, 0.025, 0.17, black, z=0.095, parent=rig)

# Raised camera island, upper-left on the rear face
island = gk.rounded_slab("Camera_Island", 0.77, 0.91, 0.055, 0.14, black, z=0.125, parent=rig)
island.location.x = -0.285
island.location.z = 0.125
# Three metallic lens rings; camera-facing surfaces point toward -Y
for i, (x, z) in enumerate([(-0.48, 1.12), (-0.12, 1.12), (-0.48, 0.76)]):
    bpy = __import__("bpy")
    bpy.ops.mesh.primitive_torus_add(major_radius=0.145, minor_radius=0.025, major_segments=64, minor_segments=16, location=(x, -0.105, z))
    ring = bpy.context.object
    ring.name = f"Lens_Ring_{i+1}"
    ring.rotation_euler[0] = math.pi / 2
    ring.data.materials.append(steel)
    ring.parent = rig
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.125, depth=0.025, location=(x, -0.112, z))
    lens = bpy.context.object
    lens.name = f"Sapphire_Lens_{i+1}"
    lens.rotation_euler[0] = math.pi / 2
    lens.data.materials.append(lens_glass)
    lens.parent = rig
    # Small lens highlight
    gk.blob(f"Lens_Glint_{i+1}", (0.025, 0.012, 0.025), white, (x-0.045, -0.132, z+0.045), parent=rig)

# Flash and sensor details
gk.blob("LED_Flash", (0.045, 0.018, 0.045), white, (-0.12, -0.12, 0.76), parent=rig)
gk.blob("LiDAR_Sensor", (0.035, 0.018, 0.035), soft_white, (-0.12, -0.12, 0.94), parent=rig)

# Side controls: slim titanium buttons
for name, x, z, h in [
    ("Volume_Up", -0.755, 0.55, 0.32),
    ("Volume_Down", -0.755, 0.12, 0.32),
    ("Action_Button", -0.755, 0.98, 0.18),
    ("Power_Button", 0.755, 0.45, 0.48),
]:
    button = gk.rounded_slab(name, 0.045, h, 0.075, 0.025, steel, parent=rig)
    button.location = (x, 0, z)

# Studio, floating dust and reflective ground
target = gk.empty("Camera_Target", (0, 0, 0))
cam = gk.camera(target, lens=58, loc=(0, -8.8, 0.12))
gk.floor((0.006, 0.007, 0.01), z=-1.75, rough=0.19)
gk.studio(target, "cool", accent="#AAB6C8")
sweep, sweep_data = gk.light_sweep(target)
dust_root, dust = gk.particles(42, color="#AAB6C8", spread=(3.6, 1.8, 3.4), size=0.012, seed=19)

# Premium typography, placed in camera-facing plane
title_mat, _ = gk.emission("#F1F3F6", 1.0)
sub_mat, _ = gk.emission("#9EA8B6", 0.7)
title = gk.glass_text("TITANIUM", title_mat, size=0.30, depth=0.012, bevel=0.002, loc=(0, -2.0, -1.18))
subtitle = gk.glass_text("PURE  •  PRECISION", sub_mat, size=0.105, depth=0.006, bevel=0.001, loc=(0, -2.0, -1.43))

def pose(f):
    t = (f - 1) / 30.0
    # Slow reveal, then a controlled full rotation and a settled hero pose
    k, dz, sca = gk.reveal(t, 0.15, 1.25)
    if t < 2.0:
        angle = -0.22 + 0.22 * gk.ease(t / 2.0)
    elif t < 11.8:
        angle = 2 * math.pi * gk.window(t, 2.0, 11.8)
    else:
        angle = 2 * math.pi
    rig.location = (0, 0, dz * 0.25 + gk.float_z(t, 0.035, 4.5))
    rig.rotation_euler = (math.radians(7) * math.sin(t * 0.7), math.radians(4) * math.sin(t * 0.55), angle)
    rig.scale = (sca, sca, sca)
    gk.float_particles(dust, t)
    gk.sweep_at(sweep, sweep_data, t, 2.8, dur=1.7, energy=1100)
    # Camera push-in, then settle
    cam.location = (0, -8.8 + 0.28 * gk.ease(gk.window(t, 0.0, 3.0)), 0.12)

gk.bake(pose, objs_loc=(rig, cam), objs_rot=(rig,), objs_scale=(rig,), lights=(sweep_data,))
gk.render(a)
