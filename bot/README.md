# Kanal boti (Telegram → Gemini → video → YouTube)

- `worker.js` — Cloudflare Worker (Telegram webhook). Miya: Gemini; keyin Claude qo'shiladi.
- O'rnatish: Actions → «Bot o'rnatish» (qo'lda). Secret'lar: TELEGRAM_BOT_TOKEN, CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID, GEMINI_API_KEY (yoki faqat bot uchun bepul BOT_GEMINI_KEY), BOT_GITHUB_TOKEN; ixtiyoriy YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN, OWNER_CHAT_ID.
- Bot `main` tarmog'iga yozadi. Bot faqat egasiga javob beradi (OWNER_CHAT_ID; bo'lmasa — o'rnatishdan oldin /start yozgan odam).
- Video: bot `videos/bot-*.json` yozadi → «▶️ Yasash» → «Video yasash» (telegram input) → MP4 Telegram'ga → «✅ YouTube'ga» → «YouTube yuklash».
- Pul sarflanadigan va YouTube'ga chiqadigan har ish faqat tugma bosilganda.
- Qirqish: video + izoh «Qirq» (yoki «Qirq 2», «Qirq: hook») → «Qirqish» workflow → eng yaxshi 2–3 sahna, ball bilan, Shorts qilib Telegram'ga.
