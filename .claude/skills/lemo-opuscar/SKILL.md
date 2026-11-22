---
name: lemo-opuscar
description: Remotion videoni Lemo-Opuscar kutubxonasidagi 100 ta kod-uslubdan birida yasash (akvarel, ukiyo-e, ink-wash, impasto, papercut, pixel-rpg, blueprint, newsreel, satellite-briefing...). Egasi "<uslub> uslubida video", "Lemo", "qanday uslublar bor" desa ishlating.
---

# Lemo-Opuscar uslublari (Remotion'da)

Kutubxona: **Lemo-Opuscar by Lemomo (LemoLab)** — https://github.com/lemomo-ai/lemo-opuscar.
Hujjatlar CC BY-NC 4.0 (o'z filmlaringiz, tijoriy ham, uchun qo'shimcha ruxsat bor), kod MIT.
Yasalgan videolar egasiniki, kredit shart emas. Kutubxona repoga **nusxalanmaydi** — kerak bo'lganda yuklanadi.

## Qadamlar

1. `sh scripts/lemo.sh` — kutubxonani `ext/lemo-opuscar/` ga yuklaydi (sparse, ~20 MB). Oxirgi qatorda `LIB=<yo'l>`.
2. Uslub tanlash: `sh scripts/lemo.sh list`. Egasi uslub aytmasa — mavzuga mos 2–3 tasini taklif qiling.
3. `$LIB/styles/<slug>/STYLE.md` ni to'liq o'qing — bu san'at yo'riqnomasi (material, rang, harakat, tipografiya, «nima emas»). Kerak bo'lsa `$LIB/DIRECTOR.md` (rejissura) va `$LIB/TECHNIQUE.md` (texnika).
4. Texnikani ko'rish kerak bo'lsa: `sh scripts/lemo.sh demo <slug>` — demo kodini (canvas/three.js) o'qing va **Remotion'ga ko'chiring**. Demo'ni o'zini render qilmang.
5. Yasash — loyiha qoidalari bo'yicha (CLAUDE.md):
   - komponentlar `src/videos/<nom>/`, `registry.tsx`, ssenariyda `{ "type": "custom", "name": "<nom>/<sahna>" }`;
   - har narsa `useCurrentFrame()` / `useScene().prog` dan; tasodif — `random(seed)` (Remotion), `Math.random` emas;
   - canvas uslublar: `<canvas>` ga har kadrda `t` bo'yicha chizish (STYLE.md «pure function of t» — Remotion bilan bir xil g'oya); qog'oz/teksturani bir marta `useMemo` bilan yasang;
   - ovoz — mavjud tizim (`ovoz`, Gemini/Kokoro), Lemo TTS kerak emas.
6. Ssenariy `videos/<nom>.json`, branch'ga commit, «Tekshiruv» o'tgach yashil «Video yasash» tugmasi.

## Cheklovlar

- Clawd (to'q sariq qahramon), Claude/Gemini va boshqa brend logolari, mavjud film qahramonlari — ishlatilmaydi.
- ✦ belgili uslublar rasm generatori talab qiladi — pullik, oldin egasidan so'rang.
- STYLE.md matnini videoga yoki boshqa joyga ko'chirib tarqatmang; faqat yo'riqnoma sifatida.
