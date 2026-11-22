// Ulash: bir nechta videoni berilgan tartibda silliq o'tishlar bilan bitta videoga ulaydi va Imzo uchun ssenariy yozadi.
//   • Format: "auto" — ko'pchilik videolar tik bo'lsa shorts (1080×1920), yotiq bo'lsa youtube (1920×1080); "shorts" / "youtube".
//   • Har video o'lchamga moslanadi: o'zi to'liq ko'rinadi, bo'sh joy — o'sha videoning xira nusxasi (qora chiziq yo'q).
//   • Ovozsiz video — jim ovoz qo'shiladi (ulash buzilmasin). O'tish — 0.4 s xfade / acrossfade.
//   • Natija: public/ulash/<nom>.mp4, videos/<nom>.json (shorts/klip: hook, subtitr — keyin scripts/subtitr.mjs), out/ulash.json.
// Ishlatish: node scripts/ula.mjs <nom> <auto|shorts|youtube> <public ichidagi video 1> <video 2> ... [--hook "matn"]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const hi = args.indexOf('--hook');
const HOOK = hi >= 0 ? args[hi + 1] || '' : '';
if (hi >= 0) args.splice(hi, 2);
const [nom, formatArg, ...srcs] = args;
if (!nom || srcs.length < 2) {
  console.error('Foydalanish: node scripts/ula.mjs <nom> <auto|shorts|youtube> <video 1> <video 2> ... [--hook "matn"]');
  process.exit(1);
}
const XFADE = 0.4;

const run = (bin, a, o = {}) => {
  try {
    return execFileSync(bin, a, { maxBuffer: 256 * 1024 * 1024, ...o });
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return execFileSync('npx', ['remotion', bin, ...a], { maxBuffer: 256 * 1024 * 1024, ...o });
  }
};
const probe = (f) => {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height:stream_tags=rotate:stream_side_data=rotation', '-of', 'json', f]).toString());
  const v = (j.streams || []).find((s) => s.codec_type === 'video') || {};
  const rot = Math.abs(Number(v.tags?.rotate || v.side_data_list?.[0]?.rotation || 0));
  const [w, h] = rot === 90 || rot === 270 ? [v.height, v.width] : [v.width, v.height];
  return { duration: Number(j.format.duration), width: w, height: h, audio: (j.streams || []).some((s) => s.codec_type === 'audio') };
};

const files = srcs.map((s) => path.join('public', s));
for (const f of files) if (!fs.existsSync(f)) throw new Error(`Video topilmadi: ${f}`);
const metas = files.map(probe);
const tik = metas.filter((m) => m.height > m.width).length;
const format = formatArg === 'shorts' || formatArg === 'youtube' ? formatArg : tik * 2 >= metas.length ? 'shorts' : 'youtube';
const [W, H] = format === 'shorts' ? [1080, 1920] : [1920, 1080];
// Uzun natija (3 daqiqadan ko'p): tezroq kodlash va o'tishsiz ulash (qayta kodlanmaydi) — keyin faqat 3 oyna imzolanadi
const UZUN = metas.reduce((a, m) => a + m.duration, 0) > 180;
const PRESET = UZUN ? 'superfast' : 'veryfast';
console.log(`▶ ${files.length} ta video → ${format} (${W}×${H}), ${PRESET}`);

// 1. Har videoni bir xil o'lcham, 30 fps, 48 kHz stereo ga keltiramiz
const tmp = files.map((_, k) => path.join(os.tmpdir(), `ula-${process.pid}-${k}.mp4`));
files.forEach((f, k) => {
  const m = metas[k];
  console.log(`  ${k + 1}) ${srcs[k]} — ${m.duration.toFixed(1)} s, ${m.width}×${m.height}${m.audio ? '' : ' (ovozsiz)'}`);
  // xira fon kichik o'lchamda hisoblanadi (8 barobar tez), keyin kattalashtiriladi
  const w8 = W / 8;
  const h8 = H / 8;
  const vf = `[0:v]split[a][b];[a]scale=${w8}:${h8}:force_original_aspect_ratio=increase,crop=${w8}:${h8},boxblur=6:2,scale=${W}:${H},eq=brightness=-0.12[bg];[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p,setsar=1[v]`;
  const a = m.audio
    ? ['-i', f, '-filter_complex', `${vf};[0:a]aresample=48000,aformat=channel_layouts=stereo[au]`, '-map', '[v]', '-map', '[au]']
    : ['-i', f, '-f', 'lavfi', '-t', m.duration.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex', vf, '-map', '[v]', '-map', '1:a'];
  run('ffmpeg', ['-loglevel', 'error', '-y', ...a, '-c:v', 'libx264', '-preset', PRESET, '-crf', '19', '-c:a', 'aac', '-b:a', '160k', '-shortest', tmp[k]], { stdio: 'inherit' });
});

// 2. Ulash: qisqada — silliq o'tishlar bilan; uzunda — o'tishsiz, qayta kodlamasdan (bir xil formatdagi bo'laklar)
const dur = tmp.map((f) => probe(f).duration);
const T = [];
dur.forEach((d, k) => T.push(k ? T[k - 1] + dur[k - 1] - (UZUN ? 0 : XFADE) : 0));
const total = T[T.length - 1] + dur[dur.length - 1];
fs.mkdirSync('public/ulash', { recursive: true });
const rel = `ulash/${nom}.mp4`;
if (UZUN) {
  const list = path.join(os.tmpdir(), `ula-${process.pid}.txt`);
  fs.writeFileSync(list, tmp.map((f) => `file '${f}'`).join('\n') + '\n');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join('public', rel)], { stdio: 'inherit' });
  fs.rmSync(list, { force: true });
} else {
let fv = '';
let fa = '';
let v = '[0:v]';
let au = '[0:a]';
for (let k = 1; k < tmp.length; k++) {
  const ov = k === tmp.length - 1 ? '[v]' : `[v${k}]`;
  const oa = k === tmp.length - 1 ? '[a]' : `[a${k}]`;
  fv += `${v}[${k}:v]xfade=transition=fade:duration=${XFADE}:offset=${T[k].toFixed(3)}${ov};`;
  fa += `${au}[${k}:a]acrossfade=d=${XFADE}${oa};`;
  v = ov;
  au = oa;
}
run('ffmpeg', ['-loglevel', 'error', '-y', ...tmp.flatMap((f) => ['-i', f]), '-filter_complex', (fv + fa).replace(/;$/, ''), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', PRESET, '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', path.join('public', rel)], { stdio: 'inherit' });
}
tmp.forEach((f) => fs.rmSync(f, { force: true }));

// 3. Imzo ssenariysi (subtitr va zoom — scripts/subtitr.mjs Whisper bilan to'ldiradi)
fs.mkdirSync('videos', { recursive: true });
fs.mkdirSync('out', { recursive: true });
const data = {
  title: `Ulash ${nom}`,
  transition: 0,
  scenes: [{ type: 'custom', name: 'shorts/klip', src: rel, hook: HOOK, duration: +total.toFixed(2), vertikal: format === 'shorts' }],
  ulash: { manbalar: srcs, format },
};
fs.writeFileSync(`videos/${nom}.json`, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync('out/ulash.json', JSON.stringify({ video: nom, format, soni: files.length, uzunlik: Math.round(total), komp: format === 'shorts' ? 'Shorts' : 'YouTube' }, null, 2) + '\n');
console.log(`✓ ${rel}: ${files.length} ta video, ${total.toFixed(1)} s, ${format}`);
