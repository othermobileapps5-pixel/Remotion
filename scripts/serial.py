# Serial epizodini yig'adi: qahramonlar va joylar har epizodda bir xil chiqishi uchun.
# Ishlatish: python3 scripts/serial.py videos/serial/<epizod>.json [--sinov]
#   Kirish: qisqa epizod fayli (sahnalar: qahramonlar, joy, voqea, dialog).
#   Chiqish: videos/<epizod>.json — AiClips formatida, «Video yasash» ga tayyor.
# Qoidalar (videos/serial/README.md):
#   - har sahnaga o'sha sahnadagi qahramonlarning rasmi beriladi (juft rasm yoki yig'ma rasm);
#   - qahramon va joy tavsifi serial faylidan so'zma-so'z olinadi (hech qachon qayta yozilmaydi);
#   - "davomi": true — 1-sahna oldingi epizodning oxirgi kadridan boshlanadi;
#   - "esla": N — boshida N soniyalik «oldingi qismda» (oldingi epizod kliplaridan, bepul);
#   - --sinov — hamma sahna arzon 360p da (yoqqanini keyin 720p da qayta yasaymiz).
import json, os, subprocess, sys
from PIL import Image

if len(sys.argv) < 2:
    sys.exit('Foydalanish: python3 scripts/serial.py videos/serial/<epizod>.json [--sinov]')
ep_path = sys.argv[1]
sinov = '--sinov' in sys.argv
ep = json.load(open(ep_path))
bible = json.load(open(os.path.join(os.path.dirname(ep_path), ep.get('serial', 'venus') + '.json')))
P = bible['papka']                      # public/ ichidagi papka
pub = lambda rel: os.path.join('public', rel)
Q, J = bible['qahramonlar'], bible['joylar']
out_name = ep['nom']                     # masalan venus-ep2


def ref_image(names):
    """Sahna qahramonlari uchun bitta rasm: juft rasm bo'lsa o'sha, bo'lmasa yonma-yon yig'ma."""
    names = [n for n in names if n in Q]
    if not names:
        return None, []
    if len(names) == 1:
        return f"{P}/{Q[names[0]]['rasm']}", names
    for key, img in bible.get('juftlar', {}).items():
        if sorted(key.split('+')) == sorted(names):
            return f"{P}/{img}", names   # juft rasmda chap-o'ng tartibi kalitdagi kabi
    ims = [Image.open(pub(f"{P}/{Q[n]['rasm']}")).convert('RGB') for n in names]
    h = 720
    ims = [im.resize((int(im.width * h / im.height), h)) for im in ims]
    strip = Image.new('RGB', (sum(i.width for i in ims), h))
    x = 0
    for im in ims:
        strip.paste(im, (x, 0)); x += im.width
    rel = f"{P}/yigma-{'-'.join(names)}.jpg"
    strip.save(pub(rel), quality=90)
    return rel, names


def order_of(img_rel, names):
    for key, img in bible.get('juftlar', {}).items():
        if f"{P}/{img}" == img_rel:
            return key.split('+')
    return names


def last_frame(src, out_rel):
    # oxirgi yorug' kadr: klip qora ekran bilan tugasa (masalan «cut to black»), orqaga qarab izlaymiz
    for back in (0.2, 0.8, 1.5, 2.5, 3.5):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-sseof', f'-{back}', '-i', pub(src), '-frames:v', '1', '-q:v', '2', pub(out_rel)], check=True)
        if sum(Image.open(pub(out_rel)).convert('L').resize((32, 18)).getdata()) / (32 * 18) > 25:
            break
    return out_rel


scenes = []
prev = None
if ep.get('oldingi'):
    prev = json.load(open(f"videos/{ep['oldingi']}.json"))
    prev_clips = [s for s in prev['scenes'] if s.get('type') == 'video' and s.get('src')]
    # «Oldingi qismda»: oldingi epizodning oxirgi ikki klipidan bo'laklar (bepul)
    if ep.get('esla'):
        part = round(ep['esla'] / 2, 1)
        for s in prev_clips[-3:-1]:
            scenes.append({'type': 'video', 'src': s['src'], 'duration': part, 'boshi': 2, 'esla': True})

for i, sc in enumerate(ep['sahnalar']):
    names = sc.get('qahramonlar', [])
    img, names = ref_image(names)
    joy = J.get(sc.get('joy', ''), None)
    parts = []
    if i == 0 and ep.get('davomi') and prev:
        clips = [s for s in prev['scenes'] if s.get('type') == 'video' and s.get('src')]
        img = last_frame(clips[-1]['src'], f"{P}/{out_name}-boshlanish.jpg")
        parts.append('The attached image is the LAST FRAME of the previous episode: continue directly from it (same people, same place, same light). ')
    elif img:
        order = order_of(img, names)
        who = ', '.join(f"{'left' if k == 0 else 'right' if k == len(order) - 1 else 'middle'}: {Q[n]['tavsif'].split(':')[0]}" for k, n in enumerate(order)) if len(order) > 1 else Q[order[0]]['tavsif'].split(':')[0]
        parts.append(f'The attached image is a CHARACTER REFERENCE ONLY ({who}) - keep faces, skin, hair and costumes exactly the same, but do NOT reproduce this exact shot. ')
    if names:
        parts.append(f"Exactly {len(names)} main character(s) in this scene: " + '; '.join(Q[n]['tavsif'] for n in names) + '. ')
    if joy:
        parts.append(f"Location: {joy['tavsif']}. ")
    parts.append(sc['voqea'].strip() + ' ')
    for who, line in sc.get('dialog', []):
        if who in Q:
            parts.append(f"{Q[who]['tavsif'].split(':')[0].replace('the ', 'The ')} says in a {Q[who]['ovoz']}: \"{line}\" ")
        else:
            parts.append(f"{who}: \"{line}\" ")
    if sc.get('ovoz'):
        parts.append(f"Sound: {sc['ovoz']}. ")
    if not sc.get('dialog'):
        parts.append('No dialogue. ')
    parts.append(bible['uslub'])
    s = {'type': 'video', 'duration': sc['soniya'], 'model': bible['model'],
         'resolution': bible['sinov_sifat'] if sinov else bible['sifat'], 'prompt': ''.join(parts)}
    if img:
        s['image'] = img
    scenes.append(s)

if ep.get('sarlavha'):
    scenes.append({'type': 'title', 'duration': ep.get('sarlavha_soniya', 2.5), 'title': bible['nom'], 'subtitle': ep['sarlavha']})

out = {'title': f"{bible['nom']} — {ep.get('sarlavha', out_name)}" + (' (sinov 360p)' if sinov else ''), 'komponent': 'AiClips', 'scenes': scenes}
dst = f"videos/{out_name}{'-sinov' if sinov else ''}.json"
json.dump(out, open(dst, 'w'), ensure_ascii=False, indent=2)
open(dst, 'a').write('\n')
paid = sum(s['duration'] for s in scenes if s['type'] == 'video' and not s.get('src'))
rate = 0.023 if sinov else 0.07  # Google Omni 1.2 Flash, $/soniya
print(f"✓ {dst}: {len(scenes)} sahna, {sum(s['duration'] for s in scenes):.1f} s; yangi AI klip {paid:.0f} s ≈ ${paid * rate:.2f}")
