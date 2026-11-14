import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontFamily } from '../fonts';
import type { TextScene, Theme } from '../types';

// Matn sahnasi: qatorlar birin-ketin pastdan chiqadi. *so'z* — asosiy rangda ajratiladi.
export const TextSceneView: React.FC<{ scene: TextScene; theme: Theme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const lines = scene.text.split('\n').filter((l) => l.trim().length);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  // uzun qatorlar kichikroq shriftda
  const base = vertical ? 70 : 76;
  const fontSize = Math.round(Math.min(base, base * (vertical ? 22 : 34) / longest + base * 0.35));

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: vertical ? 70 : 180 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: fontSize * 0.45 }}>
        {lines.map((line, i) => {
          const p = spring({ frame, fps, delay: Math.round(i * 0.45 * fps), config: { damping: 200 } });
          return (
            <div
              key={i}
              style={{
                fontFamily,
                fontWeight: 700,
                fontSize,
                lineHeight: 1.25,
                color: theme.text,
                textAlign: 'center',
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
              }}
            >
              {line.split(/(\*[^*]+\*)/g).map((part, j) =>
                part.startsWith('*') && part.endsWith('*') ? (
                  <span key={j} style={{ color: theme.accent }}>
                    {part.slice(1, -1)}
                  </span>
                ) : (
                  <span key={j}>{part}</span>
                ),
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
