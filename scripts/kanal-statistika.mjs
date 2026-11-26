// THROUGH TIME kanal statistikasi (Aron agenti uchun). node scripts/kanal-statistika.mjs → JSON (stdout)
const e = process.env;
const tok = (await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: e.YT_CLIENT_ID, client_secret: e.YT_CLIENT_SECRET, refresh_token: e.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) })).json()).access_token;
if (!tok) { console.error('ruxsat xato'); process.exit(1); }
const H = { Authorization: `Bearer ${tok}` };
const j = async (u) => (await fetch('https://www.googleapis.com/youtube/v3/' + u, { headers: H })).json();
const ch = (await j('channels?part=snippet,statistics,contentDetails&mine=true')).items?.[0];
const pl = await j(`playlistItems?part=contentDetails&maxResults=25&playlistId=${ch.contentDetails.relatedPlaylists.uploads}`);
const ids = (pl.items || []).map((i) => i.contentDetails.videoId).join(',');
const v = ids ? (await j(`videos?part=snippet,statistics,status,contentDetails&id=${ids}`)).items || [] : [];
const out = {
  vaqt: new Date().toISOString(),
  kanal: { nom: ch.snippet.title, obunachi: +ch.statistics.subscriberCount, korish: +ch.statistics.viewCount, video: +ch.statistics.videoCount },
  videolar: v.map((x) => ({ id: x.id, nom: x.snippet.title, sana: x.snippet.publishedAt, holat: x.status.privacyStatus, davom: x.contentDetails.duration,
    korish: +(x.statistics.viewCount || 0), like: +(x.statistics.likeCount || 0), izoh: +(x.statistics.commentCount || 0) })),
};
console.log(JSON.stringify(out, null, 1));
