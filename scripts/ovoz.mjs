// Sahnalar uchun o'zbekcha ovoz (Microsoft Azure TTS): Madina (ayol) yoki Sardor (erkak).
// Ishlatish: AZURE_TTS_KEY=... AZURE_TTS_REGION=eastus node scripts/ovoz.mjs videos/<nom>.json
// Sahnadagi "ovoz": "matn" → public/ovoz/<nom>-<n>.mp3, sahnaga "ovozFayl" yoziladi.
// Sahna ovozdan qisqa bo'lsa, uzunligi ovozga moslab cho'ziladi. Matn o'zgarmasa, qayta yasalmaydi (pul tejaladi).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , file] = process.argv;
const KEY = process.env.AZURE_TTS_KEY;
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
  const v = (s.ovozchi || data.ovozchi || 'madina').toLowerCase();
  return VOICES[v] || v; // to'liq Azure nomi ham bo'ladi
};
const rateOf = (s) => s.ovozTezligi || data.ovozTezligi || '0%';
const keyOf = (s) => hash(`${s.ovoz}|${voiceOf(s)}|${rateOf(s)}`);

const todo = data.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.ovoz && s.ovoz.trim() && !(s.ovozFayl && s.ovozKalit === keyOf(s)));
if (!todo.length) {
  console.log('Yangi ovoz kerak emas.');
  process.exit(0);
}
if (!KEY) {
  console.log(`AZURE_TTS_KEY yo'q — ${todo.length} ta sahna ovozsiz qoladi.`);
  process.exit(0);
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
