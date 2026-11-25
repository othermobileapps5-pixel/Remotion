# THROUGH TIME — Giza: original documentary underscore (no samples), 302 s.
# Wordless female vocalise ("aah", formant synthesis, small choir) + duduk-like reed melody
# + low drone/string pad + soft frame drum + desert wind. No plucked "ting" notes.
# python3 scripts/giza_music.py -> public/audio/giza/music.wav
import numpy as np, wave, os
from scipy.signal import lfilter, butter

SR = 44100
T = 302.0
N = int(SR * T)
rng = np.random.default_rng(11)
out = np.zeros(N)

def t_(d): return np.arange(int(SR * d)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(at, sig, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if j > i: out[i:j] += sig[: j - i] * g
def lowpass(x, fc):
    b, a = butter(2, fc / (SR / 2)); return lfilter(b, a, x)
def bandpass(x, f, bw):
    lo, hi = max(30, f - bw / 2), min(SR / 2 - 100, f + bw / 2)
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], btype='band'); return lfilter(b, a, x)

def glide_freq(notes, d):
    """notes: list of (start_sec, midi) inside a phrase of length d; smooth portamento between them."""
    tt = t_(d); f = np.zeros(len(tt))
    pts = [(s, hz(m)) for s, m in notes] + [(d, hz(notes[-1][1]))]
    for (s0, f0), (s1, f1) in zip(pts, pts[1:]):
        i0, i1 = int(s0 * SR), int(s1 * SR)
        seg = np.arange(i1 - i0) / SR
        g = np.clip(seg / 0.18, 0, 1)  # 180 ms glide
        f[i0:i1] = f0
        if i0 > 0:
            prev = f[i0 - 1]
            f[i0:i1] = prev + (f0 - prev) * (g * g * (3 - 2 * g))
    return f

# --- female vocalise: glottal pulse -> "ah" formants, vibrato, breath ---
FORMANTS = [(850, 110, 1.0), (1220, 140, 0.55), (2810, 220, 0.25), (3600, 300, 0.12)]
def voice(notes, d, detune=1.0, vib_rate=5.3):
    tt = t_(d)
    f = glide_freq(notes, d) * detune
    vib = 1 + 0.012 * np.sin(2 * np.pi * vib_rate * tt + rng.uniform(0, 6)) * np.clip(tt / 0.8, 0, 1)
    jitter = 1 + 0.003 * lowpass(rng.standard_normal(len(tt)), 8)
    ph = 2 * np.pi * np.cumsum(f * vib * jitter) / SR
    # band-limited glottal-like source: sum of harmonics with -12 dB/oct tilt
    src = np.zeros(len(tt))
    for h in range(1, 14):
        src += np.sin(h * ph) / h ** 1.6
    src += lowpass(rng.standard_normal(len(tt)), 6000) * 0.04  # breath
    s = sum(g * bandpass(src, fc, bw) for fc, bw, g in FORMANTS)
    env = np.clip(tt / 0.9, 0, 1) * np.clip((d - tt) / 1.4, 0, 1)
    return s * env

def choir(notes, d, n=4):
    s = sum(voice(notes, d, detune=1 + rng.uniform(-0.006, 0.006), vib_rate=rng.uniform(4.8, 5.8)) for _ in range(n))
    return s / n

# --- duduk-like reed: saw source, warm lowpass, nasal formant, breath ---
def reed(notes, d):
    tt = t_(d)
    f = glide_freq(notes, d)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 4.5 * tt) * np.clip((tt - 0.6) / 1.0, 0, 1)
    ph = np.cumsum(f * vib) / SR
    saw = 2 * (ph % 1) - 1
    s = lowpass(saw, 1800) + 0.5 * bandpass(saw, 1100, 400)
    s += lowpass(rng.standard_normal(len(tt)), 3000) * 0.05
    env = np.clip(tt / 0.4, 0, 1) * np.clip((d - tt) / 0.9, 0, 1)
    return s * env

# 1) drone: D2 + A2, slow breathing
t = np.arange(N) / SR
drone = (np.sin(2*np.pi*hz(38)*t) + .5*np.sin(2*np.pi*hz(45)*t) + .25*np.sin(2*np.pi*hz(50)*t*1.001))
drone *= .55 + .45*np.sin(2*np.pi*t/23)**2
out += drone * .09

# 2) string pad: chords change every 16 s (D - Eb - D - C - Bb - A)
chords = [[50, 54, 57], [51, 55, 58], [50, 54, 57], [48, 52, 55], [46, 50, 53], [45, 49, 52]]
def pad(ms, d):
    tt = t_(d); s = np.zeros(len(tt))
    for m in ms:
        for det in (0.997, 1.0, 1.004):
            ph = rng.uniform(0, 6.28)
            s += np.sin(2*np.pi*hz(m+12)*det*tt + ph)
    s = lowpass(s, 1200)
    env = np.minimum(1, tt/4) * np.minimum(1, (d-tt)/4)
    return s * env / (len(ms)*3)
for k, st in enumerate(np.arange(0, T, 16)):
    add(st, pad(chords[k % len(chords)], 20), .20)

# 3) vocal phrases (D Phrygian dominant: D Eb F# G A Bb C D), long and sparse
V = [  # (start, length, [(offset, midi), ...])
    (6,   12, [(0, 69), (3, 70), (5.5, 69), (8, 66)]),
    (40,  14, [(0, 74), (3.5, 72), (6, 70), (9, 69)]),
    (78,  12, [(0, 67), (3, 69), (6, 70), (9, 69)]),
    (118, 14, [(0, 74), (2.5, 75), (5, 74), (8, 72), (10.5, 70)]),
    (160, 12, [(0, 69), (3, 70), (6, 72), (9, 74)]),
    (200, 14, [(0, 74), (3, 72), (6, 70), (9, 69), (11, 66)]),
    (240, 16, [(0, 69), (3, 70), (6, 69), (9, 66), (12, 62)]),
    (272, 22, [(0, 74), (4, 72), (8, 70), (12, 69), (16, 62)]),
]
for st, d, notes in V:
    add(st, choir(notes, d), 0.55)
    add(st + 0.05, choir([(o, m - 12) for o, m in notes], d, n=2), 0.18)  # soft octave below

# 4) duduk-like answers between vocal phrases
R = [
    (22, 10, [(0, 62), (2.5, 63), (4.5, 66), (7, 62)]),
    (58, 10, [(0, 69), (2, 67), (4, 66), (6.5, 62)]),
    (96, 12, [(0, 62), (3, 63), (5, 62), (8, 57)]),
    (138, 10, [(0, 66), (2.5, 67), (5, 69), (7, 66)]),
    (178, 12, [(0, 69), (3, 70), (6, 69), (9, 62)]),
    (218, 10, [(0, 62), (2.5, 63), (5, 66), (7.5, 62)]),
]
for st, d, notes in R:
    add(st, reed(notes, d), 0.22)

# 5) frame drum: soft low hits in the building section (40–230 s)
beat = 60 / 66
def drum():
    tt = t_(.6); f = 70 * np.exp(-tt*6) + 45
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt*9) + lowpass(rng.standard_normal(len(tt)), 900) * np.exp(-tt*30) * .3
k = 0
for p in np.arange(40, 230, beat):
    if k % 4 in (0, 3): add(p, drum(), .20 if k % 8 == 0 else .12)
    k += 1

# 6) desert wind bed
wind = lowpass(rng.standard_normal(N), 500) * (.5 + .5*np.sin(2*np.pi*t/17)**2)
out += wind * .05

# fades + normalise
out[: SR*3] *= np.linspace(0, 1, SR*3)
out[-SR*6:] *= np.linspace(1, 0, SR*6)
out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.3) * .8
os.makedirs('public/audio/giza', exist_ok=True)
with wave.open('public/audio/giza/music.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok', len(out)/SR)
