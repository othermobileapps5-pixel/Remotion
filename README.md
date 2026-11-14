# Remotion — video yasash

YouTube (1920×1080) va Shorts/Reels/TikTok (1080×1920) videolarini **ssenariy fayli** bo'yicha yig'adi:
sarlavhalar, matnlar, rasmlar (sekin yaqinlashish bilan), video kliplar, hikoya ovozi va fon musiqasi.
Kerak bo'lsa, AI video kliplarni **fal.ai** (Kling) orqali yasaydi.

## Qanday ishlatiladi

1. `videos/` papkasida ssenariy yozing (namuna: `videos/namuna.json`).
2. Rasmlarni `public/rasmlar/`, ovoz va musiqani `public/audio/` ga qo'ying.
3. GitHub → **Actions → «Video yasash» → Run workflow**: ssenariy nomini va formatni tanlang.
4. Tayyor MP4 — **Releases → «videolar»** da (va run sahifasidagi Artifacts'da).

Video o'z-o'zidan yasalmaydi — faqat tugma bilan.

## Ssenariy (`videos/<nom>.json`)

```json
{
  "title": "Video nomi",
  "theme": { "bg": "#0B1220", "accent": "#22C55E", "text": "#FFFFFF" },
  "voiceover": "audio/ovoz.mp3",
  "music": "audio/musiqa.mp3",
  "musicVolume": 0.15,
  "transition": 0.5,
  "scenes": [
    { "type": "title", "text": "Sarlavha", "subtitle": "Kichik yozuv", "duration": 4 },
    { "type": "text", "text": "Birinchi qator\nIkkinchi *ajratilgan* qator", "duration": 6 },
    { "type": "image", "src": "rasmlar/1.jpg", "caption": "Rasm ostidagi yozuv", "duration": 6, "zoom": "in" },
    { "type": "video", "src": "kliplar/1.mp4", "caption": "Tayyor klip", "duration": 5 },
    { "type": "video", "prompt": "Aerial shot of Fergana valley at sunrise, cinematic", "duration": 5 },
    { "type": "video", "image": "rasmlar/2.jpg", "prompt": "Slow camera push-in, leaves moving in wind", "duration": 5 }
  ]
}
```

- Vaqtlar — **sekundda**. Video uzunligi sahnalardan avtomatik hisoblanadi.
- `*so'z*` — matnda so'zni asosiy rangda ajratadi.
- Fayl yo'llari `public/` ga nisbatan yoki to'liq `https://` havola.
- `prompt` li video sahna — AI klip (pastda). Klip hali yasalmagan bo'lsa, videoda ogohlantirish kadri chiqadi.

## AI kliplar (fal.ai)

1. fal.ai'da API kalit oling va xarajat chegarasini qo'ying.
2. Repo → **Settings → Secrets and variables → Actions → New secret**: nomi `FAL_KEY`.
3. «Video yasash» da **ai_kliplar** ni belgilang. `max_klip` — bir martada eng ko'pi bilan nechta klip.

- Matndan video: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`; rasmdan video (`image` berilsa): `…/standard/image-to-video` — arzonroq va natija aniqroq.
- Boshqa model: sahnada `"model"` yoki butun video uchun `"falModel"`.
- Yasalgan kliplar `public/fal/` ga saqlanadi va ssenariyga yoziladi — qayta render qilganda qayta pul to'lanmaydi.
- Uzun YouTube video uchun AI'ni faqat muhim sahnalarga ishlating; qolgani rasm va matn — shunda arzon tushadi.

## AI kliplar (Runway)

1. dev.runwayml.com'da API kalit oling va kredit to'ldiring (kamida $10, 1 kredit = $0.01).
2. Repo → **Settings → Secrets and variables → Actions → New secret**: nomi `RUNWAY_KEY`.
3. Sahnada `"provider": "runway"` yozing (butun video uchun — ssenariy boshida `"provider": "runway"`).

- Rasmdan video: `gen4_turbo` (5 kredit/sek, 5 sek ≈ $0.25); matndan video: `gen4.5` (12 kredit/sek).
- Boshqa Runway modeli: `"model": "runway/gen4.5"` va h.k.
- fal.ai va Runway bitta videoda aralash ishlatilishi mumkin; kaliti yo'q xizmat sahnalari o'tkazib yuboriladi.

## O'zbekcha ovoz (Azure)

Har sahnaga `"ovoz": "o'qiladigan matn"` yozing — «Video yasash» ovozni avtomatik yasaydi va sahnani ovoz uzunligiga moslaydi.

```json
{ "ovozchi": "sardor", "scenes": [ { "type": "title", "text": "Salom", "ovoz": "Assalomu alaykum! Bugun sizga...", "duration": 3 } ] }
```

- Ovozlar: `madina` (ayol, standart) yoki `sardor` (erkak); sahnada yoki butun video uchun `"ovozchi"`.
- Tezlik: `"ovozTezligi": "-10%"` (sekinroq) yoki `"+10%"`.
- Matn o'zgarmasa, ovoz qayta yasalmaydi.
- Sozlash: portal.azure.com → **Speech service** yarating → Keys and Endpoint'dan **KEY 1** va **Location/Region**.
  Repo secretlari: `AZURE_TTS_KEY` va `AZURE_TTS_REGION` (masalan `eastus`).

## Kompyuterda (ixtiyoriy)

```bash
npm install
npm run studio          # brauzerda ko'rish va sozlash
npm run render:youtube  # namuna videoni yig'ish
```

## Litsenziya

Remotion shaxs va 3 kishigacha bo'lgan kompaniyalar uchun bepul, tijoriy foydalanish ham (remotion.dev/license).
