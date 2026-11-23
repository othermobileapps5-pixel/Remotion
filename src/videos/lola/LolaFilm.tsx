import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, CalculateMetadataFunction, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from '@remotion/google-fonts/Fredoka';
import { FPS, type VideoProps } from '../../types';
import { resolveSrc, sceneFrames } from '../../util';
import { drawFilm } from './draw';

// «Lola and the Perfect Picture» — oq-qora chiziqli 2D multfilm (Kokoro: hikoyachi af_heart, Lola af_bella, Karim am_onyx).
// Har sahna = bitta "beat": uzunligi ovozdan (scripts/ovoz-bot.mjs) — animatsiya beat ulushi bo'yicha cho'ziladi.
const { fontFamily } = loadFont('normal', { weights: ['600', '700'], subsets: ['latin'] });

const PAD = 0.8; // ovoz-bot.mjs: ovozdan keyingi pauza
const MUSIC_VOL = 0.11;

const speakerOf = (v?: string) => (/af_bella/.test(v || '') ? 'lola' : /am_onyx/.test(v || '') ? 'karim' : null);

// Effektlar: [beat, fayl, balandlik]
const SFX: [number, string, number][] = [
  ...[0.03, 0.1, 0.17, 0.24, 0.31].map((t) => [t, 'heel', 0.35] as [number, string, number]),
  [0.45, 'pop', 0.25], [1.25, 'kiss', 0.45], [1.82, 'shutter', 0.6],
  [2.0, 'whoosh', 0.45], [2.12, 'pop', 0.4], [2.36, 'whoosh', 0.35], [2.62, 'pop', 0.3], [2.8, 'shutter', 0.4],
  [3.0, 'whoosh', 0.45], ...Array.from({ length: 14 }, (_, i) => [3.04 + i * 0.068, 'heel', 0.3] as [number, string, number]),
  [4.0, 'whoosh', 0.4], [4.31, 'thud', 0.7], [4.36, 'rip', 0.45], ...[0.44, 0.5, 0.56, 0.62, 0.7].map((t) => [4 + t, 'bounce', 0.4] as [number, string, number]),
  [6.32, 'splash', 0.7], [6.4, 'thud', 0.3], [7.1, 'pop', 0.3], [7.25, 'pop', 0.3], [8.05, 'whoosh', 0.2],
  [9.0, 'whoosh', 0.45], [9.4, 'whisper', 0.5], [9.75, 'whisper', 0.45],
  [10.0, 'whoosh', 0.45], [10.05, 'buzz', 0.6], ...[0.35, 0.45, 0.55, 0.65, 0.75, 0.85].map((t) => [10 + t, 'chime', 0.3] as [number, string, number]),
  [11.3, 'magic', 0.45],
];
// Aylanma fon tovushlari: [boshlanish beat, tugash beat, fayl, balandlik]
const LOOPS: [number, number, string, number][] = [
  [4.0, 9.0, 'rain', 0.5],
  [9.0, 10.0, 'chatter', 0.35],
];

export const lolaMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  fps: FPS,
  durationInFrames: Math.max(FPS, props.scenes.reduce((a, s) => a + sceneFrames(s.duration), 0)),
});

export const LolaFilm: React.FC<VideoProps> = (props) => {
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
    const talkLen = scene.ovoz ? (scene.ovozSek ?? scene.duration - PAD) * FPS : 0;
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
    <AbsoluteFill style={{ backgroundColor: '#fbfaf6' }}>
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
          <Audio src={staticFile(`audio/lola/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
      {LOOPS.map(([a, z, name, vol], i) => {
        const from = Math.round(beatFrame(a));
        const dur = Math.max(1, Math.round(beatFrame(z)) - from);
        return (
          <Sequence key={`l${i}`} from={from} durationInFrames={dur} layout="none">
            <Audio
              src={staticFile(`audio/lola/${name}.wav`)}
              loop
              volume={(f) => interpolate(f, [0, 15, Math.max(16, dur - 20), dur], [0, vol, vol, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
            />
          </Sequence>
        );
      })}
      <Audio
        src={staticFile('audio/lola/music.mp3')}
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
