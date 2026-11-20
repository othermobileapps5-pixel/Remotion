// FARO kanal boti — Cloudflare Worker (Telegram webhook).
// Miya: Gemini (GEMINI_API_KEY). Keyin Claude qo'shiladi: AI_PROVIDER = "claude" + ANTHROPIC/CLAUDE kaliti.
// Ishlash: Telegram xabari → (ovoz bo'lsa matnga) → Gemini niyatni aniqlaydi →
//   yangi_video: ssenariy yozadi → GitHub'ga videos/bot-*.json → «▶️ Yasash» tugmasi →
//   «Video yasash» workflow → tayyor MP4 Telegram'ga keladi (workflow o'zi yuboradi) → «✅ YouTube'ga» tugmasi.
// Xavfsizlik: faqat OWNER_CHAT_ID dan kelgan xabarlar; pul yoki yuklash — faqat tugma bosilganda.

const TG = (env, method, body) =>
  fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const say = (env, chat, text, extra = {}) => TG(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- Gemini ----------
let geminiBandGacha = 0; // Gemini band bo'lsa shu vaqtgacha to'g'ridan-to'g'ri Cloudflare
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Model band bo'lsa (503/429) qayta uriniladi, keyin zaxira modelga o'tiladi.
async function gemini(env, parts, { json = false, system = '' } = {}) {
  const models = [env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
    .filter((m, i, a) => a.indexOf(m) === i);
  const body = JSON.stringify({
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: 'user', parts }],
    generationConfig: json ? { responseMimeType: 'application/json', temperature: 0.8 } : { temperature: 0.7 },
  });
  let last = 0;
  if (Date.now() < geminiBandGacha && env.AI) return cfAI(env, parts, { json, system });
  for (const model of models) {
    for (let urinish = 0; urinish < (model === models[0] ? 2 : 1); urinish++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) {
        const j = await res.json();
        const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
        return json ? JSON.parse(text.replace(/^```(json)?|```$/g, '').trim()) : text;
      }
      last = res.status;
      await res.text();
      if (res.status === 402) throw new Error("Gemini hisobida pul tugagan (402). AI Studio → Billing'da to'ldiring yoki BOT_GEMINI_KEY ga bepul kalit qo'ying.");
      if (res.status === 400 || res.status === 403) throw new Error(`Gemini kaliti ishlamadi (${res.status}). Kalitni tekshiring.`);
      if (res.status === 404) break; // bu model yo'q — keyingisi
      if (res.status === 503 || res.status === 429 || res.status >= 500) { if (urinish === 0 && model === models[0]) await sleep(1200); continue; }
      break;
    }
  }
  if (last === 503 || last === 429 || last >= 500) geminiBandGacha = Date.now() + 180000;
  // Zaxira: Cloudflare Workers AI
  if (env.AI) {
    try { return await cfAI(env, parts, { json, system }); } catch (e) { console.log('cfAI', e.message); }
  }
  if (last === 429) throw new Error("Gemini bepul limiti vaqtincha tugadi. Bir daqiqadan keyin qayta yozing.");
  throw new Error(`AI modellari hozir band (${last}). Bir-ikki daqiqadan keyin qayta yozing.`);
}

const CF_MODELLAR = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/google/gemma-3-12b-it', '@cf/meta/llama-3.1-8b-instruct'];

async function cfAI(env, parts, { json, system }) {
  const audio = parts.find((p) => p.inline_data);
  if (audio) {
    const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: audio.inline_data.data, language: 'uz' });
    if (!r?.text) throw new Error('whisper bo\'sh');
    return r.text;
  }
  const user = parts.map((p) => p.text || '').join('\n');
  const sys = (system || '') + (json ? '\nJavobni FAQAT bitta JSON obyekt qilib qaytar, boshqa hech qanday matn yozma.' : '');
  let err;
  for (const m of CF_MODELLAR) {
    try {
      const r = await env.AI.run(m, { messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: user }], max_tokens: 2048 });
      const t = typeof r?.response === 'string' ? r.response : JSON.stringify(r?.response ?? '');
      if (!json) return t;
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      return JSON.parse(t.slice(a, b + 1));
    } catch (e) { err = e; }
  }
  throw err || new Error('cfAI');
}

const NIYAT = `Sen YouTube kanal yordamchisi botining dispetcherisan. Foydalanuvchi o'zbek, AQShda tirakchi (CDL), YouTube kanal yuritadi.
Uning xabarini o'qib, FAQAT JSON qaytar:
{"amal": "yangi_video" | "tahlil" | "suhbat", "mavzu": "...", "format": "shorts" | "youtube", "til": "uz" | "en" | "ru", "javob": "..."}
- yangi_video: video/ssenariy/reklama/qisqa video yasash so'ralsa. mavzu — aniq mavzu. format: aytilmasa "shorts".
- tahlil: kanal statistikasi, qaysi video yaxshi, g'oya so'ralsa.
- suhbat: boshqa hamma narsa; "javob" ga qisqa, foydali o'zbekcha javob yoz.
til — video tili (aytilmasa "uz").`;

const SSENARIY = `Sen qisqa YouTube video ssenariy muallifisan. Kinetik matnli (rasm va AI klipsiz) video uchun ssenariy yoz.
Qoidalar:
- Faqat haqiqatga mos ma'lumot. Aniq raqam yoki statistikani bilmasang — umuman ishlatma. To'qib chiqarma.
- Moliya, sog'liq mavzularida maslahat berma, faqat umumiy ta'lim; oxirida "Maslahat emas" kabi eslatma qo'y.
- 1-sahna kuchli hook (savol yoki hayratli fakt). Oxirgi sahna — chaqiriq (obuna/saqlash).
- Shorts: 6-9 sahna, jami 35-50 soniya. YouTube: 10-16 sahna, 70-120 soniya.
- Har sahnada "ovoz" — o'qiladigan gap (sahna matnidan uzunroq bo'lishi mumkin, 1-2 gap). "text" — ekrandagi qisqa matn (5-9 so'z, \\n bilan 2 qator).
- duration: ovoz uzunligiga mos (o'zbekcha ~2.3 so'z/soniya) + 0.8.
FAQAT JSON qaytar:
{"title": "...", "theme": {"bg": "#0b1020", "accent": "#ffcc33", "text": "#ffffff"},
 "scenes": [{"type": "title", "text": "...", "subtitle": "...", "duration": 4, "ovoz": "..."}, {"type": "text", "text": "...", "duration": 5, "ovoz": "..."}],
 "youtube": {"nom": "YouTube sarlavha (60 belgigacha)", "tavsif": "2-4 qator tavsif", "teglar": ["...", "..."]}}`;

// ---------- GitHub ----------
const GH = (env, path, init = {}) =>
  fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.BOT_GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'faro-bot', ...(init.headers || {}) },
  });

async function saveScript(env, name, data) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2) + '\n')));
  const r = await GH(env, `/contents/videos/${name}.json`, {
    method: 'PUT',
    body: JSON.stringify({ message: `Bot: ${name} ssenariysi`, content, branch: env.GITHUB_BRANCH }),
  });
  if (r.status === 403 || r.status === 404) throw new Error(`GitHub tokeniga ruxsat yetmayapti (${r.status}). BOT_GITHUB_TOKEN: Remotion repo tanlangan, Contents va Actions — Read and write bo'lsin.`);
  if (r.status === 401) throw new Error("GitHub tokeni eskirgan yoki xato (401). Yangi BOT_GITHUB_TOKEN qo'ying.");
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function loadScript(env, name) {
  const r = await GH(env, `/contents/videos/${name}.json?ref=${env.GITHUB_BRANCH}`);
  if (!r.ok) return null;
  const j = await r.json();
  return JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g, '')))));
}
async function dispatch(env, workflow, inputs) {
  const r = await GH(env, `/actions/workflows/${workflow}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: env.GITHUB_BRANCH, inputs }) });
  if (!r.ok) throw new Error(`Workflow ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// ---------- YouTube (ixtiyoriy: YT_* bo'lsa) ----------
async function ytToken(env) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('YouTube ruxsati ishlamadi: ' + JSON.stringify(j).slice(0, 150));
  return j.access_token;
}
async function ytStats(env) {
  const t = await ytToken(env);
  const api = (p) => fetch(`https://www.googleapis.com/youtube/v3/${p}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json());
  const ch = (await api('channels?part=snippet,statistics,contentDetails&mine=true')).items?.[0];
  if (!ch) throw new Error('Kanal topilmadi');
  const up = ch.contentDetails.relatedPlaylists.uploads;
  const pl = await api(`playlistItems?part=contentDetails&maxResults=15&playlistId=${up}`);
  const ids = (pl.items || []).map((i) => i.contentDetails.videoId).join(',');
  const vids = ids ? (await api(`videos?part=snippet,statistics,contentDetails&id=${ids}`)).items || [] : [];
  return {
    kanal: ch.snippet.title,
    obunachi: ch.statistics.subscriberCount,
    korishlar: ch.statistics.viewCount,
    videolar: vids.map((v) => ({ nom: v.snippet.title, sana: v.snippet.publishedAt.slice(0, 10), uzunlik: v.contentDetails.duration, korish: v.statistics.viewCount, layk: v.statistics.likeCount, izoh: v.statistics.commentCount })),
  };
}

// ---------- amallar ----------
async function newVideo(env, chat, { mavzu, format, til }) {
  await say(env, chat, `✍️ Ssenariy yozyapman: <b>${esc(mavzu)}</b> (${format})…`);
  const s = await gemini(env, [{ text: `Mavzu: ${mavzu}\nFormat: ${format}\nTil: ${til}` }], { json: true, system: SSENARIY });
  const name = `bot-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
  const data = { ...s, ovozchi: env.OVOZCHI || 'google:Charon', bot: { format, mavzu } };
  await saveScript(env, name, data);
  const total = (s.scenes || []).reduce((a, x) => a + (x.duration || 0), 0);
  const lines = (s.scenes || []).map((x, i) => `${i + 1}. ${esc((x.text || '').replace(/\n/g, ' '))}`).join('\n');
  await say(env, chat, `🎬 <b>${esc(s.title)}</b>\n~${Math.round(total)} s · ${format} · ${s.scenes?.length} sahna\n\n${lines}\n\nYouTube nomi: <i>${esc(s.youtube?.nom)}</i>\n\nNarx: AI klipsiz — bepul (faqat ovoz ~1 sent).`, {
    reply_markup: { inline_keyboard: [[{ text: '▶️ Yasash', callback_data: `y:${name}:${format}` }, { text: '❌ Bekor', callback_data: `x:${name}` }]] },
  });
}

async function analysis(env, chat) {
  if (!env.YT_REFRESH_TOKEN) return say(env, chat, "📊 YouTube hali ulanmagan. Ulash qadamlarini Claude chatida tugating (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN).");
  await say(env, chat, '📊 Kanalni tahlil qilyapman…');
  const st = await ytStats(env);
  const txt = await gemini(env, [{ text: JSON.stringify(st) }], {
    system: `YouTube kanal statistikasini o'zbek tilida qisqa tahlil qil (Telegram uchun, 12 qatordan oshmasin, HTML teglarsiz): 1) umumiy holat, 2) eng yaxshi va eng zaif videolar va ehtimoliy sabab (taxmin ekanini ayt), 3) shu kanal uchun 3 ta aniq video g'oyasi (har biri bir qator). Raqamlarni faqat berilgan ma'lumotdan ol.`,
  });
  await say(env, chat, esc(txt));
}

async function voiceToText(env, fileId) {
  const f = await TG(env, 'getFile', { file_id: fileId });
  const buf = await (await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${f.result.file_path}`)).arrayBuffer();
  let bin = '';
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return gemini(env, [{ inline_data: { mime_type: 'audio/ogg', data: btoa(bin) } }, { text: "Bu ovozli xabarni so'zma-so'z matnga aylantir (o'zbek, rus yoki ingliz). Faqat matnni qaytar." }]);
}

async function onMessage(env, msg) {
  const chat = msg.chat.id;
  TG(env, 'sendChatAction', { chat_id: chat, action: 'typing' }).catch(() => {});
  let text = msg.text || msg.caption || '';
  if (msg.voice || msg.audio) {
    text = (await voiceToText(env, (msg.voice || msg.audio).file_id)).trim();
    await say(env, chat, `🎙 <i>${esc(text)}</i>`);
  }
  if (!text) return;
  if (text === '/start' || text === '/yordam') {
    return say(env, chat, `Salom! Men kanal botingizman.\n\n• Yozing yoki ovoz yuboring: «Tirakchilik haqida shorts yasa»\n• /tahlil — kanal statistikasi va g'oyalar\n• /yangi mavzu — yangi video ssenariysi\n\nPul sarflanadigan yoki YouTube'ga yuklanadigan har ishni faqat siz tugma bosganda qilaman.`);
  }
  if (text.startsWith('/tahlil')) return analysis(env, chat);
  if (text.startsWith('/yangi')) return newVideo(env, chat, { mavzu: text.replace('/yangi', '').trim() || 'kanal mavzusida qiziqarli fakt', format: 'shorts', til: 'uz' });
  const n = await gemini(env, [{ text }], { json: true, system: NIYAT });
  if (n.amal === 'yangi_video') return newVideo(env, chat, { mavzu: n.mavzu || text, format: n.format === 'youtube' ? 'youtube' : 'shorts', til: n.til || 'uz' });
  if (n.amal === 'tahlil') return analysis(env, chat);
  return say(env, chat, esc(n.javob || 'Tushunmadim, qaytadan yozing.'));
}

async function onCallback(env, cb) {
  const chat = cb.message.chat.id;
  const [k, name, fmt] = cb.data.split(':');
  await TG(env, 'answerCallbackQuery', { callback_query_id: cb.id });
  await TG(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
  if (k === 'x') return say(env, chat, '❌ Bekor qilindi.');
  if (k === 'y') {
    await dispatch(env, 'video-yasash.yml', { video: name, format: fmt || 'shorts', ai_kliplar: 'false', max_klip: '0', telegram: String(chat) });
    return say(env, chat, `⏳ Video yig'ilmoqda (${name}). Odatda 5–8 daqiqa — tayyor bo'lgach shu yerga yuboraman.`);
  }
  if (k === 'u') {
    if (!env.YT_REFRESH_TOKEN) return say(env, chat, "YouTube hali ulanmagan — videoni yuqoridan saqlab, YouTube ilovasida joylang.");
    await dispatch(env, 'youtube-yuklash.yml', { video: name, telegram: String(chat) });
    return say(env, chat, '⬆️ YouTube\'ga yuklayapman…');
  }
}

export default {
  async fetch(req, env, ctx) {
    if (req.method !== 'POST') return new Response('FARO bot ishlayapti');
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
    const u = await req.json();
    const from = u.message?.chat?.id ?? u.callback_query?.message?.chat?.id;
    if (String(from) !== String(env.OWNER_CHAT_ID)) return new Response('ok'); // begonalarga javob yo'q
    ctx.waitUntil(
      (async () => {
        try {
          if (u.message) await onMessage(env, u.message);
          else if (u.callback_query) await onCallback(env, u.callback_query);
        } catch (e) {
          await say(env, from, `⚠️ Xato: ${esc(e.message).slice(0, 400)}`);
        }
      })(),
    );
    return new Response('ok');
  },
};
