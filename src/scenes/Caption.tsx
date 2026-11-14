import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontFamily } from '../fonts';
import type { Theme } from '../types';

// Pastki yozuv (rasm yoki klip ustida): pastdan chiqadi, oxirida yo'qoladi
export const Caption: React.FC<{ text: string; theme: Theme }> = ({ text, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;
  const enter = spring({ frame, fps, delay: Math.round(0.3 * fps), config: { damping: 200 } });
  const exit = interpolate(frame, [durationInFrames - Math.round(0.4 * fps), durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const size = vertical ? 54 : 46;

  return (
    <div
      style={{
        position: 'absolute',
        left: vertical ? 60 : 120,
        right: vertical ? 60 : 120,
        bottom: vertical ? 320 : 90,
        display: 'flex',
        justifyContent: 'center',
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 40}px)`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.3,
          color: theme.text,
          textAlign: 'center',
          padding: '18px 32px',
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderBottom: `6px solid ${theme.accent}`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
