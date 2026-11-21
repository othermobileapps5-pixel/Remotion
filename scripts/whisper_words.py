# Whisper (bepul, mahalliy): videodan so'zlar va vaqtlari + ovoz eng baland 2–3 joy (zoom uchun).
# python3 scripts/whisper_words.py <16kHz mono WAV> [model] [til]   (WAV ni subtitr.mjs ffmpeg bilan tayyorlaydi)
import json, sys, wave
import numpy as np
from faster_whisper import WhisperModel

path = sys.argv[1]
model_name = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else "small"
lang = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None

sr = 16000
with wave.open(path, "rb") as wf:
    audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0

model = WhisperModel(model_name, device="cpu", compute_type="int8")
segments, info = model.transcribe(audio, word_timestamps=True, language=lang, vad_filter=True)
words = []
for seg in segments:
    for w in seg.words or []:
        t = w.word.strip()
        if t:
            words.append({"w": t, "s": round(w.start, 2), "e": round(w.end, 2)})

# Zoom joylari: 0.1 s lik bo'laklar bo'yicha ovoz kuchi, keskin ko'tarilgan 2–3 joy
dur = len(audio) / sr
win = sr // 10
n = len(audio) // win
zoomlar = []
if n > 30:
    rms = np.sqrt((audio[: n * win].reshape(n, win) ** 2).mean(axis=1))
    smooth = np.convolve(rms, np.ones(3) / 3, mode="same")
    base = np.convolve(rms, np.ones(20) / 20, mode="same") + 1e-6  # oldingi ~2 s fon
    score = smooth / base * (smooth > np.median(smooth))
    for i in np.argsort(-score):
        t = i / 10
        if t < 1.5 or t > dur - 2.8 or score[i] < 1.25:
            continue
        if all(abs(t - z["t"]) >= 4 for z in zoomlar):
            zoomlar.append({"t": round(float(t), 1), "x": 0.5, "y": 0.45})
        if len(zoomlar) >= 3:
            break
    zoomlar.sort(key=lambda z: z["t"])

print(json.dumps({"til": info.language, "words": words, "zoomlar": zoomlar, "duration": round(dur, 2)}, ensure_ascii=False))
