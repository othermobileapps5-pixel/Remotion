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

const say = async (env, chat, text, extra = {}) => {
  const r = await TG(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  await tarixQosh(env, chat, 'bot', String(text).replace(/<[^>]+>/g, '')).catch(() => {});
  return r;
};

// ---------- Suhbat xotirasi: oxirgi 10 ta xabar (Workers KV «ALBOM», bo'lmasa — shu nusxa xotirasi) ----------
// «ha», «yana bitta», «inglizchasini ham» kabi davomli gaplarni tushunish uchun Gemini'ga beriladi.
const TARIX = new Map();
const TARIX_SONI = 10;
async function kvOl(env, key) {
  if (TARIX.has(key)) return TARIX.get(key);
  const v = env.ALBOM ? await env.ALBOM.get(key, 'json').catch(() => null) : null;
  if (v) TARIX.set(key, v);
  return v;
}
async function kvYoz(env, key, v, ttl = 7 * 86400) {
  TARIX.set(key, v);
  if (env.ALBOM) await env.ALBOM.put(key, JSON.stringify(v), { expirationTtl: ttl }).catch(() => {});
}
async function tarixQosh(env, chat, kim, matn) {
  if (!chat || !matn) return;
  const t = (await kvOl(env, `tarix/${chat}`)) || [];
  t.push({ k: kim, t: String(matn).slice(0, 400) });
  await kvYoz(env, `tarix/${chat}`, t.slice(-TARIX_SONI));
}
// Oxirgi yasalgan ssenariy (yasash, YouTube'ga yuklash, muqova uchun)
const oxirgiOl = (env, chat) => kvOl(env, `oxirgi/${chat}`);
const oxirgiYoz = (env, chat, v) => kvYoz(env, `oxirgi/${chat}`, v, 30 * 86400);
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
Unga oldingi suhbat (oxirgi xabarlar), oxirgi yasalgan video va xabarga video biriktirilganmi — beriladi. Davomli gaplarni («ha», «yasa», «yana bitta», «inglizchasini ham», «uni yukla») shu kontekst bo'yicha tushun.
FAQAT JSON qaytar:
{"amal": "...", "mavzu": "", "joy": "", "format": "", "til": "", "soni": 0, "hook": "", "fayllar": [], "url": "", "muqova": 0, "javob": ""}
amal — quyidagilardan BITTASI:
- yangi_video: video/ssenariy/reklama yasash so'ralsa. mavzu — aniq mavzu (oldingi videoga o'xshash «yana bitta» bo'lsa — o'sha mavzuga yaqin yangi mavzu). format: "shorts" | "youtube" (aytilmasa "shorts"). til: "uz" | "en" | "es" | "ru" (aytilmasa "uz").
- yasash: oxirgi yozilgan ssenariydan videoni yig'ish («ha», «yasa», «boshla» — bot oxirgi ssenariyni taklif qilgan bo'lsa).
- yuklash: oxirgi videoni YouTube'ga yuklash. muqova: 1 yoki 2 (aytilgan bo'lsa), aks holda 0.
- muqova: muqova (thumbnail) haqida so'ralsa — ko'rsatish/tanlash.
- tahlil: O'Z kanali statistikasi, qaysi videosi yaxshi.
- trend: YouTube'da nima trendda. joy: "usa" | "spanish" | "uz" | "ru" | "" (Amerika→usa, ispancha→spanish). mavzu — aytilgan bo'lsa.
- aitrend: AI bilan yasalgan videolar trendi. joy: "usa" | "spanish".
- tomy: kunlik video agenti Tomy, jadval, sozlama, kunlik video vaqti.
- bugun: kunlik videoni hozir yasash.
- referens: YouTube videoni tahlil qilish (url — havola).
- qirq: videodan eng yaxshi sahnalarni kesish (soni: 2 yoki 3). Video biriktirilgan yoki fayllar (Drive nomi .mp4) bo'lishi kerak.
- montaj: eng yaxshi lahzalardan bitta video (soni: 2–4).
- ula: bir nechta videoni bittaga ulash. format: "shorts" | "youtube" | "".
- imzo: videoga hook, subtitr, zoom, «Obuna bo'ling» qo'yish. hook — sarlavha (aytilgan bo'lsa).
- imzo_uzun: uzun videoga (Drive'dagi fayl) imzo.
- yordam: bot nima qila olishi so'ralsa.
- suhbat: boshqa hamma narsa; "javob" ga qisqa, foydali o'zbekcha javob yoz.
hook — foydalanuvchi aytgan sarlavha matni (o'zi to'qib chiqarma). fayllar — xabardagi .mp4/.mov fayl nomlari.`;

const SSENARIY = `Sen qisqa YouTube video ssenariy muallifisan. Ekranda yozuv YO'Q video uchun ssenariy yoz: har sahna — faqat rasm + ovoz.
Qoidalar:
- Faqat haqiqatga mos ma'lumot. Aniq raqam yoki statistikani bilmasang — umuman ishlatma. To'qib chiqarma.
- Moliya, sog'liq mavzularida maslahat berma, faqat umumiy ta'lim; oxirida "Maslahat emas" kabi eslatma qo'y.
- 1-sahna kuchli hook (savol yoki hayratli fakt). Oxirgi sahna — chaqiriq (obuna/saqlash).
- Shorts: 6-9 sahna, jami 35-50 soniya. YouTube: 10-16 sahna, 70-120 soniya.
- Agar "Davomiylik" berilsa — aynan shunga mosla (har sahna ~6-8 soniya; masalan 180 soniya ≈ 24-28 sahna), mavzuni chuqurroq, bo'limlarga bo'lib yorit.
- Har sahnada "ovoz" — o'qiladigan gap (sahna matnidan uzunroq bo'lishi mumkin, 1-2 gap). "text" — ekrandagi qisqa matn (5-9 so'z, \\n bilan 2 qator).
- duration: ovoz uzunligiga mos (o'zbekcha ~2.3 so'z/soniya) + 0.8.
- HAR sahnada (birinchi va oxirgisi ham) "rasm": INGLIZCHA rasm tavsifi (15-30 so'z): aniq obraz, joy, yorug'lik, kadr (close-up / wide shot); sahna mazmuniga mos, haqiqiy odamlar, brendlar va logolar bo'lmasin, rasmda yozuv bo'lmasin.
- "musiqa_qidiruv": fon musiqasi uchun 2-4 INGLIZCHA so'z — mavzu va kayfiyatga mos janr/cholg'u (Misr → "egypt ambient duduk", texnika → "tech corporate upbeat", qo'rqinchli → "dark suspense cinematic", yuk mashinasi → "country road guitar"); qo'shiq nomi yoki san'atkor emas.
- "rasmUslub": butun video uchun bitta INGLIZCHA uslub (masalan "cinematic photorealistic, warm film grain" yoki "dramatic digital painting, dark teal and orange") — rasmlar bir-biriga mos chiqadi.
FAQAT JSON qaytar:
{"title": "...", "theme": {"bg": "#0b1020", "accent": "#ffcc33", "text": "#ffffff"},
 "rasmUslub": "...",
 "musiqa_qidiruv": "...",
 "scenes": [{"type": "title", "text": "...", "subtitle": "...", "duration": 4, "ovoz": "..."}, {"type": "text", "text": "...", "duration": 5, "ovoz": "...", "rasm": "..."}],
 "youtube": {"nom": "YouTube sarlavha (60 belgigacha)", "tavsif": "2-4 qator tavsif", "teglar": ["...", "..."]},
 "muqova": {"matn": "2-4 SO'Z", "urgu": "SO'Z", "belgi": "", "rasm_prompt": "..."}}
Muqova (YouTube thumbnail) qoidalari — ko'p bosiladigan bo'lsin:
- "matn": 2-4 so'z, KATTA HARFDA, video tilida; sarlavhani takrorlama — qiziqish uyg'ot ("NOBODY KNEW THIS", "HE LIED", "NUNCA TE LO DIJERON").
- "urgu": matndagi eng kuchli bitta so'z (rangli quti ichida chiqadi).
- "belgi": ixtiyoriy qisqa stiker: "?", "!", raqam ("$5000", "24H", "1912") yoki "".
- "rasm_prompt": INGLIZCHA, bitta kuchli markaziy obraz (odam yuzi hayratda, portlash, qadimiy shahar...), dramatik yorug'lik; matn so'rama.
- "rasm" va "rasm_prompt" ichida HECH QACHON brend, o'yin, film, kompaniya yoki mashhur odam nomini yozma (GTA, iPhone, Marvel, Elon Musk...) — umumiy tasvirla ("open-world crime game city at sunset", "a tech billionaire"). Aks holda rasmga logo tushadi.`;

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
async function muqovaRasm(env, name, s) {
  if (!env.AI) return;
  const prompt = `${s.muqova.rasm_prompt || s.youtube?.nom || s.title}. YouTube thumbnail background, one bold central subject, cinematic dramatic lighting, high contrast, vivid saturated colors, ultra detailed, absolutely no text, no letters, no logos, no brand names, no trademarks.`;
  const r = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: prompt.slice(0, 2000), steps: 8 });
  if (!r?.image) throw new Error('FLUX rasm qaytarmadi');
  const res = await GH(env, `/contents/public/muqova/${name}.jpg`, {
    method: 'PUT',
    body: JSON.stringify({ message: `Bot: ${name} muqova rasmi`, content: r.image, branch: env.GITHUB_BRANCH }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
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

// ---------- Qirqish: videodan eng yaxshi 2–3 sahna, ball bilan, har biri Imzo'li Shorts ----------
// Telegram'da video + izoh «Qirq» (yoki «Qirq 2», «Qirq: hook»); katta video — Drive Raw'ga, keyin «Qirq fayl.mp4».
// «Montaj» — xuddi shunday, lekin eng yaxshi lahzalar silliq o'tishlar bilan bitta Shorts'ga ulanadi.
async function qirq(env, chat, { fileId, size, driveFayl, soni, hook, montaj }) {
  const soz = montaj ? 'Montaj' : 'Qirq';
  if (fileId && size > 20 * 1048576) {
    return say(env, chat, `📦 Video ${Math.round(size / 1048576)} MB — Telegram botlarga faqat 20 MB gacha beradi.\nVideoni Drive'dagi <b>Claude → Raw</b> papkasiga tashlang va yozing:\n<code>${soz} fayl_nomi.mp4</code>`);
  }
  await dispatchMain(env, 'qirqish.yml', { tg_fayl: fileId || '', fayl: driveFayl || '', soni: String(soni), montaj: montaj ? 'true' : 'false', hook: hook || '', telegram: String(chat) });
  return say(env, chat, montaj
    ? `🎬 <b>Montaj</b>: eng yaxshi ${soni} ta lahzani topib (har biriga ball), silliq o'tishlar bilan bitta Shorts qilaman (60 s gacha).\nHook, subtitr, zoom va «Obuna bo'ling» bilan. 5–15 daqiqada shu yerga keladi.`
    : `✂️ <b>Qirqyapman</b>: eng yaxshi ${soni} ta sahnani topib, har biriga ball qo'yaman (1–10).\nHar biri hook, subtitr, zoom va «Obuna bo'ling» bilan Shorts bo'ladi. Uzunligiga qarab 5–15 daqiqada shu yerga keladi.`);
}

// ---------- Ulash: bir nechta videoni bitta videoga (faqat «Ula» buyrug'i bilan) ----------
// Telegram albomni har video uchun alohida xabar qilib yuboradi, izoh faqat bittasida bo'ladi.
// Shuning uchun albom videolari eslab qolinadi (Workers KV «ALBOM», bo'lmasa — shu nusxa xotirasi),
// «Ula» izohli xabar kelganda bir necha soniya kutib, o'sha albomning hamma videosi yig'iladi.
const ALBOM = new Map();
async function albomSaqla(env, chat, msg, vid) {
  const v = { id: msg.message_id, g: msg.media_group_id, f: vid.file_id, size: vid.file_size || 0 };
  ALBOM.set(`${chat}/${v.id}`, v);
  if (env.ALBOM) await env.ALBOM.put(`${chat}/${v.id}`, JSON.stringify(v), { expirationTtl: 3600 }).catch(() => {});
}
async function albomOl(env, chat, msg) {
  await sleep(4000); // albomning qolgan videolari yetib kelsin
  const out = [];
  for (let id = msg.message_id - 10; id <= msg.message_id + 10; id++) {
    let v = ALBOM.get(`${chat}/${id}`);
    if (!v && env.ALBOM) v = await env.ALBOM.get(`${chat}/${id}`, 'json').catch(() => null);
    if (v && v.g === msg.media_group_id) out.push(v);
  }
  return out.sort((a, b) => a.id - b.id);
}
async function ula(env, chat, { fayllar, driveFayllar, format, hook }) {
  const n = (fayllar || driveFayllar).length;
  if (n < 2) {
    return say(env, chat, "🔗 Ulash uchun kamida 2 ta video kerak.\n• Videolarni <b>bitta albom</b> qilib yuboring, izohiga <code>Ula</code> yozing\n• Yoki Drive'dagi Claude → Raw'dan: <code>Ula a.mp4 b.mp4 c.mp4</code>");
  }
  if (n > 10) return say(env, chat, '🔗 Bir martada 10 tagacha video ulanadi.');
  const katta = (fayllar || []).find((v) => v.size > 20 * 1048576);
  if (katta) return say(env, chat, `📦 Albomdagi bir video ${Math.round(katta.size / 1048576)} MB — Telegram botlarga faqat 20 MB gacha beradi.\nVideolarni Drive'dagi <b>Claude → Raw</b> ga tashlang va yozing: <code>Ula a.mp4 b.mp4</code>`);
  await dispatchMain(env, 'ulash.yml', {
    tg_fayllar: (fayllar || []).map((v) => v.f).join(','),
    fayllar: (driveFayllar || []).join(' '),
    format,
    hook: hook || '',
    telegram: String(chat),
  });
  const fmt = format === 'auto' ? "format videolarga qarab (ko'pi tik — Shorts, yotiq — YouTube)" : format === 'shorts' ? 'Shorts (tik)' : 'YouTube (yotiq)';
  return say(env, chat, `🔗 <b>Ulayapman</b>: ${n} ta video, yuborilgan tartibda, silliq o'tishlar bilan.\n${fmt}; hook, subtitr, zoom va «Obuna bo'ling» qo'shiladi. 5–15 daqiqada shu yerga keladi.`);
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
async function newVideo(env, chat, { mavzu, format, til, soniya, avto, avtoYuklash, qoshimcha = '', googleAI = false }) {
  await say(env, chat, `✍️ Ssenariy yozyapman: <b>${esc(mavzu)}</b> (${format}${soniya ? ', ~' + Math.round(soniya / 60) + ' daq' : ''})…`);
  const s = await gemini(env, [{ text: `Mavzu: ${mavzu}\nFormat: ${format}\nTil: ${til}${soniya ? `\nDavomiylik: ${soniya} soniya` : ''}` }], { json: true, system: SSENARIY });
  const name = `bot-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}${qoshimcha}`;
  const data = { ...s, ovozchi: KOKORO_TIL[til] || env.OVOZCHI || 'google:Charon', ...(OVOZ_USLUB[til] ? { ovozUslubi: OVOZ_USLUB[til] } : {}), bot: { format, mavzu, til } };
  await saveScript(env, name, data);
  await oxirgiYoz(env, chat, { name, format, mavzu, til, muqova: format !== 'shorts' && !!s.muqova }).catch(() => {});
  // Muqova rasmi (uzun video): Google o'chiq bo'lsa — tekin Cloudflare FLUX shu yerda chiziladi;
  // Google yoqiq bo'lsa — workflow'da Gemini chizadi (scripts/muqova.mjs). Xato bo'lsa video baribir yasaladi.
  if (format !== 'shorts' && !googleAI && s.muqova) await muqovaRasm(env, name, s).catch((e) => console.log('muqova:', e.message));
  if (avto) {
    // kunlik rejim: tasdiqsiz darrov yig'iladi (AI klipsiz, faqat ovoz — bir necha sent)
    await dispatch(env, 'video-yasash.yml', { video: name, format, ai_kliplar: 'false', max_klip: '0', telegram: String(chat), google_ai: String(!!googleAI), avto_yuklash: avtoYuklash ? 'true' : 'false' });
    const total = (s.scenes || []).reduce((a, x) => a + (x.duration || 0), 0);
    return say(env, chat, `🤖 <b>Tomy'ning bugungi videosi:</b> ${esc(s.title)}\n~${Math.round(total / 60 * 10) / 10} daq · ${s.scenes?.length} sahna\nYouTube nomi: <i>${esc(s.youtube?.nom)}</i>\n\n⏳ Yig'ilmoqda — tayyor bo'lgach shu yerga keladi${avtoYuklash ? ' va YouTube\'ga o\'zi yuklanadi.' : ', ✅ bossangiz YouTube\'ga yuklanadi.'}`);
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

// AI kontent trendi: oxirgi 7 kunda AI bilan yasalgan, eng ko'p ko'rilgan videolar (YouTube qidiruvi, "|" — yoki)
const AI_TREND = {
  usa: { joy: ['US'], kalit: 'usa', ispan: false, nom: 'AI kontent', mavzu: '"AI generated"|"made with AI"|"AI video"|"AI animation"|"AI short film"|sora|veo' },
  spanish: { joy: ['MX'], kalit: 'spanish', ispan: true, nom: 'AI kontent', mavzu: '"hecho con IA"|"video con IA"|"generado con IA"|"animación IA"|"inteligencia artificial" video' },
};
async function trend(env, chat, arg) {
  if (!env.YT_REFRESH_TOKEN) return say(env, chat, '📈 YouTube hali ulanmagan.');
  const a = typeof arg === 'string' ? trendArg(arg) : arg;
  const joyNom = a.ispan ? 'ispan tilidagi (MX, ES, CO, AR)' : a.joy.join(', ');
  const mNom = a.nom || a.mavzu || 'umumiy';
  await say(env, chat, `📈 Trendlarni yig'yapman: <b>${esc(mNom)}</b> · ${esc(joyNom)}…`);
  const vids = await ytTrend(env, a);
  if (!vids.length) return say(env, chat, 'Hech narsa topilmadi. Boshqa mavzu yoki mamlakat bilan urinib ko\'ring.');
  const top = vids.slice(0, 10).map((v, i) => `${i + 1}. <a href="https://youtu.be/${v.id}">${esc(v.nom.slice(0, 70))}</a> — ${kq(v.korish)} · ${sek(v.uzunlik) <= 60 ? 'shorts' : Math.round(sek(v.uzunlik) / 60) + ' daq'}`).join('\n');
  await say(env, chat, `🔥 <b>Top videolar</b> (${esc(joyNom)}${a.mavzu ? ', «' + esc(mNom) + '»' : ''}):\n${top}`, { link_preview_options: { is_disabled: true } });
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
// eski sozlamalar bilan mos: tillar bo'lmasa — til; format bo'lmasa — daqiqadan
function sozTillar(s) { return Array.isArray(s.tillar) && s.tillar.length ? s.tillar : [s.til || 'uz']; }
function sozFormat(s) { return s.format || (Number(s.daqiqa) <= 1 ? 'shorts' : 'youtube'); }
const FORMAT_NOM = { shorts: 'Shorts (~45 s)', youtube: 'Uzun', ikkalasi: 'Uzun + Shorts' };
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
// Jadval: har biri alohida video — { soat, til, format: 'youtube' | 'shorts' }.
// Eski sozlama (tillar × format, bitta soat) bo'lsa — undan yasaladi.
const BAYROQ = { uz: '🇺🇿', en: '🇺🇸', es: '🇪🇸', ru: '🇷🇺' };
const SOATLAR = [5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 21];
const TOMY_TILLAR = ['en', 'es'];
function sozJadval(s) {
  if (Array.isArray(s.jadval)) return s.jadval;
  const f = sozFormat(s);
  return sozTillar(s).flatMap((til) => (f === 'ikkalasi' ? ['youtube', 'shorts'] : [f]).map((format) => ({ soat: Number(s.soat), til, format })));
}
const qatorNom = (j) => `${BAYROQ[j.til] || ''} ${TIL_NOM[j.til] || j.til} · ${j.format === 'shorts' ? 'Shorts' : 'Uzun'} · ${j.soat}:00`;
const qatorQisqa = (j) => `${BAYROQ[j.til] || j.til} ${j.format === 'shorts' ? 'Shorts' : 'Uzun'} ${j.soat}:00`;
// Tahrir qoralamada bo'ladi (s.qoralama) — 💾 Saqlash bosilmaguncha kunlik ish eski sozlama bilan davom etadi.
// Rejimlar (s.rejimlar: { "1": {jadval, daqiqa, yuklash}, ... }) — tayyor to'plamlar, bir bosishda yuklanadi.
const REJIMLAR = ['1', '2', '3'];
const ishOl = (s) => ({ googleAI: !!s.googleAI, ...(s.qoralama || { jadval: sozJadval(s), daqiqa: Number(s.daqiqa) > 1 ? Number(s.daqiqa) : 3, yuklash: s.yuklash || 'tasdiq' }) });
const rejimQisqa = (r) => (r?.jadval?.length ? r.jadval.slice().sort((a, b) => a.soat - b.soat).map((x) => `${BAYROQ[x.til] || x.til}${x.format === 'shorts' ? 'S' : 'U'} ${x.soat}`).join(', ') : "bo'sh");
function sozMatn(s) {
  const w = ishOl(s);
  const j = w.jadval.slice().sort((a, b) => a.soat - b.soat);
  const ro = j.length ? j.map((x, i) => `${i + 1}. ${qatorNom(x)}`).join('\n') : "— bo'sh (➕ bilan qo'shing)";
  const holat = s.qoralama ? '✏️ <b>Saqlanmagan o\'zgarish bor</b> — 💾 Saqlash bosing' : '✅ Saqlangan';
  return `🤖 <b>Tomy — kunlik video sozlamasi</b> (Los Anjeles vaqti)\n\nTomy: ${s.yoqiq ? '▶️ ishlayapti' : '⏸ dam olyapti'}\n${holat}\n\n${ro}\n\nUzun video: ${w.daqiqa} daqiqa\nYuklash: ${w.yuklash === 'avto' ? '🤖 avtomatik (tasdiqsiz)' : '✅ men tasdiqlayman'}\nMuqova rasmi: ${w.googleAI ? '🎨 Google Gemini (pullik, ~bir necha sent)' : '🆓 Cloudflare FLUX (tekin)'}\n\nTanlang va pastdagi 💾 Saqlash'ni bosing. ▶️ Hozir — darrov yasash, ❌ — o'chirish.`;
}
function sozTugma(s) {
  const w = ishOl(s);
  const b = (t, k, v) => ({ text: (String(w[k]) === String(v) ? '● ' : '') + t, callback_data: `s:${k}:${v}` });
  const j = w.jadval.map((x, i) => ({ ...x, i })).sort((a, b) => a.soat - b.soat);
  return { inline_keyboard: [
    ...j.map((x) => [{ text: qatorQisqa(x), callback_data: `j:run:${x.i}` }, { text: '▶️ Hozir', callback_data: `j:run:${x.i}` }, { text: '❌', callback_data: `j:del:${x.i}` }]),
    [{ text: '➕ Video qo\'shish', callback_data: 'j:yangi' }],
    [b('3 daq', 'daqiqa', 3), b('5 daq', 'daqiqa', 5), b('8 daq', 'daqiqa', 8)],
    [b('✅ Tasdiqlab', 'yuklash', 'tasdiq'), b('🤖 Avto yuklash', 'yuklash', 'avto')],
    [{ text: w.googleAI ? '🎨 Google AI: yoqiq' : '🆓 Google AI: o\'chiq', callback_data: `s:googleAI:${w.googleAI ? 0 : 1}` }, { text: s.yoqiq ? '⏸ To\'xtatish' : '▶️ Yoqish', callback_data: `s:yoqiq:${s.yoqiq ? 0 : 1}` }],
    s.qoralama ? [{ text: '💾 Saqlash', callback_data: 'j:saqla' }, { text: '↩️ Bekor', callback_data: 'j:bekor' }] : [{ text: '💾 Saqlash', callback_data: 'j:saqla' }],
  ] };
}
async function sozlama(env, chat) {
  const s = await sozOl(env);
  return say(env, chat, sozMatn(s), { reply_markup: sozTugma(s) });
}
const sozYangila = (env, cb) => TG(env, 'editMessageText', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: sozMatn(sozKesh), parse_mode: 'HTML', reply_markup: sozTugma(sozKesh) });
async function sozBos(env, cb, k, v) {
  const chat = cb.message.chat.id;
  if (k === 'bugun') return sozlama(env, chat);
  const s = await sozOl(env);
  if (k === 'yoqiq') s.yoqiq = v === '1'; // yoqish/to'xtatish — darrov
  else if (k === 'googleAI') s.qoralama = { ...ishOl(s), googleAI: v === '1' }; // pullik rasm — Saqlash bilan
  else if (k === 'daqiqa' || k === 'yuklash') s.qoralama = { ...ishOl(s), [k]: k === 'daqiqa' ? Number(v) : v };
  else if (k === 'soat') s.soat = Number(v);
  else if (k === 'joy') s.joy = v;
  await sozYoz(env, s);
  await sozYangila(env, cb);
}
// Jadval tugmalari: j:yangi → til → format → soat; j:run:i — hozir; j:del:i — o'chirish;
// j:saqla / j:bekor — qoralama; j:rejim — rejimlar ro'yxati; j:rq:N — yuklash; j:rs:N — joriyni N ga saqlash
async function jadvalBos(env, cb, q) {
  const chat = cb.message.chat.id;
  const tahrir = (text, kb) => TG(env, 'editMessageText', { chat_id: chat, message_id: cb.message.message_id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
  const orqaga = [{ text: '↩️ Orqaga', callback_data: 'j:orqa' }];
  const s = await sozOl(env);
  const w = ishOl(s);
  const yoz = async () => { await sozYoz(env, s); return sozYangila(env, cb); };
  if (q[0] === 'orqa') return sozYangila(env, cb);
  if (q[0] === 'yangi') return tahrir('➕ Yangi video — <b>tili</b>?', [TOMY_TILLAR.map((t) => ({ text: `${BAYROQ[t]} ${TIL_NOM[t]}`, callback_data: `j:t:${t}` })), orqaga]);
  if (q[0] === 't') return tahrir(`➕ ${BAYROQ[q[1]]} ${TIL_NOM[q[1]]} — <b>format</b>?`, [[{ text: '🎬 Uzun', callback_data: `j:f:${q[1]}:youtube` }, { text: '📱 Shorts', callback_data: `j:f:${q[1]}:shorts` }], orqaga]);
  if (q[0] === 'f') {
    const kb = [];
    for (let i = 0; i < SOATLAR.length; i += 4) kb.push(SOATLAR.slice(i, i + 4).map((h) => ({ text: `${h}:00`, callback_data: `j:a:${q[1]}:${q[2]}:${h}` })));
    return tahrir(`➕ ${BAYROQ[q[1]]} ${TIL_NOM[q[1]]} · ${q[2] === 'shorts' ? 'Shorts' : 'Uzun'} — <b>soat nechada</b>? (Los Anjeles)`, [...kb, orqaga]);
  }
  if (q[0] === 'a') { s.qoralama = { ...w, jadval: [...w.jadval, { soat: Number(q[3]), til: q[1], format: q[2] }] }; return yoz(); }
  if (q[0] === 'del') { s.qoralama = { ...w, jadval: w.jadval.filter((_, i) => i !== Number(q[1])) }; return yoz(); }
  if (q[0] === 'saqla') {
    const ozgardi = !!s.qoralama;
    if (s.qoralama) { s.jadval = s.qoralama.jadval; s.daqiqa = s.qoralama.daqiqa; s.yuklash = s.qoralama.yuklash; s.googleAI = !!s.qoralama.googleAI; delete s.qoralama; }
    await yoz();
    if (!ozgardi) return say(env, chat, '✅ Hammasi saqlangan, o\'zgarish yo\'q.');
    return say(env, chat, `💾 Saqlandi. Tomy shu jadval bilan ishlaydi:\n${s.jadval.length ? s.jadval.slice().sort((a, b) => a.soat - b.soat).map(qatorNom).join('\n') : "— bo'sh (hech narsa yasalmaydi)"}`);
  }
  if (q[0] === 'bekor') { delete s.qoralama; return yoz(); }
  if (q[0] === 'rejim') {
    const r = s.rejimlar || {};
    return tahrir(`📂 <b>Rejimlar</b>\n\n${REJIMLAR.map((n) => `Rejim ${n}: ${rejimQisqa(r[n])}`).join('\n')}\n\n<i>U — uzun, S — Shorts, raqam — soat.</i>\n«Yuklash» — rejimni tanlaydi (keyin 💾 Saqlash). «Saqlash» — hozirgi jadvalni shu rejimga yozadi.`, [
      ...REJIMLAR.map((n) => [{ text: `📥 Rejim ${n}ni yuklash`, callback_data: `j:rq:${n}` }, { text: `💾 Rejim ${n}ga saqlash`, callback_data: `j:rs:${n}` }]),
      orqaga,
    ]);
  }
  if (q[0] === 'rq') {
    const r = (s.rejimlar || {})[q[1]];
    if (!r?.jadval) return say(env, chat, `Rejim ${q[1]} hali bo'sh — avval jadval tuzib, «💾 Rejim ${q[1]}ga saqlash» bosing.`);
    s.qoralama = { jadval: r.jadval, daqiqa: r.daqiqa || 3, yuklash: r.yuklash || 'tasdiq' };
    return yoz();
  }
  if (q[0] === 'rs') {
    s.rejimlar = { ...(s.rejimlar || {}), [q[1]]: { jadval: w.jadval, daqiqa: w.daqiqa, yuklash: w.yuklash } };
    await sozYoz(env, s);
    await say(env, chat, `📂 Rejim ${q[1]} saqlandi: ${rejimQisqa(s.rejimlar[q[1]])}`);
    return sozYangila(env, cb);
  }
  if (q[0] === 'run') {
    const x = w.jadval[Number(q[1])];
    if (!x) return sozYangila(env, cb);
    return kunlikTil(env, chat, s, x.til, x.format, w.daqiqa);
  }
}

// ---------- kunlik avtomatik video ----------
// Har kuni (sozlamadagi soatda) yoki /bugun: trend → eng yaxshi g'oya → ssenariy → yig'ish → Telegram (✅ yoki avto yuklash)
async function kunlik(env, chat, soat) {
  const soz = await sozOl(env);
  if (soat === undefined) return sozlama(env, chat); // /bugun — qaysi birini yasashni tugma bilan tanlaysiz
  const daqiqa = Number(soz.daqiqa) > 1 ? Number(soz.daqiqa) : 3;
  for (const x of sozJadval(soz).filter((x) => Number(x.soat) === Number(soat))) {
    try { await kunlikTil(env, chat, soz, x.til, x.format, daqiqa); }
    catch (e) { await say(env, chat, `⚠️ Tomy xatosi (${esc(qatorNom(x))}): ${esc(e.message).slice(0, 300)}`); }
  }
}

async function kunlikTil(env, chat, soz, til, format, daqiqa) {
  // ispancha video — ispan tilidagi trend, qolganlari — sozlamadagi joy
  const joy = til === 'es' ? 'spanish' : soz.joy;
  const uzun = format !== 'shorts'; // 'youtube' yoki eski 'ikkalasi'
  await say(env, chat, `🤖 Tomy (${esc(TIL_NOM[til] || til)}): trendni ko'ryapman (${esc(joy)})…`);
  const vids = await ytTrend(env, trendArg(joy));
  if (!vids.length) return say(env, chat, `🤖 Tomy (${esc(TIL_NOM[til] || til)}): bugun trend topilmadi — ertaga yana urinaman.`);
  const r = await gemini(env, [{ text: JSON.stringify(vids.slice(0, 20).map(({ id, ...x }) => ({ ...x, sekund: sek(x.uzunlik) }))) }], {
    json: true,
    system: `Sen YouTube strategisan. Egasi o'zbek, AQShda tirakchi; kanalida kinetik matn + ovozli videolar (rasm/klip yo'q). Trend ro'yxatidan ilhomlanib BITTA eng yaxshi ${uzun ? daqiqa + ' daqiqalik' : 'Shorts'} video mavzusini tanla: trendga yaqin, foydali, haqiqatga asoslangan, boshqalarning videosini ko'chirmaydigan, siyosat/sog'liq/moliya maslahati bo'lmagan.
FAQAT JSON: {"mavzu": "aniq mavzu, 5-10 so'z, ${til === 'uz' ? "o'zbekcha" : til}", "sabab": "nega aynan shu (1 qator, o'zbekcha)"}`,
  });
  await say(env, chat, `🤖 Tomy tanladi (${esc(TIL_NOM[til] || til)}): <b>${esc(r.mavzu)}</b>\n<i>${esc(r.sabab || '')}</i>`);
  const umumiy = { mavzu: r.mavzu, til, avto: true, avtoYuklash: soz.yuklash === 'avto', googleAI: !!soz.googleAI };
  if (uzun) await newVideo(env, chat, { ...umumiy, format: 'youtube', soniya: daqiqa * 60, qoshimcha: `-${til}` });
  if (format !== 'youtube') await newVideo(env, chat, { ...umumiy, format: 'shorts', soniya: 0, qoshimcha: `-${til}-s` });
}

async function voiceToText(env, fileId) {
  const f = await TG(env, 'getFile', { file_id: fileId });
  const buf = await (await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${f.result.file_path}`)).arrayBuffer();
  let bin = '';
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return gemini(env, [{ inline_data: { mime_type: 'audio/ogg', data: btoa(bin) } }, { text: "Bu ovozli xabarni so'zma-so'z matnga aylantir (o'zbek, rus yoki ingliz). Faqat matnni qaytar." }]);
}

// drive.google.com/file/d/<ID>/..., ...open?id=<ID>, ...uc?id=<ID> → gd_<ID>.mp4
function driveHavola(text) {
  return String(text || '')
    .replace(/https?:\/\/drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{10,})[^\s:]*/g, 'gd_$1.mp4')
    .replace(/https?:\/\/drive\.google\.com\/(?:open|uc)\?(?:[^\s]*&)?id=([A-Za-z0-9_-]{10,})[^\s:]*/g, 'gd_$1.mp4');
}

async function onMessage(env, msg) {
  const chat = msg.chat.id;
  TG(env, 'sendChatAction', { chat_id: chat, action: 'typing' }).catch(() => {});
  let text = msg.text || msg.caption || '';
  // «Musiqa top: arabic female vocal duduk» → Pixabay'da qidirib, eng ko'p yuklangan 3 ta trekni kutubxonaga
  const mtop = /^\s*musiqa\s+top(?:ib)?\s*:?\s*(.+)$/i.exec(text);
  if (mtop && !msg.audio && !msg.document) {
    await dispatchMain(env, 'musiqa-kutubxona.yml', { qidiruv: mtop[1].trim().slice(0, 80), soni: '3', min_soniya: '60', telegram: String(chat) });
    return say(env, chat, `🔎 Pixabay'da qidiryapman: <b>${esc(mtop[1].trim())}</b> — topilgan 3 ta trek kutubxonaga tushadi va shu yerga keladi (~1–2 daqiqa).`);
  }
  // Musiqa fayli (Pixabay, YouTube Audio Library...) → kutubxonaga: «Musiqa kutubxona» workflow'i
  const audio = msg.audio || (msg.document && /^audio\//.test(msg.document.mime_type || '') ? msg.document : null);
  if (audio && !/^\s*(ovoz|buyruq)\b/i.test(text)) {
    if ((audio.file_size || 0) > 20e6) return say(env, chat, "⚠️ Fayl 20 MB dan katta — Telegram bot uni ololmaydi. Drive'ning Reference papkasiga qo'ying va «Musiqa kutubxona» workflow'ida <code>drive</code> ga nomini yozing.");
    const nom = audio.title || audio.file_name || '';
    const teglar = text.replace(/^\s*musiqa\s*:?\s*/i, '');
    await dispatchMain(env, 'musiqa-kutubxona.yml', { tg_fayl: audio.file_id, nom: String(nom).slice(0, 80), teglar: teglar.slice(0, 200), manba: /youtube/i.test(text) ? 'youtube' : 'pixabay', telegram: String(chat) });
    return say(env, chat, `🎵 Musiqani kutubxonaga qo'shyapman${nom ? ': <b>' + esc(nom) + '</b>' : ''}… (~1 daqiqa)`);
  }
  if (msg.voice) {
    text = (await voiceToText(env, msg.voice.file_id)).trim();
    const zaxira = text.startsWith('⚠️(zaxira) ');
    text = text.replace('⚠️(zaxira) ', '');
    await say(env, chat, `🎙 <i>${esc(text)}</i>` + (zaxira ? "\n<i>(Gemini band edi — zaxira model eshitdi, xato bo'lsa matn bilan yozing)</i>" : ''));
  }
  if (!text && !msg.video && !msg.document) return;
  const vid0 = msg.video || (msg.document && /^video\//.test(msg.document.mime_type || '') ? msg.document : null);
  await tarixQosh(env, chat, 'men', (vid0 ? '[video] ' : '') + text).catch(() => {});
  // pastki doimiy tugmalar
  const TUGMA = { '📈 Trend USA': '/trend usa', '📈 Trend Spanish': '/trend spanish', '🤖 AI trend USA': '/aitrend usa', '🤖 AI trend Spanish': '/aitrend spanish', '📈 Trend UZ': '/trend uz', '📊 Kanal tahlili': '/tahlil', '🤖 Tomy': '/tomy', '⚙️ Sozlama': '/tomy', '❓ Yordam': '/yordam' };
  if (TUGMA[text]) text = TUGMA[text];
  // Drive havolasi = fayl nomi bilan teng: havola "gd_<ID>.mp4" ga aylanadi (scripts/drive.mjs ID bo'yicha oladi)
  text = driveHavola(text);
  if (/^\s*gd_[\w-]+\.mp4\s*$/.test(text) && !vid0) {
    return say(env, chat, "🔗 Drive havolasini oldim. Nima qilay? Buyruq bilan yuboring:\n• <code>Qirq havola</code> — eng yaxshi 2–3 sahna\n• <code>Montaj havola</code> — eng yaxshi lahzalardan bitta Shorts\n• <code>Imzo havola: hook</code> — hook, subtitr, zoom\n• <code>Imzo uzun havola: hook</code> — uzun video\n• <code>Ula havola1 havola2</code> — videolarni ulash\n\nHavola o'rniga Raw'dagi fayl nomi ham bo'ladi: <code>Qirq fayl.mp4</code>");
  }
  const vid = vid0;
  // Albom videolari eslab qolinadi; izohsiz albom videosi hech narsa qilmaydi (faqat buyruq bilan)
  if (vid && msg.media_group_id) await albomSaqla(env, chat, msg, vid);
  // Ulash
  const ULA = /^\s*ula(sh|b|ng)?(?![a-z'ʻ’])/i;
  if (ULA.test(text)) {
    const rest = text.replace(ULA, '').replace(/^[\s:,-]+/, '').trim();
    const format = /\byoutube\b|yotiq/i.test(rest) ? 'youtube' : /\bshorts?\b|tik\b/i.test(rest) ? 'shorts' : 'auto';
    const hm = text.match(/^[^:]*:\s*(.+)$/);
    const hook = hm ? hm[1].trim() : '';
    if (vid && msg.media_group_id) return ula(env, chat, { fayllar: await albomOl(env, chat, msg), format, hook });
    const fl = rest.match(/\S+\.(?:mp4|mov|m4v|webm)/gi) || [];
    if (fl.length) return ula(env, chat, { driveFayllar: fl, format, hook });
    return ula(env, chat, { fayllar: vid ? [{ f: vid.file_id, size: vid.file_size || 0 }] : [], format, hook });
  }
  if (vid && msg.media_group_id && !text) return; // albomning izohsiz videosi
  // Qirqish
  const QIRQ = /^\s*(qirq\w*|kes(ib|ing)?|montaj\w*)(?![a-z'ʻ’])/i;
  if (QIRQ.test(text)) {
    const montaj = /^\s*montaj/i.test(text);
    const rest = text.replace(QIRQ, '').replace(/^[\s:,-]+/, '').trim();
    const sn = (rest.match(/\b([234])\b/) || [])[1];
    const soni = sn ? Math.min(Number(sn), montaj ? 4 : 3) : 3;
    const hm = /https?:\/\//.test(text) ? null : text.match(/^[^:]*:\s*(.+)$/);
    const hook = hm ? hm[1].trim() : '';
    if (vid) return qirq(env, chat, { fileId: vid.file_id, size: vid.file_size || 0, soni, hook, montaj });
    const f = rest.match(/(\S+\.(?:mp4|mov|m4v|webm))/i);
    if (f) return qirq(env, chat, { driveFayl: f[1], soni, hook, montaj });
    if (/https?:\/\//.test(rest)) {
      return say(env, chat, "🔗 Havoladan videoni yuklab bo'lmaydi — YouTube GitHub serverlarini bloklaydi.\nVideo faylning o'zini shu yerga yuboring (20 MB gacha), izohiga <code>Qirq</code> yozing; kattasini Drive'ga tashlab <code>Qirq fayl.mp4</code> (Raw'dagi nomi) yoki <code>Qirq</code> + Drive havolasini yozing.");
    }
    return say(env, chat, "✂️ <b>Qirqish</b> — videodan eng yaxshi 2–3 sahnani topib, ball bilan Shorts qilib beraman.\n\n• Videoni yuboring, izohiga: <code>Qirq</code> (yoki <code>Qirq 2</code> — 2 ta sahna)\n• 20 MB dan katta — Drive'ga tashlang: <code>Qirq fayl.mp4</code> (Raw'dagi nomi) yoki <code>Qirq</code> + Drive havolasi\n• Hamma sahnaga bitta sarlavha: <code>Qirq: hook matni</code>\n• Eng yaxshi lahzalardan bitta video: <code>Montaj</code> (yoki <code>Montaj 4</code>)\n• Bir nechta videoni bittaga: albom + izoh <code>Ula</code>");
  }
  // Imzo
  if (/^\s*imzo\b/i.test(text) || (vid && !text)) {
    const rest = text.replace(/^\s*imzo\b[\s:,-]*/i, '').trim();
    if (vid) return imzo(env, chat, { fileId: vid.file_id, size: vid.file_size || 0, hook: rest });
    const uzun = /^uzun\b/i.test(rest);
    const r2 = rest.replace(/^uzun\b[\s:,-]*/i, '');
    const m = r2.match(/^(\S+\.(?:mp4|mov|m4v|webm))\s*[:,-]?\s*(.*)$/i);
    if (m) return uzun ? imzoUzun(env, chat, { driveFayl: m[1], hook: m[2].trim() }) : imzo(env, chat, { driveFayl: m[1], hook: m[2].trim() });
    return say(env, chat, "✍️ <b>Imzo</b> — tayyor Shorts'ga hook, subtitr, zoom va «Obuna bo'ling» qo'shaman (bepul).\n\n• Videoni shu yerga yuboring, izohiga: <code>Imzo: hook matni</code>\n• 20 MB dan katta bo'lsa — Drive'ga tashlang: <code>Imzo fayl.mp4: hook matni</code> (Raw'dagi nomi) yoki fayl nomi o'rniga Drive havolasi\n• Uzun video (10–20 daqiqa) — Raw'ga tashlang: <code>Imzo uzun fayl.mp4: hook matni | sher</code> (faqat boshi, o'rtasi, oxiri yasaladi — tez; «| sher» — qahramon rangli, fon oq-qora)");
  }
  if (text === '🎬 Yangi video') return say(env, chat, 'Qaysi mavzuda? Yozing yoki ovoz yuboring, masalan: «tirakchilar uchun 5 ta tejash usuli».');
  if (text === '/start' || text === '/yordam') {
    await say(env, chat, 'Tugmalar pastda 👇', {
      reply_markup: { keyboard: [[{ text: '📈 Trend USA' }, { text: '📈 Trend Spanish' }], [{ text: '🤖 AI trend USA' }, { text: '🤖 AI trend Spanish' }], [{ text: '🤖 Tomy' }, { text: '🎬 Yangi video' }], [{ text: '📊 Kanal tahlili' }, { text: '❓ Yordam' }]], resize_keyboard: true, is_persistent: true },
    });
    return say(env, chat, `Salom! Men kanal botingizman.\n\n• Yozing yoki ovoz yuboring: «Tirakchilik haqida shorts yasa»\n• /tahlil — kanal statistikasi va g'oyalar\n• /trend usa · /trend spanish · /trend usa trucking — trendlar va g'oyalar\n• /aitrend usa · /aitrend spanish — AI bilan yasalgan, eng ko'p ko'rilgan videolar (7 kun)\n• /yangi mavzu — yangi video ssenariysi\n• /bugun — kunlik videoni hozir yasash\n• YouTube havolasini yuboring — referens tahlili (hook, temp, tuzilma, g'oyalar)\n• /tomy (yoki /sozlama) — Tomy, kunlik video agenti: jadval (English/Español, Uzun/Shorts, soat), muqova\n• Video yuboring + izoh «Imzo: hook» — hook, subtitr, zoom, «Obuna bo'ling» (bepul)\n• Video yuboring + izoh «Qirq» — eng yaxshi 2–3 sahna, ball bilan, Shorts qilib\n• Video yuboring + izoh «Montaj» — eng yaxshi lahzalardan bitta Shorts\n• 2–10 ta videoni albom qilib yuboring + izoh «Ula» — bitta videoga ulayman (Ula shorts / Ula youtube)`);
  }
  if (text.startsWith('/tahlil')) return analysis(env, chat);
  if (text.startsWith('/bugun')) return kunlik(env, chat);
  // YouTube havola yoki /referens <havola> — referens tahlili (yt-dlp, GitHub'da; video hech qayerga joylanmaydi)
  const havola = (text.match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/\S+/) || [])[0];
  if (havola && /(qirq|\bkes|montaj)/i.test(text)) {
    return say(env, chat, "🔗 Havoladan videoni yuklab bo'lmaydi — YouTube GitHub serverlarini bloklaydi.\nVideo faylning o'zini shu yerga yuboring (20 MB gacha), izohiga <code>Qirq</code> yozing; kattasini Drive'ga tashlab <code>Qirq fayl.mp4</code> (Raw'dagi nomi) yoki <code>Qirq</code> + Drive havolasini yozing.");
  }
  if (havola && (text.startsWith('/referens') || text.trim() === havola)) {
    await dispatch(env, 'referens.yml', { url: havola, telegram: String(chat) });
    return say(env, chat, "🔎 Referensni Gemini ko'ryapti (1–3 daqiqa): hook, tuzilma, temp va bizga moslash g'oyalari. Natija shu yerga keladi.");
  }
  if (text.startsWith('/referens')) return say(env, chat, 'Havolani ham yozing: /referens https://youtu.be/…');
  if (text.startsWith('/sozlama') || /^\/?tomy\b/i.test(text)) return sozlama(env, chat);
  if (/^\/aitrend/.test(text)) return trend(env, chat, /spanish|es\b|ispan/i.test(text) ? AI_TREND.spanish : AI_TREND.usa);
  if (text.startsWith('/trend')) return trend(env, chat, text.replace(/^\/trend\S*/, ''));
  if (text.startsWith('/yangi')) return newVideo(env, chat, { mavzu: text.replace('/yangi', '').trim() || 'kanal mavzusida qiziqarli fakt', format: 'shorts', til: 'uz' });
  // Erkin gap (va izohli video): Gemini niyatni oldingi suhbat bilan birga aniqlaydi
  return niyat(env, chat, msg, text, vid);
}

const VIDEO_AMAL = new Set(['qirq', 'montaj', 'imzo', 'ula']);
async function niyat(env, chat, msg, text, vid) {
  const tarix = ((await kvOl(env, `tarix/${chat}`)) || []).slice(0, -1); // oxirgisi — shu xabarning o'zi
  const oxirgi = await oxirgiOl(env, chat);
  const kontekst = [
    tarix.length ? `Oldingi suhbat:\n${tarix.map((x) => `${x.k === 'men' ? 'Foydalanuvchi' : 'Bot'}: ${x.t}`).join('\n')}` : '',
    oxirgi ? `Oxirgi yozilgan ssenariy: ${oxirgi.name} (${oxirgi.format}, mavzu: ${oxirgi.mavzu || '—'})` : 'Oxirgi yozilgan ssenariy: yo\'q',
    `Xabarga video biriktirilgan: ${vid ? (msg.media_group_id ? 'ha (albom)' : 'ha') : "yo'q"}`,
    `Yangi xabar: ${text || '(izohsiz)'}`,
  ].filter(Boolean).join('\n\n');
  const n = await gemini(env, [{ text: kontekst }], { json: true, system: NIYAT });
  const amal = String(n.amal || 'suhbat');
  const fayllar = (Array.isArray(n.fayllar) ? n.fayllar : []).map(String).filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f));
  const soni = Number(n.soni) || 3;
  const hook = String(n.hook || '');

  // Video biriktirilgan, lekin niyat video bilan bog'liq emas yoki aniq emas — so'raymiz
  if (vid && !VIDEO_AMAL.has(amal)) return videoSora(env, chat, msg, vid, hook);

  switch (amal) {
    case 'yangi_video':
      return newVideo(env, chat, { mavzu: n.mavzu || text, format: n.format === 'youtube' ? 'youtube' : 'shorts', til: ['uz', 'en', 'es', 'ru'].includes(n.til) ? n.til : 'uz' });
    case 'yasash': {
      if (!oxirgi) return say(env, chat, "Hali ssenariy yozilmagan. Mavzuni yozing, masalan: «tirakchilar uchun 5 ta maslahat — shorts».");
      const sz = await sozOl(env);
      await dispatch(env, 'video-yasash.yml', { video: oxirgi.name, format: oxirgi.format || 'shorts', ai_kliplar: 'false', max_klip: '0', telegram: String(chat), google_ai: String(!!sz.googleAI) });
      return say(env, chat, `⏳ Video yig'ilmoqda (${esc(oxirgi.name)}). Odatda 5–8 daqiqa — tayyor bo'lgach shu yerga yuboraman.`);
    }
    case 'yuklash': {
      if (!oxirgi) return say(env, chat, "Qaysi video? Hali bot orqali video yasalmagan.");
      if (!env.YT_REFRESH_TOKEN) return say(env, chat, "YouTube hali ulanmagan — videoni Telegram'dan saqlab, YouTube ilovasida joylang.");
      const m = Number(n.muqova) === 1 || Number(n.muqova) === 2 ? String(n.muqova) : '';
      await dispatch(env, 'youtube-yuklash.yml', { video: oxirgi.name, telegram: String(chat), muqova: oxirgi.format !== 'shorts' ? m : '' });
      return say(env, chat, `⬆️ YouTube'ga yuklayapman: ${esc(oxirgi.name)}${m ? ` (muqova ${m})` : ''}…`);
    }
    case 'muqova': {
      if (!oxirgi || oxirgi.format === 'shorts') return say(env, chat, "🖼 Muqova faqat uzun (YouTube) videolar uchun yasaladi — video bilan birga 2 xil dizaynda keladi, yuklashda «Muqova 1/2» ni tanlaysiz. Shorts'ga muqova qo'yilmaydi.");
      return say(env, chat, `🖼 <b>${esc(oxirgi.name)}</b> uchun muqova video bilan birga keladi (2 dizayn). Qaysi biri bilan yuklay?`, {
        reply_markup: { inline_keyboard: [[{ text: '✅ Muqova 1 bilan', callback_data: `u:${oxirgi.name}:1` }, { text: '✅ Muqova 2 bilan', callback_data: `u:${oxirgi.name}:2` }]] },
      });
    }
    case 'tahlil':
      return analysis(env, chat);
    case 'trend':
      return trend(env, chat, `${n.joy || ''} ${n.mavzu || ''}`);
    case 'aitrend':
      return trend(env, chat, /spanish|es/i.test(String(n.joy)) ? AI_TREND.spanish : AI_TREND.usa);
    case 'tomy':
      return sozlama(env, chat);
    case 'bugun':
      return kunlik(env, chat);
    case 'referens': {
      const url = (String(n.url || text).match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/\S+/) || [])[0];
      if (!url) return say(env, chat, 'Qaysi video? YouTube havolasini yuboring.');
      await dispatch(env, 'referens.yml', { url, telegram: String(chat) });
      return say(env, chat, "🔎 Referensni Gemini ko'ryapti (1–3 daqiqa): hook, tuzilma, temp va bizga moslash g'oyalari. Natija shu yerga keladi.");
    }
    case 'qirq':
    case 'montaj': {
      const montaj = amal === 'montaj';
      const sn = Math.max(2, Math.min(soni, montaj ? 4 : 3));
      if (vid) return qirq(env, chat, { fileId: vid.file_id, size: vid.file_size || 0, soni: sn, hook, montaj });
      if (fayllar.length) return qirq(env, chat, { driveFayl: fayllar[0], soni: sn, hook, montaj });
      return say(env, chat, `${montaj ? '🎬' : '✂️'} Videoni shu yerga yuboring (20 MB gacha), izohiga <code>${montaj ? 'Montaj' : 'Qirq'}</code> yozing; kattasini Drive'dagi <b>Claude → Raw</b> ga tashlab <code>${montaj ? 'Montaj' : 'Qirq'} fayl.mp4</code> deb yozing.\nYouTube havolasidan yuklab bo'lmaydi — GitHub serverlari bloklanadi.`);
    }
    case 'ula': {
      const format = n.format === 'youtube' || n.format === 'shorts' ? n.format : 'auto';
      if (vid && msg.media_group_id) return ula(env, chat, { fayllar: await albomOl(env, chat, msg), format, hook });
      if (fayllar.length) return ula(env, chat, { driveFayllar: fayllar, format, hook });
      return say(env, chat, "🔗 Ulash uchun 2–10 ta videoni <b>bitta albom</b> qilib yuboring, izohiga <code>Ula</code> yozing (Ula shorts / Ula youtube). Kattasi — Drive'dagi Claude → Raw: <code>Ula a.mp4 b.mp4</code>");
    }
    case 'imzo':
      if (vid) return imzo(env, chat, { fileId: vid.file_id, size: vid.file_size || 0, hook });
      if (fayllar.length) return imzo(env, chat, { driveFayl: fayllar[0], hook });
      return say(env, chat, "✍️ Videoni yuboring, izohiga <code>Imzo: hook matni</code>; 20 MB dan katta — Drive Raw'ga tashlab <code>Imzo fayl.mp4: hook</code>.");
    case 'imzo_uzun':
      if (fayllar.length) return imzoUzun(env, chat, { driveFayl: fayllar[0], hook });
      return say(env, chat, "✍️ Uzun videoni Drive'dagi <b>Claude → Raw</b> ga tashlang va yozing: <code>Imzo uzun fayl.mp4: hook matni</code>");
    case 'yordam':
      return onMessage(env, { ...msg, text: '/yordam', caption: undefined, video: undefined, document: undefined, voice: undefined, audio: undefined });
    default:
      return say(env, chat, esc(n.javob || 'Tushunmadim, qaytadan yozing.'));
  }
}

// Izohli video, lekin nima qilish aniq emas — tugmalar bilan so'raymiz (video file_id xotirada, tugmada faqat raqam)
async function videoSora(env, chat, msg, vid, hook) {
  await kvYoz(env, `vid/${chat}/${msg.message_id}`, { f: vid.file_id, size: vid.file_size || 0, hook }, 86400);
  const id = msg.message_id;
  return say(env, chat, '🎥 Bu video bilan nima qilay?', {
    reply_markup: { inline_keyboard: [
      [{ text: "✍️ Imzo (hook, subtitr)", callback_data: `v:imzo:${id}` }],
      [{ text: '✂️ Qirq (2–3 Shorts)', callback_data: `v:qirq:${id}` }, { text: '🎬 Montaj (bitta)', callback_data: `v:montaj:${id}` }],
    ] },
  });
}

async function onCallback(env, cb) {
  const chat = cb.message.chat.id;
  const [k, name, fmt] = cb.data.split(':');
  await TG(env, 'answerCallbackQuery', { callback_query_id: cb.id });
  if (k === 's') return sozBos(env, cb, name, fmt); // sozlama tugmalari (xabar qoladi, yangilanadi)
  if (k === 'j') return jadvalBos(env, cb, cb.data.split(':').slice(1)); // kunlik jadval
  if (k === 'n') return newVideo(env, chat, { mavzu: cb.data.slice(2), format: 'shorts', til: 'uz' }); // trend g'oyasi (tugmalar qoladi)
  if (k === 'v') {
    // izohli video uchun tanlov (videoSora)
    await TG(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
    const v = await kvOl(env, `vid/${chat}/${fmt}`);
    if (!v) return say(env, chat, 'Video eskirib qoldi — qaytadan yuboring.');
    await tarixQosh(env, chat, 'men', `[tugma] ${name}`).catch(() => {});
    if (name === 'imzo') return imzo(env, chat, { fileId: v.f, size: v.size, hook: v.hook });
    return qirq(env, chat, { fileId: v.f, size: v.size, soni: 3, hook: v.hook, montaj: name === 'montaj' });
  }
  await TG(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
  if (k === 'x') return say(env, chat, '❌ Bekor qilindi.');
  if (k === 'y') {
    const sz = await sozOl(env);
    await dispatch(env, 'video-yasash.yml', { video: name, format: fmt || 'shorts', ai_kliplar: 'false', max_klip: '0', telegram: String(chat), google_ai: String(!!sz.googleAI) });
    return say(env, chat, `⏳ Video yig'ilmoqda (${name}). Odatda 5–8 daqiqa — tayyor bo'lgach shu yerga yuboraman.`);
  }
  if (k === 'u') {
    if (!env.YT_REFRESH_TOKEN) return say(env, chat, "YouTube hali ulanmagan — videoni yuqoridan saqlab, YouTube ilovasida joylang.");
    await dispatch(env, 'youtube-yuklash.yml', { video: name, telegram: String(chat), muqova: fmt === '1' || fmt === '2' ? fmt : '' });
    return say(env, chat, `⬆️ YouTube'ga yuklayapman…${fmt === '1' || fmt === '2' ? ` (muqova ${fmt})` : ''}`);
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
    // Video yasash workflow'i uchun tekin rasm (Cloudflare FLUX): POST /rasm {prompt, steps} → image/jpeg
    if (req.method === 'POST' && new URL(req.url).pathname === '/rasm') {
      if (!env.RASM_KALIT || req.headers.get('X-Rasm-Kalit') !== env.RASM_KALIT) return new Response('no', { status: 403 });
      if (!env.AI) return new Response('AI binding yo\'q', { status: 500 });
      const { prompt, steps } = await req.json();
      try {
        const r = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: String(prompt || '').slice(0, 2000), steps: Math.min(8, Number(steps) || 4) });
        if (!r?.image) return new Response('rasm yo\'q', { status: 502 });
        return new Response(Uint8Array.from(atob(r.image), (c) => c.charCodeAt(0)), { headers: { 'Content-Type': 'image/jpeg' } });
      } catch (e) {
        return new Response(String(e.message || e).slice(0, 300), { status: 502 });
      }
    }
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
      if (!s.yoqiq) return;
      await kunlik(env, chat, soat);
    })().catch((e) => say(env, chat, `⚠️ Tomy xatosi: ${esc(e.message).slice(0, 400)}`)));
  },
};
