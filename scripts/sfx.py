"""Opus 5.5 videosi uchun original SFX trek (sintez, litsenziya kerak emas).

Ishga tushirish: python3 scripts/sfx.py src/videos/<nom>/timeline.json public/<nom>/sfx.mp3
timeline.json: fps, total, typing[{start,cps,text}], pop[], ding[], whoosh[] (kadrlarda).
"""
import json, math, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
T = json.load(open(os.path.join(ROOT, sys.argv[1])))
OUT = os.path.join(ROOT, sys.argv[2])
SR, FPS = 48000, T["fps"]
N = int(T["total"] / FPS * SR) + SR // 2
out = np.zeros(N)
rng = np.random.default_rng(7)

def env(n, a=0.002, d=0.05):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def key():  # mexanik klaviatura: qisqa shovqin + past "tak"
    n = int(0.045 * SR); t = np.arange(n) / SR
    s = rng.normal(0, 1, n) * env(n, 0.0005, 0.006) * 0.6
    s += np.sin(2 * np.pi * rng.uniform(1700, 2300) * t) * env(n, 0.0005, 0.004) * 0.5
    s += np.sin(2 * np.pi * 180 * t) * env(n, 0.001, 0.012) * 0.4
    return s * rng.uniform(0.6, 1.0)

def enter():
    n = int(0.09 * SR); t = np.arange(n) / SR
    return (rng.normal(0, 1, n) * env(n, 0.0005, 0.01) * 0.7 + np.sin(2 * np.pi * 120 * t) * env(n, 0.001, 0.03)) * 1.1

def pop():
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = 900 * np.exp(-t * 25) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.04) * 0.55

def ding():
    n = int(0.9 * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) * w for f, w in [(1318.5, 1), (1975.5, 0.5), (2637, 0.25)])
    return s * env(n, 0.002, 0.28) * 0.28

def whoosh():
    n = int(0.45 * SR); t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    k = np.exp(-((t - 0.22) ** 2) / 0.008)
    sm = np.convolve(noise, np.ones(24) / 24, mode="same")  # past chastotali shovqin
    return sm * k * 0.9

def put(sig, frame, gain=1.0):
    i = int(frame / FPS * SR)
    j = min(N, i + len(sig))
    out[i:j] += sig[: j - i] * gain

for t in T["typing"]:
    step = FPS / t["cps"]
    for c in range(len(t["text"])):
        if t["text"][c] != " ":
            put(key(), t["start"] + c * step + rng.uniform(-0.3, 0.3), 0.5)
    put(enter(), t["start"] + math.ceil(len(t["text"]) * FPS / t["cps"]) + 2, 0.6)
for f in T["pop"]:
    put(pop(), f, 0.5)
for f in T["ding"]:
    put(ding(), f, 0.6)
for f in T["whoosh"]:
    put(whoosh(), f - 6, 0.5)

# yumshoq fon "pad" (original): past akkord, juda past ovozda
t = np.arange(N) / SR
pad = sum(np.sin(2 * np.pi * f * t) for f in (110, 164.8, 220, 277.2)) / 4
pad *= (0.5 + 0.5 * np.sin(2 * np.pi * t / 8)) * 0.05
fade = np.minimum(1, t / 1.5) * np.minimum(1, (N / SR - t) / 1.5)
out += pad * fade

peak = np.max(np.abs(out)) or 1
out = out / peak * 0.5  # taxminan -6 dBFS cho'qqi
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wav = OUT[:-4] + ".wav"
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
import subprocess
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "128k", OUT], check=True)
os.remove(wav)
print(sys.argv[2], round(N / SR, 2), "s")
