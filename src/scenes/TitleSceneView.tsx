import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontFamily } from '../fonts';
import type { Theme, TitleScene } from '../types';

// Sarlavha: katta yozuv yumshoq kattalashib chiqadi, ostida rangli chiziq va qo'shimcha matn
export const TitleSceneView: React.FC<{ scene: TitleScene; theme: Theme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;

  const pop = spring({ frame, fps, config: { damping: 200 } });
  const bar = spring({ frame, fps, delay: Math.round(0.35 * fps), config: { damping: 200 } });
  const sub = interpolate(frame, [0.7 * fps, 1.3 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // fon sekin aylanib turadi (faqat kadrdan hisoblanadi)
  const angle = interpolate(frame, [0, 10 * fps], [135, 165]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${theme.bg} 0%, ${theme.bg} 55%, ${theme.accent}33 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        padding: vertical ? 70 : 160,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: vertical ? 96 : 110,
          lineHeight: 1.1,
          color: theme.text,
          textAlign: 'center',
          transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
          opacity: pop,
        }}
      >
        {scene.text}
      </div>
      <div
        style={{
          marginTop: 36,
          height: 10,
          width: vertical ? 260 : 340,
          borderRadius: 5,
          backgroundColor: theme.accent,
          transform: `scaleX(${bar})`,
        }}
      />
      {scene.subtitle ? (
        <div
          style={{
            fontFamily,
            fontWeight: 500,
            fontSize: vertical ? 48 : 52,
            color: theme.text,
            opacity: 0.85 * sub,
            marginTop: 36,
            textAlign: 'center',
          }}
        >
          {scene.subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
