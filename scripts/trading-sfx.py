# Trading Shorts uchun SFX va fon musiqasi (o'zimiz sintez qilamiz, litsenziya muammosi yo'q).
# Ishlatish: python3 scripts/trading-sfx.py  → public/trading/*.mp3
import numpy as np, subprocess, os
SR = 44100
OUT = 'public/trading'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)

def save(name, x, gain=0.9):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    x = x / (np.abs(x).max() + 1e-9) * gain
    raw = (x * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-b:a', '192k', f'{OUT}/{name}.mp3'], input=raw, check=True)

t = lambda d: np.arange(int(SR * d)) / SR
def env(d, a=0.005, r=None):
    n = int(SR * d); e = np.ones(n); na = max(1, int(SR * a)); e[:na] = np.linspace(0, 1, na)
    r = r or d; e *= np.exp(-np.arange(n) / (SR * r / 5)); return e
def lp(x, k):  # simple one-pole low-pass
    y = np.zeros_like(x); a = k
    for i in range(1, len(x)): y[i] = y[i - 1] + a * (x[i] - y[i - 1])
    return y

# whoosh: filtered noise sweep
d = 0.55; n = rng.standard_normal(int(SR * d)); x = t(d)
sweep = np.interp(x, [0, d * 0.6, d], [0.02, 0.35, 0.03]); y = np.zeros_like(n)
for i in range(1, len(n)): y[i] = y[i - 1] + sweep[i] * (n[i] - y[i - 1])
save('whoosh', y * np.sin(np.pi * x / d) ** 2, 0.7)
# pop: short sine blip
d = 0.12; x = t(d); save('pop', np.sin(2 * np.pi * (900 - 3000 * x) * x) * env(d, 0.002, 0.08), 0.7)
# tick: tiny click for counters / dots
d = 0.04; x = t(d); save('tick', np.sin(2 * np.pi * 2400 * x) * env(d, 0.001, 0.02), 0.45)
# boom: low hit with noise (red crash moments)
d = 1.2; x = t(d); sub = np.sin(2 * np.pi * (70 * np.exp(-x * 2.5) + 38) * x) * env(d, 0.003, 1.0)
noi = lp(rng.standard_normal(len(x)), 0.08) * env(d, 0.001, 0.25)
save('boom', sub + noi * 1.5, 0.95)
# ding: bright bell (rule / CTA)
d = 1.4; x = t(d); bell = sum(a * np.sin(2 * np.pi * f * x) for f, a in [(1320, 1), (2640, .4), (3960, .18), (1980, .25)])
save('ding', bell * env(d, 0.002, 1.2), 0.6)
# glitch: stuttered noise (loss / error)
d = 0.35; x = t(d); g = rng.standard_normal(len(x)) * (np.floor(x * 40) % 2) + np.sign(np.sin(2 * np.pi * 180 * x)) * 0.4
save('glitch', g * env(d, 0.001, 0.3), 0.55)

# background music: dark minimal pulse, 48 s, A minor, 100 bpm
D = 48; x = t(D); bpm = 100; beat = 60 / bpm
music = np.zeros_like(x)
for k in range(int(D / beat)):           # kick on every beat
    s = int(k * beat * SR); seg = t(0.35)
    hit = np.sin(2 * np.pi * (55 + 90 * np.exp(-seg * 30)) * seg) * np.exp(-seg * 9)
    music[s:s + len(seg)] += hit[: len(music) - s] * 0.9
for k in range(int(D / (beat / 2))):     # soft hats on 8ths
    s = int(k * beat / 2 * SR); seg = t(0.05); h = rng.standard_normal(len(seg)) * np.exp(-seg * 90)
    h = h - lp(h, 0.5)
    music[s:s + len(seg)] += h[: len(music) - s] * (0.10 if k % 2 else 0.05)
chords = [(220, 261.6, 329.6), (174.6, 220, 261.6), (196, 246.9, 293.7), (164.8, 207.7, 246.9)]
bar = beat * 4
for k in range(int(D / bar) + 1):        # pad
    s = int(k * bar * SR); seg = t(bar); ch = chords[k % 4]
    p = sum(np.sin(2 * np.pi * f * seg + np.sin(2 * np.pi * 0.3 * seg)) for f in ch) / 3
    p *= np.minimum(1, seg / 0.4) * np.minimum(1, (bar - seg) / 0.4)
    m = min(len(seg), len(music) - s)
    if m > 0: music[s:s + m] += p[:m] * 0.35
music *= np.minimum(1, x / 1.5) * np.minimum(1, (D - x) / 2)
save('music', music, 0.8)
print('ok')
