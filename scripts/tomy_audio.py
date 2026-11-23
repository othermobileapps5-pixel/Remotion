# «Tomy the Robot» uchun musiqa va effektlar — hammasi koddan (sintez), tekin, mualliflik huquqisiz.
#   python3 scripts/tomy_audio.py   →  public/audio/tomy/*.wav, music.mp3 (32 s, aylanma)
import os, subprocess, wave
import numpy as np

SR = 44100
OUT = 'public/audio/tomy'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)
T = lambda n: np.arange(n) / SR
note = lambda m: 440 * 2 ** ((m - 69) / 12)

def env(n, a=.005, r=.1):
    t = T(n); return np.minimum(1, t / a) * np.exp(-t / r)
def sq(f, n, duty=.5):
    ph = (np.cumsum(np.full(n, f)) / SR) % 1; return np.where(ph < duty, 1., -1.)
def tri(f, n):
    ph = (np.cumsum(np.full(n, f)) / SR) % 1; return 4 * np.abs(ph - .5) - 1
def sweep(f0, f1, dur, kind='sin'):
    n = int(dur * SR); f = np.geomspace(f0, f1, n); ph = np.cumsum(f) / SR
    return np.sin(2 * np.pi * ph) if kind == 'sin' else np.where(ph % 1 < .5, 1., -1.)
def add(buf, t0, sig, g=1):
    i = int(t0 * SR); j = min(len(buf), i + len(sig))
    if i < len(buf): buf[i:j] += sig[:j - i] * g
def save(name, x, peak=.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
def buf(d): return np.zeros(int(d * SR))

# ---------- effektlar ----------
b = buf(.12); add(b, 0, sweep(900, 320, .09) * env(int(.09 * SR), .001, .04)); save('pop', b)
n = int(.5 * SR); tt = T(n); f = 300 + 120 * np.sin(2 * np.pi * 14 * tt) * np.exp(-tt / .2)
save('boing', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .18))
n = int(.5 * SR); nz = np.convolve(rng.standard_normal(n), np.ones(12) / 12, 'same'); save('whoosh', nz * np.sin(np.pi * T(n) / .5) ** 2, .7)
n = int(.7 * SR); save('powerup', sweep(200, 1400, .7, 'sq') * np.linspace(.3, 1, n) * env(n, .01, 1.5), .5)
def chime_sig(notes, gap=.07, dur=1.0):
    b = buf(dur + gap * len(notes))
    for i, m in enumerate(notes):
        n = int(.6 * SR); t = T(n)
        add(b, i * gap, np.sin(2 * np.pi * note(m) * t) * env(n, .002, .25) + .3 * np.sin(4 * np.pi * note(m) * t) * env(n, .002, .12))
    return b
save('chime', chime_sig([84, 88, 91, 96]), .7)
save('magic', chime_sig([76, 79, 83, 88, 91, 95, 100], .06), .7)
save('shimmer', chime_sig([72, 74, 76, 79, 81, 84, 86, 88, 91], .12), .6)
n = int(.3 * SR); tt = T(n)
save('thud', np.sin(2 * np.pi * np.cumsum(np.geomspace(140, 45, n)) / SR) * np.exp(-tt / .08))
n = int(1.2 * SR); tt = T(n); hum = sq(90, n) * .5 + np.sin(2 * np.pi * 180 * tt) * .5
save('motor', hum * np.sin(np.pi * tt / 1.2) * (0.7 + .3 * np.sin(2 * np.pi * 8 * tt)), .5)
b = buf(.9)
for k, t0 in enumerate([0, .18, .5]):
    n = int(.12 * SR); tt = T(n); f = 2600 + 900 * np.sin(np.pi * tt / .12) + 300 * np.sin(2 * np.pi * 40 * tt)
    add(b, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / .12))
save('tweet', b, .6)
b = buf(.6); r = np.random.default_rng(1); t = 0
for i in range(5):
    d = .06 + .04 * r.random(); n = int(d * SR); add(b, t, sq(900 * 2 ** (r.integers(-4, 6) / 12), n) * env(n, .003, .05)); t += d + .025
save('beep', b, .5)
b = buf(.3); add(b, 0, sweep(500, 1500, .15) * env(int(.15 * SR), .002, .1)); add(b, .12, sweep(300, 120, .1) * env(int(.1 * SR), .001, .05)); save('hatch', b, .6)
n = int(.3 * SR); tt = T(n); f = 1400 + 500 * np.sin(np.pi * tt / .3)
save('squeak', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / .3), .7)
n = int(3.0 * SR); tt = T(n); nz = rng.standard_normal(n); nz = nz - np.convolve(nz, np.ones(6) / 6, 'same')
gr = (rng.random(n) < .002).astype(float); gr = np.convolve(gr, np.exp(-np.arange(400) / 60), 'same')
save('water', (nz * .25 + gr * .6 * rng.standard_normal(n)) * np.clip(tt / .2, 0, 1) * np.clip((3.0 - tt) / .4, 0, 1), .5)
n = int(2.2 * SR); tt = T(n); nz = np.convolve(rng.standard_normal(n), np.ones(40) / 40, 'same')
save('snore', nz * (np.sin(np.pi * np.clip(tt / 1.0, 0, 1)) + np.sin(np.pi * np.clip((tt - 1.2) / 1.0, 0, 1))) * (0.6 + .4 * np.sin(2 * np.pi * 30 * tt)), .6)

# ---------- musiqa: 120 bpm, C–G–Am–F, 16 takt = 32 s (aylanma) ----------
beat = .5; bars = 16; D = bars * 4 * beat
mus = buf(D + 1.0)
chords = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]
scale = [60, 62, 64, 67, 69, 72, 74, 76]
for bar in range(bars):
    t0 = bar * 4 * beat; ch = chords[bar % 4]
    for k in range(4):
        n = int(beat * .9 * SR); add(mus, t0 + k * beat, tri(note(ch[0] - 12 + (7 if k % 2 else 0)), n) * env(n, .005, .25), .32)
        n = int(.18 * SR); add(mus, t0 + k * beat + beat / 2, sum(sq(note(m + 12), n) for m in ch) / 3 * env(n, .003, .08), .05)
        n = int(.25 * SR); tt = T(n)
        add(mus, t0 + k * beat, np.sin(2 * np.pi * np.cumsum(np.geomspace(150, 45, n)) / SR) * np.exp(-tt / .09), .5)
        if k % 2: m = int(.15 * SR); add(mus, t0 + k * beat, rng.standard_normal(m) * env(m, .001, .05), .16)
        for h in range(2):
            m = int(.04 * SR); nz = np.diff(rng.standard_normal(m), prepend=0) * env(m, .001, .012); add(mus, t0 + k * beat + h * beat / 2, nz, .06)
    r = np.random.default_rng(bar % 8)
    for k in range(8):
        if r.random() < .3: continue
        m = scale[r.integers(0, len(scale))]; n = int(beat / 2 * .9 * SR)
        add(mus, t0 + k * beat / 2, (sq(note(m), n, .25) * .5 + np.sin(2 * np.pi * note(m) * T(n)) * .5) * env(n, .005, .18), .09)
# dumni boshiga qo'shamiz — aylanma choksiz
tail = mus[int(D * SR):].copy(); mus = mus[:int(D * SR)]; mus[:len(tail)] += tail
mus = np.tanh(mus * 1.2); mus = mus / np.max(np.abs(mus)) * .9
with wave.open('/tmp/tomy_music.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/tomy_music.wav', '-ac', '2', '-b:a', '160k', f'{OUT}/music.mp3'], check=True)
print('ok')
