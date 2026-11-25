// Musiqa kutubxonasi: egasi yuklagan tekin treklar (Pixabay, YouTube Audio Library...).
//   node scripts/kutubxona.mjs qosh <fayl.mp3> "<nom>" "<teglar, vergul bilan>" [manba]
//     → public/musiqa/kutubxona/<slug>.mp3 + public/musiqa/kutubxona.json ga yozuv
//   node scripts/kutubxona.mjs ro'yxat
// Ssenariyda ishlatish: "music": "musiqa/kutubxona/<slug>.mp3", "musicVolume": 0.14
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const JSONF = 'public/musiqa/kutubxona.json';
const DIR = 'public/musiqa/kutubxona';
const oqi = () => (fs.existsSync(JSONF) ? JSON.parse(fs.readFileSync(JSONF, 'utf8')) : []);

function davomiylik(f) {
  for (const cmd of [['ffprobe'], ['npx', 'remotion', 'ffprobe']]) {
    try {
      const out = execFileSync(cmd[0], [...cmd.slice(1), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
      const s = parseFloat(out.trim().split('\n').pop());
      if (s > 0) return Math.round(s);
    } catch {}
  }
  return 0;
}

const slug = (s) => String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'trek';

const [cmd, fayl, nom = '', teglar = '', manba = 'pixabay'] = process.argv.slice(2);
if (cmd === 'qosh') {
  const ro = oqi();
  let s = slug(nom || path.basename(fayl));
  while (ro.some((x) => x.fayl === `musiqa/kutubxona/${s}.mp3`)) s += '-2';
  fs.mkdirSync(DIR, { recursive: true });
  const out = path.join(DIR, `${s}.mp3`);
  if (/\.mp3$/i.test(fayl)) fs.copyFileSync(fayl, out);
  else execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-v', 'error', '-i', fayl, '-c:a', 'libmp3lame', '-b:a', '192k', out]);
  // teglar: izohdan + fayl nomidan (Pixabay nomlari: "duduk-ethnic-lament-12345.mp3")
  const t = [...new Set([...teglar.split(','), ...path.basename(fayl).toLowerCase().replace(/\.[a-z0-9]+$/, '').split(/[^a-z]+/)]
    .map((x) => x.trim().toLowerCase()).filter((x) => x.length > 2 && !/^(mp3|music|audio|pixabay|file)$/.test(x)))];
  const yozuv = { fayl: `musiqa/kutubxona/${s}.mp3`, nom: nom || s, teglar: t, soniya: davomiylik(out), manba, sana: new Date().toISOString().slice(0, 10) };
  ro.push(yozuv);
  fs.writeFileSync(JSONF, JSON.stringify(ro, null, 2) + '\n');
  console.log(JSON.stringify(yozuv));
} else {
  for (const x of oqi()) console.log(`${x.fayl} · ${Math.floor(x.soniya / 60)}:${String(x.soniya % 60).padStart(2, '0')} · ${x.teglar.join(', ')}`);
}
