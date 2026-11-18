import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';

// Venus dialogue — 2 × 8 s Veo 3.1 Fast clips via Runway API, with native audio and lip-synced speech.
// Clip 2 starts from clip 1's last frame ("image": "prev"). The clips' own sound is used (not muted).

type Scene = { type: string; src?: string };
export const DIALOG_CLIP = 240; // 8 s
export const DIALOG_TOTAL = 480;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Clip: React.FC<{ src?: string }> = ({ src }) =>
  src ? (
    <OffthreadVideo src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <AbsoluteFill style={{ background: '#140a24', color: '#fff', justifyContent: 'center', alignItems: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>AI clip not generated yet</AbsoluteFill>
  );

export const VenusDialog: React.FC<{ scenes?: Scene[] }> = ({ scenes = [] }) => {
  const f = useCurrentFrame();
  const clips = scenes.filter((s) => s.type === 'video');
  const fade = Math.max(interpolate(f, [0, 15], [1, 0], clamp), interpolate(f, [DIALOG_TOTAL - 20, DIALOG_TOTAL], [0, 1], clamp));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence durationInFrames={DIALOG_CLIP}>
        <Clip src={clips[0]?.src} />
      </Sequence>
      <Sequence from={DIALOG_CLIP}>
        <Clip src={clips[1]?.src} />
      </Sequence>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.4) 100%)' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  );
};
