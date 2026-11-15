// Multfilmdan sinov kadrlari: bir marta bundle, keyin bir nechta kadr (PNG).
// node scripts/kadrlar.mjs HollywoodShort 100,400,900 0.5 out/kadrlar
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [, , comp = 'HollywoodShort', frames = '100', scale = '0.5', outDir = 'out/kadrlar'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const chromiumOptions = { gl: process.env.GL || 'swangle' };
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions });
for (const f of frames.split(',').map(Number)) {
  const t0 = Date.now();
  const output = path.join(outDir, `${comp}-${String(f).padStart(4, '0')}.png`);
  await renderStill({ serveUrl, composition, frame: f, output, scale: Number(scale), chromiumOptions, timeoutInMilliseconds: 240000 });
  console.log(`✓ ${output} — ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
