// Google Drive bilan ishlash (egasining Drive'i, OAuth refresh token orqali).
// Secret'lar: GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN.
//
//   node scripts/drive.mjs upload out/video.mp4 [papkaId]   → Export papkasiga yuklaydi (shu nomli fayl bo'lsa — yangilaydi)
//   node scripts/drive.mjs fetch videos/<nom>.json          → ssenariydagi "drive/<fayl>" manbalarni Drive'dan public/drive/ ga oladi
//   node scripts/drive.mjs list [papkaId]                   → papkadagi fayllar ro'yxati
//   node scripts/drive.mjs get <fayl> <chiqish>             → Claude papkasidan nom bo'yicha yuklab olish
//
// Fayl ikki xil beriladi: nomi bilan ("video.mp4" — Claude papkasi ichidan qidiriladi) yoki Drive havolasi orqali —
// bot havolani "gd_<faylID>.mp4" ko'rinishiga keltiradi, bu yerda fayl to'g'ridan-to'g'ri ID bo'yicha olinadi (istalgan papkadan).
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Drive'dagi «Claude» papkalari (othermobileapps5@gmail.com)
const FOLDERS = {
  claude: process.env.GDRIVE_CLAUDE || '1v03_WFWQAZuWOZ7imzZisCk7iaaNuA6Y',
  raw: process.env.GDRIVE_RAW || '1FrEYi-gEoj-2rRTqO-tkfX3mF8_dFwoG',
  export: process.env.GDRIVE_EXPORT || '1XsizAivcX__EXqZsMT8yaFv4RrgzF9sU',
  reference: process.env.GDRIVE_REFERENCE || '1Dxvvj8ziy8JMb_QAAKzet9XMvvJAJuCu',
};
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

const { GDRIVE_CLIENT_ID: CID, GDRIVE_CLIENT_SECRET: CSEC, GDRIVE_REFRESH_TOKEN: RT } = process.env;
if (!CID || !CSEC || !RT) {
  console.log("Drive kalitlari yo'q (GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET / GDRIVE_REFRESH_TOKEN) — o'tkazib yuborildi.");
  process.exit(0);
}

let token;
async function auth() {
  if (token) return token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: CSEC, refresh_token: RT, grant_type: 'refresh_token' }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Drive kirish xatosi (${res.status}): ${j.error} ${j.error_description || ''}. Refresh token eskirgan bo'lsa, OAuth Playground'dan yangisini oling.`);
  token = j.access_token;
  return token;
}
const H = async (extra = {}) => ({ Authorization: `Bearer ${await auth()}`, ...extra });
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function list(folder, extraQ = '') {
  const files = [];
  let pageToken = '';
  do {
    const q = `'${folder}' in parents and trashed=false${extraQ}`;
    const url = `${API}/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime)&pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: await H() });
    const j = await res.json();
    if (!res.ok) throw new Error(`Ro'yxat xatosi (${res.status}): ${JSON.stringify(j).slice(0, 300)}`);
    files.push(...j.files);
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return files;
}

// Papka va ichki papkalardan nom bo'yicha qidirish
async function findByName(name, folder = FOLDERS.claude, depth = 0) {
  const items = await list(folder);
  const hit = items.find((f) => f.name === name);
  if (hit) return hit;
  if (depth > 2) return null;
  for (const f of items.filter((x) => x.mimeType === 'application/vnd.google-apps.folder')) {
    const r = await findByName(name, f.id, depth + 1);
    if (r) return r;
  }
  return null;
}

// "gd_<ID>.mp4" — Drive havolasidan kelgan fayl (ID bo'yicha), aks holda nom bo'yicha qidiruv
async function resolve(name) {
  const m = String(name).match(/^gd_([A-Za-z0-9_-]{10,})\.[a-z0-9]+$/i);
  if (!m) return findByName(name);
  const res = await fetch(`${API}/files/${m[1]}?fields=id,name,mimeType,size&supportsAllDrives=true`, { headers: await H() });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Drive havolasi ochilmadi (${res.status}): fayl sizning Drive'ingizda yoki sizga ulashilgan bo'lishi kerak.`);
  if (j.mimeType === 'application/vnd.google-apps.folder') throw new Error("Havola papkaga olib boradi — video faylning o'z havolasini yuboring.");
  console.log(`  Drive havolasi: ${j.name}`);
  return j;
}

async function upload(file, folder = FOLDERS.export) {
  const name = path.basename(file);
  const size = fs.statSync(file).size;
  const mime = name.endsWith('.mp4') ? 'video/mp4' : name.endsWith('.mov') ? 'video/quicktime' : 'application/octet-stream';
  const existing = (await list(folder, ` and name='${esc(name)}'`))[0];
  // Resumable yuklash: avval sessiya, keyin fayl baytlari (katta videolar uchun)
  const init = await fetch(
    existing ? `${UPLOAD}/files/${existing.id}?uploadType=resumable` : `${UPLOAD}/files?uploadType=resumable`,
    {
      method: existing ? 'PATCH' : 'POST',
      headers: await H({ 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size) }),
      body: JSON.stringify(existing ? {} : { name, parents: [folder] }),
    },
  );
  if (!init.ok) throw new Error(`Yuklash boshlanmadi (${init.status}): ${(await init.text()).slice(0, 300)}`);
  const session = init.headers.get('location');
  const put = await fetch(session, {
    method: 'PUT',
    headers: { 'Content-Length': String(size), 'Content-Type': mime },
    body: Readable.toWeb(fs.createReadStream(file)),
    duplex: 'half',
  });
  const j = await put.json().catch(() => ({}));
  if (!put.ok) throw new Error(`Yuklash xatosi (${put.status}): ${JSON.stringify(j).slice(0, 300)}`);
  console.log(`✓ Drive: ${name} (${(size / 1e6).toFixed(1)} MB) ${existing ? 'yangilandi' : 'yuklandi'} — https://drive.google.com/file/d/${j.id}/view`);
  return j;
}

async function download(fileId, out) {
  const res = await fetch(`${API}/files/${fileId}?alt=media&supportsAllDrives=true`, { headers: await H() });
  if (!res.ok) throw new Error(`Yuklab olish xatosi (${res.status}): ${(await res.text()).slice(0, 300)}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(out));
}

// Ssenariydagi "drive/<fayl>" manbalarni (src, image, music, ovozFayl...) Drive'dan olish
async function fetchFor(scriptFile) {
  const text = fs.readFileSync(scriptFile, 'utf8');
  const names = [...new Set([...text.matchAll(/"drive\/([^"]+)"/g)].map((m) => m[1]))];
  if (!names.length) return console.log("Ssenariyda Drive fayli yo'q.");
  for (const name of names) {
    const out = path.join('public/drive', name);
    if (fs.existsSync(out)) continue;
    const f = await resolve(name);
    if (!f) throw new Error(`Drive'da topilmadi: ${name} (Claude papkasi ichida bo'lishi kerak)`);
    console.log(`▶ ${name} (${(Number(f.size || 0) / 1e6).toFixed(1)} MB)…`);
    await download(f.id, out);
    console.log(`  ✓ public/drive/${name}`);
  }
}

const [, , cmd, a, b] = process.argv;
if (cmd === 'upload') await upload(a, b || FOLDERS.export);
else if (cmd === 'get') {
  // node scripts/drive.mjs get <fayl nomi> <chiqish yo'li> — Claude papkasidan (Raw va boshqalar) nom bo'yicha
  const f = await resolve(a);
  if (!f) throw new Error(`Drive'da topilmadi: ${a} (Claude papkasi ichida bo'lishi kerak)`);
  console.log(`▶ ${a} (${(Number(f.size || 0) / 1e6).toFixed(1)} MB)…`);
  await download(f.id, b);
  console.log(`  ✓ ${b}`);
}
else if (cmd === 'fetch') await fetchFor(a);
else if (cmd === 'list') {
  for (const f of await list(FOLDERS[a] || a || FOLDERS.claude)) console.log(`${f.mimeType.includes('folder') ? '📁' : '📄'} ${f.name}  ${f.size ? (f.size / 1e6).toFixed(1) + ' MB' : ''}`);
} else {
  console.error('Foydalanish: node scripts/drive.mjs upload <fayl> [papkaId] | fetch <ssenariy.json> | list [raw|export|reference|papkaId]');
  process.exit(1);
}
