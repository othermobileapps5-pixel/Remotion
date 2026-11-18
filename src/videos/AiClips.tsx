import React from 'react';
import { AbsoluteFill, CalculateMetadataFunction, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// Universal: AI clips (Runway / Google / fal) played back to back with their OWN sound (dialogue, music).
// videos/<nom>.json → "komponent": "AiClips"; each video scene's "duration" (seconds) sets its length.

type Scene = { type: string; src?: string; duration?: number };
export type AiClipsProps = { scenes?: Scene[] };
const FPS = 30;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const clipsOf = (scenes: Scene[] = []) => scenes.filter((s) => s.type === 'video');

export const aiClipsMetadata: CalculateMetadataFunction<AiClipsProps> = ({ props }) => {
  const total = clipsOf(props.scenes).reduce((a, s) => a + Math.round((s.duration || 8) * FPS), 0);
  return { durationInFrames: Math.max(FPS, total) };
};

export const AiClips: React.FC<AiClipsProps> = ({ scenes = [] }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  let at = 0;
  const fade = Math.max(interpolate(f, [0, 12], [1, 0], clamp), interpolate(f, [durationInFrames - 18, durationInFrames], [0, 1], clamp));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {clipsOf(scenes).map((s, i) => {
        const len = Math.round((s.duration || 8) * FPS);
        const from = at;
        at += len;
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            {s.src ? (
              <OffthreadVideo src={staticFile(s.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <AbsoluteFill style={{ background: '#140a24', color: '#fff', justifyContent: 'center', alignItems: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>AI clip not generated yet</AbsoluteFill>
            )}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  );
};
