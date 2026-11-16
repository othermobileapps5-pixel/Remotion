import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from '@remotion/google-fonts/JetBrainsMono';
import { fontFamily } from '../../fonts';
import T from './timeline.json';

// Claude Opus 5.5 haqida 47 s Shorts (1080×1920). Faqat 2D: matn, chat, diagramma, grafik.
// Raqamlar manbasi: anthropic.com/news/claude-opus-5-5 (22-sentabr 2026). SFX — public/opus/sfx.mp3 (scripts/opus-sfx.py).

const { fontFamily: mono } = loadFont('normal', { weights: ['500', '700'], subsets: ['latin'] });

const C = { bg: '#14120F', card: '#211E19', edge: '#3A342B', text: '#F5F1E8', dim: '#A39E93', accent: '#E07A55', soft: '#F2B79B', ok: '#7FC99A' };
const S = T.scenes;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const typingOf = (id: string) => T.typing.find((t) => t.id === id)!;
// harfma-harf yozilish: global kadr bo'yicha
const typed = (id: string, f: number) => {
  const t = typingOf(id);
  return t.text.slice(0, Math.max(0, Math.floor(((f - t.start) * t.cps) / T.fps)));
};
const typingDone = (id: string) => {
  const t = typingOf(id);
  return t.start + Math.ceil((t.text.length * T.fps) / t.cps);
};

const Pop: React.FC<{ at: number; children: React.ReactNode; from?: 'up' | 'left' | 'right' | 'zoom'; style?: React.CSSProperties }> = ({ at, children, from = 'up', style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 140 } });
  const tr =
    from === 'zoom' ? `scale(${interpolate(p, [0, 1], [0.6, 1])})` :
    from === 'left' ? `translateX(${interpolate(p, [0, 1], [-80, 0])}px)` :
    from === 'right' ? `translateX(${interpolate(p, [0, 1], [80, 0])}px)` :
    `translateY(${interpolate(p, [0, 1], [50, 0])}px)`;
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: tr, ...style }}>{children}</div>;
};

const Cursor: React.FC = () => {
  const f = useCurrentFrame();
  return <span style={{ opacity: Math.floor(f / 15) % 2 ? 0 : 1, color: C.accent }}>▍</span>;
};

const count = (f: number, a: number, b: number, to: number, dec = 0) => {
  const v = interpolate(f, [a, b], [0, to], { ...clamp, easing: ease });
  return dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US').replace(/,/g, ' ');
};

// Har sahna: kirishda va chiqishda yumshoq o'tish
const Scene: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [from, from + 12, to - 10, to], [0, 1, 1, 0], clamp);
  const y = interpolate(f, [from, from + 14], [40, 0], { ...clamp, easing: ease });
  const zoom = interpolate(f, [from, to], [1, 1.04], clamp); // sekin kamera yaqinlashishi
  if (f < from || f >= to) return null;
  return (
    <AbsoluteFill style={{ opacity: o, transform: `translateY(${y}px) scale(${zoom})`, justifyContent: 'center', alignItems: 'center', padding: '0 90px 260px' }}>
      {children}
    </AbsoluteFill>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: C.accent, fontSize: 34, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 30 }}>{children}</div>
);

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const gx = 50 + Math.sin(f / 90) * 18;
  const gy = 35 + Math.cos(f / 120) * 10;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${gx}% ${gy}%, rgba(224,122,85,0.22), transparent 55%)` }} />
      {Array.from({ length: 26 }).map((_, i) => {
        const x = (i * 397) % 1080;
        const y = (((i * 733) % 1920) - f * (0.6 + (i % 5) * 0.25) + 1920 * 3) % 1920;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, borderRadius: 99, background: C.soft, opacity: 0.12 + (i % 4) * 0.05 }} />;
      })}
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = typingOf('hook');
  const sweep = interpolate(f, [70, 110], [-120, 120], clamp);
  return (
    <Scene from={S.hook} to={S.chat}>
      <div style={{ fontFamily: mono, color: C.dim, fontSize: 48, minHeight: 70 }}>
        {typed('hook', f)}
        {f < typingDone('hook') + 20 && f >= t.start ? <Cursor /> : null}
      </div>
      <Pop at={62} from="zoom">
        <div style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', marginTop: 40 }}>
          <div style={{ color: C.text, fontSize: 120, fontWeight: 800, lineHeight: 1.05 }}>Claude</div>
          <div style={{ color: C.accent, fontSize: 168, fontWeight: 800, lineHeight: 1.05 }}>Opus 5.5</div>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${45 + sweep / 3}%, rgba(255,255,255,0.35) ${50 + sweep / 3}%, transparent ${55 + sweep / 3}%)` }} />
        </div>
      </Pop>
      <Pop at={80}>
        <div style={{ color: C.dim, fontSize: 40, fontWeight: 600, marginTop: 40, textAlign: 'center' }}>22-sentabr, 2026 · Claude 5.5 oilasining birinchisi</div>
      </Pop>
    </Scene>
  );
};

const Bubble: React.FC<{ me?: boolean; children: React.ReactNode }> = ({ me, children }) => (
  <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 820, background: me ? C.accent : C.card, color: me ? '#1B120D' : C.text, border: me ? 'none' : `2px solid ${C.edge}`, borderRadius: 40, padding: '30px 38px', fontSize: 44, fontWeight: 700, lineHeight: 1.3 }}>
    {children}
  </div>
);

const Chat: React.FC = () => {
  const f = useCurrentFrame();
  const done = typingDone('chat');
  const dots = f >= 222 && f < 236;
  return (
    <Scene from={S.chat} to={S.chart}>
      <div style={{ width: 900, display: 'flex', flexDirection: 'column', gap: 34 }}>
        <Bubble me>
          {typed('chat', f) || ' '}
          {f < done + 6 ? <Cursor /> : null}
        </Bubble>
        {f >= 222 ? (
          <Pop at={222} from="left">
            <Bubble>
              {dots ? (
                <span style={{ letterSpacing: 10 }}>{'•••'.slice(0, 1 + (Math.floor(f / 4) % 3))}</span>
              ) : (
                <>
                  <div style={{ color: C.dim, fontSize: 32, marginBottom: 10 }}>Erta sinovchi natijasi</div>
                  <div style={{ fontSize: 96, fontWeight: 800, color: C.accent, fontFamily: mono }}>{count(f, 236, 262, 680000)}</div>
                  <div>qator kod — <span style={{ color: C.ok }}>1 kundan kam</span> vaqtda</div>
                </>
              )}
            </Bubble>
          </Pop>
        ) : null}
        <Pop at={272}>
          <div style={{ color: C.dim, fontSize: 38, fontWeight: 600, textAlign: 'center', marginTop: 10 }}>Muhandislar jamoasiga haftalar kerak bo'lardi</div>
        </Pop>
      </div>
    </Scene>
  );
};

const BARS = [
  { name: 'Opus 5.5', v: 66.4, at: 350, hi: true },
  { name: 'Fable 5.1', v: 55.8, at: 370 },
  { name: 'Opus 5', v: 52.3, at: 390 },
];

const Chart: React.FC = () => {
  const f = useCurrentFrame();
  const glow = interpolate(f, [470, 485, 520], [0, 1, 0.6], clamp);
  return (
    <Scene from={S.chart} to={S.price}>
      <Pop at={330}>
        <Label>Kod va terminal ishlari</Label>
      </Pop>
      <Pop at={332}>
        <div style={{ color: C.text, fontSize: 64, fontWeight: 800, marginBottom: 60 }}>Terminal-Bench 4.0</div>
      </Pop>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 70, height: 760 }}>
        {BARS.map((b) => {
          const h = interpolate(f, [b.at, b.at + 70], [0, (b.v / 70) * 640], { ...clamp, easing: ease });
          return (
            <div key={b.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ fontFamily: mono, fontSize: 56, fontWeight: 700, color: b.hi ? C.accent : C.text, opacity: f >= b.at ? 1 : 0 }}>{count(f, b.at, b.at + 70, b.v, 1)}%</div>
              <div style={{ width: 200, height: h, borderRadius: 26, background: b.hi ? `linear-gradient(180deg, ${C.soft}, ${C.accent})` : '#4A433A', boxShadow: b.hi ? `0 0 ${80 * glow}px rgba(224,122,85,${0.7 * glow})` : 'none' }} />
              <div style={{ fontSize: 40, fontWeight: 700, color: b.hi ? C.text : C.dim }}>{b.name}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

const PriceRow: React.FC<{ at: number; name: string; old: string; now: string }> = ({ at, name, old, now }) => {
  const f = useCurrentFrame();
  const strike = interpolate(f, [at + 12, at + 26], [0, 100], { ...clamp, easing: ease });
  return (
    <Pop at={at} from="left">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 880, padding: '34px 44px', background: C.card, border: `2px solid ${C.edge}`, borderRadius: 34, marginBottom: 30 }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: C.dim }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34, fontFamily: mono }}>
          <span style={{ position: 'relative', fontSize: 48, color: C.dim }}>
            {old}
            <span style={{ position: 'absolute', left: 0, top: '52%', height: 5, width: `${strike}%`, background: C.accent }} />
          </span>
          <span style={{ fontSize: 64, fontWeight: 700, color: C.text, opacity: interpolate(f, [at + 20, at + 30], [0, 1], clamp) }}>{now}</span>
        </div>
      </div>
    </Pop>
  );
};

const Price: React.FC = () => (
  <Scene from={S.price} to={S.speed}>
    <Pop at={556}>
      <Label>Narx · 1 mln token</Label>
    </Pop>
    <PriceRow at={580} name="Kiritish" old="$5" now="$4" />
    <PriceRow at={615} name="Chiqish" old="$25" now="$20" />
    <Pop at={690} from="zoom">
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div style={{ color: C.accent, fontSize: 150, fontWeight: 800, lineHeight: 1 }}>~40%</div>
        <div style={{ color: C.text, fontSize: 52, fontWeight: 800 }}>arzonroq ishlaydi</div>
        <div style={{ color: C.dim, fontSize: 34, fontWeight: 600, marginTop: 14 }}>odatiy ishda, Opus 5 ga nisbatan</div>
      </div>
    </Pop>
  </Scene>
);

const Speed: React.FC = () => {
  const f = useCurrentFrame();
  const R = 300;
  const len = Math.PI * R; // yarim aylana
  const p = interpolate(f, [765, 860], [0, 1], { ...clamp, easing: ease });
  const ang = -180 + 180 * p;
  return (
    <Scene from={S.speed} to={S.safety}>
      <Pop at={760}>
        <Label>Tezlik</Label>
      </Pop>
      <svg width={720} height={400} viewBox="-360 -340 720 400">
        <path d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`} stroke="#3A342B" strokeWidth={40} fill="none" strokeLinecap="round" />
        <path d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`} stroke={C.accent} strokeWidth={40} fill="none" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
        <line x1={0} y1={0} x2={(R - 60) * Math.cos((ang * Math.PI) / 180)} y2={(R - 60) * Math.sin((ang * Math.PI) / 180)} stroke={C.text} strokeWidth={14} strokeLinecap="round" />
        <circle r={26} fill={C.text} />
      </svg>
      <Pop at={785}>
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <div style={{ color: C.text, fontSize: 80, fontWeight: 800 }}>
            <span style={{ color: C.accent }}>30%+</span> tezroq
          </div>
          <div style={{ color: C.dim, fontSize: 40, fontWeight: 600 }}>javob yozadi (Opus 5 ga nisbatan)</div>
        </div>
      </Pop>
      <Pop at={870} from="zoom">
        <div style={{ marginTop: 50, padding: '22px 40px', borderRadius: 999, border: `3px solid ${C.accent}`, color: C.text, fontSize: 44, fontWeight: 800 }}>Fast mode — 2.5x gacha</div>
      </Pop>
    </Scene>
  );
};

const NODES = [
  { label: 'METR', x: -300, y: 330, at: 950 },
  { label: 'Frontier Design', x: 300, y: 330, at: 975 },
];

const Safety: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 6) * 0.03;
  return (
    <Scene from={S.safety} to={S.where}>
      <Pop at={912}>
        <Label>Xavfsizlik</Label>
      </Pop>
      <div style={{ position: 'relative', width: 900, height: 620 }}>
        <svg width={900} height={620} viewBox="-450 0 900 620" style={{ position: 'absolute', inset: 0 }}>
          {NODES.map((n) => {
            const L = Math.hypot(n.x, n.y - 110);
            const d = interpolate(f, [n.at - 22, n.at], [L, 0], { ...clamp, easing: ease });
            const t = interpolate(f, [n.at - 22, n.at], [0, 1], clamp);
            return (
              <g key={n.label}>
                <line x1={0} y1={110} x2={n.x} y2={n.y} stroke={C.accent} strokeWidth={6} strokeDasharray={L} strokeDashoffset={d} />
                <circle cx={n.x * t} cy={110 + (n.y - 110) * t} r={12} fill={C.soft} opacity={t < 1 ? 1 : 0} />
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', left: 450, top: 110, transform: `translate(-50%, -50%) scale(${pulse})`, padding: '30px 50px', borderRadius: 999, background: C.accent, color: '#1B120D', fontSize: 52, fontWeight: 800 }}>Opus 5.5</div>
        {NODES.map((n) => (
          <div key={n.label} style={{ position: 'absolute', left: 450 + n.x, top: n.y, transform: 'translate(-50%, -50%)' }}>
            <Pop at={n.at} from="zoom">
              <div style={{ padding: '26px 36px', borderRadius: 30, background: C.card, border: `2px solid ${C.edge}`, color: C.text, fontSize: 42, fontWeight: 800, whiteSpace: 'nowrap' }}>{n.label}</div>
            </Pop>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center' }}>
          <Pop at={1000}>
            <div style={{ color: C.dim, fontSize: 38, fontWeight: 600 }}>chiqishdan oldin tashqi baholovchilar sinovi</div>
          </Pop>
        </div>
      </div>
      <Pop at={1060} from="zoom">
        <div style={{ textAlign: 'center', color: C.text, fontSize: 56, fontWeight: 800, lineHeight: 1.25 }}>
          Xulq auditida
          <br />
          <span style={{ color: C.ok }}>eng yaxshi natija</span>
        </div>
      </Pop>
    </Scene>
  );
};

const CHIPS = [
  { name: 'Claude', at: 1140 },
  { name: 'AWS', at: 1152 },
  { name: 'Google Cloud', at: 1164 },
  { name: 'Microsoft Azure', at: 1176 },
];

const Where: React.FC = () => {
  const f = useCurrentFrame();
  const done = typingDone('code');
  return (
    <Scene from={S.where} to={S.cta}>
      <Pop at={1122}>
        <Label>Qayerda bor</Label>
      </Pop>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, justifyContent: 'center', width: 900, marginBottom: 60 }}>
        {CHIPS.map((c) => (
          <Pop key={c.name} at={c.at} from="zoom">
            <div style={{ padding: '24px 40px', borderRadius: 999, background: C.card, border: `2px solid ${C.edge}`, color: C.text, fontSize: 44, fontWeight: 800 }}>{c.name}</div>
          </Pop>
        ))}
      </div>
      <div style={{ width: 900, background: '#0C0B09', border: `2px solid ${C.edge}`, borderRadius: 30, padding: '30px 40px', fontFamily: mono }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          {['#E5655B', '#E6B54A', '#62C26E'].map((c) => (
            <div key={c} style={{ width: 22, height: 22, borderRadius: 99, background: c }} />
          ))}
        </div>
        <div style={{ color: C.text, fontSize: 44, minHeight: 60 }}>
          {typed('code', f)}
          {f < done + 10 ? <Cursor /> : null}
        </div>
        <div style={{ color: C.ok, fontSize: 38, marginTop: 16, opacity: interpolate(f, [done + 12, done + 20], [0, 1], clamp) }}>✓ API'da tayyor</div>
      </div>
    </Scene>
  );
};

const Cta: React.FC = () => (
  <Scene from={S.cta} to={T.total + 11}>
    <Pop at={1320} from="zoom">
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.text, fontSize: 110, fontWeight: 800, lineHeight: 1.05 }}>Claude</div>
        <div style={{ color: C.accent, fontSize: 150, fontWeight: 800, lineHeight: 1.05 }}>Opus 5.5</div>
      </div>
    </Pop>
    <Pop at={1360}>
      <div style={{ marginTop: 50, color: C.dim, fontSize: 42, fontWeight: 700, textAlign: 'center' }}>
        Sonnet 5.5 va Haiku 5.5 — <span style={{ color: C.text }}>tez orada</span>
      </div>
    </Pop>
  </Scene>
);

export const OpusShort: React.FC = () => (
  <AbsoluteFill style={{ fontFamily }}>
    <Background />
    <Hook />
    <Chat />
    <Chart />
    <Price />
    <Speed />
    <Safety />
    <Where />
    <Cta />
    <Sequence from={0}>
      <Audio src={staticFile('opus/sfx.mp3')} />
    </Sequence>
  </AbsoluteFill>
);
