// Tayyor videoni YouTube'ga yuklash (YouTube Data API, resumable upload).
// Kerak: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN. Nom/tavsif/teglar — ssenariydagi "youtube" bo'limidan.
// Eslatma: Google audit'idan o'tmagan API loyihasidan yuklangan video "private" bo'lib qoladi.
// Ishlatish: node scripts/youtube.mjs videos/<nom>.json out/<fayl>.mp4  → video ID ni chiqaradi
import fs from 'node:fs';

const [file, mp4, muqova] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const e = process.env;
const tok = await (await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: e.YT_CLIENT_ID, client_secret: e.YT_CLIENT_SECRET, refresh_token: e.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
})).json();
if (!tok.access_token) { console.error('YouTube ruxsati xato:', JSON.stringify(tok).slice(0, 200)); process.exit(1); }

const y = d.youtube || {};
const isShort = (d.bot && d.bot.format) === 'shorts';

// Boblar (yt-chapters): sahnalardagi "bob" dan, ovozdan keyingi haqiqiy uzunliklar bo'yicha.
// YouTube qoidalari: birinchisi 0:00, kamida 3 ta, har biri kamida 10 s — buzilsa boblar qo'shilmaydi.
function boblar() {
  if (isShort) return '';
  const tr = d.transition ?? 0.5;
  const dur = (d.scenes || []).map((s) => Number(s.duration) || 0);
  const t0 = [];
  dur.forEach((x, k) => t0.push(k ? t0[k - 1] + dur[k - 1] - Math.min(tr, dur[k - 1], x) : 0));
  const jami = t0.length ? t0[t0.length - 1] + dur[dur.length - 1] : 0;
  const b = (d.scenes || []).map((s, k) => (s.bob ? { t: k ? t0[k] : 0, nom: String(s.bob).trim() } : null)).filter(Boolean);
  if (!b.length || b[0].t !== 0 || b.length < 3) return '';
  for (let i = 0; i < b.length; i++) if ((i + 1 < b.length ? b[i + 1].t : jami) - b[i].t < 10) return '';
  const vaqt = (x) => { const s = Math.floor(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  return b.map((x) => `${vaqt(x.t)} ${x.nom}`).join('\n');
}
// Tavsif tartibi (yt-seo): birinchi 2 qator → boblar → qolgani
const tavsifQator = String(y.tavsif || '').split('\n');
const bob = boblar();
const tavsif = bob ? [...tavsifQator.slice(0, 2), '', bob, '', ...tavsifQator.slice(2)].join('\n').replace(/\n{3,}/g, '\n\n') : String(y.tavsif || '');
if (bob) console.error(`boblar:\n${bob}`);
const meta = {
  snippet: {
    title: (y.nom || d.title || 'Video').slice(0, 100),
    description: `${tavsif}${isShort ? '\n\n#shorts' : ''}`.trim(),
    tags: (y.teglar || []).slice(0, 15),
    categoryId: '22',
  },
  status: { privacyStatus: e.YT_PRIVACY || 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
};
const size = fs.statSync(mp4).size;
const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' },
  body: JSON.stringify(meta),
});
if (!init.ok) { console.error('Yuklashni boshlab bo\'lmadi:', init.status, (await init.text()).slice(0, 300)); process.exit(1); }
const up = await fetch(init.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) }, body: fs.readFileSync(mp4) });
const j = await up.json();
if (!j.id) { console.error('Yuklash xatosi:', JSON.stringify(j).slice(0, 300)); process.exit(1); }
console.log(j.id);
console.error(`holat: ${j.status && j.status.privacyStatus}`);
// Muqova (thumbnail) — kanalda telefon tasdig'i bo'lsa ishlaydi; xato bo'lsa video baribir yuklangan
if (muqova && fs.existsSync(muqova)) {
  const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${j.id}&uploadType=media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'image/jpeg' },
    body: fs.readFileSync(muqova),
  });
  console.error(t.ok ? "muqova: qo'yildi" : `muqova xato ${t.status}: ${(await t.text()).slice(0, 200)}`);
}
