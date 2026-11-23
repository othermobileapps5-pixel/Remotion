# Storyboard taxtasi: qahramon namunalari + sahna rasmlari bitta rasmda (raqam, vaqt, izoh bilan).
#   python3 scripts/storyboard_board.py storyboard/<nom>.json [--yuklama]
#   --yuklama: rasmlarni URL'dan public/<out>/ ga yuklab oladi (aks holda o'sha papkadan o'qiydi)
# Natija: out/<out>-board.jpg
import json, os, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont

cfg = json.load(open(sys.argv[1]))
OUT = cfg['out']
src = f'public/{OUT}'
os.makedirs(src, exist_ok=True); os.makedirs('out', exist_ok=True)

def path(kind, key):
    return f'{src}/{kind}-{key}.png'

if '--yuklama' in sys.argv:
    for r in cfg['refs']:
        urllib.request.urlretrieve(r['url'], path('ref', r['id']))
    for s in cfg['scenes']:
        urllib.request.urlretrieve(s['url'], path('s', s['n']))
    print('rasmlar yuklandi')

def font(size, bold=True):
    names = (['Poppins-Bold.ttf', 'DejaVuSans-Bold.ttf'] if bold else ['Poppins-Regular.ttf', 'DejaVuSans.ttf'])
    for d in ['/usr/share/fonts/truetype/google-fonts', '/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/truetype']:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()

W, PAD, GAP = 1440, 40, 24
BG, CARD, INK, MUTED = (14, 22, 40), (26, 37, 62), (245, 247, 252), (160, 172, 196)
RED, BLUE, GREEN = (226, 75, 74), (55, 138, 221), (29, 158, 117)
F_T, F_ST, F_H, F_B, F_C, F_S = font(64), font(30, False), font(36), font(30), font(28), font(24, False)

def fit(im, w, h):
    # rasmni w×h ga qirqmasdan sig'diradi (o'rtada)
    r = min(w / im.width, h / im.height)
    im = im.convert('RGB').resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    c = Image.new('RGB', (w, h), CARD)
    c.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
    return c

def badge(d, x, y, text, color, f=F_B):
    tw = d.textlength(text, font=f)
    d.rounded_rectangle([x, y, x + tw + 28, y + 46], 12, fill=color)
    d.text((x + 14, y + 6), text, font=f, fill=(255, 255, 255))
    return x + tw + 28

# o'lchamlar
cols = 3
cw = (W - 2 * PAD - (cols - 1) * GAP) // cols
ch = int(cw * 16 / 9)
scene_rows = (len(cfg['scenes']) + cols - 1) // cols
ref_w = (W - 2 * PAD - 2 * GAP) // 3
ref_h = int(ref_w * 9 / 16)
H = PAD + 170 + 60 + ref_h + 110 + 60 + scene_rows * (ch + 120) + PAD

img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
y = PAD
d.text((PAD, y), cfg['title'], font=F_T, fill=INK)
d.text((PAD, y + 84), cfg['subtitle'], font=F_ST, fill=MUTED)
bw = d.textlength('STORYBOARD', font=F_B) + 28
badge(d, W - PAD - bw, y + 84, 'STORYBOARD', RED)
# sarlavha juda uzun bo'lsa kichraytiramiz
ft = F_T
while d.textlength(cfg['title'], font=ft) > W - 2 * PAD and ft.size > 36:
    ft = font(ft.size - 4)
d.rectangle([PAD, y, W - PAD, y + 80], fill=BG)
d.text((PAD, y), cfg['title'], font=ft, fill=INK)
y += 170

d.text((PAD, y), 'QAHRAMONLAR  ·  Character Lock', font=F_H, fill=INK); y += 60
for i, r in enumerate(cfg['refs']):
    x = PAD + i * (ref_w + GAP)
    p = path('ref', r['id'])
    im = fit(Image.open(p), ref_w, ref_h) if os.path.exists(p) else Image.new('RGB', (ref_w, ref_h), CARD)
    img.paste(im, (x, y))
    nx = badge(d, x, y + ref_h + 14, r['id'], BLUE, F_C)
    d.text((nx + 14, y + ref_h + 20), r['name'], font=F_C, fill=INK)
y += ref_h + 110

d.text((PAD, y), f"{len(cfg['scenes'])} SAHNA", font=F_H, fill=INK); y += 60
for i, s in enumerate(cfg['scenes']):
    r_, c_ = divmod(i, cols)
    x = PAD + c_ * (cw + GAP); yy = y + r_ * (ch + 120)
    p = path('s', s['n'])
    im = fit(Image.open(p), cw, ch) if os.path.exists(p) else Image.new('RGB', (cw, ch), CARD)
    img.paste(im, (x, yy))
    badge(d, x + 14, yy + 14, f"S{s['n']}", RED)
    tt = s['t']; tw = d.textlength(tt, font=F_C)
    d.rounded_rectangle([x + cw - tw - 42, yy + 14, x + cw - 14, yy + 60], 12, fill=(0, 0, 0))
    d.text((x + cw - tw - 28, yy + 21), tt, font=F_C, fill=INK)
    # izoh: kenglikka sig'masa 2 qatorga
    words, lines, cur = s['cap'].split(), [], ''
    for w_ in words:
        t_ = (cur + ' ' + w_).strip()
        if d.textlength(t_, font=F_C) > cw and cur: lines.append(cur); cur = w_
        else: cur = t_
    lines.append(cur)
    for k, ln in enumerate(lines[:2]):
        d.text((x, yy + ch + 12 + k * 38), ln, font=F_C, fill=INK)
if len(cfg['scenes']) % cols:
    # oxirgi qatordagi bo'sh joyga tartib belgisi
    i = len(cfg['scenes']); r_, c_ = divmod(i, cols)
    x = PAD + c_ * (cw + GAP); yy = y + r_ * (ch + 120)
    d.rounded_rectangle([x, yy, W - PAD, yy + ch], 16, outline=MUTED, width=2)
    info = [f"Jami: {cfg['subtitle'].split('·')[0].strip()}", 'Tartib: S1 dan S' + str(len(cfg['scenes'])) + ' gacha', 'Har biri 10 s', 'Format 9:16']
    for k, t in enumerate(info):
        d.text((x + 30, yy + 40 + k * 64), t, font=F_B if k == 0 else F_C, fill=INK if k == 0 else MUTED)
    badge(d, x + 30, yy + ch - 80, 'Rasmlar tayyor', GREEN)

img.save(f'out/{OUT}-board.jpg', quality=90)
print(f'out/{OUT}-board.jpg', img.size)
