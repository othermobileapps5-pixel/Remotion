// Google Veo 3.1 (Gemini API, predictLongRunning) — fal.mjs da "model": "google/veo-3.1-lite" (yoki veo-3.1-fast, veo-3.1).
// Klip 4/6/8 s. Haqiqiy model nomi (…-001 / …-preview) Google'ning ro'yxatidan avtomatik tanlanadi.
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gj(key, url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`Google xatosi (${r.status}): ${t.slice(0, 600)}`);
  return JSON.parse(t);
}

let modelCache;
async function candidates(key, want) {
  // want: "veo-3.1-lite" → avval Google ro'yxatidan, bo'lmasa ma'lum nomlar (…-001, …-preview)
  if (/generate/.test(want)) return [want];
  if (!modelCache) {
    modelCache = [];
    try {
      let tok = '';
      for (let i = 0; i < 10; i++) {
        const res = await gj(key, `${API}/models?pageSize=200${tok ? `&pageToken=${tok}` : ''}`);
        modelCache.push(...(res.models || []).map((m) => m.name.replace(/^models\//, '')));
        if (!(tok = res.nextPageToken)) break;
      }
    } catch (e) { console.log(`  modellar ro'yxati olinmadi: ${e.message.slice(0, 120)}`); }
  }
  const listed = modelCache.filter((n) => n.startsWith(`${want}-generate`));
  return [...new Set([...listed.filter((n) => n.endsWith('-001')), ...listed, `${want}-generate-001`, `${want}-generate-preview`])];
}

const mimeFor = (p) => (path.extname(p).toLowerCase() === '.png' ? 'image/png' : path.extname(p).toLowerCase() === '.webp' ? 'image/webp' : 'image/jpeg');

/** Bitta Veo klipi. image — public/ ichidagi yo'l. Natija: { buf, model } */
export async function veoVideo({ key, model, prompt, image, aspect = '16:9', resolution = '720p', duration = 8 }) {
  if (!key) throw new Error("GEMINI_API_KEY yo'q.");
  const instance = { prompt };
  if (image) {
    const p = path.join('public', image);
    if (!fs.existsSync(p)) throw new Error(`Rasm topilmadi: ${p}`);
    instance.image = { bytesBase64Encoded: fs.readFileSync(p).toString('base64'), mimeType: mimeFor(p) };
  }
  const durationSeconds = [4, 6, 8].find((d) => d >= Math.round(duration)) || 8;
  const parameters = { aspectRatio: aspect, resolution, durationSeconds };
  let op, name, lastErr;
  for (const n of await candidates(key, model)) {
    try {
      op = await gj(key, `${API}/models/${n}:predictLongRunning`, { instances: [instance], parameters });
      name = n; break;
    } catch (e) {
      lastErr = e;
      if (!/\((404|400)\)/.test(e.message) || /402|credit|billing/i.test(e.message)) throw e; // pul/limit xatosi — boshqa nom sinalmaydi
      console.log(`  ${n}: ${e.message.slice(0, 160)}`);
    }
  }
  if (!op) throw lastErr || new Error(`Veo modeli topilmadi: ${model}`);
  console.log(`  Veo: ${name}, ${resolution}, ${durationSeconds} s`);
  for (let k = 0; !op.done && k < 120; k++) {
    await sleep(10000);
    op = await gj(key, `${API}/${op.name}`);
  }
  if (!op.done) throw new Error('Veo: 20 daqiqada tayyor bo\'lmadi');
  if (op.error) throw new Error(`Veo xatosi: ${JSON.stringify(op.error).slice(0, 400)}`);
  const s = op.response?.generateVideoResponse?.generatedSamples?.[0] || op.response?.generatedVideos?.[0];
  const uri = s?.video?.uri;
  if (!uri) throw new Error(`Veo javobida video yo'q (filtr?): ${JSON.stringify(op.response || op).slice(0, 500)}`);
  const dl = await fetch(uri, { headers: { 'x-goog-api-key': key }, redirect: 'follow' });
  if (!dl.ok) throw new Error(`Veo videosini yuklab bo'lmadi (${dl.status})`);
  return { buf: Buffer.from(await dl.arrayBuffer()), model: `google/${name}` };
}
