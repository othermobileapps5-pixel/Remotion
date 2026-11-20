import React from 'react';
import { random } from 'remotion';
import { C } from './kit';

// Apollo kemasi sxemasi (yon ko'rinish): xizmat moduli (SM) — buyruq moduli Odyssey (CM) — oy moduli Aquarius (LM)
// draw: 0..1 chiziqlar chizilishi; hi: ajratilgan qism; damage: 0..1 SM paneli uchib ketishi;
// split: 0..1 SM ajralishi (splitLm berilmasa LM ham); splitLm: LM ajralishi; glow: CM issiqlik nuri
export type Part = 'sm' | 'cm' | 'lm' | null;

const PATHS = {
  bell: 'M140 175 L60 145 L60 255 L140 225 Z',
  sm: 'M140 120 H400 V280 H140 Z',
  smLines: 'M200 120 V280 M270 120 V280 M340 120 V280',
  cm: 'M400 120 L560 185 L560 215 L400 280 Z',
  cmWindow: 'M470 160 L500 172 L500 190 L470 180 Z',
  lmA: 'M570 165 L600 140 L650 140 L668 165 L668 235 L650 260 L600 260 L570 235 Z',
  lmD: 'M668 130 H790 V270 H668 Z',
  legs: 'M790 140 L850 100 M790 260 L850 300 M730 130 L750 90 M730 270 L750 310',
};

const Stroke: React.FC<{ d: string; p: number; color: string; fill?: string; w?: number }> = ({ d, p, color, fill = 'none', w = 4 }) => (
  <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} stroke={color} strokeWidth={w} fill={fill} strokeLinejoin="round" strokeLinecap="round" />
);

export const Spacecraft: React.FC<{
  draw?: number;
  hi?: Part;
  damage?: number;
  split?: number;
  splitLm?: number;
  glow?: number;
  showSm?: boolean;
  showLm?: boolean;
  dim?: Part[];
}> = ({ draw = 1, hi = null, damage = 0, split = 0, splitLm, glow = 0, showSm = true, showLm = true, dim = [] }) => {
  const sl = splitLm ?? split;
  const col = (p: Part) => (hi === p ? C.accent : dim.includes(p) ? '#334155' : C.text);
  const fillOf = (p: Part) => (hi === p ? `${C.accent}33` : `${C.text}0D`);
  const fillOp = Math.max(0, draw * 1.5 - 0.5);
  const smX = -split * 260;
  const smR = -split * 25;
  const lmX = sl * 300;
  const lmR = sl * 18;

  return (
    <svg viewBox="0 0 900 400" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {showSm ? (
        <g transform={`translate(${smX} ${split * 40}) rotate(${smR} 270 200)`} opacity={1 - Math.max(0, split - 0.6) * 2.5}>
          <g opacity={fillOp}>
            <path d={PATHS.sm} fill={fillOf('sm')} />
          </g>
          <Stroke d={PATHS.bell} p={draw} color={col('sm')} />
          <Stroke d={PATHS.sm} p={draw} color={col('sm')} />
          <Stroke d={PATHS.smLines} p={draw} color={col('sm')} w={2} />
          {damage > 0 ? (
            <g>
              {/* yorilgan panel: qora tirqish va qirrali chet */}
              <path d="M215 120 L330 120 L322 150 L338 170 L310 205 L262 196 L236 214 L222 170 Z" fill={C.bg} opacity={Math.min(1, damage * 2)} stroke={C.red} strokeWidth={3} />
              {/* uchayotgan parchalar */}
              {damage < 1 && new Array(14).fill(0).map((_, i) => {
                const a = -Math.PI * (0.15 + random(`a${i}`) * 0.7);
                const dist = damage * (120 + random(`r${i}`) * 260);
                const x = 270 + Math.cos(a) * dist;
                const y = 150 + Math.sin(a) * dist;
                const s = 6 + random(`s${i}`) * 14;
                return <rect key={i} x={x} y={y} width={s} height={s * 0.5} fill={C.dim} opacity={1 - damage * 0.6} transform={`rotate(${damage * 400 * (random(`o${i}`) - 0.5)} ${x} ${y})`} />;
              })}
              {/* kislorod oqimi (oq bulut) */}
              {damage < 1 && new Array(10).fill(0).map((_, i) => {
                const k = (damage * 3 + i / 10) % 1;
                return <circle key={`g${i}`} cx={275 + (random(`gx${i}`) - 0.5) * 80 * k} cy={130 - k * 160} r={8 + k * 40} fill="#E2E8F0" opacity={(1 - k) * 0.35 * Math.min(1, damage * 3)} />;
              })}
            </g>
          ) : null}
        </g>
      ) : null}

      <g>
        {glow > 0 ? (
          <>
            <ellipse cx={400} cy={200} rx={40 + glow * 70} ry={90 + glow * 60} fill={C.accent} opacity={glow * 0.35} />
            <ellipse cx={392} cy={200} rx={20 + glow * 40} ry={80 + glow * 30} fill="#FDE68A" opacity={glow * 0.5} />
          </>
        ) : null}
        <g opacity={fillOp}>
          <path d={PATHS.cm} fill={fillOf('cm')} />
        </g>
        <Stroke d={PATHS.cm} p={draw} color={col('cm')} />
        <Stroke d={PATHS.cmWindow} p={draw} color={col('cm')} w={2} />
      </g>

      {showLm ? (
        <g transform={`translate(${lmX} ${-sl * 30}) rotate(${lmR} 680 200)`} opacity={1 - Math.max(0, sl - 0.6) * 2.5}>
          <g opacity={fillOp}>
            <path d={PATHS.lmA} fill={fillOf('lm')} />
            <path d={PATHS.lmD} fill={fillOf('lm')} />
          </g>
          <Stroke d={PATHS.lmA} p={draw} color={col('lm')} />
          <Stroke d={PATHS.lmD} p={draw} color={col('lm')} />
          <Stroke d={PATHS.legs} p={draw} color={col('lm')} w={3} />
        </g>
      ) : null}
    </svg>
  );
};

// Yer — Oy yo'li uchun kub Bezier nuqtalari (kema nuqtasi yo'l bo'ylab yuradi)
export type Pt = [number, number];
export type Seg = [Pt, Pt, Pt, Pt];
export const bez = (s: Seg, t: number): Pt => {
  const m = 1 - t;
  const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0], a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
};
export const pathOf = (segs: Seg[]) => `M ${segs[0][0][0]} ${segs[0][0][1]} ` + segs.map((s) => `C ${s[1][0]} ${s[1][1]}, ${s[2][0]} ${s[2][1]}, ${s[3][0]} ${s[3][1]}`).join(' ');
export const pointOn = (segs: Seg[], t: number): Pt => {
  const x = Math.min(0.9999, Math.max(0, t)) * segs.length;
  const i = Math.floor(x);
  return bez(segs[i], x - i);
};
