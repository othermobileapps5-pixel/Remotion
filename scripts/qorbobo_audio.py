# Qor Bobo: qishki alla (celesta / music box + torlar, D major, 70 bpm) va sahna SFX — bitta trek.
# python3 scripts/qorbobo_audio.py -> public/audio/qorbobo/music.wav (keyin mp3)
import numpy as np, wave, os

SR = 44100
T = 72.0
N = int(SR * T)
rng = np.random.default_rng(7)
mus = np.zeros(N)
sfx = np.zeros(N)

def t_(d): return np.arange(int(SR * d)) / SR
def add(buf, at, sig, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if j > i: buf[i:j] += sig[: j - i] * g
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, a):  # bir qutbli past filtr
    y = np.empty_like(x); s = 0.0
    for k in range(len(x)): s += a * (x[k] - s); y[k] = s
    return y
def noise(d): return rng.standard_normal(int(SR * d))

def musicbox(m, d=2.2):
    t = t_(d); f = hz(m)
    s = np.sin(2*np.pi*f*t) + .35*np.sin(2*np.pi*2*f*t) + .12*np.sin(2*np.pi*4.02*f*t)
    return s * np.exp(-t * 2.6) * np.minimum(1, t * 400)
def pad(ms, d):
    t = t_(d); s = sum(np.sin(2*np.pi*hz(m)*t) + .3*np.sin(2*np.pi*hz(m)*1.003*t) for m in ms)
    env = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 1.5)
    return s * env / len(ms)

beat = 60 / 70
bar = beat * 4
# D - Bm - G - A
chords = [[50, 54, 57], [47, 50, 54], [43, 47, 50], [45, 49, 52]]
melody = [[74, 73, 71, 69], [71, 69, 66, 69], [67, 69, 71, 74], [73, 71, 69, 76]]

def level(sec):  # S1-3 sokin, S4 dan iliqroq, S6 o'sadi, S7 cho'qqi
    return float(np.interp(sec, [0, 30, 40, 50, 60, 66, 70, 72], [.45, .5, .7, .75, 1.0, 1.15, .9, 0]))

nbars = int(T / bar)
for b in range(nbars):
    st = b * bar; c = chords[b % 4]; g = level(st)
    add(mus, st, pad([m + 12 for m in c], bar + .3), .16 * g * (1 if st >= 30 else .6))
    for k, m in enumerate(melody[b % 4]):
        add(mus, st + k * beat, musicbox(m), .22 * g)
        if st >= 50:
            add(mus, st + k * beat + beat / 2, musicbox(c[k % 3] + 24, 1.4), .09 * g)

# --- SFX ---
def bells(d, g):
    out = np.zeros(int(SR * d))
    for k in np.arange(0, d, .11):
        for f in (2600, 3400, 4300):
            s = np.sin(2*np.pi*f*t_(.35) * rng.uniform(.98, 1.02)) * np.exp(-t_(.35) * 14)
            i = int(k * SR); out[i:i+len(s)] += s[: len(out) - i] * rng.uniform(.3, 1)
    return out * g
def wind(d):
    x = lp(noise(d), .02); m = .5 + .5 * np.sin(2*np.pi*.15*t_(d))
    return x * m * np.minimum(1, t_(d)/1.5) * np.minimum(1, (d - t_(d))/1.5)
def click(): return noise(.02) * np.exp(-t_(.02) * 300)
def rustle(d): return lp(noise(d), .25) * (.4 + .6 * np.abs(np.sin(2*np.pi*3*t_(d))))
def crunch(): x = lp(noise(.18), .5); return x * np.exp(-t_(.18) * 18)
def chime(): return sum(np.sin(2*np.pi*f*t_(3)) * np.exp(-t_(3)*1.2) for f in (1568, 2093, 2637, 3136)) / 4

add(sfx, .3, bells(4, 1), .05);  add(sfx, 0, wind(10), .5)
for k in np.arange(10.5, 19.5, .42): add(sfx, k, click(), .25)       # to'qish ignasi
for k in rng.uniform(10.5, 19.5, 25): add(sfx, k, click(), .08)       # sham chirsillashi
add(sfx, 20.5, rustle(1.8), .18); add(sfx, 23.5, rustle(1.2), .14); add(sfx, 20, wind(10), .45)
add(sfx, 33.2, lp(noise(.25), .1) * np.exp(-t_(.25)*12), 1.2)        # eshik zarbi
add(sfx, 33.3, lp(noise(1.2), .08) * np.sin(np.pi*t_(1.2)/1.2), .6)  # iliq shamol
for k in np.arange(31, 39.5, .5): add(sfx, k, crunch(), .18)          # qorda qadam
for k in (41, 41.6, 42.4): add(sfx, k, crunch(), .15)
add(sfx, 43.5, rustle(2.5), .06)
add(sfx, 52, chime(), .35)
for k in rng.uniform(52.5, 59.5, 40): add(sfx, k, musicbox(rng.integers(88, 100), .6), .05)  # yaltirash
add(sfx, 60, pad([62, 66, 69, 74], 10) * (1 + .2*np.sin(2*np.pi*5*t_(10))), .22)            # xor
b = bells(9, 1) * np.linspace(1, 0, int(SR * 9)); add(sfx, 61, b, .04)

out = mus + sfx
out[int(69*SR):] *= np.linspace(1, 0, N - int(69*SR))
out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.4) * .85
os.makedirs('public/audio/qorbobo', exist_ok=True)
with wave.open('public/audio/qorbobo/music.wav', 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok')
