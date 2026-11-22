# Tekin mahalliy ovoz (GitHub serverida, limitsiz): Chatterbox (MIT) va Kokoro (Apache 2.0) — tijorat uchun ruxsat.
#   python3 scripts/tts_local.py <chatterbox|kokoro> <til: en/es/ru...> <ovoz> <jobs.json> <natija.json>
# jobs.json: [{"text": "...", "out": "public/ovoz/x.wav"}]  →  natija.json: [{"out": ..., "sec": ...}]
# Model bir marta yuklanadi va barcha sahnalar ketma-ket yasaladi.
import json, sys, time, wave
import numpy as np

engine, lang, voice, jobs_path, res_path = sys.argv[1:6]
jobs = json.load(open(jobs_path))

def save_wav(path, audio, sr):
    a = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype(np.int16).tobytes())
    return len(a) / sr

results = []
t0 = time.time()
if engine == "kokoro":
    from kokoro import KPipeline
    codes = {"en": "a", "es": "e", "fr": "f", "hi": "h", "it": "i", "pt": "p", "ja": "j", "zh": "z"}
    if lang not in codes:
        sys.exit(f"Kokoro '{lang}' tilini bilmaydi")
    pipe = KPipeline(lang_code=codes[lang])
    v = voice or ("am_michael" if lang == "en" else "em_alex" if lang == "es" else "af_heart")
    for j in jobs:
        parts = [a for _, _, a in pipe(j["text"], voice=v, speed=1.05)]
        audio = np.concatenate([np.asarray(p) for p in parts]) if parts else np.zeros(2400)
        results.append({"out": j["out"], "sec": round(save_wav(j["out"], audio, 24000), 2)})
        print(f"  ✓ kokoro/{v}: {j['out']} {results[-1]['sec']} s", flush=True)
elif engine == "chatterbox":
    import torch
    torch.set_num_threads(max(1, __import__("os").cpu_count() or 4))
    ref = voice if voice and voice.endswith((".wav", ".mp3")) else None  # ixtiyoriy: ovoz namunasi (nusxalash)
    if lang == "en":
        from chatterbox.tts import ChatterboxTTS
        model = ChatterboxTTS.from_pretrained(device="cpu")
        gen = lambda text: model.generate(text, audio_prompt_path=ref, exaggeration=0.55, cfg_weight=0.45)
    else:
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
        gen = lambda text: model.generate(text, language_id=lang, audio_prompt_path=ref, exaggeration=0.55, cfg_weight=0.45)
    for j in jobs:
        wav = gen(j["text"])
        results.append({"out": j["out"], "sec": round(save_wav(j["out"], wav.squeeze().cpu().numpy(), model.sr), 2)})
        print(f"  ✓ chatterbox: {j['out']} {results[-1]['sec']} s ({time.time() - t0:.0f} s o'tdi)", flush=True)
else:
    sys.exit(f"Noma'lum ovoz dvigateli: {engine}")
json.dump(results, open(res_path, "w"))
