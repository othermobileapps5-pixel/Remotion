// Sahnalar uchun hikoya ovozi.
//   • Gemini TTS (standart emas, ssenariyda "ovozXizmat": "gemini"): GEMINI_API_KEY. Har qanday til (ingliz, o'zbek...).
//       ovozchi: Gemini ovozi (Charon, Kore, Puck, Gacrux...); model: "geminiTtsModel" (standart arzon: gemini-3.8-flash-lite-tts);
//       uslub: "ovozUslubi" (masalan "calm documentary narrator"); tezlik: "ovozTezligi": "+15%" (ffmpeg atempo).
//   • Azure (eski, "ovozXizmat" yo'q bo'lsa): AZURE_TTS_KEY, AZURE_TTS_REGION; madina / sardor.
// Ishlatish: node scripts/ovoz.mjs videos/<nom>.json
// Sahnadagi "ovoz": "matn" → public/ovoz/<nom>-<n>.(wav|mp3), sahnaga "ovozFayl" yoziladi.
// Sahna ovozdan qisqa bo'lsa cho'ziladi; "ovozgaMoslash": true bo'lsa sahna aniq ovoz + PAD uzunligiga keltiriladi.
// Matn o'zgarmasa, qayta yasalmaydi (pul tejaladi).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , file] = process.argv;
if (!file) {
  console.error('Foydalanish: node scripts/ovoz.mjs videos/<nom>.json');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file, '.json');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const PAD = data.ovozPad ?? 0.8; // ovozdan keyin sahna yana shuncha sekund davom etadi
const service = (data.ovozXizmat || 'azure').toLowerCase();

// ---------- Azure ----------
const AZ_KEY = process.env.AZURE_TTS_KEY;
const AZ_REGION = process.env.AZURE_TTS_REGION || 'eastus';
const AZ_VOICES = { madina: 'uz-UZ-MadinaNeural', sardor: 'uz-UZ-SardorNeural' };
const AZ_FORMAT = 'audio-24khz-96kbitrate-mono-mp3';

// ---------- Gemini ----------
const GM_KEY = process.env.GEMINI_API_KEY;
const GM_MODEL = data.geminiTtsModel || 'gemini-3.8-flash-lite-tts';

const voiceOf = (s) => {
  const v = s.ovozchi || data.ovozchi || (service === 'gemini' ? 'Charon' : 'madina');
  return service === 'gemini' ? v : AZ_VOICES[v.toLowerCase()] || v;
};
const rateOf = (s) => s.ovozTezligi || data.ovozTezligi || '0%';
const styleOf = (s) => s.ovozUslubi || data.ovozUslubi || '';
const keyOf = (s) =>
  hash(service === 'gemini' ? `g|${GM_MODEL}|${s.ovoz}|${voiceOf(s)}|${styleOf(s)}|${rateOf(s)}` : `${s.ovoz}|${voiceOf(s)}|${rateOf(s)}`);

// Gemini: "ovozTezligi": "+15%" → ffmpeg atempo (ohang o'zgarmaydi)
import { execFileSync } from 'node:child_process';
import os from 'node:os';
const speedUp = (wav, rate) => {
  const pct = parseFloat(String(rate).replace('%', ''));
  if (!pct) return wav;
  const tempo = Math.min(2, Math.max(0.5, 1 + pct / 100));
  const a = path.join(os.tmpdir(), `ovoz-in-${process.pid}.wav`);
  const b = path.join(os.tmpdir(), `ovoz-out-${process.pid}.wav`);
  fs.writeFileSync(a, wav);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', a, '-filter:a', `atempo=${tempo}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', b]);
  return fs.readFileSync(b);
};

const todo = data.scenes
  .map((s, i) => ({ s, i }))
  .filter(({ s }) => s.ovoz && s.ovoz.trim() && !(s.ovozFayl && s.ovozKalit === keyOf(s)));
if (!todo.length) {
  console.log('Yangi ovoz kerak emas.');
  process.exit(0);
}
if (service === 'gemini' && !GM_KEY) throw new Error(`GEMINI_API_KEY yo'q — ${todo.length} ta sahnaga ovoz kerak. Repo Settings → Secrets → GEMINI_API_KEY.`);
if (service !== 'gemini' && !AZ_KEY) {
  console.log(`AZURE_TTS_KEY yo'q — ${todo.length} ta sahna ovozsiz qoladi.`);
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// PCM (24 kHz, mono, 16-bit) → WAV
const pcmToWav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};
// WAV uzunligi (sek): fmt va data bo'laklarini o'qiymiz
const wavSeconds = (buf) => {
  let off = 12;
  let byteRate = 48000;
  let dataLen = buf.length - 44;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(off + 16);
    if (id === 'data') {
      dataLen = Math.min(size, buf.length - off - 8);
      break;
    }
    off += 8 + size + (size % 2);
  }
  return dataLen / byteRate;
};

async function gemini(s) {
  const text = s.ovoz.trim().replace(/\n+/g, ' … ');
  const style = styleOf(s);
  // Yangi (3.8) so'rov shakli, rad etilsa — eski shakl (prebuiltVoiceConfig, uslub matn ichida)
  const bodies = [
    {
      contents: [{ role: 'user', parts: [{ text, ...(style ? { speech_metadata: { style } } : {}) }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice: voiceOf(s) } } },
    },
    {
      contents: [{ role: 'user', parts: [{ text: style ? `Read in this style (${style}): ${text}` : text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceOf(s) } } },
      },
    },
  ];
  let lastErr = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    const body = bodies[Math.min(attempt, 1)];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GM_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': GM_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    const part = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data || p.inline_data?.data);
    const b64 = part?.inlineData?.data || part?.inline_data?.data;
    if (res.ok && b64) {
      const raw = Buffer.from(b64, 'base64');
      const mime = part.inlineData?.mimeType || part.inline_data?.mime_type || '';
      const rate = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
      return raw.toString('ascii', 0, 4) === 'RIFF' ? raw : pcmToWav(raw, rate);
    }
    lastErr = `${res.status}: ${JSON.stringify(json).slice(0, 400)}`;
    console.log(`  ! urinish ${attempt + 1}: ${lastErr}`);
    await sleep(res.status === 429 ? 20000 : 3000);
  }
  throw new Error(`Gemini TTS xatosi (${GM_MODEL}) — ${lastErr}`);
}

async function azure(s) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="uz-UZ"><voice name="${voiceOf(s)}"><prosody rate="${rateOf(s)}">` +
    esc(s.ovoz.trim()).replace(/\n+/g, '<break time="400ms"/>') +
    '</prosody></voice></speak>';
  const res = await fetch(`https://${AZ_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZ_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': AZ_FORMAT,
      'User-Agent': 'remotion-video',
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure xatosi (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

fs.mkdirSync('public/ovoz', { recursive: true });
for (const { s, i } of todo) {
  console.log(`▶ ${i + 1}-sahna ovozi (${service}, ${voiceOf(s)}): "${s.ovoz.slice(0, 50)}"…`);
  const isGemini = service === 'gemini';
  const buf = isGemini ? speedUp(await gemini(s), rateOf(s)) : await azure(s);
  const out = `ovoz/${name}-${i + 1}.${isGemini ? 'wav' : 'mp3'}`;
  fs.writeFileSync(path.join('public', out), buf);
  const seconds = isGemini ? wavSeconds(buf) : (buf.length * 8) / 96000;
  s.ovozFayl = out;
  s.ovozKalit = keyOf(s);
  const need = Math.ceil((seconds + PAD) * 10) / 10;
  if (data.ovozgaMoslash || !s.duration || s.duration < need) s.duration = need;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ ${out} — ${seconds.toFixed(1)} sek, sahna ${s.duration} sek`);
}
console.log('Tayyor.');
