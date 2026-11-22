# Seriallar — epizodlar bir-biriga ulanishi

Maqsad: har epizodda qahramonlar, joylar, uslub va sarlavha bir xil chiqsin.

## Fayllar
- `videos/serial/venus.json` — serial «biblesi»: qahramonlar (rasm + o'zgarmas tavsif + ovoz), juft rasmlar, joylar, uslub, model va sifat.
- `public/venus/serial/` — qahramon va joy rasmlari (Episode 1 ning eng yaxshi kadrlaridan).
- `videos/serial/<epizod>.json` — qisqa epizod fayli (pastdagi namuna).
- `scripts/serial.py` — epizod faylidan `videos/<epizod>.json` (AiClips) yasaydi.

## Qoidalar
1. Har sahnaga **o'sha sahnadagi qahramonlarning rasmi** beriladi: juft rasm bo'lsa o'sha, bo'lmasa yonma-yon yig'ma rasm.
2. Qahramon va joy tavsifi **faqat bible'dan, so'zma-so'z** olinadi. Tashqi ko'rinishni o'zgartirish kerak bo'lsa — bible'da o'zgartiriladi (hamma epizodga birdan).
3. Rasmi yo'q yangi qahramon bo'lsa — avval uning rasmi yasaladi (360p sinov kadridan yoki rasm modelidan) va bible'ga qo'shiladi.
4. `"davomi": true` — 1-sahna oldingi epizodning oxirgi kadridan boshlanadi.
5. `"esla": 6` — boshida 6 soniyalik «oldingi qismda» (oldingi epizod kliplaridan, pulsiz).
6. Avval `--sinov` (360p, ~$0.023/s) — yoqqan sahnalar keyin 720p (~$0.07/s) da yasaladi.
7. Pullik ishdan oldin: narx va Google balansi so'raladi; balans kam bo'lsa kliplar ketma-ket yuboriladi (`KLIP_PARALLEL=1`).
8. Sarlavha kartasi, ranglar va yakun — har epizodda bir xil (Remotion'da, AI'siz).

## Epizod fayli namunasi
```json
{
  "serial": "venus",
  "nom": "venus-ep2",
  "oldingi": "venus-ep1",
  "davomi": true,
  "esla": 6,
  "sarlavha": "EPISODE 2 — ...",
  "sahnalar": [
    { "soniya": 12, "qahramonlar": ["qiz", "opa"], "joy": "krater",
      "voqea": "The golden object rises slowly into the air...",
      "dialog": [["opa", "Step back!"], ["qiz", "It's calling me..."]],
      "ovoz": "low pulsing hum, wind" }
  ]
}
```

## Ishlatish
```bash
python3 scripts/serial.py videos/serial/venus-ep2.json --sinov   # arzon sinov
python3 scripts/serial.py videos/serial/venus-ep2.json           # yakuniy 720p
```
So'ng branch'ga commit va «Video yasash» (YouTube, AI kliplar bilan).
