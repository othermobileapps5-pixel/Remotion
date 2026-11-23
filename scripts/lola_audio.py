# «Lola and the Perfect Picture» uchun musiqa va effektlar — koddan sintez, tekin.
#   python3 scripts/lola_audio.py  →  public/audio/lola/*.wav, music.mp3 (aylanma)
import os, subprocess, wave
import numpy as np

SR = 44100
OUT = 'public/audio/lola'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
T = lambda n: np.arange(n) / SR
note = lambda m: 440 * 2 ** ((m - 69) / 12)

def env(n, a=.005, r=.1):
    t = T(n); return np.minimum(1, t / a) * np.exp(-t / r)
def sweep(f0, f1, dur):
    n = int(dur * SR); f = np.geomspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def add(buf, t0, sig, g=1):
    i = int(t0 * SR); j = min(len(buf), i + len(sig))
    if i < len(buf): buf[i:j] += sig[:j - i] * g
def save(name, x, peak=.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
def buf(d): return np.zeros(int(d * SR))
def lp(x, k=8): return np.convolve(x, np.ones(k) / k, 'same')

# ---- effektlar ----
b = buf(.12); n = int(.05 * SR); add(b, 0, lp(rng.standard_normal(n), 2) * env(n, .0005, .012)); add(b, 0, np.sin(2 * np.pi * 1800 * T(n)) * env(n, .0005, .01), .4); save('heel', b, .6)
n = int(.25 * SR); tt = T(n); save('kiss', np.sin(2 * np.pi * np.cumsum(np.geomspace(500, 1400, n)) / SR) * np.sin(np.pi * tt / .25) ** 2, .5)
b = buf(.25); n = int(.03 * SR); add(b, 0, rng.standard_normal(n) * env(n, .0005, .008)); add(b, .07, rng.standard_normal(n) * env(n, .0005, .02), .8); save('shutter', b, .7)
n = int(.45 * SR); save('whoosh', lp(rng.standard_normal(n), 14) * np.sin(np.pi * T(n) / .45) ** 2, .6)
b = buf(.12); add(b, 0, sweep(900, 300, .09) * env(int(.09 * SR), .001, .04)); save('pop', b)
# yomg'ir (aylanma, 6 s)
n = int(6 * SR); r = rng.standard_normal(n); r = r - lp(r, 3); drops = (rng.random(n) < .0015).astype(float); drops = np.convolve(drops, np.exp(-np.arange(300) / 40), 'same') * rng.standard_normal(n)
rr = lp(r, 2) * .35 + drops * .5; fade = int(.3 * SR); rr[:fade] *= np.linspace(0, 1, fade); rr[-fade:] *= np.linspace(1, 0, fade); rr[:fade] += rr[-fade:][::-1] * 0
save('rain', rr, .5)
n = int(.35 * SR); tt = T(n); save('thud', np.sin(2 * np.pi * np.cumsum(np.geomspace(140, 40, n)) / SR) * np.exp(-tt / .09) + lp(rng.standard_normal(n), 30) * np.exp(-tt / .05) * .5)
n = int(.3 * SR); save('rip', lp(rng.standard_normal(n), 3) * np.linspace(1, .2, n) * (0.6 + .4 * np.sign(np.sin(2 * np.pi * 60 * T(n)))), .5)
b = buf(.15); add(b, 0, sweep(500, 250, .06) * env(int(.06 * SR), .001, .03)); save('bounce', b, .6)
n = int(.7 * SR); tt = T(n); save('splash', lp(rng.standard_normal(n), 4) * np.exp(-tt / .18) + lp(rng.standard_normal(n), 20) * np.exp(-tt / .3) * .6, .8)
n = int(.6 * SR); tt = T(n); save('buzz', np.sign(np.sin(2 * np.pi * 150 * tt)) * (np.sin(2 * np.pi * 8 * tt) > 0) * .5 * np.minimum(1, (0.6 - tt) * 10), .4)
def chime_sig(notes, gap=.07):
    b = buf(1.0 + gap * len(notes))
    for i, m in enumerate(notes):
        n = int(.7 * SR); t = T(n); add(b, i * gap, np.sin(2 * np.pi * note(m) * t) * env(n, .002, .3) + .3 * np.sin(4 * np.pi * note(m) * t) * env(n, .002, .12))
    return b
save('chime', chime_sig([84, 88]), .5)
save('magic', chime_sig([76, 79, 83, 88, 91, 95], .07), .6)
# odamlar g'o'ng'irlashi (aylanma 6 s)
n = int(6 * SR); mur = np.zeros(n)
for k in range(8):
    f0 = 140 + rng.random() * 120; ph = np.cumsum(f0 * (1 + .08 * np.sin(2 * np.pi * (2 + rng.random() * 3) * T(n)))) / SR
    am = (np.sin(2 * np.pi * (1.5 + rng.random() * 2) * T(n) + rng.random() * 6) > .2).astype(float); am = lp(am, 2000)
    mur += np.sin(2 * np.pi * ph) * am * lp(rng.standard_normal(n), 6) * 2
save('chatter', lp(mur, 6), .5)
n = int(.5 * SR); save('whisper', lp(rng.standard_normal(n), 2) * np.sin(np.pi * T(n) / .5) * (0.5 + .5 * np.sin(2 * np.pi * 9 * T(n))), .35)

# ---- musiqa: yengil, 96 bpm, F–Dm–Bb–C, 16 takt = 40 s (aylanma) ----
bpm = 96; beat = 60 / bpm; bars = 16; D = bars * 4 * beat
mus = buf(D + 1.5)
chords = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]]
mel = [72, 74, 76, 77, 79, 81, 84]
def pluck(f, dur):
    n = int(dur * SR); t = T(n)
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)) * env(n, .003, .25)
for bar in range(bars):
    t0 = bar * 4 * beat; ch = chords[bar % 4]
    for k in range(4):
        add(mus, t0 + k * beat, pluck(note(ch[0] - 12), beat * .95), .35)
        for j, m in enumerate(ch): add(mus, t0 + k * beat + beat / 2 + j * .02, pluck(note(m), beat * .6), .08)
    r = np.random.default_rng(100 + bar % 8)
    for k in range(8):
        if r.random() < .4: continue
        m = mel[r.integers(0, len(mel))]
        add(mus, t0 + k * beat / 2, pluck(note(m), beat), .14)
    # yengil shaqildoq
    for k in range(8):
        n = int(.03 * SR); add(mus, t0 + k * beat / 2, np.diff(rng.standard_normal(n), prepend=0) * env(n, .001, .01), .05)
tail = mus[int(D * SR):].copy(); mus = mus[:int(D * SR)]; mus[:len(tail)] += tail
mus = np.tanh(mus * 1.3); mus = mus / np.max(np.abs(mus)) * .9
with wave.open('/tmp/lola_music.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/lola_music.wav', '-ac', '2', '-b:a', '160k', f'{OUT}/music.mp3'], check=True)
print('ok')
