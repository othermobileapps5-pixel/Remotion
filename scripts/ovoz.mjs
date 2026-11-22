// Sahnalar uchun hikoya ovozi — ssenariyga qarab ikki yo'ldan biri:
//   • "ovozXizmat": "gemini" (Apollo-13, Bobil kabi): scripts/ovoz-gemini.mjs — Gemini TTS, "ovozchi": "Charon" / "Kore"...
//   • qolganlari (bot videolari, HomePilot, Venus, Trading): scripts/ovoz-bot.mjs —
//     "google:Charon" (Gemini), "kokoro:..." / "chatterbox" (tekin, mahalliy), Azure ovozlari (en-US-GuyNeural, madina...).
// Ishlatish: node scripts/ovoz.mjs videos/<nom>.json
import fs from 'node:fs';

const [, , file] = process.argv;
if (!file) {
  console.error('Foydalanish: node scripts/ovoz.mjs videos/<nom>.json');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
await import(data.ovozXizmat === 'gemini' ? './ovoz-gemini.mjs' : './ovoz-bot.mjs');
