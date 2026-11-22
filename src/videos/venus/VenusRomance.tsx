import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import T from './timeline.json';

// "The First Encounter" — 20 s sci-fi romance (1920×1080). Two Runway Gen-4 Turbo clips:
// clip 1 from the owner's image, clip 2 from clip 1's last frame (scripts/fal.mjs "image": "prev").
// Dialogue: Azure voices (no lip-sync). Ambient + shimmer: scripts/sfx.py.

type Scene = { id?: string; type: string; src?: string; ovozFayl?: string };
export type VenusProps = { scenes?: Scene[] };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Clip: React.FC<{ src?: string }> = ({ src }) =>
  src ? (
    <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <AbsoluteFill style={{ background: '#140a24', color: '#fff', justifyContent: 'center', alignItems: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>AI clip not generated yet</AbsoluteFill>
  );

export const VenusRomance: React.FC<VenusProps> = ({ scenes = [] }) => {
  const f = useCurrentFrame();
  const clips = scenes.filter((s) => s.type === 'video');
  const fadeIn = interpolate(f, [0, 20], [1, 0], clamp);
  const fadeOut = interpolate(f, [T.total - 24, T.total], [0, 1], clamp);
  // soft golden flash when their hands touch
  const flash = interpolate(f, [462, 472, 500], [0, 0.35, 0], clamp);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence durationInFrames={T.clipCut}>
        <Clip src={clips[0]?.src} />
      </Sequence>
      <Sequence from={T.clipCut}>
        <Clip src={clips[1]?.src} />
      </Sequence>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 55%, rgba(255,210,120,1), transparent 60%)', opacity: flash, mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(fadeIn, fadeOut) }} />
      <Audio src={staticFile('venus/sfx.mp3')} volume={0.55} />
      {scenes.map((s, i) => {
        const at = s.id ? (T.lines as Record<string, number>)[s.id] : undefined;
        return s.ovozFayl && at !== undefined ? (
          <Sequence key={i} from={at}>
            <Audio src={staticFile(s.ovozFayl)} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
