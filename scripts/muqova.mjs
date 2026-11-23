// YouTube muqovasi: rasm (Gemini yoki tekin Cloudflare FLUX) + 2 ta dizayn (Remotion still).
//   node scripts/muqova.mjs videos/<nom>.json out/        → out/<nom>-muqova-1.jpg, out/<nom>-muqova-2.jpg
// Ssenariyda: "muqova": { "matn": "2-4 SO'Z", "urgu": "SO'Z", "belgi": "?", "rasm_prompt": "english prompt" }
// Rasm bir marta yasaladi va public/muqova/<nom>.jpg da qoladi — qayta ishga tushsa pul sarflanmaydi.
// Google (pullik): GOOGLE_AI=1 va GEMINI_API_KEY. Aks holda CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (tekin limit).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [file, outDir = 'out'] = process.argv.slice(2);
const nom = path.basename(file, '.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const e = process.env;
const y = d.youtube || {};

// muqova bo'limi bo'lmasa — sarlavhadan oddiy variant
const m = d.muqova || {};
const sarlavha = y.nom || d.title || nom;
const matn = (m.matn || sarlavha.split(/\s+/).slice(0, 4).join(' ')).toUpperCase();
const urgu = (m.urgu || matn.split(/\s+/).sort((a, b) => b.length - a.length)[0] || '').toUpperCase();
const prompt = `${m.rasm_prompt || `${sarlavha}, dramatic key visual`}. YouTube thumbnail background, one bold central subject, cinematic lighting, high contrast, vivid saturated colors, shallow depth of field, ultra detailed, 16:9, absolutely no text, no letters, no logos, no brands, no trademarks, no watermark.`;

const rel = `muqova/${nom}.jpg`;
const abs = path.join('public', rel);
fs.mkdirSync(path.dirname(abs), { recursive: true });

async function gemini() {
  const model = e.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': e.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  if (!part) throw new Error('Gemini rasm qaytarmadi');
  return Buffer.from((part.inlineData || part.inline_data).data, 'base64');
}

async function flux() {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${e.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, steps: 8 }),
  });
  const j = await r.json();
  if (!r.ok || !j.result?.image) throw new Error(`Cloudflare ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 200)}`);
  return Buffer.from(j.result.image, 'base64');
}

async function botFlux() {
  const url = (e.BOT_URL || 'https://faro-kanal-bot.othermobileapps5.workers.dev').replace(/\/$/, '') + '/rasm';
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Rasm-Kalit': e.RASM_KALIT }, body: JSON.stringify({ prompt, steps: 8 }) });
  if (!r.ok) throw new Error(`bot ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return Buffer.from(await r.arrayBuffer());
}

let manba = 'oldin yasalgan';
if (!fs.existsSync(abs)) {
  const yollar = [];
  if (e.GOOGLE_AI === '1' && e.GEMINI_API_KEY) yollar.push(['Gemini', gemini]);
  if (e.RASM_KALIT) yollar.push(['Cloudflare FLUX bot orqali (tekin)', botFlux]);
  if (e.CLOUDFLARE_ACCOUNT_ID && e.CLOUDFLARE_API_TOKEN) yollar.push(['Cloudflare FLUX (tekin)', flux]);
  manba = 'rasmsiz (gradient)';
  for (const [n, f] of yollar) {
    try { fs.writeFileSync(abs, await f()); manba = n; break; }
    catch (err) { console.error(`! ${n}: ${err.message}`); }
  }
}
console.error(`Muqova rasmi: ${manba}`);

fs.mkdirSync(outDir, { recursive: true });
const chiqdi = [];
for (const variant of [1, 2]) {
  const props = { matn, urgu, belgi: m.belgi || '', rasm: fs.existsSync(abs) ? rel : '', variant, rang: m.rang || '#FFD400' };
  const pf = path.join(outDir, `.muqova-${variant}.json`);
  fs.writeFileSync(pf, JSON.stringify(props));
  const out = path.join(outDir, `${nom}-muqova-${variant}.jpg`);
  execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Muqova', out, `--props=${pf}`, '--image-format=jpeg', '--jpeg-quality=90'], { stdio: 'inherit' });
  fs.rmSync(pf);
  chiqdi.push(out);
}
console.log(chiqdi.join('\n'));
