import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { fontFamily } from '../../fonts';
import T from './timeline.json';

// GTA 6 — "Everything confirmed" YouTube explainer (1920×1080, ~2.5 min, English).
// 2D only, all graphics original: synthwave sunset, generic skyline, kinetic text, charts.
// No Rockstar footage, logo, artwork or characters. Facts: Rockstar / Take-Two via press (see SCRIPT.md).

const S = T.scenes;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const C = { text: '#FFF7F0', dim: '#D9C6E8', pink: '#FF4FA3', orange: '#FF9F45', cyan: '#3EE0FF', purple: '#7B3FE4', card: 'rgba(20,8,40,0.55)', edge: 'rgba(255,255,255,0.18)', ok: '#5BF0A0' };
const SCENE_IDS = Object.keys(S) as (keyof typeof S)[];
const endOf = (id: keyof typeof S) => {
  const i = SCENE_IDS.indexOf(id);
  return i + 1 < SCENE_IDS.length ? S[SCENE_IDS[i + 1]] : T.total;
};

const sp = (f: number, at: number, damping = 14, stiffness = 140) => spring({ frame: f - at, fps: 30, config: { damping, stiffness } });
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const count = (f: number, a: number, b: number, to: number) => interpolate(f, [a, b], [0, to], { ...clamp, easing: ease });
const typed = (id: string, f: number) => {
  const t = T.typing.find((x) => x.id === id)!;
  return t.text.slice(0, Math.max(0, Math.floor(((f - t.start) * t.cps) / 30)));
};

const Pop: React.FC<{ at: number; from?: 'up' | 'left' | 'right' | 'zoom'; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, from = 'up', style, children }) => {
  const f = useCurrentFrame();
  const p = sp(f, at);
  const tr =
    from === 'zoom' ? `scale(${interpolate(p, [0, 1], [0.5, 1])})` :
    from === 'left' ? `translateX(${interpolate(p, [0, 1], [-120, 0])}px)` :
    from === 'right' ? `translateX(${interpolate(p, [0, 1], [120, 0])}px)` :
    `translateY(${interpolate(p, [0, 1], [60, 0])}px)`;
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: tr, ...style }}>{children}</div>;
};

// Scene wrapper: fade + slide in, slow push-in, fade out
const Scene: React.FC<{ id: keyof typeof S; children: React.ReactNode }> = ({ id, children }) => {
  const f = useCurrentFrame();
  const a = S[id];
  const b = endOf(id);
  if (f < a || f >= b) return null;
  const o = interpolate(f, [a, a + 12, b - 10, b], [0, 1, 1, 0], clamp);
  const x = interpolate(f, [a, a + 16], [80, 0], { ...clamp, easing: ease });
  const z = interpolate(f, [a, b], [1, 1.035], clamp);
  return <AbsoluteFill style={{ opacity: o, transform: `translateX(${x}px) scale(${z})`, justifyContent: 'center', alignItems: 'center' }}>{children}</AbsoluteFill>;
};

const Heading: React.FC<{ at: number; kicker: string; title: React.ReactNode }> = ({ at, kicker, title }) => (
  <div style={{ position: 'absolute', left: 140, top: 110 }}>
    <Pop at={at} from="left">
      <div style={{ color: C.cyan, fontSize: 30, fontWeight: 800, letterSpacing: 8 }}>{kicker}</div>
    </Pop>
    <Pop at={at + 6} from="left">
      <div style={{ color: C.text, fontSize: 78, fontWeight: 800, marginTop: 8, textShadow: '0 6px 30px rgba(0,0,0,0.5)' }}>{title}</div>
    </Pop>
  </div>
);

const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: C.card, border: `2px solid ${C.edge}`, borderRadius: 36, padding: '40px 50px', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), 0 30px 80px rgba(0,0,0,0.35)', ...style }}>{children}</div>
);
const Hi: React.FC<{ c?: string; children: React.ReactNode }> = ({ c = C.pink, children }) => <span style={{ color: c }}>{children}</span>;

// --- background: synthwave sunset, generic skyline, palms, perspective grid ---
const Background: React.FC = () => {
  const f = useCurrentFrame();
  const drift = (f * 0.25) % 1920;
  const buildings = Array.from({ length: 34 }, (_, i) => ({ w: 40 + ((i * 37) % 70), h: 120 + ((i * 89) % 260), x: i * 62 }));
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #12002B 0%, #3A0B5E 38%, #B0306E 62%, #FF8A4C 74%, #1A0530 74.2%, #0B0118 100%)' }}>
      {/* sun */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 800, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 960 - 260, top: 380, width: 520, height: 520, borderRadius: 999, background: 'linear-gradient(180deg, #FFE27A, #FF4FA3)', boxShadow: '0 0 160px rgba(255,120,120,0.6)', WebkitMaskImage: 'repeating-linear-gradient(180deg, #000 0 26px, transparent 26px 34px)' }} />
      </div>
      {/* skyline (two parallax layers) */}
      {[0, 1].map((layer) => (
        <div key={layer} style={{ position: 'absolute', left: -((drift * (layer ? 0.6 : 0.3)) % 2108), top: 0, width: 4300, height: 800 }}>
          {[...buildings, ...buildings.map((b) => ({ ...b, x: b.x + 2108 }))].map((b, i) => (
            <div key={i} style={{ position: 'absolute', left: b.x + layer * 25, top: 800 - b.h * (layer ? 0.75 : 1), width: b.w, height: b.h * (layer ? 0.75 : 1), background: layer ? '#1B0634' : '#2A0B47', boxShadow: layer ? 'none' : 'inset 0 0 0 2px rgba(255,79,163,0.12)' }} />
          ))}
        </div>
      ))}
      {/* palms (generic silhouettes) */}
      {[150, 1700].map((x, i) => (
        <svg key={i} style={{ position: 'absolute', left: x, top: 420 + Math.sin(f / 50 + i) * 3 }} width={240} height={400} viewBox="0 0 240 400">
          <path d="M120 400 C118 300 112 200 124 110" stroke="#0E0220" strokeWidth={14} fill="none" />
          {[-150, -110, -60, -20, 20, 70].map((a, k) => (
            <path key={k} d={`M124 110 q ${70 * Math.cos((a * Math.PI) / 180)} ${-30 + 50 * Math.sin((a * Math.PI) / 180)} ${120 * Math.cos((a * Math.PI) / 180)} ${40 + 60 * Math.sin((a * Math.PI) / 180)}`} stroke="#0E0220" strokeWidth={12} fill="none" strokeLinecap="round" />
          ))}
        </svg>
      ))}
      {/* grid floor */}
      <svg style={{ position: 'absolute', left: 0, top: 800 }} width={1920} height={280} viewBox="0 0 1920 280">
        {Array.from({ length: 21 }, (_, i) => (
          <line key={`v${i}`} x1={960 + (i - 10) * 30} y1={0} x2={960 + (i - 10) * 260} y2={280} stroke="rgba(255,79,163,0.35)" strokeWidth={2} />
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const t = ((i + (f % 40) / 40) / 8) ** 2;
          return <line key={`h${i}`} x1={0} x2={1920} y1={t * 280} y2={t * 280} stroke="rgba(62,224,255,0.3)" strokeWidth={2} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(5,0,15,0.65) 100%)' }} />
    </AbsoluteFill>
  );
};

// --- scenes ---
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const glow = interpolate(f, [200, 212, 240], [0, 1, 0.4], clamp);
  return (
    <Scene id="hook">
      <Pop at={30} from="zoom">
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: C.dim, fontSize: 56, fontWeight: 700 }}>In just</div>
          <div style={{ color: C.text, fontSize: 260, fontWeight: 800, lineHeight: 1, textShadow: `0 0 ${80 * glow}px ${C.pink}` }}>
            3 <Hi>DAYS</Hi>
          </div>
        </div>
      </Pop>
      <div style={{ marginTop: 30, fontSize: 64, fontWeight: 800, color: C.orange, letterSpacing: 6, minHeight: 80 }}>
        {typed('date', f)}
        <span style={{ color: C.cyan, opacity: Math.floor(f / 15) % 2 ? 0 : 1 }}>▍</span>
      </div>
    </Scene>
  );
};

const Title: React.FC = () => {
  const f = useCurrentFrame();
  const p = sp(f, 260, 10, 120);
  return (
    <Scene id="title">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 300, fontWeight: 800, color: C.text, lineHeight: 1, transform: `scale(${interpolate(p, [0, 1], [3, 1])})`, opacity: Math.min(1, p * 2), letterSpacing: 10, textShadow: `0 0 60px ${C.pink}` }}>
          GTA <Hi>6</Hi>
        </div>
        <div style={{ marginTop: 30, fontSize: 64, fontWeight: 700, color: C.cyan, minHeight: 80 }}>{typed('title', f)}</div>
      </div>
    </Scene>
  );
};

const Wait: React.FC = () => {
  const f = useCurrentFrame();
  const bar = interpolate(f, [560, 690], [0, 1], { ...clamp, easing: ease });
  const years = Math.round(count(f, 560, 690, 13));
  return (
    <Scene id="wait">
      <Heading at={490} kicker="THE LONGEST WAIT" title={<>13 years between games</>} />
      <div style={{ position: 'relative', width: 1400, height: 300, marginTop: 120 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 140, height: 16, borderRadius: 9, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ position: 'absolute', left: 0, width: `${bar * 100}%`, top: 140, height: 16, borderRadius: 9, background: `linear-gradient(90deg, ${C.cyan}, ${C.pink})`, boxShadow: `0 0 30px ${C.pink}` }} />
        <div style={{ position: 'absolute', left: -60, top: 0 }}>
          <Pop at={520}>
            <div style={{ textAlign: 'center', width: 120 }}>
              <div style={{ fontSize: 34, color: C.dim, fontWeight: 700 }}>GTA 5</div>
              <div style={{ fontSize: 64, color: C.text, fontWeight: 800 }}>2013</div>
            </div>
          </Pop>
        </div>
        <div style={{ position: 'absolute', right: -60, top: 0 }}>
          <Pop at={560}>
            <div style={{ textAlign: 'center', width: 120 }}>
              <div style={{ fontSize: 34, color: C.dim, fontWeight: 700 }}>GTA 6</div>
              <div style={{ fontSize: 64, color: C.pink, fontWeight: 800 }}>2026</div>
            </div>
          </Pop>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center', fontSize: 110, fontWeight: 800, color: C.text }}>
          {years} <Hi c={C.orange}>years</Hi>
        </div>
      </div>
    </Scene>
  );
};

const BARS = [
  { name: 'GTA 6 Trailer 1', sub: 'most viewed game reveal', v: 90.4, at: 1180, c: C.pink },
  { name: 'Previous non-music record', sub: 'YouTube, 24 hours', v: 59.4, at: 1200, c: '#7E6A9E' },
  { name: 'Overall record (music video)', sub: 'YouTube, 24 hours', v: 108.2, at: 1220, c: '#4B3D66' },
];
const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Scene id="trailer">
      <Heading at={970} kicker="DECEMBER 2023 · TRAILER 1" title={<>A world record in 24 hours</>} />
      <div style={{ display: 'flex', gap: 80, alignItems: 'center', marginTop: 150 }}>
        <Pop at={1000} from="left">
          <Card style={{ width: 640, textAlign: 'center' }}>
            <div style={{ fontSize: 34, color: C.dim, fontWeight: 700 }}>Views in the first 24 hours</div>
            <div style={{ fontSize: 104, color: C.text, fontWeight: 800, marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>{fmt(count(f, 1000, 1130, 90421491))}</div>
            <div style={{ fontSize: 30, color: C.cyan, fontWeight: 700, marginTop: 6 }}>Guinness World Record</div>
          </Card>
        </Pop>
        <div style={{ width: 760 }}>
          {BARS.map((b) => (
            <div key={b.name} style={{ marginBottom: 34, opacity: f >= b.at ? 1 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 700, color: C.text }}>
                <span>{b.name}</span>
                <span style={{ color: b.c === C.pink ? C.pink : C.dim }}>{count(f, b.at, b.at + 60, b.v).toFixed(1)}M</span>
              </div>
              <div style={{ height: 34, marginTop: 10, borderRadius: 17, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ height: 34, borderRadius: 17, width: `${(count(f, b.at, b.at + 60, b.v) / 110) * 100}%`, background: b.c, boxShadow: b.c === C.pink ? `0 0 30px ${C.pink}` : 'none' }} />
              </div>
              <div style={{ fontSize: 22, color: C.dim, marginTop: 6 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </Scene>
  );
};

const NODES = [
  { label: '2025', sub: 'First promised · Dec 2023', at: 1540, struck: 1660 },
  { label: 'May 26, 2026', sub: 'Delay 1 · May 2, 2025', at: 1660, struck: 1820 },
  { label: 'Nov 19, 2026', sub: 'Delay 2 · Nov 6, 2025', at: 1820, struck: 99999 },
];
const Delays: React.FC = () => {
  const f = useCurrentFrame();
  const line = interpolate(f, [1540, 1840], [0, 1], { ...clamp, easing: ease });
  const finalGlow = interpolate(f, [1980, 2000, 2060, 2080], [0, 1, 1, 0.6], clamp);
  return (
    <Scene id="delays">
      <Heading at={1510} kicker="RELEASE DATE HISTORY" title={<>Two delays</>} />
      <div style={{ position: 'relative', width: 1500, height: 320, marginTop: 130 }}>
        <div style={{ position: 'absolute', left: 120, top: 60, width: 1260 * line, height: 8, background: `linear-gradient(90deg, ${C.purple}, ${C.pink})`, borderRadius: 4 }} />
        {NODES.map((n, i) => {
          const x = 120 + i * 630;
          const s = interpolate(f, [n.struck, n.struck + 12], [0, 100], clamp);
          const last = i === NODES.length - 1;
          return (
            <div key={n.label} style={{ position: 'absolute', left: x - 180, top: 0, width: 360, textAlign: 'center' }}>
              <Pop at={n.at} from="zoom">
                <div style={{ margin: '40px auto 0', width: 48, height: 48, borderRadius: 99, background: last ? C.pink : C.text, boxShadow: last ? `0 0 ${50 * finalGlow}px ${C.pink}` : 'none' }} />
                <div style={{ position: 'relative', display: 'inline-block', marginTop: 34, fontSize: 60, fontWeight: 800, color: last ? C.pink : C.text, opacity: s > 0 ? 0.55 : 1 }}>
                  {n.label}
                  <div style={{ position: 'absolute', left: 0, top: '52%', height: 7, width: `${s}%`, background: C.orange, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 28, color: C.dim, marginTop: 10 }}>{n.sub}</div>
              </Pop>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

const Platform: React.FC<{ at: number; name: string; note: string; dashed?: boolean }> = ({ at, name, note, dashed }) => (
  <Pop at={at} from="up">
    <Card style={{ width: 430, height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: dashed ? `3px dashed ${C.dim}` : `2px solid ${C.edge}`, background: dashed ? 'rgba(20,8,40,0.25)' : C.card }}>
      <div style={{ fontSize: 60, fontWeight: 800, color: dashed ? C.dim : C.text, textAlign: 'center' }}>{name}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: dashed ? C.orange : C.ok, marginTop: 18 }}>{note}</div>
    </Card>
  </Pop>
);
const Platforms: React.FC = () => (
  <Scene id="platforms">
    <Heading at={2170} kicker="PLATFORMS" title={<>Consoles first</>} />
    <div style={{ display: 'flex', gap: 60, marginTop: 140 }}>
      <Platform at={2200} name="PlayStation 5" note="✓ Launch day" />
      <Platform at={2240} name="Xbox Series X|S" note="✓ Launch day" />
      <Platform at={2290} name="PC" note="Not announced" dashed />
    </div>
  </Scene>
);

const Price: React.FC = () => {
  const f = useCurrentFrame();
  const disc = interpolate(f, [2880, 2900], [0, 1], clamp);
  return (
    <Scene id="price">
      <Heading at={2650} kicker="PRICE (US)" title={<>What it costs</>} />
      <div style={{ display: 'flex', gap: 60, alignItems: 'stretch', marginTop: 150 }}>
        {[
          { at: 2680, name: 'Standard Edition', v: 79.99 },
          { at: 2740, name: 'Ultimate Edition', v: 99.99 },
        ].map((p) => (
          <Pop key={p.name} at={p.at} from="up">
            <Card style={{ width: 460, textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: C.dim, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 120, color: C.text, fontWeight: 800, marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>${count(f, p.at, p.at + 50, p.v).toFixed(2)}</div>
            </Card>
          </Pop>
        ))}
        <Pop at={2860} from="right">
          <Card style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={150} height={150} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={40} fill="none" stroke={C.dim} strokeWidth={6} />
              <circle cx={50} cy={50} r={10} fill="none" stroke={C.dim} strokeWidth={6} />
              <line x1={18} y1={18} x2={18 + 64 * disc} y2={18 + 64 * disc} stroke={C.orange} strokeWidth={8} strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 40, color: C.text, fontWeight: 800, marginTop: 16, textAlign: 'center' }}>No disc in the box</div>
            <div style={{ fontSize: 28, color: C.dim, marginTop: 6 }}>download code only</div>
          </Card>
        </Pop>
      </div>
    </Scene>
  );
};

// Schematic map: labels only, positions are illustrative (not the real map)
const REGIONS = [
  { name: 'Mount Kalaga', x: 300, y: 70, at: 3260 },
  { name: 'Ambrosia', x: 560, y: 150, at: 3290 },
  { name: 'Port Gellhorn', x: 140, y: 230, at: 3320 },
  { name: 'Grassrivers', x: 460, y: 330, at: 3350 },
  { name: 'Vice City', x: 690, y: 420, at: 3380, hi: true },
  { name: 'Leonida Keys', x: 420, y: 560, at: 3410 },
];
const Setting: React.FC = () => {
  const f = useCurrentFrame();
  const outline = interpolate(f, [3220, 3300], [1, 0], clamp);
  return (
    <Scene id="setting">
      <Heading at={3190} kicker="SETTING & STORY" title={<>Welcome to <Hi>Leonida</Hi></>} />
      <div style={{ display: 'flex', gap: 80, alignItems: 'center', marginTop: 160 }}>
        <div style={{ position: 'relative', width: 860, height: 640 }}>
          <svg width={860} height={640} viewBox="0 0 860 640" style={{ position: 'absolute', inset: 0 }}>
            <path d="M80 40 L620 40 L720 300 L760 470 L700 520 L560 600 L380 620 L300 520 L120 360 Z" fill="rgba(123,63,228,0.18)" stroke={C.cyan} strokeWidth={4} strokeDasharray={2600} strokeDashoffset={2600 * outline} strokeLinejoin="round" />
          </svg>
          {REGIONS.map((r) => {
            const p = sp(f, r.at, 12);
            const pulse = r.hi ? 1 + 0.25 * Math.max(0, Math.sin((f - r.at) / 8)) : 1;
            return (
              <div key={r.name} style={{ position: 'absolute', left: r.x, top: r.y, transform: `translate(-50%, -50%) scale(${p})`, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: 99, background: r.hi ? C.pink : C.cyan, transform: `scale(${pulse})`, boxShadow: `0 0 20px ${r.hi ? C.pink : C.cyan}` }} />
                <div style={{ fontSize: r.hi ? 40 : 30, fontWeight: 800, color: r.hi ? C.pink : C.text, whiteSpace: 'nowrap' }}>{r.name}</div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 0, bottom: -40, fontSize: 22, color: C.dim }}>Schematic — not the real map</div>
        </div>
        <div style={{ width: 620 }}>
          {[
            { at: 3480, name: 'Jason Duval', note: 'Playable lead' },
            { at: 3520, name: 'Lucia Caminos', note: 'First female lead in a main GTA' },
          ].map((c) => (
            <Pop key={c.name} at={c.at} from="right" style={{ marginBottom: 30 }}>
              <Card>
                <div style={{ fontSize: 54, fontWeight: 800, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: c.name.startsWith('Lucia') ? C.pink : C.cyan, marginTop: 8 }}>{c.note}</div>
              </Card>
            </Pop>
          ))}
        </div>
      </div>
    </Scene>
  );
};

const Preload: React.FC = () => {
  const f = useCurrentFrame();
  const pct = Math.round(count(f, 3770, 3860, 100));
  return (
    <Scene id="preload">
      <Heading at={3730} kicker="LAUNCH WEEK" title={<>Ready to download</>} />
      <div style={{ display: 'flex', gap: 60, marginTop: 150 }}>
        <Pop at={3760} from="left">
          <Card style={{ width: 760 }}>
            <div style={{ fontSize: 36, color: C.dim, fontWeight: 700 }}>Digital preload · opened Nov 12</div>
            <div style={{ height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.1)', marginTop: 26, overflow: 'hidden' }}>
              <div style={{ height: 40, width: `${pct}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.ok})` }} />
            </div>
            <div style={{ fontSize: 80, fontWeight: 800, color: pct === 100 ? C.ok : C.text, marginTop: 18 }}>{pct}%</div>
          </Card>
        </Pop>
        <Pop at={3880} from="right">
          <Card style={{ width: 560 }}>
            <div style={{ fontSize: 36, color: C.dim, fontWeight: 700 }}>At launch</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: C.text, marginTop: 14 }}>Single-player</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: C.orange, marginTop: 10 }}>Online: coming later</div>
          </Card>
        </Pop>
      </div>
    </Scene>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const sub = sp(f, 4440, 10, 160);
  const pulse = 1 + 0.06 * Math.max(0, Math.sin(((f - 4470) / 20) * Math.PI)) * (f > 4470 ? 1 : 0);
  return (
    <Scene id="cta">
      <div style={{ textAlign: 'center' }}>
        <Pop at={4180}>
          <div style={{ fontSize: 44, color: C.dim, fontWeight: 700 }}>GTA 5 has sold around</div>
        </Pop>
        <div style={{ fontSize: 200, fontWeight: 800, color: C.text, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(count(f, 4190, 4330, 235))}M
        </div>
        <Pop at={4330}>
          <div style={{ fontSize: 64, fontWeight: 800, color: C.pink }}>Can GTA 6 beat it?</div>
        </Pop>
        <div style={{ marginTop: 50, display: 'inline-block', padding: '28px 70px', borderRadius: 999, background: '#FF2D55', color: '#fff', fontSize: 52, fontWeight: 800, opacity: sub, transform: `scale(${(0.6 + 0.4 * sub) * pulse})`, boxShadow: '0 20px 60px rgba(255,45,85,0.5)' }}>Subscribe</div>
      </div>
    </Scene>
  );
};

type VoiceScene = { id?: string; ovozFayl?: string };
export const Gta6Explainer: React.FC<{ scenes?: VoiceScene[] }> = ({ scenes = [] }) => {
  const voiced = scenes.some((v) => v.ovozFayl);
  return (
    <AbsoluteFill style={{ fontFamily, overflow: 'hidden' }}>
      <Background />
      <Hook />
      <Title />
      <Wait />
      <Trailer />
      <Delays />
      <Platforms />
      <Price />
      <Setting />
      <Preload />
      <Cta />
      <Sequence from={0}>
        <Audio src={staticFile('gta6/sfx.mp3')} volume={voiced ? 0.4 : 1} />
      </Sequence>
      {scenes.map((v, i) => {
        const id = (v.id ?? SCENE_IDS[i]) as keyof typeof S;
        return v.ovozFayl && S[id] !== undefined ? (
          <Sequence key={i} from={S[id] + 10}>
            <Audio src={staticFile(v.ovozFayl)} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
