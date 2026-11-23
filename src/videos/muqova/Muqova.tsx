// YouTube muqovasi (thumbnail) 1280×720 — 2 xil dizayn. `npx remotion still ... Muqova` bilan yasaladi.
// Qoidalar: 2–4 katta so'z, kuchli kontrast, bitta markaziy obraz, bitta urg'u so'z (rangli quti), qizil strelka/doira.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Anton';

const { fontFamily } = loadFont('normal', { weights: ['400'], subsets: ['latin', 'latin-ext', 'cyrillic'] });

export type MuqovaProps = {
  matn: string; // 2–4 so'z, masalan "HECH KIM BILMAYDI"
  urgu?: string; // matndagi bitta so'z — rangli quti ichida
  belgi?: string; // burchakdagi stiker: "?", "$5000", "24H" (ixtiyoriy)
  rasm?: string; // public/ ichidagi yo'l (masalan "muqova/x.jpg"); bo'lmasa — gradient fon
  variant?: 1 | 2;
  rang?: string; // urg'u rangi
};

export const MUQOVA_DEFAULT: MuqovaProps = { matn: 'NOBODY TALKS ABOUT THIS', urgu: 'NOBODY', belgi: '?', rasm: '', variant: 1, rang: '#FFD400' };

const QIZIL = '#FF2D2D';
const kontur = (w: number) => {
  // qalin qora kontur (text-stroke Chrome'da ichkariga chizadi — soyalar bilan tashqi kontur)
  const s: string[] = [];
  for (let a = 0; a < 16; a++) {
    const r = (a / 16) * Math.PI * 2;
    s.push(`${(Math.cos(r) * w).toFixed(1)}px ${(Math.sin(r) * w).toFixed(1)}px 0 #000`);
  }
  return [...s, `0 ${w * 1.6}px ${w * 3}px rgba(0,0,0,.85)`].join(',');
};

const Fon: React.FC<{ rasm?: string; filter?: string; style?: React.CSSProperties }> = ({ rasm, filter, style }) =>
  rasm ? (
    <Img src={staticFile(rasm)} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter, ...style }} />
  ) : (
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 70% 40%, #ff7a18 0%, #b4161b 35%, #1a0505 75%)', ...style }} />
  );

// So'zlarni qatorlarga bo'lib, urg'u so'zni quti ichiga oladi
const Sozlar: React.FC<{ matn: string; urgu?: string; rang: string; size: number; align: 'left' | 'center'; qatorlar: number }> = ({ matn, urgu, rang, size, align, qatorlar }) => {
  const words = matn.toUpperCase().split(/\s+/).filter(Boolean).slice(0, 5);
  const per = Math.ceil(words.length / qatorlar);
  const rows: string[][] = [];
  for (let i = 0; i < words.length; i += per) rows.push(words.slice(i, i + per));
  const u = (urgu || '').toUpperCase();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center', gap: size * 0.06 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: size * 0.22, flexWrap: 'nowrap' }}>
          {r.map((w, j) => {
            const hl = u && w.replace(/[^\p{L}\p{N}$%]/gu, '') === u.replace(/[^\p{L}\p{N}$%]/gu, '');
            return (
              <span
                key={j}
                style={{
                  fontFamily,
                  fontSize: size,
                  lineHeight: 1.02,
                  color: hl ? '#000' : '#fff',
                  background: hl ? rang : 'transparent',
                  padding: hl ? `0 ${size * 0.12}px` : 0,
                  transform: hl ? 'rotate(-2deg)' : undefined,
                  textShadow: hl ? 'none' : kontur(size * 0.045),
                  boxShadow: hl ? `0 ${size * 0.06}px 0 #000` : undefined,
                  letterSpacing: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Stiker: React.FC<{ belgi?: string; style: React.CSSProperties }> = ({ belgi, style }) =>
  belgi ? (
    <div
      style={{
        position: 'absolute',
        fontFamily,
        fontSize: belgi.length > 3 ? 70 : 120,
        color: '#fff',
        background: QIZIL,
        border: '8px solid #fff',
        borderRadius: 999,
        minWidth: 170,
        height: 170,
        padding: '0 26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,.6)',
        transform: 'rotate(8deg)',
        ...style,
      }}
    >
      {belgi}
    </div>
  ) : null;

// Qizil strelka (SVG)
const Strelka: React.FC<{ style: React.CSSProperties; flip?: boolean }> = ({ style, flip }) => (
  <svg viewBox="0 0 200 120" style={{ position: 'absolute', width: 230, transform: flip ? 'scaleX(-1)' : undefined, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.7))', ...style }}>
    <path d="M8 70 C 60 70, 100 60, 140 40 L 128 14 L 196 40 L 140 92 L 140 64 C 100 82, 60 92, 8 94 Z" fill={QIZIL} stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
  </svg>
);

export const Muqova: React.FC<MuqovaProps> = (p) => {
  const { matn, urgu, belgi, rasm, variant = 1, rang = '#FFD400' } = { ...MUQOVA_DEFAULT, ...p };
  const nW = matn.split(/\s+/).filter(Boolean).length;

  if (variant === 2) {
    // 2-dizayn: to'liq rasm, pastda katta markaziy matn, obraz atrofida qizil doira
    return (
      <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
        <Fon rasm={rasm} filter="saturate(1.35) contrast(1.15)" />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.85) 100%)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '34%', width: 380, height: 380, marginLeft: -190, marginTop: -190, borderRadius: '50%', border: `14px solid ${QIZIL}`, boxShadow: '0 0 0 6px #fff, 0 10px 40px rgba(0,0,0,.6)' }} />
        <Stiker belgi={belgi} style={{ right: 50, top: 40 }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center' }}>
          <Sozlar matn={matn} urgu={urgu} rang={rang} size={nW <= 2 ? 190 : nW <= 3 ? 150 : 124} align="center" qatorlar={nW <= 3 ? 1 : 2} />
        </div>
      </AbsoluteFill>
    );
  }

  // 1-dizayn: rasm o'ngda, chapda qorong'i panel va 2–3 qatorli ulkan matn, strelka rasmga qaraydi
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Fon rasm={rasm} filter="saturate(1.4) contrast(1.2)" style={{ left: '28%', width: '72%' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, #000 0%, #000 34%, rgba(0,0,0,.55) 48%, rgba(0,0,0,0) 62%)' }} />
      <AbsoluteFill style={{ boxShadow: `inset 0 0 0 14px ${rang}` }} />
      <div style={{ position: 'absolute', left: 56, top: 0, bottom: 0, width: 700, display: 'flex', alignItems: 'center' }}>
        <Sozlar matn={matn} urgu={urgu} rang={rang} size={nW <= 2 ? 200 : nW <= 3 ? 160 : 132} align="left" qatorlar={nW <= 2 ? 2 : 3} />
      </div>
      <Strelka style={{ left: 640, top: 430, transform: 'rotate(-18deg)' }} />
      <Stiker belgi={belgi} style={{ right: 46, top: 40 }} />
    </AbsoluteFill>
  );
};
