// Multfilmdan sinov kadrlari: bir marta bundle, keyin bir nechta kadr (PNG).
// node scripts/kadrlar.mjs HollywoodShort 100,400,900 0.5 out/kadrlar
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [, , comp = 'HollywoodShort', frames = '100', scale = '0.5', outDir = 'out/kadrlar'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const GLS = (process.env.GL || 'swangle').split(',');
const inputProps = process.env.POST ? { post: JSON.parse(process.env.POST) } : {};
for (const gl of GLS) {
const chromiumOptions = { gl };
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, inputProps });
for (const f of frames.split(',').map(Number)) {
  const t0 = Date.now();
  const output = path.join(outDir, `${comp}-${String(f).padStart(4, '0')}${GLS.length > 1 ? '-' + gl : ''}${process.env.POST ? '-post' : ''}.png`);
  await renderStill({ serveUrl, composition, frame: f, output, scale: Number(scale), chromiumOptions, inputProps, timeoutInMilliseconds: 240000,
    onBrowserLog: (l) => { if (l.type !== 'debug' && l.type !== 'verbose') console.log(`  [${l.type}] ${l.text.slice(0, 300)}`); } });
  console.log(`✓ ${output} — ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
}
