import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, CalculateMetadataFunction, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from '@remotion/google-fonts/Fredoka';
import { FPS, type VideoProps } from '../../types';
import { resolveSrc, sceneFrames } from '../../util';
import { drawFilm } from './draw';

// «Tomy the Robot» — 2D multfilm, bitta kanvas, ovozli (Kokoro: hikoyachi af_heart, Tomy am_puck, gul af_sky).
// Har sahna = bitta "beat": uzunligi ovozdan (scripts/ovoz-bot.mjs) — animatsiya beat ulushi bo'yicha cho'ziladi.
const { fontFamily } = loadFont('normal', { weights: ['600', '700'], subsets: ['latin'] });

const PAD = 0.8; // ovoz-bot.mjs: ovozdan keyingi pauza
const MUSIC_VOL = 0.13;

const speakerOf = (v?: string) => (/am_puck/.test(v || '') ? 'tomy' : /af_sky/.test(v || '') ? 'flower' : null);

// Effektlar: [beat, fayl, balandlik]
const SFX: [number, string, number][] = [
  [0.02, 'snore', 0.5], [0.06, 'pop', 0.4], [0.1, 'pop', 0.35], [0.14, 'pop', 0.35], [0.18, 'pop', 0.35],
  [0.82, 'whoosh', 0.4], [1.0, 'powerup', 0.5], [1.08, 'chime', 0.4], [1.18, 'boing', 0.5], [1.36, 'thud', 0.5],
  [2.1, 'motor', 0.4], [3.0, 'motor', 0.3], [3.1, 'tweet', 0.5], [3.6, 'chime', 0.25],
  [4.6, 'pop', 0.5], [7.0, 'beep', 0.35], [8.0, 'hatch', 0.5], [8.07, 'pop', 0.5], [8.18, 'boing', 0.35], [8.75, 'whoosh', 0.45],
  [9.02, 'pop', 0.5], [9.18, 'squeak', 0.55], [9.78, 'whoosh', 0.45],
  [10.02, 'pop', 0.5], [10.03, 'chime', 0.5], [10.5, 'whoosh', 0.25], [11.06, 'water', 0.5],
  [12.68, 'magic', 0.55], [12.7, 'boing', 0.3], [13.0, 'chime', 0.3], [15.0, 'whoosh', 0.3], [15.18, 'thud', 0.4],
  [16.0, 'shimmer', 0.45], [16.4, 'pop', 0.35], [16.47, 'pop', 0.35], [16.54, 'pop', 0.35], [16.61, 'pop', 0.35],
];

export const tomyMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  fps: FPS,
  durationInFrames: Math.max(FPS, props.scenes.reduce((a, s) => a + sceneFrames(s.duration), 0)),
});

export const TomyFilm: React.FC<VideoProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  const timeline = useMemo(() => {
    const frames = props.scenes.map((s) => sceneFrames(s.duration));
    const starts: number[] = [];
    let acc = 0;
    for (const f of frames) {
      starts.push(acc);
      acc += f;
    }
    return { frames, starts, total: acc };
  }, [props.scenes]);

  const { frames, starts } = timeline;
  // beat → kadr
  const beatFrame = (bt: number) => {
    const k = Math.max(0, Math.min(frames.length - 1, Math.floor(bt)));
    const frac = bt >= frames.length ? 1 + (bt - frames.length) : bt - k;
    return starts[k] + frac * frames[k];
  };

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let k = 0;
    while (k < frames.length - 1 && frame >= starts[k + 1]) k++;
    const local = frame - starts[k];
    const b = k + Math.min(0.9999, local / frames[k]);
    const scene = props.scenes[k];
    const talkLen = scene.ovoz ? (scene.duration - PAD) * FPS : 0;
    const talk = local < talkLen ? speakerOf(scene.ovozchi) : null;
    drawFilm(ctx, {
      b,
      gt: frame / FPS,
      talk,
      total: durationInFrames / FPS,
      font: fontFamily,
      bt: (x: number) => beatFrame(x) / FPS,
    });
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220' }}>
      <canvas ref={ref} width={1080} height={1920} style={{ width, height }} />
      {props.scenes.map((s, i) =>
        s.ovozFayl ? (
          <Sequence key={`v${i}`} from={starts[i]} durationInFrames={frames[i]} layout="none">
            <Audio src={resolveSrc(s.ovozFayl)} volume={props.ovozBalandligi ?? 1} />
          </Sequence>
        ) : null,
      )}
      {SFX.map(([bt, name, vol], i) => (
        <Sequence key={`s${i}`} from={Math.round(beatFrame(bt))} layout="none">
          <Audio src={staticFile(`audio/tomy/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
      <Audio
        src={staticFile('audio/tomy/music.mp3')}
        loop
        volume={(f) =>
          interpolate(f, [0, FPS, Math.max(FPS + 1, durationInFrames - 2 * FPS), durationInFrames], [0, MUSIC_VOL, MUSIC_VOL, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </AbsoluteFill>
  );
};
