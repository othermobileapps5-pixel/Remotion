# Remotion — video yasash

Egasi telefon orqali ishlaydi: javoblar **o'zbek tilida**, qisqa va aniq.

- Video ssenariy (`videos/<nom>.json`, turi `src/types.ts`) bo'yicha yig'iladi: `src/ScriptVideo.tsx` sahnalarni `TransitionSeries` bilan ulaydi.
- Kompozitsiyalar: `YouTube` (1920×1080) va `Shorts` (1080×1920), 30 fps; uzunlik `calculateMetadata` orqali ssenariydan.
- Barcha animatsiya `useCurrentFrame()` dan; CSS animatsiya/transition ishlatilmaydi. Rasm — `<Img>`, klip — `<OffthreadVideo>`, ovoz — `@remotion/media` `<Audio>`.
- Remotion paketlari bir xil versiyada bo'lsin (package.json).
- AI kliplar: `scripts/fal.mjs` — fal.ai (`FAL_KEY`) yoki Runway (`RUNWAY_KEY`, sahnada `"provider": "runway"`). Yasalgan klip `public/fal/` ga saqlanadi va ssenariyga `src` bo'lib yoziladi.
- Hikoya ovozi: sahnada `"ovoz": "matn"` → `scripts/ovoz.mjs`. Ssenariyda `"ovozXizmat": "gemini"` — Gemini TTS (`GEMINI_API_KEY`, standart arzon `gemini-3.8-flash-lite-tts`, ovoz `ovozchi`: Charon, Kore...; `ovozgaMoslash` — sahna ovoz uzunligiga). Aks holda Azure (`AZURE_TTS_KEY`, `AZURE_TTS_REGION`; madina/sardor).
- Murakkab animatsiya: `src/videos/<nom>/` da komponentlar, `src/videos/registry.tsx` ga ro'yxatdan o'tadi, ssenariyda `{ "type": "custom", "name": "<nom>/<sahna>" }`. Animatsiya vaqtlari sahna uzunligining ulushi bo'yicha (`useScene().prog`).
- «Tekshiruv» o'zgargan ssenariylardan har sahnadan 2 ta kadr chiqaradi (`scripts/kadrlar.mjs`, artifact «kadrlar»).
- Google Drive (egasining «Claude» papkasi: Raw / Export / Reference): `scripts/drive.mjs`, secret'lar `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_REFRESH_TOKEN`. «Video yasash» tayyor MP4 ni Export'ga yuklaydi; ssenariyda `"src": "drive/<fayl>"` bo'lsa, render oldidan Drive'dan oladi. «Drive» workflow (qo'lda): relizdagi videoni Export'ga yuklash yoki papka ro'yxati.
- Video faqat qo'lda yasaladi: «Video yasash» workflow (`workflow_dispatch`). Avtomatik — faqat arzon «Tekshiruv» (tsc + 2 kadr).
- Video so'ralganda: ssenariyni `videos/` ga yozing, PR oching, egasiga chatda yashil «Video yasash» tugmasini ko'rsating.
- Tadqiqot (internetdan o'qish): «Tadqiqot» workflow (qo'lda) — Agent Reach v1.6.1; natija `tadqiqot` branch'ida `tadqiqot/<nom>.json`. Faqat o'qish, login kanallar yoqilmaydi.
