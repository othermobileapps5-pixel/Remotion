# Kadrdan qahramonni (odam/hayvon/asosiy obyekt) ajratish — rembg, bepul, mahalliy.
# python3 scripts/cutout.py <kadr.png> <chiqish.png>   → "OK <qamrov>" yoki "SKIP"
import sys
import numpy as np
from PIL import Image
from rembg import new_session, remove

inp, out = sys.argv[1], sys.argv[2]
img = Image.open(inp).convert("RGB")
res = remove(img, session=new_session("isnet-general-use"), post_process_mask=True)
alpha = np.array(res)[..., 3]
cover = float((alpha > 128).mean())
# hech narsa topilmasa yoki deyarli butun kadr bo'lsa — effekt qilinmaydi
if cover < 0.03 or cover > 0.8:
    print(f"SKIP {cover:.3f}")
else:
    res.save(out)
    print(f"OK {cover:.3f}")
