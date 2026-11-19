// Video uchun bitta umumiy kuy (Google Lyria 3.5, GEMINI_API_KEY; ~$0.08 bir kuy).
// Ssenariyda: "musiqa": { "prompt": "...", "rasm": "venus/poster.jpg" }  → public/musiqa/<nom>.mp3, "fayl" yoziladi.
// "fayl" bor bo'lsa — qayta yasalmaydi (pul ketmaydi). Ishlatish: node scripts/musiqa.mjs videos/<nom>.json
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file, '.json');
const m = data.musiqa;
if (!m || !m.prompt) { console.log('Musiqa so\'ralmagan.'); process.exit(0); }
if (m.fayl && fs.existsSync(path.join('public', m.fayl))) { console.log(`Musiqa bor: ${m.fayl}`); process.exit(0); }
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.log('GEMINI_API_KEY yo\'q — musiqasiz.'); process.exit(0); }

const input = [{ type: 'text', text: m.prompt }];
if (m.rasm) {
  const p = path.join('public', m.rasm);
  input.push({ type: 'image', mime_type: p.endsWith('.png') ? 'image/png' : 'image/jpeg', data: fs.readFileSync(p).toString('base64') });
}
console.log(`▶ Musiqa (${m.model || 'lyria-3.5'}): "${m.prompt.slice(0, 70)}"…`);
const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
  method: 'POST',
  headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: m.model || 'lyria-3.5', input }),
});
if (!res.ok) { console.error(`Lyria xatosi (${res.status}): ${(await res.text()).slice(0, 500)}`); process.exit(1); }
const j = await res.json();
const step = (j.steps || []).filter((s) => s.type === 'model_output').pop();
const audio = step && (step.content || []).filter((c) => c.type === 'audio').pop();
if (!audio || !audio.data) { console.error('Lyria javobida audio yo\'q: ' + JSON.stringify(j).slice(0, 400)); process.exit(1); }
const ext = (audio.mime_type || '').includes('wav') ? 'wav' : 'mp3';
const out = `musiqa/${name}.${ext}`;
fs.mkdirSync(path.join('public', 'musiqa'), { recursive: true });
fs.writeFileSync(path.join('public', out), Buffer.from(audio.data, 'base64'));
m.fayl = out;
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`  ✓ ${out} (${(fs.statSync(path.join('public', out)).size / 1e6).toFixed(1)} MB)`);
