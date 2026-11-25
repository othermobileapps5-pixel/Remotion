// Kanalimdagi eng oxirgi video (nomi bo'yicha) ga muqova qo'yadi. node muqova-yukla/yukla.mjs "<nom qismi>" <rasm.jpg>
import fs from 'node:fs';
const [q, img] = process.argv.slice(2); const e = process.env;
const tok = (await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: e.YT_CLIENT_ID, client_secret: e.YT_CLIENT_SECRET, refresh_token: e.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) })).json()).access_token;
if (!tok) { console.error('ruxsat xato'); process.exit(1); }
const H = { Authorization: `Bearer ${tok}` };
const ch = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', { headers: H })).json();
const c = ch.items?.[0]; console.log('Kanal:', c?.snippet?.title);
const pl = await (await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${c.contentDetails.relatedPlaylists.uploads}`, { headers: H })).json();
const items = (pl.items || []).filter((i) => i.snippet.title.includes(q));
items.forEach((i) => console.log('  ', i.snippet.resourceId.videoId, i.snippet.publishedAt, i.snippet.title));
const v = items[0]; if (!v) { console.error('video topilmadi'); process.exit(1); }
const id = v.snippet.resourceId.videoId;
const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: fs.readFileSync(img) });
console.log('Muqova:', r.status, (await r.text()).slice(0, 300));
console.log('Video: https://youtu.be/' + id);
