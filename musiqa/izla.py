# OpenMontage pixabay_music orqali bepul musiqa nomzodlari (Pixabay Content License).
import json, sys, os
sys.path.insert(0, os.path.expanduser('~/OpenMontage'))
from tools.audio.pixabay_music import PixabayMusic
Q = ["egyptian female vocal", "middle eastern female vocal cinematic", "ancient egypt documentary", "duduk cinematic", "arabian epic vocal"]
pm = PixabayMusic(); out = []; os.makedirs('musiqa/out', exist_ok=True)
for q in Q:
    try:
        tr = pm._search({"query": q})
    except Exception as e:
        print('XATO', q, e); continue
    print(f'== {q}: {len(tr)} ta')
    for t in tr[:6]: print('  ', t.get('title'), '|', t.get('artist'), '|', t.get('duration'))
    picks = [t for t in tr if (t.get('duration') or 0) >= 100][:2] or tr[:1]
    for i, t in enumerate(picks):
        try:
            p = pm._download(t, {"output_path": f"musiqa/out/{len(out)+1:02d}-{q.replace(' ','-')[:30]}.mp3"})
            out.append({"q": q, "title": t.get('title'), "artist": t.get('artist'), "dur": t.get('duration'), "file": str(p), "url": t.get('url') or t.get('page_url')})
            print('   ✓', p)
        except Exception as e:
            print('   ✗ yuklash', e)
json.dump(out, open('musiqa/out/royxat.json', 'w'), ensure_ascii=False, indent=1)
