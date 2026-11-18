import React from 'react';
import {
  AbsoluteFill, CalculateMetadataFunction, Easing, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Audio } from '@remotion/media';
import { fontFamily } from '../../fonts';

// «Nega treyderlarning ko'pi pul yo'qotadi?» — ~40 s Shorts (1080×1920), o'zbekcha, Sardor ovozi.
// Kinetik matn + harakatli grafiklar + 2 ta Gemini Omni klip (hook va hissiyot sahnalari fonida).
// Manbalar: Chague, De-Losso, Giovannetti, "Day Trading for a Living?" (SSRN 3423101) — 300+ kun savdo qilganlarning 97% zararda;
// ESMA (2018) — chakana CFD hisoblarining 74–89% pul yo'qotadi. Leverage misoli — oddiy arifmetika (1:100 × −1% = −100%).
// Sahna uzunliklari ssenariydan (ovoz.mjs ovozga qarab cho'zadi) — calculateMetadata yig'adi, ovoz ustma-ust tushmaydi.

type Scene = { id: string; type?: string; duration?: number; ovoz?: string; ovozFayl?: string; src?: string };
export type TradingProps = { scenes?: Scene[] };
const FPS = 30;
const C = { bg: '#070B10', panel: 'rgba(14,20,28,0.86)', edge: 'rgba(255,255,255,0.10)', text: '#F3F6FA', dim: '#8C98A8', red: '#FF3B4E', green: '#19D38A', amber: '#FFC24B' };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const lenOf = (s: Scene) => Math.round((s.duration || 4) * FPS);

export const tradingMetadata: CalculateMetadataFunction<TradingProps> = ({ props }) => ({
  durationInFrames: Math.max(FPS, (props.scenes || []).reduce((a, s) => a + lenOf(s), 0)),
});

const sp = (f: number, fps: number, delay = 0, cfg = { damping: 14, stiffness: 160 }) => spring({ frame: f - delay, fps, config: cfg });

// ---------- shared pieces ----------
const Pop: React.FC<{ at?: number; from?: 'up' | 'zoom' | 'left' | 'right' | 'slam'; children: React.ReactNode; style?: React.CSSProperties }> = ({ at = 0, from = 'up', children, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sp(f, fps, at, from === 'slam' ? { damping: 11, stiffness: 220 } : { damping: 15, stiffness: 150 });
  const tr =
    from === 'zoom' ? `scale(${interpolate(p, [0, 1], [0.5, 1])})` :
    from === 'slam' ? `scale(${interpolate(p, [0, 1], [2.2, 1])})` :
    from === 'left' ? `translateX(${interpolate(p, [0, 1], [-120, 0])}px)` :
    from === 'right' ? `translateX(${interpolate(p, [0, 1], [120, 0])}px)` :
    `translateY(${interpolate(p, [0, 1], [70, 0])}px)`;
  return <div style={{ opacity: f < at ? 0 : Math.min(1, p * 1.5), transform: tr, ...style }}>{children}</div>;
};

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.amber }) => (
  <div style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 14, border: `2px solid ${color}`, color, fontSize: 34, fontWeight: 800, letterSpacing: 4 }}>{children}</div>
);

const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 120, color = C.text }) => (
  <div style={{ fontSize: size, fontWeight: 800, color, lineHeight: 1.02, letterSpacing: -2, textShadow: '0 6px 30px rgba(0,0,0,.6)' }}>{children}</div>
);

// highlighted word: bar grows behind it
const Mark: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = C.red, children }) => {
  const f = useCurrentFrame();
  const w = interpolate(f, [at, at + 10], [0, 100], { ...clamp, easing: ease });
  return (
    <span style={{ position: 'relative', display: 'inline-block', padding: '0 14px' }}>
      <span style={{ position: 'absolute', left: 0, top: '12%', bottom: '8%', width: `${w}%`, background: color, borderRadius: 10, zIndex: 0 }} />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </span>
  );
};

const Source: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top: 1430, color: C.dim, fontSize: 28, fontWeight: 600, textAlign: 'center' }}>{children}</div>
);

// faint moving candlestick chart behind everything
const candles = Array.from({ length: 80 }, (_, i) => {
  const r = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { o: r(1), c: r(2), h: r(3), l: r(4) };
});
const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const shift = (f * 1.6) % 54;
  let y = 900;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 900px at 50% 30%, #0F1A26 0%, ${C.bg} 70%)` }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', opacity: 0.16 }}>
        {Array.from({ length: 20 }, (_, i) => <line key={i} x1={0} x2={1080} y1={i * 100} y2={i * 100} stroke="#2A3746" strokeWidth={1} />)}
        {candles.map((k, i) => {
          const up = k.c > k.o, open = y, close = y + (k.c - k.o) * 160;
          y = close - Math.sin(i / 6) * 6;
          const x = i * 54 - shift;
          const top = Math.min(open, close), h = Math.max(6, Math.abs(close - open));
          return (
            <g key={i}>
              <line x1={x + 14} x2={x + 14} y1={top - 30 - k.h * 50} y2={top + h + 30 + k.l * 50} stroke={up ? C.red : C.green} strokeWidth={3} />
              <rect x={x} y={top} width={28} height={h} rx={3} fill={up ? C.red : C.green} />
            </g>
          );
        })}
      </svg>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(7,11,16,.2), rgba(7,11,16,.75) 85%)' }} />
    </AbsoluteFill>
  );
};

// AI clip as background (muted voice-wise; its own ambient kept low)
const ClipBg: React.FC<{ src?: string; len: number }> = ({ src, len }) => {
  const f = useCurrentFrame();
  if (!src) return <Backdrop />;
  const z = interpolate(f, [0, len], [1.0, 1.08]);
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(src)} volume={0.25} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,8,12,.55) 0%, rgba(5,8,12,.15) 35%, rgba(5,8,12,.25) 60%, rgba(5,8,12,.85) 100%)' }} />
    </AbsoluteFill>
  );
};

const Center: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 330 }) => (
  <AbsoluteFill style={{ padding: `${top}px 80px 0`, alignItems: 'center', textAlign: 'center', fontFamily }}>{children}</AbsoluteFill>
);

const Sfx: React.FC<{ at: number; name: string; vol?: number }> = ({ at, name, vol = 0.5 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60} layout="none">
    <Audio src={staticFile(`trading/${name}.mp3`)} volume={vol} />
  </Sequence>
);

// dynamic subtitle: words of the voice line light up in order
const Subtitle: React.FC<{ text?: string; len: number }> = ({ text, len }) => {
  const f = useCurrentFrame();
  if (!text) return null;
  const words = text.split(/\s+/);
  const spoken = Math.max(1, len - 24); // voice ends ~0.8 s before the scene does
  const n = interpolate(f, [4, spoken], [0, words.length], clamp);
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 1300, textAlign: 'center', fontFamily, fontSize: 44, fontWeight: 800, lineHeight: 1.25 }}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span style={{ color: i < n ? (i < n - 1 ? C.text : C.amber) : 'rgba(243,246,250,.28)', textShadow: '0 3px 12px rgba(0,0,0,.8)' }}>{w}</span>{' '}
        </React.Fragment>
      ))}
    </div>
  );
};

const count = (f: number, a: number, b: number, from: number, to: number) => Math.round(interpolate(f, [a, b], [from, to], { ...clamp, easing: ease }));

// ---------- scenes ----------
const Hook: React.FC<{ s: Scene; len: number }> = ({ s, len }) => {
  const f = useCurrentFrame();
  const v = count(f, 6, 40, 0, 97);
  const shake = f > 40 && f < 52 ? Math.sin(f * 3) * 10 : 0;
  return (
    <>
      <ClipBg src={s.src} len={len} />
      <Center top={360}>
        <Pop from="zoom"><Label color={C.red}>KUNLIK SAVDO</Label></Pop>
        <div style={{ transform: `translateX(${shake}px)`, marginTop: 30 }}>
          <Big size={340} color={C.red}>{v}%</Big>
        </div>
        <Pop at={38} from="slam"><Big size={92}>pul yo'qotgan</Big></Pop>
      </Center>
      <Sfx at={6} name="whoosh" vol={0.5} />
      <Sfx at={40} name="boom" vol={0.7} />
    </>
  );
};

const Grid: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const greens = new Set([23, 58, 86]);
  return (
    <>
      <Backdrop />
      <Center top={300}>
        <Pop><Label>100 TREYDERDAN</Label></Pop>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 56px)', gap: 14, marginTop: 46 }}>
          {Array.from({ length: 100 }, (_, i) => {
            const appear = sp(f, fps, 6 + (i % 10) + Math.floor(i / 10) * 1.2);
            const turn = !greens.has(i) && f > 36 + i * 0.35;
            const col = greens.has(i) ? C.green : turn ? C.red : '#3A4656';
            return <div key={i} style={{ width: 56, height: 56, borderRadius: 28, background: col, transform: `scale(${appear})`, boxShadow: turn ? `0 0 18px ${C.red}88` : greens.has(i) && f > 70 ? `0 0 26px ${C.green}` : 'none' }} />;
          })}
        </div>
        <Pop at={80} style={{ marginTop: 50, display: 'flex', gap: 50, fontSize: 56, fontWeight: 800 }}>
          <span style={{ color: C.red }}>97 zararda</span><span style={{ color: C.green }}>3 foydada</span>
        </Pop>
      </Center>
      <Source>Braziliya, 300+ kun savdo qilganlar · Chague va boshq., «Day Trading for a Living?»</Source>
      <Sfx at={6} name="tick" vol={0.35} /><Sfx at={20} name="tick" vol={0.35} /><Sfx at={36} name="glitch" vol={0.4} />
      <Sfx at={80} name="pop" vol={0.5} />
    </>
  );
};

const Esma: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [16, 46], [0, 74], { ...clamp, easing: ease });
  const b = interpolate(f, [46, 70], [74, 89], { ...clamp, easing: ease });
  return (
    <>
      <Backdrop />
      <Center top={400}>
        <Pop><Label>YEVROPA · CFD HISOBLARI</Label></Pop>
        <div style={{ marginTop: 60, fontSize: 150, fontWeight: 800, color: C.red }}>{Math.round(a)}–{Math.round(Math.max(b, a))}%</div>
        <div style={{ fontSize: 60, fontWeight: 800, color: C.text, marginTop: 10 }}>zararda</div>
        <div style={{ position: 'relative', width: 900, height: 70, borderRadius: 35, background: '#1B2532', marginTop: 70, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${a}%`, background: `linear-gradient(90deg, #7a1d27, ${C.red})` }} />
          <div style={{ position: 'absolute', left: '74%', top: 0, bottom: 0, width: `${Math.max(0, b - 74)}%`, background: 'repeating-linear-gradient(45deg, #FF3B4E 0 14px, #c92a3a 14px 28px)' }} />
        </div>
        <div style={{ width: 900, display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: 30, marginTop: 14, fontWeight: 700 }}><span>0%</span><span>100%</span></div>
      </Center>
      <Source>ESMA ogohlantirishi: chakana CFD hisoblarining 74–89% pul yo'qotadi</Source>
      <Sfx at={16} name="whoosh" vol={0.4} /><Sfx at={70} name="glitch" vol={0.4} />
    </>
  );
};

const Why: React.FC = () => (
  <>
    <Backdrop />
    <Center top={560}>
      <Pop from="slam"><Big size={210} color={C.amber}>NEGA?</Big></Pop>
      <div style={{ display: 'flex', gap: 30, marginTop: 70 }}>
        {[1, 2, 3].map((k) => (
          <Pop key={k} at={18 + k * 6} from="zoom">
            <div style={{ width: 210, height: 210, borderRadius: 40, background: C.panel, border: `3px solid ${C.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 130, fontWeight: 800, color: C.red }}>{k}</div>
          </Pop>
        ))}
      </div>
      <Pop at={44}><Big size={80}>uchta xato</Big></Pop>
    </Center>
    <Sfx at={0} name="boom" vol={0.55} /><Sfx at={24} name="pop" vol={0.4} /><Sfx at={30} name="pop" vol={0.4} /><Sfx at={36} name="pop" vol={0.4} />
  </>
);

const Leverage: React.FC = () => {
  const f = useCurrentFrame();
  const drop = interpolate(f, [60, 90], [0, 1], { ...clamp, easing: ease });
  const bal = Math.round(100 * (1 - drop));
  return (
    <>
      <Backdrop />
      <Center top={300}>
        <Pop><Label color={C.red}>1 · KATTA LEVERAGE</Label></Pop>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 60, fontSize: 64, fontWeight: 800 }}>
          <Pop at={10} from="left"><div style={{ padding: '24px 34px', borderRadius: 26, background: C.panel, border: `2px solid ${C.edge}` }}>$100</div></Pop>
          <Pop at={20} from="zoom"><span style={{ color: C.amber }}>× 100</span></Pop>
          <Pop at={30} from="right"><div style={{ padding: '24px 34px', borderRadius: 26, background: C.panel, border: `2px solid ${C.amber}` }}>$10 000</div></Pop>
        </div>
        <Pop at={46} style={{ marginTop: 60 }}>
          <svg width={900} height={300}>
            <polyline points="0,120 120,100 240,130 360,90 480,110 600,95" fill="none" stroke={C.green} strokeWidth={8} strokeLinejoin="round" />
            <polyline points={`600,95 ${600 + 300 * drop},${95 + 170 * drop}`} fill="none" stroke={C.red} strokeWidth={10} />
            {drop > 0.05 && <text x={640} y={80} fill={C.red} fontSize={56} fontWeight={800} fontFamily={fontFamily}>−1%</text>}
          </svg>
        </Pop>
        <div style={{ fontSize: 44, color: C.dim, fontWeight: 700 }}>Hisob</div>
        <div style={{ fontSize: 170, fontWeight: 800, color: bal < 100 ? C.red : C.text }}>${bal}</div>
      </Center>
      <Sfx at={10} name="pop" vol={0.4} /><Sfx at={20} name="pop" vol={0.4} /><Sfx at={30} name="pop" vol={0.4} /><Sfx at={88} name="boom" vol={0.6} />
    </>
  );
};

const StopLoss: React.FC = () => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [12, 80], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const pts = Array.from({ length: 30 }, (_, i) => `${i * 31},${120 + i * i * 0.42 + Math.sin(i * 1.7) * 22}`).join(' ');
  return (
    <>
      <Backdrop />
      <Center top={300}>
        <Pop><Label color={C.red}>2 · STOP-LOSS YO'Q</Label></Pop>
        <div style={{ position: 'relative', marginTop: 70 }}>
          <svg width={920} height={620}>
            <line x1={0} x2={920} y1={200} y2={200} stroke={C.amber} strokeWidth={5} strokeDasharray="22 16" opacity={0.85} />
            <text x={10} y={186} fill={C.amber} fontSize={36} fontWeight={800} fontFamily={fontFamily}>STOP</text>
            <polyline points={pts} fill="none" stroke={C.red} strokeWidth={10} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </svg>
          <Pop at={34} from="slam" style={{ position: 'absolute', left: 160, top: 130 }}>
            <div style={{ fontSize: 140, color: C.red, fontWeight: 800 }}>✕</div>
          </Pop>
        </div>
        <Pop at={60}><Big size={80}>Zarar <Mark at={66}>to'xtamaydi</Mark></Big></Pop>
      </Center>
      <Sfx at={34} name="glitch" vol={0.45} /><Sfx at={66} name="whoosh" vol={0.35} />
    </>
  );
};

const Emotion: React.FC<{ s: Scene; len: number }> = ({ s, len }) => {
  const f = useCurrentFrame();
  const step = f < 44 ? 0 : f < 64 ? 1 : 2; // revenge trading: each time a bigger position
  const lot = [1, 2, 4][step];
  return (
    <>
      <ClipBg src={s.src} len={len} />
      <Center top={380}>
        <Pop><Label color={C.red}>3 · HISSIYOT</Label></Pop>
        <Pop at={14} from="slam" style={{ marginTop: 50 }}><Big size={118}>«Qaytarib</Big></Pop>
        <Pop at={24} from="slam"><Big size={118}>olaman!»</Big></Pop>
        <Pop at={40} style={{ marginTop: 40 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: C.red, padding: '14px 34px', borderRadius: 24, background: 'rgba(0,0,0,.5)', transform: `scale(${1 + step * 0.12})` }}>Lot × {lot}</div>
        </Pop>
      </Center>
      <Sfx at={14} name="pop" vol={0.4} /><Sfx at={24} name="pop" vol={0.4} /><Sfx at={44} name="glitch" vol={0.4} /><Sfx at={64} name="glitch" vol={0.45} />
    </>
  );
};

const Rule: React.FC = () => {
  const f = useCurrentFrame();
  const R = 230, Cc = 2 * Math.PI * R;
  const ring = interpolate(f, [8, 34], [0, 1], { ...clamp, easing: ease });
  const slice = interpolate(f, [40, 56], [0, 0.01], { ...clamp, easing: ease });
  const glow = 0.5 + Math.sin(f / 4) * 0.5;
  return (
    <>
      <Backdrop />
      <Center top={300}>
        <Pop><Label color={C.green}>QOIDA · 1%</Label></Pop>
        <div style={{ position: 'relative', width: 560, height: 560, marginTop: 50 }}>
          <svg width={560} height={560} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={280} cy={280} r={R} fill="none" stroke="#1E2A38" strokeWidth={70} />
            <circle cx={280} cy={280} r={R} fill="none" stroke="#2C6E55" strokeWidth={70} strokeDasharray={`${Cc * ring} ${Cc}`} />
            <circle cx={280} cy={280} r={R} fill="none" stroke={C.amber} strokeWidth={84} strokeDasharray={`${Math.max(slice * Cc * 3, 0)} ${Cc}`} opacity={f > 40 ? 0.6 + glow * 0.4 : 0} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 40, color: C.dim, fontWeight: 700 }}>Hisob</div>
            <div style={{ fontSize: 110, fontWeight: 800, color: C.text }}>$1 000</div>
          </div>
        </div>
        <Pop at={50} style={{ marginTop: 30 }}><Big size={78}>Bitta savdoda xavf: <span style={{ color: C.amber }}>$10</span></Big></Pop>
      </Center>
      <Sfx at={8} name="whoosh" vol={0.35} /><Sfx at={50} name="ding" vol={0.45} />
    </>
  );
};

const Cta: React.FC = () => (
  <>
    <Backdrop />
    <Center top={520}>
      <Pop from="slam"><Big size={120}>Avval</Big></Pop>
      <Pop at={8} from="slam"><Big size={120}><Mark at={14} color={C.green}>omon qoling</Mark></Big></Pop>
      <Pop at={30} style={{ marginTop: 20 }}><Big size={90} color={C.dim}>keyin daromad</Big></Pop>
      <Pop at={50} from="zoom" style={{ marginTop: 70 }}>
        <div style={{ padding: '26px 50px', borderRadius: 999, background: C.amber, color: '#1a1200', fontSize: 56, fontWeight: 800 }}>🔖 Saqlab qo'ying</div>
      </Pop>
    </Center>
    <Source>Moliyaviy maslahat emas · faqat ta'lim uchun</Source>
    <Sfx at={0} name="whoosh" vol={0.4} /><Sfx at={14} name="ding" vol={0.4} /><Sfx at={50} name="pop" vol={0.5} />
  </>
);

const views: Record<string, React.FC<{ s: Scene; len: number }>> = {
  hook: Hook, grid: Grid, esma: Esma, why: Why, leverage: Leverage, stop: StopLoss, emotion: Emotion, rule: Rule, cta: Cta,
};

export const TradingShort: React.FC<TradingProps> = ({ scenes = [] }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  let at = 0;
  const musicVol = (x: number) => interpolate(x, [0, 20, durationInFrames - 40, durationInFrames], [0, 0.11, 0.11, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily, color: C.text }}>
      {scenes.map((s, i) => {
        const len = lenOf(s), from = at;
        at += len;
        const V = views[s.id];
        return (
          <Sequence key={i} from={from} durationInFrames={len} premountFor={30}>
            <SceneFade len={len}>{V ? <V s={s} len={len} /> : <Backdrop />}</SceneFade>
            <Subtitle text={s.ovoz} len={len} />
            {s.ovozFayl && <Audio src={staticFile(s.ovozFayl)} />}
          </Sequence>
        );
      })}
      <Audio src={staticFile('trading/music.mp3')} volume={musicVol} />
      <AbsoluteFill style={{ background: '#000', opacity: interpolate(f, [durationInFrames - 15, durationInFrames], [0, 1], clamp), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

const SceneFade: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6, len - 5, len], [0, 1, 1, 0.3], clamp);
  const z = interpolate(f, [0, len], [1, 1.03], clamp);
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};
