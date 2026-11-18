# Remotion — video yasash

Egasi telefon orqali ishlaydi: javoblar **o'zbek tilida**, qisqa va aniq.

- Video ssenariy (`videos/<nom>.json`, turi `src/types.ts`) bo'yicha yig'iladi: `src/ScriptVideo.tsx` sahnalarni `TransitionSeries` bilan ulaydi.
- Kompozitsiyalar: `YouTube` (1920×1080) va `Shorts` (1080×1920), 30 fps; uzunlik `calculateMetadata` orqali ssenariydan.
- Barcha animatsiya `useCurrentFrame()` dan; CSS animatsiya/transition ishlatilmaydi. Rasm — `<Img>`, klip — `<OffthreadVideo>`, ovoz — `@remotion/media` `<Audio>`.
- Remotion paketlari bir xil versiyada bo'lsin (package.json).
- AI kliplar: `scripts/fal.mjs` — fal.ai (`FAL_KEY`) yoki Runway (`RUNWAY_KEY`, sahnada `"provider": "runway"`). Yasalgan klip `public/fal/` ga saqlanadi va ssenariyga `src` bo'lib yoziladi.
- O'zbekcha ovoz: sahnada `"ovoz": "matn"` → `scripts/ovoz.mjs` (Azure: `AZURE_TTS_KEY`, `AZURE_TTS_REGION`; madina/sardor).
- Video faqat qo'lda yasaladi: «Video yasash» workflow (`workflow_dispatch`). Avtomatik — faqat arzon «Tekshiruv» (tsc + 2 kadr).
- Video so'ralganda: ssenariyni `videos/` ga yozing, PR oching, egasiga chatda yashil «Video yasash» tugmasini ko'rsating.
- Tadqiqot (internetdan o'qish): «Tadqiqot» workflow (qo'lda) — Agent Reach v1.6.1; natija `tadqiqot` branch'ida `tadqiqot/<nom>.json`. Faqat o'qish, login kanallar yoqilmaydi.
- Seriallar (masalan Venus Prince): epizodlar bir-biriga mos chiqishi uchun `videos/serial/README.md` qoidalari — qahramon/joy rasmlari `public/<serial>/serial/`, o'zgarmas tavsiflar `videos/serial/<serial>.json`, epizod `python3 scripts/serial.py videos/serial/<epizod>.json [--sinov]` bilan yig'iladi. Avval 360p sinov, keyin 720p; pullik ishdan oldin narx va Google balansini so'rang.
