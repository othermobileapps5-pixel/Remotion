# OmniVoice (k2-fsa) sinovi: CPU'da matn -> ovoz. Natija ovoz-sinov/out/*.wav
import json, os, time, torch, soundfile as sf
from omnivoice.models.omnivoice import OmniVoice

os.makedirs('ovoz-sinov/out', exist_ok=True)
t0 = time.time()
model = OmniVoice.from_pretrained('k2-fsa/OmniVoice', device_map='cpu', dtype=torch.float32)
print(f'model yuklandi: {time.time()-t0:.0f} s', flush=True)
sr = getattr(model, 'sampling_rate', None) or 24000
for it in json.load(open('ovoz-sinov/matn.json')):
    t = time.time()
    try:
        wav = model.generate(text=it['matn'], language=it['til'], instruct=it.get('instruct'))[0]
        wav = wav.squeeze().float().cpu().numpy()
        sf.write(f"ovoz-sinov/out/{it['nom']}.wav", wav, sr)
        print(f"✓ {it['nom']}: {len(wav)/sr:.1f} s ovoz, {time.time()-t:.0f} s ketdi", flush=True)
    except Exception as e:
        print(f"✗ {it['nom']}: {e}", flush=True)
