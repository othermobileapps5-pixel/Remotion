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
const pulTugagan = new Set(); // 402 bergan kalitlar (shu nusxa ishlaguncha)
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
  // avval pullik kalit, pul tugasa (402) — bepul zaxira kalit
  const kalitlar = [env.GEMINI_API_KEY, env.GEMINI_FREE_KEY].filter((k, i, a) => k && a.indexOf(k) === i && !pulTugagan.has(k));
  const ovoz = parts.some((p) => p.inline_data);
  // matn uchun: Gemini band bo'lsa darrov zaxira; ovoz uchun har doim Gemini'ga urinamiz (o'zbekchani yaxshi tushunadi)
  if (!ovoz && Date.now() < geminiBandGacha && env.AI) return cfAI(env, parts, { json, system });
  kalit: for (const key of kalitlar) {
    for (const model of models) {
      for (let urinish = 0; urinish < (model === models[0] ? (ovoz ? 3 : 2) : (ovoz ? 2 : 1)); urinish++) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body,
        });
        if (res.ok) {
          const j = await res.json();
          const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
          return json ? JSON.parse(text.replace(/^```(json)?|```$/g, '').trim()) : text;
        }
        last = res.status;
        await res.text();
        if (res.status === 402) { pulTugagan.add(key); continue kalit; } // pul tugagan — keyingi kalit
        if (res.status === 400 || res.status === 403) throw new Error(`Gemini kaliti ishlamadi (${res.status}). Kalitni tekshiring.`);
        if (res.status === 404) break; // bu model yo'q — keyingisi
        if (res.status === 503 || res.status === 429 || res.status >= 500) { if (ovoz) await sleep(1500 * (urinish + 1)); else if (urinish === 0 && model === models[0]) await sleep(1200); continue; }
        break;
      }
    }
    break; // kalit ishladi, lekin modellar band — zaxiraga
  }
  if (last === 402 && !env.AI) throw new Error("Gemini hisobida pul tugagan (402). AI Studio → Billing'da to'ldiring.");
  if (!ovoz && (last === 503 || last === 429 || last >= 500)) geminiBandGacha = Date.now() + 180000;
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
    return '⚠️(zaxira) ' + r.text;
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
{"amal": "yangi_video" | "tahlil" | "trend" | "suhbat", "mavzu": "...", "joy": "usa" | "uz" | "ru" | "spanish" | "", "format": "shorts" | "youtube", "til": "uz" | "en" | "ru", "javob": "..."}
- yangi_video: video/ssenariy/reklama/qisqa video yasash so'ralsa. mavzu — aniq mavzu. format: aytilmasa "shorts".
- tahlil: O'Z kanali statistikasi, qaysi videosi yaxshi so'ralsa.
- trend: YouTube'da nima trendda, nima ko'p ko'rilyapti, mashhur videolar so'ralsa. joy — mamlakat yoki til (Amerika→usa, ispancha→spanish), mavzu — aytilgan bo'lsa (masalan "trucking"), aks holda "".
- suhbat: boshqa hamma narsa; "javob" ga qisqa, foydali o'zbekcha javob yoz.
til — video tili (aytilmasa "uz").`;

const SSENARIY = `Sen qisqa YouTube video ssenariy muallifisan. Kinetik matnli (rasm va AI klipsiz) video uchun ssenariy yoz.
Qoidalar:
- Faqat haqiqatga mos ma'lumot. Aniq raqam yoki statistikani bilmasang — umuman ishlatma. To'qib chiqarma.
- Moliya, sog'liq mavzularida maslahat berma, faqat umumiy ta'lim; oxirida "Maslahat emas" kabi eslatma qo'y.
- 1-sahna kuchli hook (savol yoki hayratli fakt). Oxirgi sahna — chaqiriq (obuna/saqlash).
- Shorts: 6-9 sahna, jami 35-50 soniya. YouTube: 10-16 sahna, 70-120 soniya.
- Agar "Davomiylik" berilsa — aynan shunga mosla (har sahna ~6-8 soniya; masalan 180 soniya ≈ 24-28 sahna), mavzuni chuqurroq, bo'limlarga bo'lib yorit.
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
// ---------- Imzo: tayyor Shorts'ga hook + kinetik subtitr (Whisper, bepul) + zoom + «Obuna bo'ling» ----------
// Telegram'da video + izoh «Imzo» (yoki «Imzo: hook matni»); katta video — Drive Raw'ga, keyin «Imzo fayl.mp4: hook».
async function imzo(env, chat, { fileId, size, driveFayl, hook }) {
  if (fileId && size > 20 * 1024 * 1024) {
    return say(env, chat, `📦 Video ${Math.round(size / 1048576)} MB — Telegram botlarga faqat 20 MB gacha beradi.\nVideoni Drive'dagi <b>Claude → Raw</b> papkasiga tashlang va yozing:\n<code>Imzo fayl_nomi.mp4: hook matni</code>`);
  }
  const name = `imzo-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
  const scene = { type: 'custom', name: 'shorts/klip', src: fileId ? `tg/${name}.mp4` : `drive/${driveFayl}`, duration: 10 };
  if (hook) scene.hook = hook;
  await saveScript(env, name, { title: `Imzo ${name}`, transition: 0, scenes: [scene] });
  await dispatch(env, 'video-yasash.yml', { video: name, format: 'shorts', ai_kliplar: 'false', max_klip: '0', telegram: String(chat), tg_fayl: fileId || '' });
  return say(env, chat, `✍️ <b>Imzo</b> qo'yilmoqda${hook ? `\nHook: <i>${esc(hook)}</i>` : "\n<i>(hook yo'q — keyingi safar «Imzo: sarlavha» deb yozing)</i>"}\nSubtitr (Whisper), zoom, «Obuna bo'ling» — bepul. 3–6 daqiqada shu yerga keladi va Drive Export'ga tushadi.`);
}

async function dispatchMain(env, workflow, inputs) {
  const r = await GH(env, `/actions/workflows/${workflow}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs }) });
  if (!r.ok) throw new Error(`Workflow ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function imzoUzun(env, chat, { driveFayl, hook }) {
  // «hook | kim» — kim: rang ajratiladigan qahramon (sher, ayol, yuk mashinasi…)
  const [h, kim] = (hook || '').split('|').map((x) => x.trim());
  await dispatchMain(env, 'uzun-imzo.yml', { fayl: driveFayl, hook: h || '', til: '', kim: kim || '', telegram: String(chat) });
  hook = h;
  return say(env, chat, `✍️ <b>Uzun imzo</b>: ${esc(driveFayl)}${hook ? `\nHook: <i>${esc(hook)}</i>` : ''}${kim ? `\nRang ajratish: <i>${esc(kim)}</i>` : ''}\nFaqat boshi, o'rtasi va oxiri qayta yasaladi — butun video render qilinmaydi. 10 daqiqalik video ~6–8 daqiqada tayyor; Drive Export'ga tushadi, shu yerga xabar keladi.`);
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
async function newVideo(env, chat, { mavzu, format, til, soniya, avto, avtoYuklash }) {
  await say(env, chat, `✍️ Ssenariy yozyapman: <b>${esc(mavzu)}</b> (${format}${soniya ? ', ~' + Math.round(soniya / 60) + ' daq' : ''})…`);
  const s = await gemini(env, [{ text: `Mavzu: ${mavzu}\nFormat: ${format}\nTil: ${til}${soniya ? `\nDavomiylik: ${soniya} soniya` : ''}` }], { json: true, system: SSENARIY });
  const name = `bot-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
  const data = { ...s, ovozchi: KOKORO_TIL[til] || env.OVOZCHI || 'google:Charon', ...(OVOZ_USLUB[til] ? { ovozUslubi: OVOZ_USLUB[til] } : {}), bot: { format, mavzu, til } };
  await saveScript(env, name, data);
  if (avto) {
    // kunlik rejim: tasdiqsiz darrov yig'iladi (AI klipsiz, faqat ovoz — bir necha sent)
    await dispatch(env, 'video-yasash.yml', { video: name, format, ai_kliplar: 'false', max_klip: '0', telegram: String(chat), avto_yuklash: avtoYuklash ? 'true' : 'false' });
    const total = (s.scenes || []).reduce((a, x) => a + (x.duration || 0), 0);
    return say(env, chat, `🗓 <b>Bugungi video:</b> ${esc(s.title)}\n~${Math.round(total / 60 * 10) / 10} daq · ${s.scenes?.length} sahna\nYouTube nomi: <i>${esc(s.youtube?.nom)}</i>\n\n⏳ Yig'ilmoqda — tayyor bo'lgach shu yerga keladi${avtoYuklash ? ' va YouTube\'ga o\'zi yuklanadi.' : ', ✅ bossangiz YouTube\'ga yuklanadi.'}`);
  }
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

// ---------- trendlar ----------
const JOYLAR = {
  usa: ['US'], us: ['US'], amerika: ['US'], aqsh: ['US'],
  uz: ['UZ'], uzbekiston: ['UZ'], ozbekiston: ['UZ'],
  ru: ['RU'], rossiya: ['RU'], russia: ['RU'],
  spanish: ['MX', 'ES', 'CO', 'AR'], ispanish: ['MX', 'ES', 'CO', 'AR'], ispan: ['MX', 'ES', 'CO', 'AR'], es: ['MX', 'ES', 'CO', 'AR'], espanol: ['MX', 'ES', 'CO', 'AR'],
  mexico: ['MX'], meksika: ['MX'], spain: ['ES'], ispaniya: ['ES'], uk: ['GB'], turkiya: ['TR'], tr: ['TR'], india: ['IN'],
};
const SPANISH = new Set(['spanish', 'ispanish', 'ispan', 'es', 'espanol']);

function trendArg(s) {
  const so = String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  let joy = null, kalit = null;
  const qolgan = [];
  for (const w of so) {
    if (!joy && JOYLAR[w]) { joy = JOYLAR[w]; kalit = w; } else qolgan.push(w);
  }
  return { joy: joy || ['US'], kalit: kalit || 'usa', mavzu: qolgan.join(' ').trim(), ispan: SPANISH.has(kalit) };
}

async function ytTrend(env, { joy, mavzu, ispan }) {
  const t = await ytToken(env);
  const api = (p) => fetch(`https://www.googleapis.com/youtube/v3/${p}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json());
  let ids = [];
  if (mavzu) {
    // mavzu bo'yicha: oxirgi 7 kunda eng ko'p ko'rilganlar (100 birlik)
    const after = new Date(Date.now() - 7 * 864e5).toISOString();
    const q = new URLSearchParams({ part: 'id', type: 'video', order: 'viewCount', maxResults: '15', q: mavzu, publishedAfter: after, regionCode: joy[0] });
    if (ispan) q.set('relevanceLanguage', 'es');
    const s = await api(`search?${q}`);
    if (s.error) throw new Error('YouTube: ' + (s.error.message || s.error.code));
    ids = (s.items || []).map((i) => i.id.videoId).filter(Boolean);
  } else {
    // mamlakat trendi (har mamlakat 1 birlik)
    for (const r of joy) {
      const p = await api(`videos?part=id&chart=mostPopular&maxResults=${joy.length > 1 ? 8 : 15}&regionCode=${r}`);
      if (p.error) throw new Error('YouTube: ' + (p.error.message || p.error.code));
      ids.push(...(p.items || []).map((i) => i.id));
    }
  }
  ids = [...new Set(ids)].slice(0, 25);
  if (!ids.length) return [];
  const v = await api(`videos?part=snippet,statistics,contentDetails&id=${ids.join(',')}`);
  return (v.items || [])
    .map((x) => ({ nom: x.snippet.title, kanal: x.snippet.channelTitle, sana: x.snippet.publishedAt.slice(0, 10), uzunlik: x.contentDetails.duration, korish: Number(x.statistics.viewCount || 0), id: x.id }))
    .sort((a, b) => b.korish - a.korish);
}

const kq = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
const sek = (d) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
const qisqa = (s, max) => { let o = ''; for (const ch of s) { if (new TextEncoder().encode(o + ch).length > max) break; o += ch; } return o; };

async function trend(env, chat, arg) {
  if (!env.YT_REFRESH_TOKEN) return say(env, chat, '📈 YouTube hali ulanmagan.');
  const a = typeof arg === 'string' ? trendArg(arg) : arg;
  const joyNom = a.ispan ? 'ispan tilidagi (MX, ES, CO, AR)' : a.joy.join(', ');
  await say(env, chat, `📈 Trendlarni yig'yapman: <b>${esc(a.mavzu || 'umumiy')}</b> · ${esc(joyNom)}…`);
  const vids = await ytTrend(env, a);
  if (!vids.length) return say(env, chat, 'Hech narsa topilmadi. Boshqa mavzu yoki mamlakat bilan urinib ko\'ring.');
  const top = vids.slice(0, 10).map((v, i) => `${i + 1}. ${esc(v.nom.slice(0, 70))} — ${kq(v.korish)} · ${sek(v.uzunlik) <= 60 ? 'shorts' : Math.round(sek(v.uzunlik) / 60) + ' daq'}`).join('\n');
  await say(env, chat, `🔥 <b>Top videolar</b> (${esc(joyNom)}${a.mavzu ? ', «' + esc(a.mavzu) + '»' : ''}):\n${top}`);
  const r = await gemini(env, [{ text: JSON.stringify(vids.map(({ id, ...x }) => ({ ...x, sekund: sek(x.uzunlik) }))) }], {
    json: true,
    system: `Sen YouTube strategisan. Egasi o'zbek, AQShda tirakchi, Shorts va qisqa videolar yasaydi (kinetik matn + ovoz, rasm/klip kam). Berilgan trend videolar ro'yxatini tahlil qil.
FAQAT JSON: {"xulosa": "o'zbekcha 4-6 qator: nima ishlayapti (mavzu, nom uslubi, uzunlik, format), raqamlar faqat berilgandan", "goyalar": ["g'oya 1", "g'oya 2", "g'oya 3", "g'oya 4"]}
G'oyalar: egasi o'zi yasay oladigan, trendga mos, aniq mavzu (har biri 4-8 so'z, o'zbekcha). Boshqalarning videosini ko'chirma, o'z burchagidan ber.`,
  });
  const goya = (r.goyalar || []).slice(0, 4);
  const kb = goya.map((g) => [{ text: '🎬 ' + qisqa(g, 40), callback_data: 'n:' + qisqa(g, 58) }]);
  await say(env, chat, `🧠 <b>Xulosa</b>\n${esc(r.xulosa || '')}\n\n💡 <b>G'oyalar</b> — bossangiz ssenariy yozaman:`, { reply_markup: { inline_keyboard: kb } });
}

// ---------- sozlamalar (GitHub'da bot/sozlama.json — bot o'zi o'qiydi/yozadi) ----------
const SOZ_FAYL = 'bot/sozlama.json';
let sozKesh = null, sozVaqt = 0;
function sozStandart(env) {
  return { yoqiq: true, soat: 7, joy: env.KUNLIK_JOY || 'usa', til: env.KUNLIK_TIL || 'uz', daqiqa: Number(env.KUNLIK_DAQIQA || 3), yuklash: 'tasdiq' };
}
async function sozOl(env) {
  if (sozKesh && Date.now() - sozVaqt < 30000) return sozKesh;
  const r = await GH(env, `/contents/${SOZ_FAYL}?ref=${env.GITHUB_BRANCH}`);
  let s = sozStandart(env), sha;
  if (r.ok) {
    const j = await r.json();
    sha = j.sha;
    try { s = { ...s, ...JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\n/g, ''))))) }; } catch {}
  }
  sozKesh = { ...s, _sha: sha }; sozVaqt = Date.now();
  return sozKesh;
}
async function sozYoz(env, s) {
  const { _sha, ...toza } = s;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(toza, null, 2) + '\n')));
  const r = await GH(env, `/contents/${SOZ_FAYL}`, { method: 'PUT', body: JSON.stringify({ message: 'Bot: sozlama', content, branch: env.GITHUB_BRANCH, ...(_sha ? { sha: _sha } : {}) }) });
  if (!r.ok) throw new Error(`Sozlamani saqlab bo'lmadi (${r.status})`);
  const j = await r.json();
  sozKesh = { ...toza, _sha: j.content?.sha }; sozVaqt = Date.now();
}
const JOY_NOM = { usa: '🇺🇸 USA', spanish: '🇪🇸 Spanish', uz: '🇺🇿 UZ', ru: '🇷🇺 RU' };
const TIL_NOM = { uz: "O'zbek", en: 'English', es: 'Español', ru: 'Русский' };
// inglizcha/ispancha videolar — tekin Kokoro ovozi; boshqa tillar — Gemini
const KOKORO_TIL = { en: 'kokoro:am_michael', es: 'kokoro:em_alex' };
const OVOZ_USLUB = {
  en: 'natural, confident and energetic male narrator speaking English at a brisk pace',
  es: 'narrador masculino natural, seguro y enérgico, hablando español con ritmo ágil',
  ru: 'естественный, уверенный и энергичный мужской диктор, говорит по-русски в бодром темпе',
};
function sozMatn(s) {
  return `⚙️ <b>Kunlik video sozlamalari</b>\n\nHolat: ${s.yoqiq ? '✅ yoqiq' : '⏸ o\'chiq'}\nVaqt: har kuni ${s.soat}:00 (Los Anjeles)\nTrend: ${JOY_NOM[s.joy] || s.joy}\nVideo tili: ${TIL_NOM[s.til] || s.til}\nUzunlik: ${s.daqiqa <= 1 ? 'Shorts (~45 s)' : s.daqiqa + ' daqiqa'}\nYuklash: ${s.yuklash === 'avto' ? '🤖 avtomatik (tasdiqsiz)' : '✅ men tasdiqlayman'}\n\nO'zgartirish uchun tugmani bosing:`;
}
function sozTugma(s) {
  const b = (t, k, v) => ({ text: (String(s[k]) === String(v) ? '● ' : '') + t, callback_data: `s:${k}:${v}` });
  return { inline_keyboard: [
    [{ text: s.yoqiq ? '⏸ To\'xtatish' : '▶️ Yoqish', callback_data: `s:yoqiq:${s.yoqiq ? 0 : 1}` }, { text: '🎬 Hozir yasash', callback_data: 's:bugun:1' }],
    [5, 7, 9, 12, 18, 21].map((h) => b(`${h}:00`, 'soat', h)),
    Object.entries(JOY_NOM).map(([k, t]) => b(t, 'joy', k)),
    Object.entries(TIL_NOM).map(([k, t]) => b(t, 'til', k)),
    [b('Shorts', 'daqiqa', 1), b('3 daq', 'daqiqa', 3), b('5 daq', 'daqiqa', 5), b('8 daq', 'daqiqa', 8)],
    [b('✅ Tasdiq bilan', 'yuklash', 'tasdiq'), b('🤖 Avto yuklash', 'yuklash', 'avto')],
  ] };
}
async function sozlama(env, chat) {
  const s = await sozOl(env);
  return say(env, chat, sozMatn(s), { reply_markup: sozTugma(s) });
}
async function sozBos(env, cb, k, v) {
  const chat = cb.message.chat.id;
  if (k === 'bugun') return kunlik(env, chat);
  const s = await sozOl(env);
  if (k === 'yoqiq') s.yoqiq = v === '1';
  else if (k === 'soat' || k === 'daqiqa') s[k] = Number(v);
  else if (['joy', 'til', 'yuklash'].includes(k)) s[k] = v;
  await sozYoz(env, s);
  await TG(env, 'editMessageText', { chat_id: chat, message_id: cb.message.message_id, text: sozMatn(sozKesh), parse_mode: 'HTML', reply_markup: sozTugma(sozKesh) });
}

// ---------- kunlik avtomatik video ----------
// Har kuni (sozlamadagi soatda) yoki /bugun: trend → eng yaxshi g'oya → ssenariy → yig'ish → Telegram (✅ yoki avto yuklash)
async function kunlik(env, chat) {
  const soz = await sozOl(env);
  const joy = soz.joy, til = soz.til;
  const soniya = Math.round(Number(soz.daqiqa || 3) * 60);
  await say(env, chat, `🗓 Kunlik video: trendni ko'ryapman (${esc(joy)})…`);
  const a = trendArg(joy);
  const vids = await ytTrend(env, a);
  if (!vids.length) return say(env, chat, '🗓 Bugun trend topilmadi — ertaga yana urinaman.');
  const r = await gemini(env, [{ text: JSON.stringify(vids.slice(0, 20).map(({ id, ...x }) => ({ ...x, sekund: sek(x.uzunlik) }))) }], {
    json: true,
    system: `Sen YouTube strategisan. Egasi o'zbek, AQShda tirakchi; kanalida kinetik matn + ovozli videolar (rasm/klip yo'q). Trend ro'yxatidan ilhomlanib BITTA eng yaxshi ${Math.round(soniya / 60)} daqiqalik video mavzusini tanla: trendga yaqin, foydali, haqiqatga asoslangan, boshqalarning videosini ko'chirmaydigan, siyosat/sog'liq/moliya maslahati bo'lmagan.
FAQAT JSON: {"mavzu": "aniq mavzu, 5-10 so'z, ${til === 'uz' ? "o'zbekcha" : til}", "sabab": "nega aynan shu (1 qator, o'zbekcha)"}`,
  });
  await say(env, chat, `🎯 Tanlangan mavzu: <b>${esc(r.mavzu)}</b>\n<i>${esc(r.sabab || '')}</i>`);
  return newVideo(env, chat, { mavzu: r.mavzu, format: soniya <= 60 ? 'shorts' : 'youtube', til, soniya: soniya <= 60 ? 0 : soniya, avto: true, avtoYuklash: soz.yuklash === 'avto' });
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
    const zaxira = text.startsWith('⚠️(zaxira) ');
    text = text.replace('⚠️(zaxira) ', '');
    await say(env, chat, `🎙 <i>${esc(text)}</i>` + (zaxira ? "\n<i>(Gemini band edi — zaxira model eshitdi, xato bo'lsa matn bilan yozing)</i>" : ''));
  }
  if (!text && !msg.video && !msg.document) return;
  // pastki doimiy tugmalar
  const TUGMA = { '📈 Trend USA': '/trend usa', '📈 Trend Spanish': '/trend spanish', '📈 Trend UZ': '/trend uz', '📊 Kanal tahlili': '/tahlil', '⚙️ Sozlama': '/sozlama', '❓ Yordam': '/yordam' };
  if (TUGMA[text]) text = TUGMA[text];
  // Imzo
  const vid = msg.video || (msg.document && /^video\//.test(msg.document.mime_type || '') ? msg.document : null);
  if (/^\s*imzo\b/i.test(text) || (vid && !text)) {
    const rest = text.replace(/^\s*imzo\b[\s:,-]*/i, '').trim();
    if (vid) return imzo(env, chat, { fileId: vid.file_id, size: vid.file_size || 0, hook: rest });
    const uzun = /^uzun\b/i.test(rest);
    const r2 = rest.replace(/^uzun\b[\s:,-]*/i, '');
    const m = r2.match(/^(\S+\.(?:mp4|mov|m4v|webm))\s*[:,-]?\s*(.*)$/i);
    if (m) return uzun ? imzoUzun(env, chat, { driveFayl: m[1], hook: m[2].trim() }) : imzo(env, chat, { driveFayl: m[1], hook: m[2].trim() });
    return say(env, chat, "✍️ <b>Imzo</b> — tayyor Shorts'ga hook, subtitr, zoom va «Obuna bo'ling» qo'shaman (bepul).\n\n• Videoni shu yerga yuboring, izohiga: <code>Imzo: hook matni</code>\n• 20 MB dan katta bo'lsa — Drive'dagi Claude → Raw'ga tashlang va yozing: <code>Imzo fayl.mp4: hook matni</code>\n• Uzun video (10–20 daqiqa) — Raw'ga tashlang: <code>Imzo uzun fayl.mp4: hook matni | sher</code> (faqat boshi, o'rtasi, oxiri yasaladi — tez; «| sher» — qahramon rangli, fon oq-qora)");
  }
  if (text === '🎬 Yangi video') return say(env, chat, 'Qaysi mavzuda? Yozing yoki ovoz yuboring, masalan: «tirakchilar uchun 5 ta tejash usuli».');
  if (text === '/start' || text === '/yordam') {
    await say(env, chat, 'Tugmalar pastda 👇', {
      reply_markup: { keyboard: [[{ text: '📈 Trend USA' }, { text: '📈 Trend Spanish' }], [{ text: '📈 Trend UZ' }, { text: '📊 Kanal tahlili' }], [{ text: '🎬 Yangi video' }, { text: '⚙️ Sozlama' }], [{ text: '❓ Yordam' }]], resize_keyboard: true, is_persistent: true },
    });
    return say(env, chat, `Salom! Men kanal botingizman.\n\n• Yozing yoki ovoz yuboring: «Tirakchilik haqida shorts yasa»\n• /tahlil — kanal statistikasi va g'oyalar\n• /trend usa · /trend spanish · /trend usa trucking — trendlar va g'oyalar\n• /yangi mavzu — yangi video ssenariysi\n• /bugun — kunlik videoni hozir yasash\n• YouTube havolasini yuboring — referens tahlili (hook, temp, tuzilma, g'oyalar)\n• /sozlama — kunlik video: vaqt, trend, til, uzunlik, yuklash rejimi\n• Video yuboring + izoh «Imzo: hook» — hook, subtitr, zoom, «Obuna bo'ling» (bepul)`);
  }
  if (text.startsWith('/tahlil')) return analysis(env, chat);
  if (text.startsWith('/bugun')) return kunlik(env, chat);
  // YouTube havola yoki /referens <havola> — referens tahlili (yt-dlp, GitHub'da; video hech qayerga joylanmaydi)
  const havola = (text.match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/\S+/) || [])[0];
  if (havola && (text.startsWith('/referens') || text.trim() === havola)) {
    await dispatch(env, 'referens.yml', { url: havola, telegram: String(chat) });
    return say(env, chat, "🔎 Referensni Gemini ko'ryapti (1–3 daqiqa): hook, tuzilma, temp va bizga moslash g'oyalari. Natija shu yerga keladi.");
  }
  if (text.startsWith('/referens')) return say(env, chat, 'Havolani ham yozing: /referens https://youtu.be/…');
  if (text.startsWith('/sozlama')) return sozlama(env, chat);
  if (text.startsWith('/trend')) return trend(env, chat, text.replace(/^\/trend\S*/, ''));
  if (text.startsWith('/yangi')) return newVideo(env, chat, { mavzu: text.replace('/yangi', '').trim() || 'kanal mavzusida qiziqarli fakt', format: 'shorts', til: 'uz' });
  const n = await gemini(env, [{ text }], { json: true, system: NIYAT });
  if (n.amal === 'yangi_video') return newVideo(env, chat, { mavzu: n.mavzu || text, format: n.format === 'youtube' ? 'youtube' : 'shorts', til: n.til || 'uz' });
  if (n.amal === 'tahlil') return analysis(env, chat);
  if (n.amal === 'trend') return trend(env, chat, `${n.joy || ''} ${n.mavzu || ''}`);
  return say(env, chat, esc(n.javob || 'Tushunmadim, qaytadan yozing.'));
}

async function onCallback(env, cb) {
  const chat = cb.message.chat.id;
  const [k, name, fmt] = cb.data.split(':');
  await TG(env, 'answerCallbackQuery', { callback_query_id: cb.id });
  if (k === 's') return sozBos(env, cb, name, fmt); // sozlama tugmalari (xabar qoladi, yangilanadi)
  if (k === 'n') return newVideo(env, chat, { mavzu: cb.data.slice(2), format: 'shorts', til: 'uz' }); // trend g'oyasi (tugmalar qoladi)
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


// ---------- Ochiq sahifalar (Google OAuth: bosh sahifa, maxfiylik, shartlar) ----------
const SAHIFALAR = {
  '/': ['Kanal bot', `<p>Kanal bot — bitta egasining shaxsiy YouTube kanal yordamchisi (Telegram bot). U egasining buyrug'i bilan video ssenariy yozadi, video yasaydi va egasi tasdiqlagandan keyingina uning o'z YouTube kanaliga yuklaydi.</p>
<p>Bot faqat egasi uchun ishlaydi; boshqa foydalanuvchilarga xizmat ko'rsatmaydi.</p>
<p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>
<hr><p lang="en">Kanal bot is a private assistant for a single owner's YouTube channel. It writes video scripts, renders videos and uploads them to the owner's own channel only after the owner approves each upload. It does not serve other users.</p>`],
  '/privacy': ['Privacy Policy', `<p lang="en"><b>Last updated:</b> November 20, 2026</p>
<p lang="en">Kanal bot is used only by its owner. With the owner's permission it uses Google OAuth to access the owner's YouTube account with two scopes: <i>youtube.upload</i> (to upload videos the owner approved) and <i>youtube.readonly</i> (to read channel and video statistics for the owner's own analysis).</p>
<ul lang="en"><li>YouTube data is used only to show statistics to the owner and to upload the owner's videos. It is not sold, shared with third parties or used for advertising.</li>
<li>OAuth tokens are stored encrypted as secrets of the owner's Cloudflare Worker and GitHub repository and are never published.</li>
<li>Statistics are processed on request and are not stored permanently.</li>
<li>The owner can revoke access at any time at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.</li></ul>
<p lang="en">Kanal bot's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements. YouTube API Services are used under the <a href="https://www.youtube.com/t/terms">YouTube Terms of Service</a> and the <a href="https://policies.google.com/privacy">Google Privacy Policy</a>.</p>
<p lang="en">Contact: via Telegram, <a href="https://t.me/Farolabsbot">@Farolabsbot</a>.</p>`],
  '/terms': ['Terms of Service', `<p lang="en">Kanal bot is a private tool operated by and for its single owner. It is provided as is, without warranty. Using it means agreeing to the <a href="https://www.youtube.com/t/terms">YouTube Terms of Service</a>. Contact: via Telegram, <a href="https://t.me/Farolabsbot">@Farolabsbot</a>.</p>`],
};

function sahifa(yol) {
  const p = SAHIFALAR[yol] || SAHIFALAR['/'];
  const html = `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p[0]}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;color:#222}a{color:#1a73e8}</style></head>
<body><h1>${p[0]}</h1>${p[1]}</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(req, env, ctx) {
    if (req.method !== 'POST') return sahifa(new URL(req.url).pathname);
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
  // Cloudflare cron (wrangler.toml → [triggers]) — har kungi video
  // har soat ishga tushadi; sozlamadagi soat (Los Anjeles vaqti, yoz/qish o'zi hisoblanadi) kelganda video yasaydi
  async scheduled(event, env, ctx) {
    const chat = env.OWNER_CHAT_ID;
    if (!chat) return;
    ctx.waitUntil((async () => {
      const s = await sozOl(env);
      const soat = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(new Date(event.scheduledTime || Date.now())));
      if (!s.yoqiq || soat !== Number(s.soat)) return;
      await kunlik(env, chat);
    })().catch((e) => say(env, chat, `⚠️ Kunlik video xatosi: ${esc(e.message).slice(0, 400)}`)));
  },
};
