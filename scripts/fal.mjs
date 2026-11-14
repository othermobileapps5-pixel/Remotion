// fal.ai orqali AI video kliplar yasash.
// Ishlatish: FAL_KEY=... node scripts/fal.mjs videos/<nom>.json [16:9|9:16] [maksimal_klip_soni]
// Ssenariydagi har bir { "type": "video", "prompt": "..." } sahnasi uchun (src hali bo'lmasa) klip yasaydi,
// public/fal/ ga yuklab oladi va sahnaga "src" yozib qo'yadi — qayta render qilinganda qayta pul to'lanmaydi.
import fs from 'node:fs';
import path from 'node:path';

const [, , file, aspect = '16:9', maxArg = '10'] = process.argv;
const KEY = process.env.FAL_KEY;
const MAX = Number(maxArg) || 10;

// Standart modellar (narxi fal.ai sahifasida): matndan video va rasmdan video
const TEXT_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const IMAGE_MODEL = 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video';

if (!file) {
  console.error('Foydalanish: node scripts/fal.mjs videos/<nom>.json [16:9|9:16] [maks]');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file, '.json');
const todo = data.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.type === 'video' && s.prompt && !s.src);

if (!todo.length) {
  console.log('AI klip kerak bo\'lgan sahna yo\'q.');
  process.exit(0);
}
if (!KEY) {
  console.log(`FAL_KEY yo'q — ${todo.length} ta AI klip o'tkazib yuborildi (videoda "AI klip hali yasalmagan" kadri chiqadi).`);
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
  const model = scene.model || data.falModel || (scene.image ? IMAGE_MODEL : TEXT_MODEL);
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
for (const { s, i } of todo) {
  const out = `fal/${name}-${i + 1}.mp4`;
  console.log(`▶ ${i + 1}-sahna: "${s.prompt.slice(0, 60)}"…`);
  const { url, model } = await generate(s);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(path.join('public', out), buf);
  s.src = out;
  s.model = s.model || model;
  // har klipdan keyin saqlaymiz: keyingisida xato bo'lsa ham, yasalgani yo'qolmaydi
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ ${out} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
console.log('Tayyor.');
