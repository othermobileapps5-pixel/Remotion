import fs from 'node:fs';
const { uslub, rasmlar } = JSON.parse(fs.readFileSync('rasm/kategoriya.json', 'utf8'));
const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_FREE_KEY].filter(Boolean);
const MODEL = 'gemini-2.5-flash-image';
fs.mkdirSync('rasm/out', { recursive: true });
const LOG = [];
const log = (...a) => { console.log(...a); LOG.push(a.join(' ')); };
log('kalitlar:', KEYS.length);
let xato = 0;
for (const [nom, tavsif] of Object.entries(rasmlar)) {
  if (fs.existsSync(`rasm/out/${nom}.png`)) { log('bor:', nom); continue; }
  let ok = false;
  for (const key of KEYS) {
    for (let urinish = 0; urinish < 3 && !ok; urinish++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${tavsif}. ${uslub}.` }] }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '5:4' } },
        }),
      });
      const j = await r.json().catch(() => ({}));
      const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) {
        fs.writeFileSync(`rasm/out/${nom}.png`, Buffer.from(part.inlineData.data, 'base64'));
        log('tayyor:', nom); ok = true;
      } else {
        log(nom, r.status, JSON.stringify(j).slice(0, 200));
        if (r.status === 402 || r.status === 403 || r.status === 429) break;
        await new Promise((s) => setTimeout(s, 5000));
      }
    }
    if (ok) break;
  }
  if (!ok) xato++;
}
log('xato:', xato);
fs.writeFileSync('rasm/out/log.txt', LOG.join('\n').replace(/AIza[\w-]+/g, '***'));
