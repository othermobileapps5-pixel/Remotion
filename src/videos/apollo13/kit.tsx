import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from '@remotion/google-fonts/JetBrainsMono';
import { fontFamily } from '../../fonts';

export const { fontFamily: mono } = loadFont('normal', { weights: ['500', '700'], subsets: ['latin'] });
export { fontFamily };

export const C = {
  bg: '#050816',
  bg2: '#0B1430',
  accent: '#F59E0B',
  red: '#EF4444',
  green: '#22C55E',
  cyan: '#38BDF8',
  text: '#F8FAFC',
  dim: '#94A3B8',
  line: '#1E293B',
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Sahna ichidagi vaqt: hamma narsa sahna uzunligining ulushi (0..1) bo'yicha — ovoz uzunligi o'zgarsa ham moslashadi
export const useScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur, width: W, height: H } = useVideoConfig();
  const vertical = H > W;
  const u = Math.min(W, H) / 1080; // o'lcham birligi
  const at = (frac: number) => Math.round(frac * dur);
  // ulushdan ulushgacha 0→1 (silliq)
  const prog = (a: number, b: number, e = ease) => interpolate(frame, [at(a), Math.max(at(a) + 1, at(b))], [0, 1], { ...clamp, easing: e });
  const pop = (a: number, damping = 14) => spring({ frame: frame - at(a), fps, config: { damping, mass: 0.6 } });
  return { frame, fps, dur, W, H, vertical, u, at, prog, pop };
};

export const lerp = (p: number, a: number, b: number) => a + (b - a) * p;

// SFX: sahna ulushi bo'yicha aniq kadrda
export const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.5 }) => {
  const { at: toFrame } = useScene();
  return (
    <Sequence from={toFrame(at)} layout="none">
      <Audio src={staticFile(`audio/apollo13/${src}.wav`)} volume={volume} />
    </Sequence>
  );
};

// Yulduzli fon + sekin parallaks
export const Stars: React.FC<{ count?: number; drift?: number; tint?: string }> = ({ count = 160, drift = 1, tint }) => {
  const { frame, W, H } = useScene();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${tint ?? C.bg2} 0%, ${C.bg} 70%)`, overflow: 'hidden' }}>
      {new Array(count).fill(0).map((_, i) => {
        const depth = 0.3 + random(`d${i}`) * 0.7;
        const x = ((random(`x${i}`) * W - frame * depth * 0.6 * drift) % W + W) % W;
        const y = random(`y${i}`) * H;
        const size = 1 + depth * 2.4;
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(frame / (20 + random(`t${i}`) * 40) + i));
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, background: '#fff', opacity: depth * tw }} />;
      })}
    </AbsoluteFill>
  );
};

// Yuqoridagi missiya yozuvi (bob nomi)
export const Hud: React.FC<{ left: string; right?: string }> = ({ left, right }) => {
  const { u, prog, vertical } = useScene();
  const p = prog(0, 0.06);
  const pad = vertical ? 60 * u : 56 * u;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', opacity: p, transform: `translateY(${(1 - p) * -20}px)` }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 24 * u, letterSpacing: 4 * u, color: C.accent, display: 'flex', alignItems: 'center', gap: 14 * u }}>
          <div style={{ width: 12 * u, height: 12 * u, borderRadius: 12 * u, background: C.accent }} />
          {left}
        </div>
        {right ? <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 24 * u, letterSpacing: 3 * u, color: C.dim }}>{right}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// Harfma-harf yozilish + miltillovchi kursor
export const TypeText: React.FC<{ text: string; from: number; to: number; style?: React.CSSProperties; cursor?: boolean }> = ({ text, from, to, style, cursor = true }) => {
  const { frame, prog, fps } = useScene();
  const n = Math.round(prog(from, to, Easing.linear) * text.length);
  const done = n >= text.length;
  const blink = Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {cursor && (!done || blink) ? <span style={{ opacity: 0.9, color: C.accent }}>▍</span> : null}
    </span>
  );
};

// Klaviatura tovushlari: yozilish davomida har bir necha harfda
export const TypeSfx: React.FC<{ from: number; to: number; chars: number; volume?: number }> = ({ from, to, chars, volume = 0.35 }) => {
  const clicks = Math.min(40, Math.ceil(chars / 2));
  return (
    <>
      {new Array(clicks).fill(0).map((_, i) => (
        <Sfx key={i} at={from + ((to - from) * i) / clicks} src="key" volume={volume * (0.7 + random(`k${i}`) * 0.3)} />
      ))}
    </>
  );
};

// Sanaluvchi raqam
export const Count: React.FC<{ to: number; from?: number; a: number; b: number; style?: React.CSSProperties; suffix?: string; start?: number }> = ({ to, from = 0, a, b, style, suffix = '', start }) => {
  const { prog } = useScene();
  const v = Math.round(lerp(prog(a, b, Easing.out(Easing.cubic)), start ?? from, to));
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{v.toLocaleString('en-US')}{suffix}</span>;
};

// So'zma-so'z chiqadigan sarlavha; *so'z* — ajratilgan (orqasida plashka o'sadi)
export const Words: React.FC<{ text: string; at: number; step?: number; size: number; color?: string; hi?: string; weight?: number; align?: 'center' | 'left'; lineHeight?: number }> = ({
  text,
  at,
  step = 0.02,
  size,
  color = C.text,
  hi = C.accent,
  weight = 800,
  align = 'center',
  lineHeight = 1.15,
}) => {
  const { pop, prog } = useScene();
  const words = text.split(' ');
  return (
    <div style={{ fontFamily, fontWeight: weight, fontSize: size, color, lineHeight, textAlign: align, display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.28}px` }}>
      {words.map((w, i) => {
        const marked = /^\*.*\*[.,!?:]?$/.test(w);
        const clean = w.replace(/\*/g, '');
        const p = pop(at + i * step, 16);
        const bar = prog(at + i * step + 0.02, at + i * step + 0.07);
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * size * 0.5}px) scale(${0.9 + 0.1 * p})` }}>
            {marked ? (
              <span style={{ position: 'absolute', left: -size * 0.12, right: -size * 0.12, top: '12%', bottom: '8%', background: hi, borderRadius: size * 0.12, transform: `scaleX(${bar})`, transformOrigin: 'left' }} />
            ) : null}
            <span style={{ position: 'relative', color: marked && bar > 0.5 ? C.bg : marked ? hi : color }}>{clean}</span>
          </span>
        );
      })}
    </div>
  );
};

// Kichik yorliq (kartochka ostidagi izoh)
export const Tag: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.accent, size = 26, style }) => {
  const { u } = useScene();
  return (
    <div style={{ display: 'inline-block', fontFamily: mono, fontWeight: 700, fontSize: size * u, letterSpacing: 3 * u, color, border: `${2 * u}px solid ${color}`, borderRadius: 8 * u, padding: `${6 * u}px ${14 * u}px`, ...style }}>
      {children}
    </div>
  );
};

// Ekran silkinishi (portlash)
export const shake = (frame: number, start: number, len: number, amp: number) => {
  if (frame < start || frame > start + len) return { x: 0, y: 0 };
  const k = 1 - (frame - start) / len;
  return { x: Math.sin(frame * 2.7) * amp * k, y: Math.cos(frame * 3.3) * amp * k };
};

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', ...style }}>{children}</AbsoluteFill>
);

// Pastki matn chizig'i (subtitr o'rniga — asosiy fikr)
export const Lower: React.FC<{ text: string; at: number; color?: string }> = ({ text, at, color = C.text }) => {
  const { u, prog, vertical, H } = useScene();
  const p = prog(at, at + 0.06);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: vertical ? H * 0.22 : 70 * u, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * 30 * u}px)` }}>
      <div style={{ fontFamily, fontWeight: 700, fontSize: (vertical ? 40 : 38) * u, color, background: 'rgba(5,8,22,0.72)', padding: `${12 * u}px ${28 * u}px`, borderRadius: 14 * u, borderLeft: `${6 * u}px solid ${C.accent}`, maxWidth: vertical ? '86%' : '70%', textAlign: 'center' }}>
        {text}
      </div>
    </div>
  );
};
