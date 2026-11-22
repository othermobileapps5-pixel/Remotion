# Uzun video uchun SFX yo'lagi: sahna almashganda «whoosh», ovoz keskin ko'tarilgan urg'u joylarda «pop».
# python3 scripts/sfx_track.py <to'liq ovoz 16k mono wav> <sahna kesimlari json> <imzo oynalari json> <chiqish wav> <davomiylik>
import json, sys, wave
import numpy as np

audio_wav, cuts_json, wins_json, out_wav, dur = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5])
cuts = json.load(open(cuts_json))
wins = json.load(open(wins_json))
SR = 44100
GAP = 8.0  # ikki effekt orasida kamida shuncha sekund

def load(p):
    with wave.open(p, "rb") as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() == 2:
            a = a.reshape(-1, 2).mean(axis=1)
        return a, w.getframerate()

def in_window(t):
    return any(w["start"] - 0.8 <= t <= w["start"] + w["len"] + 0.8 for w in wins)

# Urg'u joylari: 0.1 s bo'laklar, oldingi ~3 s ga nisbatan keskin ko'tarilish
peaks = []
if audio_wav != "-":
    a, sr = load(audio_wav)
    win = sr // 10
    n = len(a) // win
    if n > 50:
        rms = np.sqrt((a[: n * win].reshape(n, win) ** 2).mean(axis=1))
        smooth = np.convolve(rms, np.ones(3) / 3, mode="same")
        base = np.array([rms[max(0, i - 30): i].mean() if i > 0 else rms[0] for i in range(n)]) + 1e-6
        score = smooth / base * (smooth > np.percentile(smooth, 60))
        for i in np.argsort(-score):
            if score[i] < 1.8:
                break
            peaks.append(round(i / 10, 2))

# Hodisalar: avval sahna kesimlari (whoosh), keyin urg'ular (pop); oraliq ≥ GAP, imzo oynalaridan tashqarida
events = []
def free(t):
    return 1.0 < t < dur - 1.0 and not in_window(t) and all(abs(t - e[0]) >= GAP for e in events)
for t in sorted(cuts):
    if free(t):
        events.append((t, "whoosh"))
for t in peaks:
    if free(t):
        events.append((t, "pop"))
events.sort()

sfx = {k: load(f"public/audio/shorts/{k}.wav") for k in ("whoosh", "pop")}
vol = {"whoosh": 0.22, "pop": 0.14}
lead = {"whoosh": 0.35, "pop": 0.0}  # whoosh kesimdan sal oldin boshlanadi
track = np.zeros(int(dur * SR) + SR, dtype=np.float32)
for t, k in events:
    s, sr = sfx[k]
    if sr != SR:
        s = np.interp(np.arange(0, len(s), sr / SR), np.arange(len(s)), s)
    i = max(0, int((t - lead[k]) * SR))
    j = min(len(track), i + len(s))
    track[i:j] += s[: j - i] * vol[k]
track = np.clip(track[: int(dur * SR)], -1, 1)
with wave.open(out_wav, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((track * 32767).astype(np.int16).tobytes())
print(json.dumps({"whoosh": sum(1 for e in events if e[1] == "whoosh"), "pop": sum(1 for e in events if e[1] == "pop")}))
