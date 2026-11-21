// Shorts uchun Gemini tahlili: videodan nutq matni (vaqtlari bilan), hook sarlavha, 2–3 ta zoom joyi.
// Ishlatish: node scripts/subtitr.mjs videos/<nom>.json
// "shorts/klip" sahnalari uchun: subtitr, hook (bo'sh bo'lsa), zoomlar (bo'sh bo'lsa), til, duration yoziladi.
// Natija ssenariyga saqlanadi — qayta ishga tushganda pul to'lanmaydi.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [, , file] = process.argv;
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const KEY = process.env.GEMINI_API_KEY;
const BASE = 'https://generativelanguage.googleapis.com';
const todo = data.scenes.filter((s) => s.type === 'custom' && s.name === 'shorts/klip' && s.src && !s.subtitr);
if (!todo.length) {
  console.log('Subtitr kerak emas.');
  process.exit(0);
}
if (!KEY) throw new Error("GEMINI_API_KEY yo'q — subtitr yasab bo'lmaydi.");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const localPath = (src) => path.join('public', src.replace(/^\/+/, ''));

// ffprobe: tizimdagi yoki Remotion bilan keladigani
const probe = (f) => {
  const args = ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', f];
  let out;
  try {
    out = execFileSync('ffprobe', args);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    out = execFileSync('npx', ['remotion', 'ffprobe', ...args]);
  }
  const j = JSON.parse(out.toString());
  const v = (j.streams || []).find((s) => s.width) || {};
  return { duration: Number(j.format.duration), width: v.width, height: v.height };
};

// Eng yangi "flash" modelni tanlash (tts / image / lite / live emas)
async function pickModel() {
  if (data.geminiTahlilModel) return data.geminiTahlilModel;
  const res = await fetch(`${BASE}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } });
  const j = await res.json();
  const ok = (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace('models/', ''))
    .filter((n) => /^gemini-[\d.]+-flash(-preview.*)?$/.test(n) || /^gemini-[\d.]+-flash$/.test(n))
    .sort((a, b) => parseFloat(b.split('-')[1]) - parseFloat(a.split('-')[1]) || a.length - b.length);
  if (!ok.length) throw new Error(`Mos Gemini modeli topilmadi: ${JSON.stringify(j).slice(0, 300)}`);
  return ok[0];
}

async function uploadFile(f) {
  const size = fs.statSync(f).size;
  const mime = f.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': KEY,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(size),
      'X-Goog-Upload-Header-Content-Type': mime,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: path.basename(f) } }),
  });
  const url = start.headers.get('x-goog-upload-url');
  if (!url) throw new Error(`Gemini fayl yuklash boshlanmadi (${start.status}): ${await start.text()}`);
  const up = await fetch(url, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize', 'Content-Length': String(size) },
    body: fs.readFileSync(f),
  });
  let info = (await up.json()).file;
  for (let i = 0; i < 60 && info.state !== 'ACTIVE'; i++) {
    if (info.state === 'FAILED') throw new Error('Gemini videoni qayta ishlay olmadi.');
    await sleep(3000);
    info = await (await fetch(`${BASE}/v1beta/${info.name}`, { headers: { 'x-goog-api-key': KEY } })).json();
  }
  return { uri: info.uri, mime };
}

const PROMPT = (dur, hookGiven) => `You are an editor preparing a vertical YouTube Short (${dur.toFixed(1)} s).
Return ONLY JSON with this shape:
{
  "til": "<ISO language code of the speech, e.g. en, uz, ru; 'none' if no speech>",
  "hook": "<${hookGiven ? 'empty string' : 'a short, punchy on-screen hook title in the SAME language as the speech (max 6 words). It must be honest about what happens in the clip — no false clickbait'}>",
  "segments": [ { "start": <sec>, "end": <sec>, "text": "<exact spoken words>" } ],
  "zoomlar": [ { "t": <sec>, "x": <0..1 horizontal focus>, "y": <0..1 vertical focus> } ]
}
Rules:
- segments: verbatim transcript of ALL speech, split into short phrases of 2–6 words, with accurate start/end times in seconds. Empty array if there is no speech.
- zoomlar: pick only 2 or 3 of the most important or emotional moments for a quick punch-in zoom; x/y is where the key subject is in the frame. Not in the first 1.5 s.
- Do not add any words that are not spoken.`;

const model = await pickModel();
console.log(`Gemini model: ${model}`);
for (const s of todo) {
  const f = localPath(s.src);
  if (!fs.existsSync(f)) throw new Error(`Video topilmadi: ${f} (Drive'dan olinmaganmi?)`);
  const meta = probe(f);
  console.log(`▶ ${s.src}: ${meta.duration.toFixed(1)} s, ${meta.width}×${meta.height}`);
  const { uri, mime } = await uploadFile(f);
  let out;
  for (let attempt = 0; attempt < 3 && !out; attempt++) {
    const res = await fetch(`${BASE}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ file_data: { mime_type: mime, file_uri: uri } }, { text: PROMPT(meta.duration, !!s.hook) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    const j = await res.json();
    const txt = j?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    try {
      out = JSON.parse(txt);
    } catch {
      console.log(`  ! urinish ${attempt + 1}: ${res.status} ${JSON.stringify(j).slice(0, 300)}`);
      await sleep(4000);
    }
  }
  if (!out) throw new Error('Gemini javobi tushunarsiz.');

  // So'zlarga bo'lish: har bir ibora vaqti so'zlar uzunligiga qarab taqsimlanadi
  const words = [];
  for (const seg of out.segments || []) {
    const ws = String(seg.text).trim().split(/\s+/).filter(Boolean);
    const st = Math.max(0, Number(seg.start));
    const en = Math.min(meta.duration, Math.max(st + 0.2, Number(seg.end)));
    const total = ws.reduce((a, w) => a + w.length + 1, 0);
    let t = st;
    for (const w of ws) {
      const d = ((en - st) * (w.length + 1)) / total;
      words.push({ w, s: +t.toFixed(2), e: +(t + d).toFixed(2) });
      t += d;
    }
  }
  s.til = out.til || s.til || 'en';
  if (!s.hook) s.hook = out.hook || '';
  if (!s.zoomlar) s.zoomlar = (out.zoomlar || []).slice(0, 3).filter((z) => z.t > 1.2 && z.t < meta.duration - 1);
  s.subtitr = words;
  s.duration = +meta.duration.toFixed(2);
  s.vertikal = meta.height > meta.width;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ til=${s.til}, ${words.length} so'z, hook="${s.hook}", zoom=${s.zoomlar.length}`);
}
