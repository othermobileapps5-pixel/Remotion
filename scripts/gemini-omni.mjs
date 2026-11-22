// Gemini Omni video (Interactions API) — fal.mjs ("model": "google/...") va gemini-video.mjs ("provider": "gemini")
// uchun YAGONA so'rov va javobni o'qish.
// Hujjat: https://ai.google.dev/gemini-api/docs/omni — natija steps[] ichidagi "model_output" qadamida (data yoki uri).
// delivery: "uri" uchun store: true shart. Javob boshqacha tuzilmada kelsa ham — ichidan video data/uri qidiriladi.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Uzoq kutish (bir necha daqiqa) uchun fetch o'rniga https — vaqt chegarasi yo'q
function httpsJson(key, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key } },
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

// Javobdan video: avval hujjatdagi joy (steps → model_output → content), bo'lmasa butun javob ichidan qidiramiz
export function findVideo(res) {
  const step = (res.steps || []).find((st) => st.type === 'model_output');
  const out = (step?.content || []).find((c) => c.data || c.uri);
  if (out) return { data: out.data, uri: out.uri };
  let found = null;
  (function walk(v) {
    if (found || !v || typeof v !== 'object') return;
    if (v.type === 'video' && (typeof v.data === 'string' || typeof v.uri === 'string')) { found = { data: v.data, uri: v.uri }; return; }
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x);
  })(res);
  return found;
}

const mimeFor = (p) => {
  const ext = path.extname(p).toLowerCase();
  return ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
};

/**
 * Bitta klip yasaydi. image — public/ ichidagi yo'l (ixtiyoriy). Natija: MP4 Buffer.
 * @param {{ key: string, model: string, prompt: string, image?: string, aspect?: string, resolution?: string, duration?: number }} o
 */
export async function geminiOmniVideo({ key, model, prompt, image, aspect = '16:9', resolution = '720p', duration }) {
  if (!key) throw new Error("GEMINI_API_KEY yo'q. Repo Settings → Secrets and variables → Actions ichida qo'shing.");
  const input = [];
  if (image) {
    const p = path.join('public', image);
    if (!fs.existsSync(p)) throw new Error(`Reference rasm topilmadi: ${p}. Uni public/ ichiga yuklang.`);
    input.push({ type: 'image', data: fs.readFileSync(p).toString('base64'), mime_type: mimeFor(p) });
  }
  input.push({ type: 'text', text: prompt });
  const response_format = { type: 'video', aspect_ratio: aspect, resolution, delivery: 'uri' };
  if (duration) response_format.duration = `${Math.max(3, Math.min(15, Math.round(duration)))}s`;
  const body = () => ({ model, input, response_format, store: true, stream: false, background: false });

  let res;
  try {
    res = await httpsJson(key, `${API}/interactions`, body());
  } catch (e) {
    // eski hujjatlarda "duration" yo'q — rad etilsa, usiz qayta urinamiz (pul faqat muvaffaqiyatli javob uchun olinadi)
    if (!/duration/i.test(String(e.message))) throw e;
    delete response_format.duration;
    console.log("  duration qabul qilinmadi, usiz qayta so'rayapman…");
    res = await httpsJson(key, `${API}/interactions`, body());
  }

  const out = findVideo(res);
  if (out?.data) return Buffer.from(out.data, 'base64');
  if (!out?.uri) throw new Error(`Google javobida video yo'q: ${JSON.stringify(res).slice(0, 600)}`);
  // URI: fayl tayyor (ACTIVE) bo'lguncha kutamiz, keyin yuklab olamiz
  const fileName = (out.uri.match(/files\/[^/?:]+/) || [])[0];
  if (fileName) {
    for (let k = 0; k < 120; k++) {
      const meta = await httpsJson(key, `${API}/${fileName}`);
      if (meta.state === 'ACTIVE' || !meta.state) break;
      if (meta.state === 'FAILED') throw new Error(`Google fayli xato: ${JSON.stringify(meta).slice(0, 300)}`);
      await sleep(5000);
    }
  }
  const dl = await fetch(fileName ? `${API}/${fileName}:download?alt=media` : out.uri, { headers: { 'x-goog-api-key': key } });
  if (!dl.ok) throw new Error(`Google videosini yuklab bo'lmadi (${dl.status}): ${(await dl.text()).slice(0, 300)}`);
  return Buffer.from(await dl.arrayBuffer());
}
