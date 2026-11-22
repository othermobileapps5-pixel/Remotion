# Mavzudagi qahramonni topish va ajratish (bepul, mahalliy): CLIPSeg (matn bo'yicha) + rembg (aniq chegaralar).
#   python3 scripts/subject.py find <kadrlar papkasi> <qadam sek> "<kim, inglizcha>" <chiqarib tashlanadigan oynalar json>
#       → {"t": <eng yaxshi soniya>, "score": ...}
#   python3 scripts/subject.py cut <kadr.png> "<kim>" <chiqish.png>   → "OK <qamrov>" yoki "SKIP ..."
import glob, json, os, sys
import numpy as np
import torch
from PIL import Image, ImageFilter
from transformers import CLIPSegForImageSegmentation, CLIPSegProcessor

torch.set_num_threads(os.cpu_count() or 4)
MODEL = "CIDAS/clipseg-rd64-refined"
proc = CLIPSegProcessor.from_pretrained(MODEL)
model = CLIPSegForImageSegmentation.from_pretrained(MODEL).eval()

def masks(images, prompt):
    with torch.no_grad():
        inp = proc(text=[f"a photo of a {prompt}"] * len(images), images=images, return_tensors="pt", padding=True)
        out = torch.sigmoid(model(**inp).logits)
    return out.reshape(len(images), out.shape[-2], out.shape[-1]).numpy()

def score(m):
    # ishonch (eng kuchli 3% piksel o'rtachasi) × qamrov 3–60% oralig'ida bo'lsa
    flat = np.sort(m.ravel())[::-1]
    conf = float(flat[: max(1, len(flat) // 33)].mean())
    cover = float((m > 0.4).mean())
    return conf * (1.0 if 0.03 <= cover <= 0.6 else 0.4), cover

cmd = sys.argv[1]
if cmd == "find":
    folder, step, prompt, excl = sys.argv[2], float(sys.argv[3]), sys.argv[4], json.load(open(sys.argv[5]))
    files = sorted(glob.glob(os.path.join(folder, "*.jpg")))
    best = (-1.0, 0.0)
    for i in range(0, len(files), 8):
        batch = files[i : i + 8]
        ms = masks([Image.open(f).convert("RGB") for f in batch], prompt)
        for f, m in zip(batch, ms):
            t = (int(os.path.basename(f).split(".")[0]) - 1) * step + step / 2
            if any(w["start"] - 1 <= t <= w["start"] + w["len"] + 1 for w in excl):
                continue
            s, _ = score(m)
            if s > best[0]:
                best = (s, t)
    print(json.dumps({"t": round(best[1], 2), "score": round(best[0], 3)}))
elif cmd == "cut":
    inp, prompt, out = sys.argv[2], sys.argv[3], sys.argv[4]
    img = Image.open(inp).convert("RGB")
    m = masks([img], prompt)[0]
    s, cover = score(m)
    if s < 0.35:
        print(f"SKIP topilmadi ({s:.2f})")
        sys.exit(0)
    seg = Image.fromarray((m * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    region = np.array(seg.filter(ImageFilter.MaxFilter(31))) / 255.0  # biroz kengaytirilgan hudud
    alpha = None
    try:
        from rembg import new_session, remove
        rb = np.array(remove(img, session=new_session("isnet-general-use"), post_process_mask=True))[..., 3] / 255.0
        cand = rb * (region > 0.35)
        if 0.02 <= (cand > 0.5).mean() <= 0.7:
            alpha = cand  # rembg chegaralari, faqat qahramon hududida
    except Exception as e:
        print(f"rembg: {e}", file=sys.stderr)
    if alpha is None:
        alpha = np.array(seg.filter(ImageFilter.GaussianBlur(6))) / 255.0
        alpha = np.clip((alpha - 0.35) / 0.3, 0, 1)
    cov = float((alpha > 0.5).mean())
    if cov < 0.02 or cov > 0.8:
        print(f"SKIP qamrov {cov:.3f}")
        sys.exit(0)
    rgba = np.dstack([np.array(img), (alpha * 255).astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(out)
    print(f"OK {cov:.3f} ishonch {s:.2f}")
