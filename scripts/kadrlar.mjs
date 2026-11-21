// Tekshiruv uchun kadrlar: har sahnadan 2 ta kadr (o'rtasi va oxiriga yaqin), kichik o'lchamda.
// Ishlatish: node scripts/kadrlar.mjs videos/<nom>.json [YouTube|Shorts]
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [, , file, comp = 'YouTube'] = process.argv;
const props = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file, '.json');
const FPS = 30;
const t = Math.round((props.transition ?? 0.5) * FPS);
const frames = props.scenes.map((s) => Math.max(1, Math.round(s.duration * FPS)));
let start = 0;
const marks = [];
frames.forEach((f, i) => {
  if (i > 0) start -= Math.min(t, frames[i - 1] - 1, f - 1);
  const label = (props.scenes[i].name || props.scenes[i].type).split('/').pop();
  const ks = frames.length === 1 ? [0.06, 0.2, 0.45, 0.6, 0.75, 0.82, 0.95] : [0.5, 0.88];
  for (const k of ks) marks.push({ frame: start + Math.floor(f * k), label: `${String(i + 1).padStart(2, '0')}-${label}-${Math.round(k * 100)}` });
  start += f;
});

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: props });
fs.mkdirSync('out/kadrlar', { recursive: true });
for (const m of marks) {
  const output = `out/kadrlar/${name}-${comp}-${m.label}.jpeg`;
  await renderStill({ serveUrl, composition, inputProps: props, frame: Math.min(m.frame, composition.durationInFrames - 1), output, imageFormat: 'jpeg', scale: 0.5 });
  console.log('✓', output);
}
