from PIL import Image, ImageDraw
import glob, os
fs = sorted(glob.glob('public/giza/*'))
W, cols = 480, 4
ims = [Image.open(f).convert('RGB') for f in fs]
th = [im.resize((W, int(W * im.height / im.width))) for im in ims]
H = max([t.height for t in th] + [1]) + 40
S = Image.new('RGB', (W * cols, H * max(1, (len(th) + cols - 1) // cols)), 'black')
d = ImageDraw.Draw(S)
for i, (t, f, im) in enumerate(zip(th, fs, ims)):
    x, y = (i % cols) * W, (i // cols) * H
    S.paste(t, (x, y + 40))
    d.text((x + 8, y + 8), f'#{i+1} {os.path.basename(f)[:40]} {im.width}x{im.height}', fill='white')
S.save('giza-zip-varaq.jpg', quality=85)
