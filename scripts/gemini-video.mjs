// Gemini Omni video generation through the Gemini Developer API.
// Required secret: GEMINI_API_KEY
// Usage: node scripts/gemini-video.mjs videos/<name>.json [16:9|9:16] [max_clips]
import fs from 'node:fs';
import path from 'node:path';

const [, , file, aspect = '16:9', maxArg = '10'] = process.argv;
const apiKey = process.env.GEMINI_API_KEY;
const maxClips = Number(maxArg) || 10;
if (!apiKey) throw new Error('GEMINI_API_KEY secret yo\'q. GitHub repo Settings → Secrets and variables → Actions ichida qo\'shing.');
if (!file || !fs.existsSync(file)) throw new Error(`Ssenariy topilmadi: ${file || '(file)'}`);

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const model = data.geminiModel || 'gemini-omni-1.2-flash';
const scenes = data.scenes.map((scene, index) => ({ scene, index }))
  .filter(({ scene }) => scene.type === 'video' && scene.prompt && !scene.src);
if (!scenes.length) {
  console.log('Gemini uchun yangi video sahnasi yo\'q (src allaqachon mavjud).');
  process.exit(0);
}
if (scenes.length > maxClips) throw new Error(`${scenes.length} ta klip kerak, max_klip=${maxClips}. Xarajatni cheklash uchun to\'xtatildi.`);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const mimeFor = p => {
  const ext = path.extname(p).toLowerCase();
  return ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
};
function collectVideoData(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (value.type === 'video' && typeof value.data === 'string') found.push(value.data);
  if (Array.isArray(value)) for (const item of value) collectVideoData(item, found);
  else for (const item of Object.values(value)) collectVideoData(item, found);
  return found;
}
async function request(scene) {
  const input = [];
  if (scene.image) {
    const imagePath = path.join('public', scene.image);
    if (!fs.existsSync(imagePath)) throw new Error(`Reference rasm topilmadi: ${imagePath}. Uni public/ ichiga yuklang.`);
    input.push({ type: 'image', data: fs.readFileSync(imagePath).toString('base64'), mime_type: mimeFor(imagePath) });
  }
  input.push({ type: 'text', text: scene.prompt });

  const seconds = Math.max(3, Math.min(15, Math.round(Number(scene.duration) || 8)));
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input,
      response_format: {
        type: 'video',
        duration: `${seconds}s`,
        resolution: data.resolution || '720p',
        aspect_ratio: aspect
      }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || JSON.stringify(payload).slice(0, 1200);
    throw new Error(`Gemini API ${response.status}: ${detail}`);
  }
  const videos = collectVideoData(payload);
  if (!videos.length) throw new Error('Gemini javobida MP4 video data topilmadi: ' + JSON.stringify(payload).slice(0, 1500));
  return Buffer.from(videos[0], 'base64');
}

fs.mkdirSync('public/gemini', { recursive: true });
for (const { scene, index } of scenes) {
  console.log(`Gemini ${model}: ${index + 1}-sahna generatsiya qilinmoqda...`);
  const mp4 = await request(scene);
  if (mp4.length < 10000) throw new Error('Gemini qaytargan video fayli juda kichik yoki noto\'g\'ri.');
  const relative = `gemini/${path.basename(file, '.json')}-${index + 1}.mp4`;
  fs.writeFileSync(path.join('public', relative), mp4);
  scene.src = relative;
  scene.model = model;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ public/${relative} — ${(mp4.length / 1e6).toFixed(2)} MB`);
}
console.log('Gemini video kliplar tayyor.');
