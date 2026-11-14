# Remotion — video yasash

Egasi telefon orqali ishlaydi: javoblar **o'zbek tilida**, qisqa va aniq.

- Video ssenariy (`videos/<nom>.json`, turi `src/types.ts`) bo'yicha yig'iladi: `src/ScriptVideo.tsx` sahnalarni `TransitionSeries` bilan ulaydi.
- Kompozitsiyalar: `YouTube` (1920×1080) va `Shorts` (1080×1920), 30 fps; uzunlik `calculateMetadata` orqali ssenariydan.
- Barcha animatsiya `useCurrentFrame()` dan; CSS animatsiya/transition ishlatilmaydi. Rasm — `<Img>`, klip — `<OffthreadVideo>`, ovoz — `@remotion/media` `<Audio>`.
- Remotion paketlari bir xil versiyada bo'lsin (package.json).
- AI kliplar: `scripts/fal.mjs` (fal.ai, `FAL_KEY` secret). Yasalgan klip `public/fal/` ga saqlanadi va ssenariyga `src` bo'lib yoziladi.
- Video faqat qo'lda yasaladi: «Video yasash» workflow (`workflow_dispatch`). Avtomatik — faqat arzon «Tekshiruv» (tsc + 2 kadr).
- Video so'ralganda: ssenariyni `videos/` ga yozing, PR oching, egasiga chatda yashil «Video yasash» tugmasini ko'rsating.
