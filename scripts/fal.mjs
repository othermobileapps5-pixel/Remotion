// AI video kliplar yasash: fal.ai (standart) yoki Runway.
// Ishlatish: FAL_KEY=... RUNWAY_KEY=... node scripts/fal.mjs videos/<nom>.json [16:9|9:16] [maksimal_klip_soni]
// Runway: sahnada "provider": "runway" yoki "model": "runway/gen4_turbo" (butun video uchun — "provider" / "falModel").
// Ssenariydagi har bir { "type": "video", "prompt": "..." } sahnasi uchun (src hali bo'lmasa) klip yasaydi,
// public/fal/ ga yuklab oladi va sahnaga "src" yozib qo'yadi — qayta render qilinganda qayta pul to'lanmaydi.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import https from 'node:https';

const [, , file, aspect = '16:9', maxArg = '10'] = process.argv;
const KEY = process.env.FAL_KEY;
const RUNWAY_KEY = process.env.RUNWAY_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY; // Google: Gemini Omni Flash (video + ovoz), "model": "google/gemini-omni-1.2-flash"
const MAX = Number(maxArg) || 10;

// Standart modellar (narxi fal.ai sahifasida): matndan video va rasmdan video
const TEXT_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const IMAGE_MODEL = 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video';
// Runway standart modellari: rasmdan — gen4_turbo (5 kredit/sek), matndan — gen4.5 (12 kredit/sek)
const RUNWAY_IMAGE_MODEL = 'gen4_turbo';
const RUNWAY_TEXT_MODEL = 'gen4.5';
const RUNWAY_API = 'https://api.dev.runwayml.com/v1';

if (!file) {
  console.error('Foydalanish: node scripts/fal.mjs videos/<nom>.json [16:9|9:16] [maks]');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file, '.json');
const all = data.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.type === 'video' && s.prompt && !s.src);

// Sahna qaysi xizmatda yasaladi
const isGoogle = (s) => (s.model || '').startsWith('google/');
const isRunway = (s) => (s.model || '').startsWith('runway/') || (!s.model && (s.provider || data.provider) === 'runway');
const todo = all.filter(({ s, i }) => {
  const need = isGoogle(s) ? 'GEMINI_API_KEY' : isRunway(s) ? 'RUNWAY_KEY' : 'FAL_KEY';
  const ok = isGoogle(s) ? GEMINI_KEY : isRunway(s) ? RUNWAY_KEY : KEY;
  if (!ok) console.log(`${i + 1}-sahna o'tkazib yuborildi: ${need} yo'q.`);
  return ok;
});

if (!todo.length) {
  console.log(all.length ? 'Kalit yo\'q — AI kliplar o\'tkazib yuborildi (videoda "AI klip hali yasalmagan" kadri chiqadi).' : 'AI klip kerak bo\'lgan sahna yo\'q.');
  process.exit(0);
}
if (todo.length > MAX) {
  console.error(`${todo.length} ta klip kerak, chegara ${MAX}. Chegarani oshiring yoki sahnalarni kamaytiring.`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };

// Mahalliy rasm → data URI (fal.ai image_url sifatida qabul qiladi)
function imageUrl(src) {
  if (/^https?:\/\//.test(src)) return src;
  const p = path.join('public', src);
  const ext = path.extname(p).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(p).toString('base64')}`;
}

async function generate(scene) {
  if (isGoogle(scene)) return generateGoogle(scene);
  return isRunway(scene) ? generateRunway(scene) : generateFal(scene);
}

// Google Gemini Omni Flash (Interactions API): bitta so'rovda 3–15 s video, ovoz va dialog bilan.
// delivery: "uri" uchun store: true shart (aks holda 400 xato).
// Hujjat: https://ai.google.dev/gemini-api/docs/omni — natija steps[] ichidagi "model_output" qadamida (data yoki uri).
function httpsJson(url, body) {
  // Uzoq kutish (bir necha daqiqa) uchun fetch o'rniga https — vaqt chegarasi yo'q
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) return reject(new Error(`Google xatosi (${res.statusCode}): ${text.slice(0, 600)}`));
          try { resolve(JSON.parse(text)); } catch { reject(new Error(`Google javobi JSON emas: ${text.slice(0, 300)}`)); }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(0);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
async function generateGoogle(scene) {
  const model = scene.model.replace(/^google\//, '');
  const input = [];
  if (scene.image) {
    const url = imageUrl(scene.image);
    const [, mime, data] = url.match(/^data:([^;]+);base64,(.*)$/) || [];
    if (!data) throw new Error('Google uchun rasm mahalliy fayl bo\'lishi kerak');
    input.push({ type: 'image', data, mime_type: mime });
  }
  input.push({ type: 'text', text: scene.prompt });
  const response_format = { type: 'video', aspect_ratio: aspect, resolution: scene.resolution || '720p', delivery: 'uri' };
  if (scene.duration) response_format.duration = `${Math.max(3, Math.min(15, Math.round(scene.duration)))}s`;
  const API = 'https://generativelanguage.googleapis.com/v1beta';
  let res;
  try {
    res = await httpsJson(`${API}/interactions`, { model, input, response_format, store: true, stream: false, background: false });
  } catch (e) {
    // eski hujjatlarda "duration" yo'q — rad etilsa, usiz qayta urinamiz (pul faqat muvaffaqiyatli javob uchun olinadi)
    if (!/duration/i.test(String(e.message))) throw e;
    delete response_format.duration;
    console.log('  duration qabul qilinmadi, usiz qayta so\'rayapman…');
    res = await httpsJson(`${API}/interactions`, { model, input, response_format, store: true, stream: false, background: false });
  }
  const step = (res.steps || []).find((st) => st.type === 'model_output') || {};
  const out = (step.content || []).find((c) => c.data || c.uri) || {};
  if (out.data) return { buf: Buffer.from(out.data, 'base64'), model: `google/${model}` };
  if (!out.uri) throw new Error(`Google javobida video yo'q: ${JSON.stringify(res).slice(0, 600)}`);
  // URI: fayl tayyor (ACTIVE) bo'lguncha kutamiz, keyin yuklab olamiz
  const fileName = (out.uri.match(/files\/[^/?:]+/) || [])[0];
  if (fileName) {
    for (let k = 0; k < 120; k++) {
      const meta = await httpsJson(`${API}/${fileName}`);
      if (meta.state === 'ACTIVE' || !meta.state) break;
      if (meta.state === 'FAILED') throw new Error(`Google fayli xato: ${JSON.stringify(meta).slice(0, 300)}`);
      await sleep(5000);
    }
  }
  const dl = await fetch(fileName ? `${API}/${fileName}:download?alt=media` : out.uri, { headers: { 'x-goog-api-key': GEMINI_KEY } });
  if (!dl.ok) throw new Error(`Google videosini yuklab bo'lmadi (${dl.status}): ${(await dl.text()).slice(0, 300)}`);
  return { buf: Buffer.from(await dl.arrayBuffer()), model: `google/${model}` };
}

// Runway: https://docs.dev.runwayml.com — vazifa yaratiladi, keyin /tasks/{id} kuzatiladi
async function generateRunway(scene) {
  const rw = { Authorization: `Bearer ${RUNWAY_KEY}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' };
  const model = (scene.model || '').replace(/^runway\//, '') || (scene.image ? RUNWAY_IMAGE_MODEL : RUNWAY_TEXT_MODEL);
  // Veo 3.1 (Runway orqali): 4/6/8 s, ovoz va dialog lab harakati bilan (audio: true — standart)
  const isVeo = model.startsWith('veo');
  const duration = isVeo ? [4, 6, 8].find((d) => d >= (scene.duration || 8)) || 8 : scene.duration > 5 ? 10 : 5;
  const body = { model, promptText: scene.prompt, ratio: aspect === '9:16' ? '720:1280' : '1280:720', duration };
  if (typeof scene.audio === 'boolean') body.audio = scene.audio;
  if (scene.image) body.promptImage = imageUrl(scene.image);
  const endpoint = scene.image ? 'image_to_video' : 'text_to_video';

  const sub = await fetch(`${RUNWAY_API}/${endpoint}`, { method: 'POST', headers: rw, body: JSON.stringify(body) });
  if (!sub.ok) throw new Error(`Runway so'rovni qabul qilmadi (${sub.status}): ${await sub.text()}`);
  const { id } = await sub.json();

  const started = Date.now();
  for (;;) {
    await sleep(5000);
    const t = await (await fetch(`${RUNWAY_API}/tasks/${id}`, { headers: rw })).json();
    if (t.status === 'SUCCEEDED') {
      const url = Array.isArray(t.output) ? t.output[0] : null;
      if (!url) throw new Error(`Runway javobida video yo'q: ${JSON.stringify(t).slice(0, 300)}`);
      return { url, model: `runway/${model}` };
    }
    if (['FAILED', 'CANCELLED'].includes(t.status)) throw new Error(`Runway xatosi: ${JSON.stringify(t).slice(0, 300)}`);
    if (Date.now() - started > 15 * 60 * 1000) throw new Error('15 daqiqada tayyor bo\'lmadi');
  }
}

async function generateFal(scene) {
  const model = scene.model || (data.falModel && !data.falModel.startsWith('runway/') ? data.falModel : null) || (scene.image ? IMAGE_MODEL : TEXT_MODEL);
  const input = { prompt: scene.prompt, duration: scene.duration > 5 ? '10' : '5' };
  if (scene.image) input.image_url = imageUrl(scene.image);
  else input.aspect_ratio = aspect;

  const sub = await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(input) });
  if (!sub.ok) throw new Error(`fal.ai so'rovni qabul qilmadi (${sub.status}): ${await sub.text()}`);
  const { status_url, response_url } = await sub.json();

  const started = Date.now();
  for (;;) {
    await sleep(5000);
    const st = await (await fetch(status_url, { headers })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status && !['IN_QUEUE', 'IN_PROGRESS'].includes(st.status)) throw new Error(`fal.ai xatosi: ${JSON.stringify(st)}`);
    if (Date.now() - started > 15 * 60 * 1000) throw new Error('15 daqiqada tayyor bo\'lmadi');
  }
  const res = await (await fetch(response_url, { headers })).json();
  const url = res.video?.url;
  if (!url) throw new Error(`Javobda video yo'q: ${JSON.stringify(res).slice(0, 300)}`);
  return { url, model };
}

fs.mkdirSync('public/fal', { recursive: true });
// ffmpeg: tizimda bo'lsa o'shani, bo'lmasa Remotion ichidagi ffmpeg'ni ishlatamiz (npx remotion ffmpeg) —
// shuning uchun hech qayerga alohida o'rnatish shart emas
function ffmpeg(args) {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    execFileSync('ffmpeg', args, { stdio: 'inherit' });
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    execFileSync('npx', ['remotion', 'ffmpeg', ...args], { stdio: 'inherit' });
  }
}
// "image": "prev" — klip oldingi sahna klipining oxirgi kadridan boshlanadi (yuzlar va joy uzilmaydi)
function prevFrame(i) {
  const prev = data.scenes.slice(0, i).reverse().find((x) => x.type === 'video' && x.src);
  if (!prev) throw new Error(`${i + 1}-sahna: "image": "prev", lekin oldingi klip yo'q`);
  const out = `fal/${name}-${i + 1}-start.jpg`;
  ffmpeg(['-v', 'error', '-y', '-sseof', '-0.15', '-i', path.join('public', prev.src), '-frames:v', '1', '-q:v', '2', path.join('public', out)]);
  return out;
}
for (const { s, i } of todo) {
  if (s.image === 'prev') s.image = prevFrame(i);
  const out = `fal/${name}-${i + 1}.mp4`;
  console.log(`▶ ${i + 1}-sahna: "${s.prompt.slice(0, 60)}"…`);
  const r = await generate(s);
  const model = r.model;
  const buf = r.buf || Buffer.from(await (await fetch(r.url)).arrayBuffer());
  fs.writeFileSync(path.join('public', out), buf);
  s.src = out;
  s.model = s.model || model;
  // har klipdan keyin saqlaymiz: keyingisida xato bo'lsa ham, yasalgani yo'qolmaydi
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ ${out} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
console.log('Tayyor.');
