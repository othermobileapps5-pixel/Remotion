import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontFamily } from '../fonts';
import type { ImageScene, Theme, VideoScene } from '../types';
import { resolveSrc } from '../util';
import { Caption } from './Caption';

// Rasm: sekin yaqinlashish/uzoqlashish (Ken Burns) — oddiy rasm ham "jonli" ko'rinadi
export const ImageSceneView: React.FC<{ scene: ImageScene; theme: Theme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [from, to] = scene.zoom === 'out' ? [1.15, 1] : [1, 1.15];
  const scale = interpolate(frame, [0, durationInFrames], [from, to], { extrapolateRight: 'clamp' });
  const drift = interpolate(frame, [0, durationInFrames], [0, -2], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, overflow: 'hidden' }}>
      <Img
        src={resolveSrc(scene.src)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${drift}%)` }}
      />
      {scene.caption ? <Caption text={scene.caption} theme={theme} /> : null}
    </AbsoluteFill>
  );
};

// Video klip (o'zingizniki yoki fal.ai yasagan). Klip hali yo'q bo'lsa — ogohlantirish kadri, render to'xtamaydi.
export const VideoSceneView: React.FC<{ scene: VideoScene; theme: Theme }> = ({ scene, theme }) => {
  const { width, height } = useVideoConfig();
  if (!scene.src) {
    return (
      <AbsoluteFill style={{ backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 80 }}>
        <div style={{ fontFamily, fontWeight: 700, fontSize: height > width ? 52 : 56, color: theme.accent, textAlign: 'center' }}>
          AI klip hali yasalmagan
        </div>
        {scene.prompt ? (
          <div style={{ fontFamily, fontWeight: 500, fontSize: 34, color: theme.text, opacity: 0.7, marginTop: 24, textAlign: 'center' }}>
            {scene.prompt}
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <OffthreadVideo src={resolveSrc(scene.src)} muted={scene.muted ?? true} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {scene.caption ? <Caption text={scene.caption} theme={theme} /> : null}
    </AbsoluteFill>
  );
};
