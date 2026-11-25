# THROUGH TIME — Giza: original documentary underscore (no samples), 302 s.
# Low drone + string pad (D Phrygian dominant colour) + slow plucked oud-like notes + soft frame drum.
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

# 1) drone: D2 + A2, slow breathing
t = np.arange(N) / SR
drone = (np.sin(2*np.pi*hz(38)*t) + .5*np.sin(2*np.pi*hz(45)*t) + .25*np.sin(2*np.pi*hz(50)*t*1.001))
drone *= .55 + .45*np.sin(2*np.pi*t/23)**2
out += drone * .10

# 2) string pad: chords change every 16 s (D - Eb - D - C - Bb - A)
chords = [[50, 54, 57], [51, 55, 58], [50, 54, 57], [48, 52, 55], [46, 50, 53], [45, 49, 52]]
def pad(ms, d):
    tt = t_(d); s = np.zeros(len(tt))
    for m in ms:
        for det in (0.997, 1.0, 1.004):
            ph = rng.uniform(0, 6.28)
            s += np.sign(np.sin(2*np.pi*hz(m+12)*det*tt + ph)) * .15 + np.sin(2*np.pi*hz(m+12)*det*tt + ph)
    s = lowpass(s, 1400)
    env = np.minimum(1, tt/4) * np.minimum(1, (d-tt)/4)
    return s * env / (len(ms)*3)
for k, st in enumerate(np.arange(0, T, 16)):
    add(st, pad(chords[k % len(chords)], 20), .22)

# 3) plucked notes (Karplus-Strong-ish via decaying harmonics), D Phrygian dominant scale
scale = [62, 63, 66, 67, 69, 70, 72, 74]
def pluck(m, d=2.5):
    tt = t_(d); f = hz(m)
    s = sum((1/(h**1.3)) * np.sin(2*np.pi*f*h*tt) * np.exp(-tt*(2.5+h*1.2)) for h in range(1, 7))
    return s * np.minimum(1, tt*600)
beat = 60/66
pos = 8.0
while pos < T - 6:
    sec = pos
    density = np.interp(sec, [0, 60, 150, 240, 290, 302], [.25, .45, .6, .5, .3, 0])
    if rng.random() < density:
        m = int(rng.choice(scale)) + (12 if rng.random() < .2 else 0)
        add(pos, pluck(m), .16)
    pos += beat / 2

# 4) frame drum: soft low hits, only in the building section (40–230 s)
def drum():
    tt = t_(.6); f = 70 * np.exp(-tt*6) + 45
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt*9) + lowpass(rng.standard_normal(len(tt)), 900) * np.exp(-tt*30) * .3
k = 0
for p in np.arange(40, 230, beat):
    if k % 4 in (0, 3): add(p, drum(), .22 if k % 8 == 0 else .14)
    k += 1

# 5) desert wind bed
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
