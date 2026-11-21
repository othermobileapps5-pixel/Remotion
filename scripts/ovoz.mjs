// Sahnalar uchun ovoz. Asosiy: Google Gemini TTS ("ovozchi": "google:Charon" — GEMINI_API_KEY).
// Zaxira (vaqtincha o'chiq, faqat "ovozchi": "madina"/"sardor" bo'lsa): Microsoft Azure TTS (AZURE_TTS_KEY, AZURE_TTS_REGION).
// Ishlatish: GEMINI_API_KEY=... node scripts/ovoz.mjs videos/<nom>.json
// Sahnadagi "ovoz": "matn" → public/ovoz/<nom>-<n>.mp3, sahnaga "ovozFayl" yoziladi.
// Sahna ovozdan qisqa bo'lsa, uzunligi ovozga moslab cho'ziladi. Matn o'zgarmasa, qayta yasalmaydi (pul tejaladi).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , file] = process.argv;
const KEY = process.env.AZURE_TTS_KEY;
const GKEY = process.env.GEMINI_API_KEY;
// pullik kalitda pul tugasa (402) yoki limit bo'lsa — bepul kalit (BOT_GEMINI_KEY) bilan qayta urinamiz
const PULSIZ = new Set(); // 402 bergan kalitlar — keyingi sahnalarda o'tkazib yuboriladi
const GKEYS = [GKEY, process.env.GEMINI_FREE_KEY].filter((k, i, a) => k && a.indexOf(k) === i);
const GOOGLE_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];
const REGION = process.env.AZURE_TTS_REGION || 'eastus';
const VOICES = { madina: 'uz-UZ-MadinaNeural', sardor: 'uz-UZ-SardorNeural' };
const FORMAT = 'audio-24khz-96kbitrate-mono-mp3'; // doimiy 96 kbit/s → uzunlikni fayl hajmidan hisoblaymiz
const PAD = 0.8; // ovozdan keyin sahna yana shuncha sekund davom etadi

if (!file) {
  console.error('Foydalanish: node scripts/ovoz.mjs videos/<nom>.json');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file, '.json');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

const voiceOf = (s) => {
  const raw = s.ovozchi || data.ovozchi || 'google:Charon';
  if (/^google/i.test(raw)) return `google:${raw.split(':')[1] || 'Charon'}`;
  const v = raw.toLowerCase();
  return VOICES[v] || v; // to'liq Azure nomi ham bo'ladi
};
const rateOf = (s) => s.ovozTezligi || data.ovozTezligi || '0%';
const styleOf = (s) => s.ovozUslubi || data.ovozUslubi || '';
const keyOf = (s) => hash(`${s.ovoz}|${voiceOf(s)}|${rateOf(s)}|${styleOf(s)}`);
const isGoogle = (s) => voiceOf(s).startsWith('google:');

const todo = data.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.ovoz && s.ovoz.trim() && !(s.ovozFayl && s.ovozKalit === keyOf(s)));
if (!todo.length) {
  console.log('Yangi ovoz kerak emas.');
  process.exit(0);
}
if (todo.some(({ s }) => isGoogle(s)) && !GKEY) {
  console.log(`GEMINI_API_KEY yo'q — Google ovozli sahnalar ovozsiz qoladi.`);
}
if (todo.some(({ s }) => !isGoogle(s)) && !KEY) {
  console.log(`AZURE_TTS_KEY yo'q — Azure ovozli sahnalar ovozsiz qoladi.`);
}

// Google Gemini TTS (Interactions API): WAV 24 kHz mono 16-bit qaytaradi
async function googleTts(s) {
  const voice = voiceOf(s).split(':')[1];
  const style = styleOf(s) || "o'zbek tilida, tabiiy, ishonchli va energik, tezroq sur'atda gapiradigan erkak diktor";
  let lastErr;
  for (const key of GKEYS.filter((k) => !PULSIZ.has(k))) for (const model of GOOGLE_MODELS) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{ type: 'user_input', content: [{ type: 'text', text: s.ovoz.trim(), annotations: [{ type: 'speech_metadata', style }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }),
    });
    if (!res.ok) {
      lastErr = `${model}: ${res.status} ${(await res.text()).slice(0, 300)}`; console.log(`  ${lastErr}`);
      if (res.status === 402 && GKEYS.length > 1) { PULSIZ.add(key); console.log('  pullik kalitda pul tugagan — bepul kalitga o\'tildi'); break; }
      continue;
    }
    const j = await res.json();
    const step = (j.steps || []).filter((x) => x.type === 'model_output').pop();
    const audio = step && (step.content || []).filter((c) => c.type === 'audio').pop();
    if (audio && audio.data) return { buf: Buffer.from(audio.data, 'base64'), model };
    lastErr = `${model}: javobda audio yo'q`;
  }
  throw new Error(`Google TTS xatosi — ${lastErr}`);
}
// WAV uzunligi: "data" bo'lagi hajmi / bayt-tezlik
function wavSeconds(buf) {
  const byteRate = buf.readUInt32LE(28);
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString('ascii', o, o + 4), size = buf.readUInt32LE(o + 4);
    if (id === 'data') return Math.min(size, buf.length - o - 8) / byteRate;
    o += 8 + size + (size % 2);
  }
  return (buf.length - 44) / byteRate;
}

// til ovoz nomidan: en-US-GuyNeural → en-US (inglizcha ovozlar ham ishlaydi)
const langOf = (s) => (voiceOf(s).match(/^[a-z]{2,3}-[A-Z]{2}/) || ['uz-UZ'])[0];
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// \n — qisqa pauza
const ssml = (s) =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${langOf(s)}"><voice name="${voiceOf(s)}"><prosody rate="${rateOf(s)}">` +
  esc(s.ovoz.trim()).replace(/\n+/g, '<break time="400ms"/>') +
  '</prosody></voice></speak>';

fs.mkdirSync('public/ovoz', { recursive: true });
for (const { s, i } of todo) {
  console.log(`▶ ${i + 1}-sahna ovozi (${voiceOf(s)}): "${s.ovoz.slice(0, 50)}"…`);
  if (isGoogle(s)) {
    if (!GKEY) continue;
    const { buf, model } = await googleTts(s);
    const out = `ovoz/${name}-${i + 1}.wav`;
    fs.writeFileSync(path.join('public', out), buf);
    const seconds = wavSeconds(buf);
    s.ovozFayl = out;
    s.ovozKalit = keyOf(s);
    const need = Math.ceil((seconds + PAD) * 10) / 10;
    if (!s.duration || s.duration < need) s.duration = need;
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${out} — ${seconds.toFixed(1)} sek (${model}), sahna ${s.duration} sek`);
    continue;
  }
  if (!KEY) continue;
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': FORMAT,
      'User-Agent': 'remotion-video',
    },
    body: ssml(s),
  });
  if (!res.ok) throw new Error(`Azure xatosi (${res.status}): ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = `ovoz/${name}-${i + 1}.mp3`;
  fs.writeFileSync(path.join('public', out), buf);
  const seconds = (buf.length * 8) / 96000;
  s.ovozFayl = out;
  s.ovozKalit = keyOf(s);
  const need = Math.ceil((seconds + PAD) * 10) / 10;
  if (!s.duration || s.duration < need) s.duration = need;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ ${out} — ${seconds.toFixed(1)} sek, sahna ${s.duration} sek`);
}
console.log('Tayyor.');
