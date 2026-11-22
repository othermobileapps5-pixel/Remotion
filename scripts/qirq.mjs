// Qirqish: uzun videodan eng yaxshi 2–3 sahnani topib, har biriga ball (1–10) qo'yadi va Shorts uchun tayyorlaydi.
//   • Nutq — Whisper (bepul, scripts/whisper_words.py): so'zlar va vaqtlari.
//   • Tanlash — GEMINI_API_KEY bo'lsa Gemini matn bo'yicha tanlaydi (arzon, faqat matn yuboriladi; ball, sabab, hook);
//     bo'lmasa yoki xato bo'lsa — mahalliy hisob: ovoz kuchi, gap zichligi, keskin joylar, uzunlik.
//   • Har sahna ffmpeg bilan kesiladi → public/qirq/<nom>-<k>.mp4 va videos/<nom>-<k>.json (shorts/klip: hook, subtitr, zoom).
//     Subtitr Whisper natijasidan olinadi — qayta hisoblanmaydi.
// Ishlatish: node scripts/qirq.mjs <public ichidagi video> <soni 2|3> <nom> [--til uz] [--hook "matn"]
// Natija ro'yxati: out/qirq.json (workflow Telegram'ga ball bilan yuboradi).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] || '' : '';
};
const [src, soniArg, nom] = args;
if (!src || !nom) {
  console.error('Foydalanish: node scripts/qirq.mjs <public ichidagi video> <soni> <nom> [--til uz] [--hook "matn"]');
  process.exit(1);
}
const SONI = Math.max(1, Math.min(3, Number(soniArg) || 3));
const TIL = opt('til');
const HOOK = opt('hook');
const KEY = process.env.GEMINI_API_KEY;
const MIN = 20; // sahna uzunligi, soniya
const MAX = 58;
const PAD_BOSH = 0.15;
const PAD_OXIR = 0.35;

const file = path.join('public', src);
if (!fs.existsSync(file)) throw new Error(`Video topilmadi: ${file}`);

// ffmpeg / ffprobe: tizimdagi yoki Remotion bilan keladigani
const run = (bin, a, o = {}) => {
  try {
    return execFileSync(bin, a, { maxBuffer: 256 * 1024 * 1024, ...o });
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return execFileSync('npx', ['remotion', bin, ...a], { maxBuffer: 256 * 1024 * 1024, ...o });
  }
};
const probe = (f) => {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', f]).toString());
  const v = (j.streams || []).find((s) => s.width) || {};
  return { duration: Number(j.format.duration), width: v.width, height: v.height };
};

const meta = probe(file);
console.log(`▶ ${src}: ${meta.duration.toFixed(1)} s, ${meta.width}×${meta.height}`);

// ---------- 1. Ovoz: Whisper so'zlari + har 0.5 s ovoz kuchi ----------
const wav = path.join(os.tmpdir(), `qirq-${process.pid}.wav`);
run('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], { stdio: 'inherit' });
console.log('▶ Whisper (nutq matni)…');
const wh = JSON.parse(run('python3', ['scripts/whisper_words.py', wav, process.env.WHISPER_MODEL || 'small', TIL]).toString());
const words = wh.words || [];
const til = TIL || wh.til || 'en';

const pcm = fs.readFileSync(wav);
const dataAt = pcm.indexOf('data') + 8; // WAV sarlavhasidan keyin
const samples = new Int16Array(pcm.buffer.slice(pcm.byteOffset + dataAt, pcm.byteOffset + pcm.length - ((pcm.length - dataAt) % 2)));
const STEP = 8000; // 0.5 s
const rms = [];
for (let i = 0; i + STEP <= samples.length; i += STEP) {
  let s = 0;
  for (let k = i; k < i + STEP; k++) s += samples[k] * samples[k];
  rms.push(Math.sqrt(s / STEP) / 32768);
}
fs.rmSync(wav, { force: true });
const median = (a) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? b[Math.floor(b.length / 2)] : 0;
};
const rmsMed = median(rms) || 1e-6;
const rmsAt = (t) => rms[Math.min(rms.length - 1, Math.max(0, Math.floor(t * 2)))] || 0;

// ---------- 2. Gaplar ----------
const gaplar = [];
let cur = null;
for (const w of words) {
  if (cur && (w.s - cur.e > 0.7 || cur.n >= 28)) {
    gaplar.push(cur);
    cur = null;
  }
  if (!cur) cur = { s: w.s, e: w.e, text: '', n: 0 };
  cur.text += (cur.text ? ' ' : '') + w.w;
  cur.e = w.e;
  cur.n++;
  if (/[.!?…]["»”']?$/.test(w.w)) {
    gaplar.push(cur);
    cur = null;
  }
}
if (cur) gaplar.push(cur);
console.log(`  til=${til}, ${words.length} so'z, ${gaplar.length} gap`);

// ---------- 3. Nomzod sahnalar va mahalliy ball ----------
const avgDensity = words.length / Math.max(1, meta.duration);
function mahalliyBall(s, e) {
  const len = e - s;
  const parts = rms.slice(Math.floor(s * 2), Math.ceil(e * 2));
  const energy = parts.reduce((a, b) => a + b, 0) / Math.max(1, parts.length) / rmsMed; // ~1 — o'rtacha
  const peaks = parts.filter((v, i) => v > rmsMed * 1.8 && v >= (parts[i - 1] || 0) && v >= (parts[i + 1] || 0)).length / (len / 10);
  const ws = words.filter((w) => w.s >= s && w.e <= e);
  const density = ws.length / len / Math.max(0.1, avgDensity); // ~1 — o'rtacha
  const nutq = ws.reduce((a, w) => a + (w.e - w.s), 0) / len; // gapirilgan ulush
  const first = gaplar.find((g) => g.s >= s - 0.01);
  const hook = first && /[?!]/.test(first.text) ? 1 : 0;
  const lenFit = len >= 28 && len <= 46 ? 1 : 1 - Math.min(1, Math.abs(len - 37) / 30);
  const raw =
    2.2 * Math.min(1.6, energy) + 1.6 * Math.min(1.5, density) + 0.8 * Math.min(2, peaks) + 2.0 * Math.min(1, nutq) + 1.2 * hook + 1.5 * lenFit;
  return Math.max(1, Math.min(10, Math.round(raw * 10) / 10)); // taxminan 2…10
}

const nomzodlar = [];
if (gaplar.length >= 2) {
  for (let i = 0; i < gaplar.length; i++) {
    for (let j = i; j < gaplar.length; j++) {
      const s = gaplar[i].s;
      const e = gaplar[j].e;
      if (e - s > MAX) break;
      if (e - s >= MIN) nomzodlar.push({ s, e, bi: i, oi: j });
    }
  }
}
// Nutq kam bo'lsa (musiqa, manzara) — 30 s lik oynalar, ovoz kuchi bo'yicha
if (!nomzodlar.length) {
  const L = Math.min(30, meta.duration);
  for (let s = 0; s + L <= meta.duration + 0.01; s += 5) nomzodlar.push({ s, e: s + L });
}
for (const c of nomzodlar) c.ball = mahalliyBall(c.s, c.e);

const ustma = (a, b) => a.s < b.e && b.s < a.e;
function enYaxshi(list, n) {
  const out = [];
  for (const c of [...list].sort((a, b) => b.ball - a.ball)) {
    if (out.every((o) => !ustma(o, c))) out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

// ---------- 4. Gemini tanlovi (ixtiyoriy) ----------
async function geminiTanlov() {
  if (!KEY || gaplar.length < 3) return null;
  const qatorlar = gaplar.map((g, i) => `[${i}] ${g.s.toFixed(1)}-${g.e.toFixed(1)}: ${g.text}`);
  let matn = qatorlar.join('\n');
  if (matn.length > 120000) matn = matn.slice(0, 120000);
  const prompt = `Below is a video transcript split into numbered sentences with start-end seconds.
Pick the ${SONI} BEST moments to cut into standalone vertical Shorts (TikTok/Reels/YouTube Shorts).
Rules:
- Each clip = a continuous range of sentences [bosh..oxir], ${MIN}-${MAX} seconds long, clips must not overlap.
- Prefer: a strong first line (hook), a complete thought with a payoff, emotion, surprise, humor, a useful tip.
- Avoid clips that start mid-thought or need earlier context.
- ball: 1-10 (10 = will go viral). Be honest and different per clip.
- sabab: why it is good, in Uzbek (Latin), max 12 words.
- hook: a short on-screen title for the clip, max 6 words, in the transcript language.
Return ONLY JSON: {"klips":[{"bosh":0,"oxir":3,"ball":8.5,"sabab":"...","hook":"..."}]}

Transcript:
${matn}`;
  for (const model of ['gemini-3.8-flash', 'gemini-2.5-flash']) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.log(`  Gemini ${model}: ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
        if (res.status === 402) return null;
        continue;
      }
      const txt = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      const out = JSON.parse(txt.replace(/^```(json)?|```$/g, '').trim());
      const klips = [];
      for (const k of out.klips || []) {
        const bi = Math.max(0, Math.min(gaplar.length - 1, Number(k.bosh)));
        const oi = Math.max(bi, Math.min(gaplar.length - 1, Number(k.oxir)));
        let s = gaplar[bi].s;
        let e = gaplar[oi].e;
        if (e - s > MAX + 5) e = s + MAX; // juda uzun — kesamiz
        if (e - s < 8) continue; // yaroqsiz
        const c = { s, e, ball: Math.max(1, Math.min(10, Number(k.ball) || mahalliyBall(s, e))), sabab: String(k.sabab || ''), hook: String(k.hook || ''), gemini: true };
        if (klips.every((o) => !ustma(o, c))) klips.push(c);
      }
      if (klips.length) {
        console.log(`  Gemini (${model}) ${klips.length} ta sahna tanladi`);
        return klips.slice(0, SONI);
      }
    } catch (e) {
      console.log(`  Gemini xatosi: ${e.message}`);
    }
  }
  return null;
}

let tanlov = await geminiTanlov();
if (!tanlov) {
  console.log('  Mahalliy hisob bilan tanlanmoqda (ovoz kuchi, gap zichligi, keskin joylar)');
  tanlov = enYaxshi(nomzodlar, SONI);
}
// Video juda qisqa bo'lsa — butun video bitta sahna
if (!tanlov.length) tanlov = [{ s: 0, e: meta.duration, ball: mahalliyBall(0, meta.duration) }];
// Gemini yetarli bermasa — mahalliy nomzodlardan to'ldiramiz
if (tanlov.length < SONI) for (const c of enYaxshi(nomzodlar.filter((c) => tanlov.every((o) => !ustma(o, c))), SONI - tanlov.length)) tanlov.push(c);
tanlov.sort((a, b) => b.ball - a.ball);

// ---------- 5. Kesish va ssenariylar ----------
const sabab = (c) => {
  if (c.sabab) return c.sabab;
  const len = c.e - c.s;
  const parts = rms.slice(Math.floor(c.s * 2), Math.ceil(c.e * 2));
  const energy = parts.reduce((a, b) => a + b, 0) / Math.max(1, parts.length) / rmsMed;
  const bits = [];
  if (energy > 1.15) bits.push('ovoz baland va jonli');
  const ws = words.filter((w) => w.s >= c.s && w.e <= c.e).length;
  if (ws / len > avgDensity * 1.1) bits.push("gap zich, to'xtalish kam");
  const first = gaplar.find((g) => g.s >= c.s - 0.01);
  if (first && /[?!]/.test(first.text)) bits.push('kuchli boshlanish');
  if (len >= 28 && len <= 46) bits.push('Shorts uchun qulay uzunlik');
  return bits.join(', ') || 'eng jonli qism';
};
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

fs.mkdirSync('public/qirq', { recursive: true });
fs.mkdirSync('out', { recursive: true });
fs.mkdirSync('videos', { recursive: true });
const natija = [];
for (let k = 0; k < tanlov.length; k++) {
  const c = tanlov[k];
  const s = Math.max(0, c.s - PAD_BOSH);
  const e = Math.min(meta.duration, c.e + PAD_OXIR);
  const len = +(e - s).toFixed(2);
  const rel = `qirq/${nom}-${k + 1}.mp4`;
  console.log(`▶ ${k + 1}-sahna: ${fmt(s)}–${fmt(e)} (${len.toFixed(1)} s), ball ${c.ball}`);
  run('ffmpeg', ['-loglevel', 'error', '-y', '-ss', s.toFixed(2), '-i', file, '-t', len.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', path.join('public', rel)], { stdio: 'inherit' });

  // Subtitr: Whisper so'zlari sahna vaqtiga suriladi
  const subtitr = words.filter((w) => w.s >= s && w.e <= e).map((w) => ({ w: w.w, s: +(w.s - s).toFixed(2), e: +(w.e - s).toFixed(2) }));
  // Zoom: sahna ichidagi eng keskin 2–3 joy (boshidan 1.5 s, oxiridan 2.8 s uzoqda, oralig'i ≥ 4 s)
  const zoomlar = [];
  const cand = [];
  for (let t = s + 1.5; t < e - 2.8; t += 0.5) cand.push({ t, v: rmsAt(t) / (rmsAt(t - 2) + rmsAt(t - 1.5) + 1e-6) });
  for (const z of cand.sort((a, b) => b.v - a.v)) {
    if (zoomlar.every((o) => Math.abs(o.t - (z.t - s)) >= 4)) zoomlar.push({ t: +(z.t - s).toFixed(1), x: 0.5, y: 0.45 });
    if (zoomlar.length >= 3) break;
  }
  zoomlar.sort((a, b) => a.t - b.t);

  const scene = {
    type: 'custom',
    name: 'shorts/klip',
    src: rel,
    hook: HOOK || c.hook || '',
    til,
    subtitr,
    zoomlar,
    duration: len,
    vertikal: meta.height > meta.width,
  };
  const data = {
    title: `Qirq ${nom} ${k + 1}`,
    transition: 0,
    scenes: [scene],
    qirq: { manba: src, boshi: +s.toFixed(2), oxiri: +e.toFixed(2), ball: c.ball, sabab: sabab(c), tanlagan: c.gemini ? 'gemini' : 'mahalliy' },
  };
  const json = `videos/${nom}-${k + 1}.json`;
  fs.writeFileSync(json, JSON.stringify(data, null, 2) + '\n');
  natija.push({ video: `${nom}-${k + 1}`, json, ball: c.ball, sabab: data.qirq.sabab, vaqt: `${fmt(s)}–${fmt(e)}`, uzunlik: Math.round(len), hook: scene.hook, tanlagan: data.qirq.tanlagan });
}
fs.writeFileSync('out/qirq.json', JSON.stringify(natija, null, 2) + '\n');
console.log(`✓ ${natija.length} ta sahna: ${natija.map((n) => `${n.vaqt} (${n.ball})`).join(', ')}`);
