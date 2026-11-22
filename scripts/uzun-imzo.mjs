// Uzun videoga imzo — butun videoni render qilmasdan.
// Remotion faqat 3 ta qisqa oynani yasaydi: boshi (hook + subtitr), o'rtasi (obuna eslatmasi), oxiri (katta «Obuna bo'ling»).
// ffmpeg ularni asl video ustiga aynan o'sha vaqtga qo'yadi. Qolgan qismi asl holicha.
// Butun video bo'ylab: sahna almashganda «whoosh», urg'u joylarda «pop» (scripts/sfx_track.py, 8 s da ko'pi bilan bitta, past ovozda).
//
//   node scripts/uzun-imzo.mjs <video (public/ ichida)> <chiqish.mp4> [--hook "matn"] [--til en]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : '';
};
const [srcRel, outFile] = args;
if (!srcRel || !outFile) {
  console.error('Foydalanish: node scripts/uzun-imzo.mjs <public ichidagi video> <chiqish.mp4> [--hook "matn"] [--til en]');
  process.exit(1);
}
const src = path.join('public', srcRel);
const hook = opt('hook');
let til = opt('til');
const run = (cmd, a, o = {}) => execFileSync(cmd, a, { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 256 * 1024 * 1024, ...o }).toString();

// --- 1. Asl video haqida ---
const pj = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', src]));
const vs = pj.streams.find((s) => s.codec_type === 'video');
const hasAudio = pj.streams.some((s) => s.codec_type === 'audio');
const dur = Number(pj.format.duration);
const [fn, fd] = vs.r_frame_rate.split('/').map(Number);
const fps = Math.round(fn / (fd || 1)) || 30;
const even = (n) => Math.round(n / 2) * 2;
const W = even(vs.width);
const H = even(vs.height);
console.log(`Video: ${(dur / 60).toFixed(1)} daqiqa, ${W}×${H}, ${fps} fps, ovoz: ${hasAudio ? 'bor' : "yo'q"}`);

// --- 2. Oynalar: boshi / o'rtasi / oxiri ---
const wins = [{ kind: 'bosh', start: 0, len: Math.min(8, dur) }];
if (dur >= 40) wins.push({ kind: 'orta', start: +(dur / 2 - 3.5).toFixed(2), len: 7 });
if (dur >= 20) wins.push({ kind: 'oxir', start: +Math.max(0, dur - 9).toFixed(2), len: +Math.min(9, dur).toFixed(2) });

fs.mkdirSync('out/uzun', { recursive: true });
for (const w of wins) {
  // --- 3. Shu oyna ovozidan subtitr va zoom (Whisper, bepul) ---
  let words = [];
  let zoomlar = [];
  if (hasAudio) {
    const wav = `out/uzun/${w.kind}.wav`;
    run('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(w.start), '-t', String(w.len), '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
    const r = JSON.parse(run('python3', ['scripts/whisper_words.py', wav, process.env.WHISPER_MODEL || 'small', til]));
    if (!til) til = r.til || 'en';
    words = r.words;
    zoomlar = (r.zoomlar || []).filter((z) => z.t >= 1 && z.t <= w.len - 2.2).slice(0, 1);
  }
  if (!zoomlar.length && w.kind !== 'oxir') zoomlar = [{ t: +(w.len * 0.45).toFixed(1), x: 0.5, y: 0.45 }];
  const props = { src: srcRel, start: w.start, len: w.len, kind: w.kind, width: W, height: H, fps, hook: w.kind === 'bosh' ? hook : '', til: til || 'en', subtitr: words, zoomlar };
  const pf = `out/uzun/${w.kind}.json`;
  fs.writeFileSync(pf, JSON.stringify(props, null, 2));
  console.log(`▶ ${w.kind}: ${w.start.toFixed(1)}–${(w.start + w.len).toFixed(1)} s, ${words.length} so'z, zoom ${zoomlar.length}`);

  // --- 4. Faqat shu oynani render qilish ---
  w.file = `out/uzun/${w.kind}.mp4`;
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'UzunImzo', w.file, `--props=${pf}`, '--log=error'], { stdio: 'inherit' });
}

// --- 5. Butun video bo'ylab SFX: sahna kesimlari (ffmpeg scene) + urg'u joylari (ovoz) ---
console.log('▶ Sahna kesimlari va urg\'u joylari…');
const scRes = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-threads', '0', '-i', src, '-an', '-vf', "fps=4,scale=320:-2,select='gt(scene,0.25)',showinfo", '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const sc = scRes.stderr || '';
const cuts = [...sc.matchAll(/pts_time:([\d.]+)/g)].map((m) => +Number(m[1]).toFixed(2));
fs.writeFileSync('out/uzun/cuts.json', JSON.stringify(cuts));
fs.writeFileSync('out/uzun/wins.json', JSON.stringify(wins.map(({ start, len }) => ({ start, len }))));
let fullWav = '-';
if (hasAudio) {
  fullWav = 'out/uzun/full.wav';
  run('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', fullWav]);
}
const sfxInfo = JSON.parse(run('python3', ['scripts/sfx_track.py', fullWav, 'out/uzun/cuts.json', 'out/uzun/wins.json', 'out/uzun/sfx.wav', String(dur)]));
console.log(`  ✓ ${cuts.length} ta sahna kesimi topildi → whoosh: ${sfxInfo.whoosh}, pop: ${sfxInfo.pop}`);

// --- 6. ffmpeg: oynalarni asl video ustiga qo'yish, SFX'ni ovozga qo'shish ---
const inputs = ['-i', src];
wins.forEach((w) => inputs.push('-i', w.file));
inputs.push('-i', 'out/uzun/sfx.wav');
const sfxIdx = wins.length + 1;
const vf = [];
let last = '0:v';
if (vs.width !== W || vs.height !== H) {
  vf.push(`[0:v]scale=${W}:${H}[base]`);
  last = 'base';
}
wins.forEach((w, i) => {
  const k = i + 1;
  const e = (w.start + w.len).toFixed(3);
  vf.push(`[${k}:v]setpts=PTS-STARTPTS+${w.start}/TB[s${k}]`);
  vf.push(`[${last}][s${k}]overlay=eof_action=pass:enable='between(t,${w.start},${e})'[v${k}]`);
  last = `v${k}`;
});
const af = [];
wins.forEach((w, i) => af.push(`[${i + 1}:a]adelay=${Math.round(w.start * 1000)}:all=1[a${i + 1}]`));
const mixIn = (hasAudio ? '[0:a]' : '') + wins.map((_, i) => `[a${i + 1}]`).join('') + `[${sfxIdx}:a]`;
af.push(`${mixIn}amix=inputs=${wins.length + 1 + (hasAudio ? 1 : 0)}:duration=${hasAudio ? 'first' : 'longest'}:dropout_transition=0:normalize=0[aout]`);
console.log('▶ Yig\'ish (ffmpeg)…');
execFileSync(
  'ffmpeg',
  ['-loglevel', 'error', '-stats', '-y', ...inputs, '-filter_complex', [...vf, ...af].join(';'), '-map', `[${last}]`, '-map', '[aout]', '-t', String(dur),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outFile],
  { stdio: 'inherit' },
);
console.log(`✓ ${outFile} (${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB)`);
