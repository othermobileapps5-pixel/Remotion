import React from 'react';
import { AbsoluteFill, OffthreadVideo, random } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Cinzel';
import type { CustomScene } from '../../types';
import { resolveSrc } from '../../util';
import { Sfx, fontFamily, lerp, mono, useScene } from '../apollo13/kit';

export const { fontFamily: serif } = loadFont('normal', { weights: ['700', '900'], subsets: ['latin'] });
export { fontFamily, mono };

// Bobil ranglari: lojuvard (lapis) ko'k, oltin, qum
export const B = {
  bg: '#0A0F1F',
  lapis: '#1D4ED8',
  lapisDeep: '#172554',
  gold: '#F5C451',
  goldDeep: '#B45309',
  sand: '#E7C68F',
  text: '#FFF8EB',
  dim: '#C7B89A',
  line: '#3B3324',
};

export const BSfx: React.FC<{ at: number; src: string; volume?: number }> = (p) => {
  const shared = ['whoosh', 'ding', 'pulse', 'key', 'boom', 'switch', 'static'];
  return <Sfx {...p} dir={shared.includes(p.src) ? 'apollo13' : 'bobil'} />;
};

// Qum-oltin fon (klip yo'q paytda ham chiroyli) + uchib yuruvchi chang zarralari
export const Dusk: React.FC<{ tone?: 'gold' | 'lapis' }> = ({ tone = 'gold' }) => {
  const { frame, W, H, u } = useScene();
  const top = tone === 'gold' ? '#2A1B0B' : '#0B1433';
  const mid = tone === 'gold' ? '#7C4A15' : '#1E3A8A';
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 85%, ${mid} 0%, ${top} 55%, ${B.bg} 100%)`, overflow: 'hidden' }}>
      {new Array(60).fill(0).map((_, i) => {
        const x = ((random(`dx${i}`) * W + frame * (0.3 + random(`dv${i}`)) * u) % W);
        const y = random(`dy${i}`) * H + Math.sin(frame / 40 + i) * 12 * u;
        const s = (1.5 + random(`ds${i}`) * 3) * u;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, background: B.sand, opacity: 0.15 + random(`do${i}`) * 0.35 }} />;
      })}
    </AbsoluteFill>
  );
};

// Bobil silueti (klip yo'q sahnalar uchun): devorlar, zikkurat, palmalar — sekin parallaks
export const Skyline: React.FC = () => {
  const { prog } = useScene();
  const x = lerp(prog(0, 1, (t) => t), 0, -40);
  const wall = new Array(40).fill(0).map((_, i) => `L${i * 50} 760 L${i * 50} 740 L${i * 50 + 25} 740 L${i * 50 + 25} 760`).join(' ');
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <g transform={`translate(${x * 0.5} 0)`} fill="#1A1206" opacity={0.85}>
        <path d="M1150 820 L1150 700 L1190 700 L1190 610 L1230 610 L1230 520 L1270 520 L1270 440 L1310 440 L1310 380 L1390 380 L1390 440 L1430 440 L1430 520 L1470 520 L1470 610 L1510 610 L1510 700 L1550 700 L1550 820 Z" />
      </g>
      <g transform={`translate(${x} 0)`} fill="#0E0A04">
        <path d={`M0 1080 L0 760 ${wall} L2000 760 L2000 1080 Z`} />
        {[180, 260, 1700, 1790].map((px) => (
          <g key={px}>
            <path d={`M${px} 760 Q${px + 6} 680 ${px + 2} 600`} stroke="#0E0A04" strokeWidth={10} fill="none" />
            <path d={`M${px + 2} 600 q-60 10 -80 40 M${px + 2} 600 q60 10 80 40 M${px + 2} 600 q-40 -30 -70 -20 M${px + 2} 600 q40 -30 70 -20`} stroke="#0E0A04" strokeWidth={12} fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>
    </svg>
  );
};

// AI klip fon: sekin yaqinlashish + pastdan qorong'i parda (matn o'qilsin)
export const ClipBg: React.FC<{ scene: CustomScene; tone?: 'gold' | 'lapis' }> = ({ scene, tone }) => {
  const { prog, dur, fps } = useScene();
  const z = lerp(prog(0, 1, (x) => x), 1.02, 1.12);
  // Gemini klip uzunligi = sahna uzunligi (3..15 s); sahna uzunroq bo'lsa klip sekinlashtiriladi — qora kadr qolmaydi
  const clipSec = Math.min(15, Math.max(3, Math.round(dur / fps)));
  const rate = Math.min(1, (clipSec - 0.1) / (dur / fps));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {scene.src ? (
        <OffthreadVideo src={resolveSrc(scene.src)} muted={scene.muted ?? true} playbackRate={rate} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})` }} />
      ) : (
        <>
          <Dusk tone={tone} />
          <Skyline />
        </>
      )}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(10,15,31,0.55) 0%, rgba(10,15,31,0) 25%, rgba(10,15,31,0) 45%, rgba(10,15,31,0.85) 100%)' }} />
    </AbsoluteFill>
  );
};

// Yuqori chap yorliq (davr / joy)
export const Era: React.FC<{ text: string; right?: string }> = ({ text, right }) => {
  const { u, prog, vertical } = useScene();
  const p = prog(0, 0.06);
  const pad = (vertical ? 60 : 56) * u;
  return (
    <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', opacity: p }}>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 24 * u, letterSpacing: 4 * u, color: B.gold, display: 'flex', alignItems: 'center', gap: 14 * u, textShadow: '0 2px 8px #000' }}>
        <div style={{ width: 14 * u, height: 14 * u, transform: 'rotate(45deg)', background: B.gold }} />
        {text}
      </div>
      {right ? <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 24 * u, letterSpacing: 3 * u, color: B.dim, textShadow: '0 2px 8px #000' }}>{right}</div> : null}
    </div>
  );
};

// Klip ustidagi sarlavha (pastki chap) + navbat bilan chiqadigan yorliqlar + markazdagi katta urg'u
export type Beat = { at: number; text: string; kind: 'title' | 'tag' | 'big' };
export const ClipText: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  const { u, prog, pop, vertical, H } = useScene();
  const title = beats.find((b) => b.kind === 'title');
  const tags = beats.filter((b) => b.kind === 'tag');
  const big = beats.find((b) => b.kind === 'big');
  const bigP = big ? prog(big.at, big.at + 0.05) : 0;
  const pad = (vertical ? 70 : 110) * u;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: vertical ? H * 0.2 : 100 * u, opacity: 1 - bigP * 0.85 }}>
        {title ? (
          <>
            <div
              style={{
                fontFamily: serif,
                fontWeight: 900,
                fontSize: (vertical ? 92 : 120) * u,
                color: B.text,
                lineHeight: 1.02,
                letterSpacing: lerp(prog(title.at, title.at + 0.15), 24, 4) * u,
                opacity: prog(title.at, title.at + 0.06),
                textShadow: `0 ${4 * u}px ${30 * u}px rgba(0,0,0,0.8)`,
              }}
            >
              {title.text}
            </div>
            <div style={{ height: 6 * u, width: 300 * u, background: B.gold, marginTop: 18 * u, transform: `scaleX(${prog(title.at + 0.04, title.at + 0.12)})`, transformOrigin: 'left' }} />
          </>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 * u, marginTop: 26 * u }}>
          {tags.map((t) => {
            const p = pop(t.at, 14);
            return (
              <div
                key={t.text}
                style={{
                  fontFamily: mono,
                  fontWeight: 700,
                  fontSize: 28 * u,
                  letterSpacing: 3 * u,
                  color: B.bg,
                  background: B.gold,
                  padding: `${8 * u}px ${18 * u}px`,
                  borderRadius: 8 * u,
                  opacity: Math.min(1, p * 1.4),
                  transform: `translateY(${(1 - p) * 30 * u}px)`,
                }}
              >
                {t.text}
              </div>
            );
          })}
        </div>
      </div>
      {big ? (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: `rgba(10,15,31,${0.55 * bigP})` }}>
          <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 96 : 130) * u, color: B.gold, textAlign: 'center', padding: 80 * u, opacity: bigP, transform: `scale(${lerp(pop(big.at, 12), 1.3, 1)})`, textShadow: `0 0 ${50 * u}px rgba(245,196,81,0.45)` }}>
            {big.text}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// Bitta umumiy klip sahnasi: fon + yorliq + matn + SFX
export const ClipScene: React.FC<{ scene: CustomScene; era: string; right?: string; beats: Beat[]; tone?: 'gold' | 'lapis'; sfx?: { at: number; src: string; volume?: number }[] }> = ({ scene, era, right, beats, tone, sfx = [] }) => (
  <AbsoluteFill>
    <ClipBg scene={scene} tone={tone} />
    <Era text={era} right={right} />
    <ClipText beats={beats} />
    {beats.map((b, i) => (
      <BSfx key={i} at={b.at} src={b.kind === 'title' ? 'drum' : b.kind === 'big' ? 'gong' : 'whoosh'} volume={b.kind === 'tag' ? 0.3 : 0.5} />
    ))}
    {sfx.map((s, i) => (
      <BSfx key={`s${i}`} {...s} />
    ))}
  </AbsoluteFill>
);
