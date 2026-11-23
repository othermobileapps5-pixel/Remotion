// Sahna rasmlari: ssenariydagi har sahnaning "rasm" (inglizcha tavsif) maydonidan rasm yasab,
// sahnani yozuvsiz rasmli sahnaga aylantiradi (sekin zoom; ovoz o'zgarmaydi).
//   node scripts/sahna-rasm.mjs videos/<nom>.json [shorts|youtube]
// Rasm bir marta yasaladi (public/rasm/<nom>/<i>.jpg) — qayta ishga tushsa pul/limit sarflanmaydi.
// Manba: GOOGLE_AI=1 → Gemini (pullik); aks holda bot (Cloudflare FLUX, tekin): BOT_URL + RASM_KALIT.
// Rasm yasalmasa sahna avvalgidek (matnli) qoladi — video baribir chiqadi.
import fs from 'node:fs';
import path from 'node:path';

const [file, format = 'youtube'] = process.argv.slice(2);
const nom = path.basename(file, '.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const e = process.env;
const uslub = d.rasmUslub || 'cinematic, dramatic lighting, rich colors, highly detailed';
const dir = path.join('public', 'rasm', nom);

async function gemini(prompt) {
  const model = e.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': e.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: format === 'shorts' ? '9:16' : '16:9' } } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
  const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  if (!part) throw new Error('Gemini rasm qaytarmadi');
  return Buffer.from((part.inlineData || part.inline_data).data, 'base64');
}

async function bot(prompt) {
  const url = (e.BOT_URL || 'https://faro-kanal-bot.othermobileapps5.workers.dev').replace(/\/$/, '') + '/rasm';
  for (let urinish = 1; urinish <= 3; urinish++) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Rasm-Kalit': e.RASM_KALIT || '' }, body: JSON.stringify({ prompt, steps: 6 }) });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const t = (await r.text()).slice(0, 160);
    if (r.status === 403 || urinish === 3) throw new Error(`bot ${r.status}: ${t}`);
    await new Promise((ok) => setTimeout(ok, 3000 * urinish));
  }
}

const yasash = e.GOOGLE_AI === '1' && e.GEMINI_API_KEY ? gemini : e.RASM_KALIT ? bot : null;
if (!yasash) { console.error('Rasm manbai yo\'q (GEMINI_API_KEY + GOOGLE_AI=1 yoki RASM_KALIT) — sahnalar o\'zgarmaydi'); process.exit(0); }

fs.mkdirSync(dir, { recursive: true });
let yangi = 0, tayyor = 0, xato = 0;
for (const [i, sc] of (d.scenes || []).entries()) {
  if (!sc.rasm || sc.type === 'image' || sc.type === 'video' || sc.type === 'custom') continue;
  const rel = `rasm/${nom}/${i + 1}.jpg`;
  const abs = path.join('public', rel);
  if (!fs.existsSync(abs)) {
    try {
      fs.writeFileSync(abs, await yasash(`${sc.rasm}. Style: ${uslub}. No text, no letters, no logos, no watermark.`));
      yangi++;
    } catch (err) {
      console.error(`! ${i + 1}-sahna: ${err.message}`);
      xato++;
      continue;
    }
  } else tayyor++;
  // yozuvsiz rasmli sahna: matn faqat ovozda qoladi
  const { text, subtitle, ...qolgan } = sc;
  d.scenes[i] = { ...qolgan, type: 'image', src: rel, zoom: i % 2 ? 'out' : 'in', ...(text ? { matn: text } : {}) };
}
fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
console.error(`Sahna rasmlari (${yasash === gemini ? 'Gemini' : 'tekin FLUX'}): ${yangi} yangi, ${tayyor} oldin yasalgan, ${xato} xato`);
