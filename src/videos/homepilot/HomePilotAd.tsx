import React from 'react';
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { fontFamily } from '../../fonts';
import T from './timeline.json';

// HomePilot — 60 s English Shorts (1080×1920), 2D glassmorphism, telefon ramkasisiz (ekranning o'zi). App screens redrawn from the app code
// (Home-pilot/App.tsx, demo data and theme). Voice: videos/homepilot-reklama.json (scripts/ovoz.mjs).

const C = {
  bg: '#070E1C', elev: 'rgba(255,255,255,0.08)', card: 'rgba(255,255,255,0.07)', soft: 'rgba(255,255,255,0.10)', line: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF', text2: '#E2E8F0', muted: '#A8B9CC', blue: '#3B82F6', bright: '#60A5FA', green: '#34D399', amber: '#FBBF24',
};
const S = T.scenes;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
// Glassmorphism (2D): shaffof karta, fon xiralashadi, yupqa yorug' chet, ichki yaltiroq
const G: React.CSSProperties = {
  background: C.card,
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.25)',
};

const typing = (id: string) => T.typing.find((t) => t.id === id)!;
const typed = (id: string, f: number) => {
  const t = typing(id);
  return t.text.slice(0, Math.max(0, Math.floor(((f - t.start) * t.cps) / T.fps)));
};
const typedEnd = (id: string) => {
  const t = typing(id);
  return t.start + Math.ceil((t.text.length * T.fps) / t.cps);
};

const usePop = (at: number, damping = 16) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - at, fps, config: { damping, stiffness: 140 } });
};

const Pop: React.FC<{ at: number; from?: 'up' | 'left' | 'right' | 'zoom'; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, from = 'up', style, children }) => {
  const p = usePop(at);
  const tr =
    from === 'zoom' ? `scale(${interpolate(p, [0, 1], [0.6, 1])})` :
    from === 'left' ? `translateX(${interpolate(p, [0, 1], [-60, 0])}px)` :
    from === 'right' ? `translateX(${interpolate(p, [0, 1], [60, 0])}px)` :
    `translateY(${interpolate(p, [0, 1], [30, 0])}px)`;
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: tr, ...style }}>{children}</div>;
};

const Cursor: React.FC<{ color?: string }> = ({ color = C.bright }) => {
  const f = useCurrentFrame();
  return <span style={{ opacity: Math.floor(f / 15) % 2 ? 0 : 1, color }}>▍</span>;
};

// --- simple line icons (SVG) ---
type IconName = 'home' | 'snow' | 'water' | 'roof' | 'pipe' | 'check' | 'circle' | 'doc' | 'wallet' | 'spark' | 'receipt' | 'plus' | 'calendar' | 'building';
const Icon: React.FC<{ name: IconName; size?: number; color?: string }> = ({ name, size = 20, color = C.blue }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const d: Record<IconName, React.ReactNode> = {
    home: <path {...p} d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />,
    building: <path {...p} d="M4 21V5l8-2v18M12 8h8v13M8 8h0M8 12h0M8 16h0M16 12h0M16 16h0" />,
    snow: <path {...p} d="M12 2v20M4 6l16 12M20 6 4 18" />,
    water: <path {...p} d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z" />,
    roof: <path {...p} d="M2 12 12 4l10 8M5 10v10h14V10" />,
    pipe: <path {...p} d="M4 8h10a4 4 0 0 1 4 4v8M4 4v8M14 20h8" />,
    check: <><circle cx={12} cy={12} r={10} fill={color} /><path d="m7 12 3.5 3.5L17 9" fill="none" stroke={C.bg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></>,
    circle: <circle {...p} cx={12} cy={12} r={10} />,
    doc: <path {...p} d="M6 2h8l5 5v15H6zM14 2v5h5M9 13h7M9 17h7" />,
    wallet: <path {...p} d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3zM3 7l13-4v4M16 13h2" />,
    spark: <path {...p} d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
    receipt: <path {...p} d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" />,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    calendar: <path {...p} d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{d[name]}</svg>;
};

// --- app pieces in app units (the phone scales them ×2) ---
const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ ...G, borderRadius: 18, padding: 16, marginBottom: 10, ...style }}>{children}</div>
);
const Title: React.FC<{ children: React.ReactNode; done?: boolean }> = ({ children, done }) => (
  <div style={{ fontSize: 15, fontWeight: 700, color: done ? C.muted : C.text, textDecoration: done ? 'line-through' : 'none' }}>{children}</div>
);
const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{children}</div>;
const SectionHead: React.FC<{ title: string; right?: string }> = ({ title, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px' }}>
    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{title}</div>
    {right ? <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{right}</div> : null}
  </div>
);
const IconBox: React.FC<{ name: IconName }> = ({ name }) => (
  <div style={{ width: 40, height: 40, borderRadius: 12, background: C.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <Icon name={name} size={21} />
  </div>
);
const Row: React.FC<{ icon: IconName; title: string; sub: string; right?: React.ReactNode; at: number }> = ({ icon, title, sub, right, at }) => (
  <Pop at={at} from="right">
    <Card style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconBox name={icon} />
        <div style={{ flex: 1 }}>
          <Title>{title}</Title>
          <Sub>{sub}</Sub>
        </div>
        {right}
      </div>
    </Card>
  </Pop>
);
const Heading: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <>
    <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginTop: 4 }}>{title}</div>
    <div style={{ fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 8 }}>{sub}</div>
  </>
);
const Stats: React.FC<{ items: [string, string][]; at: number }> = ({ items, at }) => (
  <Pop at={at}>
    <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
      {items.map(([l, v]) => (
        <div key={l} style={{ flex: 1, ...G, borderRadius: 15, padding: 12 }}>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 800, letterSpacing: 0.5 }}>{l}</div>
          <div style={{ fontSize: 15, color: C.text, fontWeight: 800, marginTop: 6 }}>{v}</div>
        </div>
      ))}
    </div>
  </Pop>
);

type Tab = 'Home' | 'My Home' | 'Maintenance' | 'Documents' | 'Budget' | 'Ask AI';
const TABS: [Tab, IconName][] = [['Home', 'home'], ['My Home', 'building'], ['Maintenance', 'calendar'], ['Documents', 'doc'], ['Budget', 'wallet'], ['Ask AI', 'spark']];

const TopBar: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
    <Img src={staticFile('homepilot/logo.png')} style={{ width: 32, height: 32 }} />
    <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: C.text }}>
      HOME<span style={{ color: C.blue }}>PILOT</span>
    </div>
    <div style={{ background: C.soft, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: C.muted }}>DEMO</div>
  </div>
);
const NavBar: React.FC<{ tab: Tab }> = ({ tab }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 68, background: C.elev, borderTop: `1px solid ${C.line}`, display: 'flex' }}>
    {TABS.map(([t, ic]) => (
      <div key={t} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Icon name={ic} size={20} color={t === tab ? C.blue : C.muted} />
        <div style={{ fontSize: 10, color: t === tab ? C.blue : C.muted, fontWeight: t === tab ? 700 : 500 }}>{t}</div>
      </div>
    ))}
  </div>
);

// Finger tap: ring + dot at app coordinates
const Tap: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < -12 || t > 22) return null;
  const dot = interpolate(t, [-12, -2, 6, 22], [0, 1, 1, 0], clamp);
  const ring = interpolate(t, [0, 18], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -30 * ring - 12, top: -30 * ring - 12, width: 24 + 60 * ring, height: 24 + 60 * ring, borderRadius: 999, border: '3px solid rgba(255,255,255,0.8)', opacity: (1 - ring) * (t >= 0 ? 1 : 0) }} />
      <div style={{ position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 999, background: 'rgba(255,255,255,0.55)', opacity: dot }} />
    </div>
  );
};

// --- screens ---
const HomeScreen: React.FC = () => {
  const f = useCurrentFrame();
  const score = Math.round(interpolate(f, [S.dash + 40, S.dash + 120], [0, 80], { ...clamp, easing: ease }));
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 16px' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 1 }}>YOUR HOME AT A GLANCE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginTop: 4 }}>Good morning</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>A little care goes a long way.</div>
        </div>
      </div>
      <Pop at={S.dash + 12}>
        <div style={{ ...G, borderRadius: 20, padding: 18, display: 'flex', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 1 }}>YOUR HOME</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 4 }}>Desert Haven</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Phoenix, AZ · 3 bed · 2 bath</div>
            <div style={{ marginTop: 12, background: C.blue, display: 'inline-block', padding: '8px 14px', borderRadius: 12, color: C.text, fontWeight: 700, fontSize: 13 }}>View home →</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <Icon name="home" size={58} color={C.bright} />
          </div>
        </div>
      </Pop>
      <SectionHead title="Home health" />
      <Pop at={S.dash + 40}>
        <Card>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <svg width={64} height={64} viewBox="0 0 64 64">
              <circle cx={32} cy={32} r={28} stroke={C.elev} strokeWidth={5} fill="none" />
              <circle cx={32} cy={32} r={28} stroke={C.green} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={176} strokeDashoffset={176 * (1 - score / 100)} transform="rotate(-90 32 32)" />
              <text x={32} y={37} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.text}>{score}%</text>
            </svg>
            <div style={{ flex: 1 }}>
              <Title>Your home care overview</Title>
              <Sub>4 systems on record · 0 tasks completed</Sub>
              <div style={{ height: 6, background: C.elev, borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: 6, background: C.blue }} />
              </div>
            </div>
          </div>
        </Card>
      </Pop>
      <SectionHead title="Quick actions" />
      <Pop at={S.dash + 80}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          {([['plus', 'Add system'], ['doc', 'Add document'], ['wallet', 'Add expense'], ['calendar', 'Add task']] as [IconName, string][]).map(([ic, l]) => (
            <div key={l} style={{ width: 'calc(50% - 5px)', ...G, borderRadius: 16, padding: 14, minHeight: 88, boxSizing: 'border-box' }}>
              <IconBox name={ic} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </Pop>
      <SectionHead title="Coming up next" right="See all" />
      <TaskList at={S.dash + 160} limit={3} />
    </>
  );
};

const TASKS = [
  { title: 'Replace HVAC air filter', due: '2026-11-23', cat: 'HVAC' },
  { title: 'Flush water heater', due: '2026-12-05', cat: 'Water heater' },
  { title: 'Test smoke and CO alarms', due: '2026-12-11', cat: 'Safety' },
  { title: 'Inspect roof and gutters', due: '2027-02-09', cat: 'Roof' },
];
const CHECK_AT = S.tasks + 95; // first task is checked off here

const TaskList: React.FC<{ at: number; limit?: number; checkable?: boolean }> = ({ at, limit = 4, checkable }) => {
  const f = useCurrentFrame();
  return (
    <>
      {TASKS.slice(0, limit).map((t, i) => {
        const done = checkable && i === 0 && f >= CHECK_AT;
        const pop = checkable && i === 0 ? interpolate(f, [CHECK_AT, CHECK_AT + 5, CHECK_AT + 12], [1, 1.35, 1], clamp) : 1;
        return (
          <Pop key={t.title} at={at + i * 12} from="right">
            <Card style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ transform: `scale(${pop})` }}>
                  <Icon name={done ? 'check' : 'circle'} size={24} color={done ? C.green : C.muted} />
                </div>
                <div style={{ flex: 1 }}>
                  <Title done={done}>{t.title}</Title>
                  <Sub>{t.cat} · Due {t.due}</Sub>
                </div>
              </div>
            </Card>
          </Pop>
        );
      })}
    </>
  );
};

const SystemsScreen: React.FC = () => (
  <>
    <Heading title="My Home" sub="Keep every home system and service detail together." />
    <Pop at={S.systems + 14}>
      <div style={{ margin: '12px 0', ...G, borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="home" size={22} />
        <div style={{ flex: 1 }}>
          <Title>Desert Haven</Title>
          <Sub>Phoenix, AZ 85001 · Single-family · 3 bed · 2 bath</Sub>
        </div>
      </div>
    </Pop>
    <SectionHead title="Home systems · 4" right="+ Add system" />
    <Row at={S.systems + 40} icon="snow" title="Central HVAC" sub="HVAC · Last serviced Sep 12, 2026" />
    <Row at={S.systems + 55} icon="water" title="Tank water heater" sub="Water heater · Warranty through 2028" />
    <Row at={S.systems + 70} icon="roof" title="Asphalt shingle roof" sub="Roof · Inspection due next spring" />
    <Row at={S.systems + 85} icon="pipe" title="Main plumbing" sub="Plumbing · No issues reported" />
  </>
);

const TasksScreen: React.FC = () => {
  const f = useCurrentFrame();
  const done = f >= CHECK_AT ? 1 : 0;
  return (
    <>
      <Heading title="Maintenance plan" sub="Stay ahead of routine home care." />
      <Stats at={S.tasks + 40} items={[['TOTAL TASKS', '4'], ['COMPLETED', String(done)], ['UPCOMING', String(4 - done)]]} />
      <SectionHead title="Your maintenance tasks" right="+ Add task" />
      <TaskList at={S.tasks + 60} checkable />
    </>
  );
};

const EXPENSES = [
  { title: 'HVAC seasonal service', amount: 185, cat: 'Maintenance', date: '2026-09-12' },
  { title: 'Kitchen faucet repair', amount: 240, cat: 'Repair', date: '2026-08-21' },
  { title: 'Water heater inspection', amount: 95, cat: 'Maintenance', date: '2026-06-02' },
];
const MoneyScreen: React.FC = () => {
  const f = useCurrentFrame();
  const total = Math.round(interpolate(f, [S.money + 100, S.money + 170], [0, 520], { ...clamp, easing: ease }));
  return (
    <>
      <Heading title="Documents" sub="Keep receipts, warranties and inspection records organized." />
      <Row at={S.money + 40} icon="doc" title="HVAC installation warranty.pdf" sub="Warranty · Sep 12, 2026" />
      <Row at={S.money + 55} icon="doc" title="Water heater receipt.pdf" sub="Receipt · Jun 02, 2026" />
      <Row at={S.money + 70} icon="doc" title="Roof inspection report.pdf" sub="Inspection · Mar 18, 2026" />
      <Pop at={S.money + 140}>
        <div style={{ ...G, borderRadius: 20, padding: 18, marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 1 }}>RECORDED EXPENSES</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.text, marginTop: 6 }}>${total.toLocaleString('en-US')}.00</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>3 records · Maintenance $280 · Repairs $240</div>
        </div>
      </Pop>
      {EXPENSES.map((e, i) => (
        <Row key={e.title} at={S.money + 150 + i * 10} icon="receipt" title={e.title} sub={`${e.cat} · ${e.date}`} right={<div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>${e.amount}.00</div>} />
      ))}
    </>
  );
};

const AskScreen: React.FC = () => {
  const f = useCurrentFrame();
  const sent = f >= typedEnd('ask') + 6;
  const bubble = (me: boolean, children: React.ReactNode) => (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 290, ...(me ? {} : G), background: me ? C.blue : C.card, color: C.text, borderRadius: 18, padding: '12px 14px', fontSize: 14, lineHeight: 1.45, marginBottom: 10 }}>{children}</div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
      <Heading title="Ask AI" sub="Questions about your home, tasks and spending." />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: 12 }}>
        {sent ? bubble(true, typing('ask').text) : null}
        {sent ? (
          <Pop at={typedEnd('ask') + 24} from="left" style={{ alignSelf: 'flex-start' }}>
            {bubble(false, (
              <>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Coming up next:</div>
                {TASKS.map((t) => (
                  <div key={t.title}>• {t.title} — {t.due}</div>
                ))}
              </>
            ))}
          </Pop>
        ) : null}
      </div>
      <div style={{ ...G, border: `1px solid ${C.line}`, borderRadius: 16, padding: '12px 14px', fontSize: 14, color: sent || f < typing('ask').start ? C.muted : C.text, display: 'flex', justifyContent: 'space-between' }}>
        <span>
          {sent || f < typing('ask').start ? 'Ask about your home…' : typed('ask', f)}
          {!sent && f >= typing('ask').start ? <Cursor /> : null}
        </span>
        <span style={{ color: C.blue, fontWeight: 800 }}>↑</span>
      </div>
    </div>
  );
};

// Which screen the phone shows, and how far it is scrolled (app units)
const screenAt = (f: number): { tab: Tab; el: React.ReactNode; scroll: number } => {
  if (f < S.systems) return { tab: 'Home', el: <HomeScreen />, scroll: interpolate(f, [S.dash + 140, S.dash + 230], [0, 330], { ...clamp, easing: ease }) };
  if (f < S.tasks) return { tab: 'My Home', el: <SystemsScreen />, scroll: 0 };
  if (f < S.money) return { tab: 'Maintenance', el: <TasksScreen />, scroll: 0 };
  if (f < S.ask) return { tab: 'Documents', el: <MoneyScreen />, scroll: interpolate(f, [S.money + 105, S.money + 160], [0, 300], { ...clamp, easing: ease }) };
  return { tab: 'Ask AI', el: <AskScreen />, scroll: 0 };
};

const K = 2.5; // app unit → video px (390 × 2.5 = 975: deyarli butun kenglik)
const TOP = 64; // ilova kontenti boshlanishi (app units)
const SCREEN_W = 390 * K;
// Telefon ramkasi yo'q: ilova ekranining o'zi — katta shisha panel
const Screen: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.dash - 10 || f >= S.cta + 10) return null;
  const inP = interpolate(f, [S.dash - 10, S.dash + 16], [0, 1], { ...clamp, easing: ease });
  const outP = interpolate(f, [S.cta - 8, S.cta + 10], [0, 1], clamp);
  const { tab, el, scroll } = screenAt(f);
  const zoom = 1 + 0.025 * Math.sin((f - S.dash) / 70);
  const starts = [S.systems, S.tasks, S.money, S.ask];
  const fade = Math.min(1, ...starts.map((s) => Math.min(1, Math.abs(f - s) / 6)));
  const sweep = interpolate((f - S.dash) % 240, [0, 60], [-40, 140], clamp); // nur o'tishi
  return (
    <div style={{ position: 'absolute', left: (1080 - SCREEN_W) / 2, top: 360, width: SCREEN_W, height: 1700, transform: `translateY(${(1 - inP) * 400 + outP * 500}px) scale(${(0.94 + 0.06 * inP) * zoom})`, opacity: inP * (1 - outP), transformOrigin: '50% 20%' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 830, borderRadius: 28, overflow: 'hidden', transform: `scale(${K})`, transformOrigin: '0 0', background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 30px 80px rgba(0,0,0,0.45)' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(115deg, transparent ${sweep}%, rgba(255,255,255,0.07) ${sweep + 6}%, transparent ${sweep + 12}%)`, pointerEvents: 'none' }} />
        <div style={{ height: 8 }} />
        <TopBar />
        <div style={{ position: 'absolute', top: TOP, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0 16px', transform: `translateY(${-scroll}px)`, opacity: fade }}>{el}</div>
        </div>
        <NavBar tab={tab} />
        <Tap at={S.systems + 150} x={330} y={TOP + 197} />
        <Tap at={CHECK_AT} x={44} y={TOP + 221} />
        <Tap at={typedEnd('ask') + 4} x={360} y={TOP + 480 - 24} />
      </div>
    </div>
  );
};

// --- captions above the phone (kinetic) ---
const Caption: React.FC<{ from: number; to: number; text: string; hi?: string }> = ({ from, to, text, hi }) => {
  const f = useCurrentFrame();
  if (f < from - 2 || f >= to) return null;
  const words = text.split(' ');
  const out = interpolate(f, [to - 10, to], [1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 150, textAlign: 'center', opacity: out }}>
      {words.map((w, i) => {
        const p = spring({ frame: f - from - i * 3, fps: 30, config: { damping: 18, stiffness: 160 } });
        const isHi = hi && w.replace(/[.,]/g, '') === hi;
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: 18, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, color: isHi ? C.bright : C.text, fontSize: 68, fontWeight: 800, lineHeight: 1.15 }}>{w}</span>
        );
      })}
    </div>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= S.problem) return null;
  const out = interpolate(f, [S.problem - 10, S.problem], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 80px 280px', opacity: out }}>
      <div style={{ color: C.muted, fontSize: 60, fontWeight: 700, textAlign: 'center', minHeight: 90 }}>
        {typed('hook', f)}
        {f < typedEnd('hook') + 12 ? <Cursor /> : null}
      </div>
      <Pop at={72} from="zoom">
        <div style={{ color: C.text, fontSize: 110, fontWeight: 800, textAlign: 'center', lineHeight: 1.05, marginTop: 40 }}>
          Who's keeping <span style={{ color: C.bright }}>track?</span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

const NOTES = [
  { t: 'Where is the receipt?', x: 120, y: 520, r: -6, at: 180 },
  { t: 'Warranty expired?', x: 520, y: 700, r: 5, at: 200 },
  { t: 'Last HVAC service?', x: 150, y: 930, r: 4, at: 220 },
  { t: 'Roof check… when?', x: 500, y: 1140, r: -5, at: 240 },
];
const Problem: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.problem - 2 || f >= S.reveal) return null;
  const out = interpolate(f, [S.reveal - 12, S.reveal], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Caption from={S.problem + 4} to={S.reveal} text="Lost receipts. Forgotten service dates." hi="Forgotten" />
      {NOTES.map((n, i) => {
        const p = spring({ frame: f - n.at, fps: 30, config: { damping: 12, stiffness: 150 } });
        const drift = Math.sin((f + i * 20) / 18) * 8;
        return (
          <div key={n.t} style={{ position: 'absolute', left: n.x, top: n.y + drift, transform: `rotate(${n.r}deg) scale(${p})`, background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(18px)', border: '1.5px solid rgba(251,191,36,0.55)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), 0 20px 50px rgba(0,0,0,0.45)', color: C.text, padding: '34px 38px', borderRadius: 36, fontSize: 46, fontWeight: 800, width: 400 }}>{n.t}</div>
        );
      })}
    </AbsoluteFill>
  );
};

const Logo: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const p = usePop(at, 12);
  return (
    <div style={{ width: size * 1.35, height: size * 1.35, borderRadius: size * 0.36, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${p})`, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.22)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 30px 80px rgba(59,130,246,0.35)' }}>
      <Img src={staticFile('homepilot/logo.png')} style={{ width: size, height: size, filter: 'drop-shadow(0 0 30px rgba(96,165,250,0.6))' }} />
    </div>
  );
};
const Wordmark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ fontSize: size, fontWeight: 800, color: C.text, letterSpacing: 2 }}>
    HOME<span style={{ color: C.blue }}>PILOT</span>
  </div>
);

const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.reveal - 2 || f >= S.dash) return null;
  const out = interpolate(f, [S.dash - 12, S.dash], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 0 300px', opacity: out }}>
      <Logo at={S.reveal + 30} size={300} />
      <Pop at={S.reveal + 48}>
        <div style={{ marginTop: 40 }}>
          <Wordmark size={110} />
        </div>
      </Pop>
      <Pop at={S.reveal + 70}>
        <div style={{ color: C.muted, fontSize: 46, fontWeight: 600, marginTop: 20, textAlign: 'center' }}>Your home maintenance companion</div>
      </Pop>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.cta) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 0 300px', opacity: interpolate(f, [S.cta, S.cta + 12], [0, 1], clamp) }}>
      <Logo at={S.cta + 40} size={260} />
      <Pop at={S.cta + 55}>
        <div style={{ marginTop: 36 }}>
          <Wordmark size={100} />
        </div>
      </Pop>
      <Pop at={S.cta + 85}>
        <div style={{ color: C.text, fontSize: 54, fontWeight: 800, marginTop: 30, textAlign: 'center' }}>
          A little care goes <span style={{ color: C.bright }}>a long way.</span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

const Background: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {[
        { c: 'rgba(59,130,246,0.55)', x: 20, y: 25, r: 520, sp: 90 },
        { c: 'rgba(34,211,238,0.40)', x: 80, y: 55, r: 460, sp: 120 },
        { c: 'rgba(139,92,246,0.42)', x: 35, y: 85, r: 500, sp: 105 },
      ].map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: `${b.x + Math.sin(f / b.sp + i) * 8}%`, top: `${b.y + Math.cos(f / b.sp + i * 2) * 6}%`, width: b.r * 2, height: b.r * 2, marginLeft: -b.r, marginTop: -b.r, borderRadius: 9999, background: `radial-gradient(circle, ${b.c}, transparent 70%)`, filter: 'blur(40px)' }} />
      ))}
      {Array.from({ length: 22 }).map((_, i) => {
        const x = (i * 433) % 1080;
        const y = (((i * 751) % 1920) - f * (0.5 + (i % 4) * 0.2) + 1920 * 4) % 1920;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 5, height: 5, borderRadius: 9, background: C.bright, opacity: 0.12 + (i % 3) * 0.06 }} />;
      })}
    </AbsoluteFill>
  );
};

type VoiceScene = { id?: string; ovozFayl?: string };
export type HomePilotProps = { scenes?: VoiceScene[] };
const IDS = Object.keys(S) as (keyof typeof S)[];

export const HomePilotAd: React.FC<HomePilotProps> = ({ scenes = [] }) => {
  const voiced = scenes.some((v) => v.ovozFayl);
  return (
    <AbsoluteFill style={{ fontFamily, overflow: 'hidden' }}>
      <Background />
      <Hook />
      <Problem />
      <Reveal />
      <Caption from={S.dash + 4} to={S.systems} text="Your whole home at a glance." hi="glance." />
      <Caption from={S.systems + 4} to={S.tasks} text="Every system in one place." hi="system" />
      <Caption from={S.tasks + 4} to={S.money} text="Check off tasks as you go." hi="tasks" />
      <Caption from={S.money + 4} to={S.ask} text="Receipts, warranties, real costs." hi="costs." />
      <Caption from={S.ask + 4} to={S.cta} text="Ask what's due next." hi="next." />
      <Screen />
      <Cta />
      <Sequence from={0}>
        <Audio src={staticFile('homepilot/sfx.mp3')} volume={voiced ? 0.4 : 1} />
      </Sequence>
      {scenes.map((v, i) => {
        const id = (v.id ?? IDS[i]) as keyof typeof S;
        return v.ovozFayl && S[id] !== undefined ? (
          <Sequence key={i} from={S[id] + 8}>
            <Audio src={staticFile(v.ovozFayl)} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
