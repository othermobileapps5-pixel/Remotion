---
name: openmontage
description: Full agentic video production with OpenMontage — research, script, assets (free stock footage or AI providers), edit and final render from a plain-language brief, or "make one like this video". Use when the user asks for OpenMontage, a full documentary/explainer video from a topic, or to copy the structure of a video they like.
---

# OpenMontage (calesthio/OpenMontage, AGPL-3.0)

OpenMontage o'zi butun loyiha (165 MB, Python + Node + Remotion), shuning uchun bu repoga ko'chirilmagan — kerak bo'lganda klonlanadi.

## Ishga tushirish
1. Klonlash (ochiq repo, add_repo kerak bo'lsa — faqat o'qish):
   `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/calesthio/OpenMontage ~/OpenMontage`
2. `cd ~/OpenMontage && make setup` (Python 3.10+, FFmpeg, Node 22+). Internet kerak.
3. **Avval `AGENT_GUIDE.md` ni o'qing** — OpenMontage'ning barcha qoidalari o'sha yerda (CLAUDE.md shuni talab qiladi). Keyin uning `skills/` va `pipeline_defs/` bo'yicha ishlang.

## Egasi uchun qoidalar
- Gaplashish o'zbek tilida; video tilini egasi tanlaydi.
- Pullik AI provayderlar (video/rasm/ovoz) faqat egasi ruxsat bersa; narxini oldindan ayting. Bepul yo'l — ochiq stok videolar.
- API kalitlar faqat GitHub secret yoki `.env` (gitignore) orqali; chatga yozdirmang, kodga yozmang.
- Render og'ir: egasining kompyuterida yoki qo'lda ishga tushadigan GitHub workflow'da. Avtomatik render qilinmaydi.
- AGPL: o'zgartirilgan OpenMontage'ni boshqalarga tarqatsak yoki xizmat qilib ochsak, manbasini ochish shart. Shaxsiy foydalanishda cheklov yo'q.
