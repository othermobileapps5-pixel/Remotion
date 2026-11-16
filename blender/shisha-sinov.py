# Sinov: shisha-ikonka.py dan har bo'lakdan bittadan kadr (60, 240, 400, 580), kam namuna bilan — tez tekshiruv.
import sys, os, runpy
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
start = int(argv[argv.index("--start") + 1]) if "--start" in argv else 1
out = argv[argv.index("--out") + 1] if "--out" in argv else "out/frames"
still = {1: 60, 151: 240, 301: 400, 451: 580}.get(start, 60)
sys.argv = [sys.argv[0], "--", "--still", str(still), "--samples", "12", "--out", out]
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shisha-ikonka.py"), run_name="__main__")
