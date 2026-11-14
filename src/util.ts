import { staticFile } from 'remotion';
import { DEFAULT_THEME, FPS, type Theme, type VideoProps } from './types';

// "rasmlar/1.jpg" → public/ dagi fayl; https://... → o'zi
export const resolveSrc = (src: string) => (/^https?:\/\//.test(src) ? src : staticFile(src.replace(/^\/+/, '')));

export const themeOf = (p: VideoProps): Theme => ({ ...DEFAULT_THEME, ...(p.theme || {}) });

export const transitionFrames = (p: VideoProps) => Math.round((p.transition ?? 0.5) * FPS);

export const sceneFrames = (seconds: number) => Math.max(1, Math.round(seconds * FPS));

// Umumiy uzunlik: sahnalar yig'indisi minus o'tishlar (o'tishda ikki sahna ustma-ust turadi)
export const totalFrames = (p: VideoProps) => {
  const scenes = p.scenes.map((s) => sceneFrames(s.duration));
  const sum = scenes.reduce((a, b) => a + b, 0);
  const t = transitionFrames(p);
  // o'tish eng qisqa qo'shni sahnadan uzun bo'lmasin
  let overlap = 0;
  for (let i = 1; i < scenes.length; i++) overlap += Math.min(t, scenes[i - 1] - 1, scenes[i] - 1);
  return Math.max(1, sum - overlap);
};
