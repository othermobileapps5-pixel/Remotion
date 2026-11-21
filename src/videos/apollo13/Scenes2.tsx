import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C, Center, Count, Hud, Sfx, Stars, Tag, TypeSfx, TypeText, Words, fontFamily, lerp, mono, shake, useScene } from './kit';
import { Spacecraft, pathOf, pointOn, type Seg } from './Spacecraft';

const pad2 = (n: number) => String(n).padStart(2, '0');

// 5. PORTLASH — missiya soati, kalit, kislorod baki, "Houston..."
export const Explosion: React.FC = () => {
  const { frame, fps, u, prog, at, vertical } = useScene();
  const bang = at(0.56);
  // soat 55:54:30 dan boshlab real vaqtda yuradi, kalit bosilgan payt ~55:54:37
  const t0 = 55 * 3600 + 54 * 60 + 53 - Math.round(bang / fps) + Math.floor(frame / fps);
  const clock = `${pad2(Math.floor(t0 / 3600))}:${pad2(Math.floor((t0 % 3600) / 60))}:${pad2(t0 % 60)}`;
  const sh = shake(frame, bang, 30, 30 * u);
  const flash = interpolate(frame, [bang, bang + 2, bang + 16], [0, 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const alarmOn = frame > bang + 6 && Math.floor(frame / 8) % 2 === 0 && frame < at(0.68);
  const sw = prog(0.26, 0.28);
  const heat = prog(0.3, 0.56);
  const quoteP = prog(0.66, 0.7);
  const tank = (label: string, hot: number, burst: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u }}>
      <div
        style={{
          width: 200 * u,
          height: 200 * u,
          borderRadius: 200 * u,
          border: `${6 * u}px solid ${burst && frame > bang ? C.red : C.text}`,
          background: `radial-gradient(circle, ${C.red}${Math.round(hot * 200).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          transform: `scale(${burst && frame > bang ? 1.25 + prog(0.56, 0.64) * 0.3 : 1 + hot * 0.06 * Math.sin(frame)})`,
          opacity: burst && frame > bang ? 1 - prog(0.56, 0.66) : 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily,
          fontWeight: 800,
          fontSize: 54 * u,
          color: C.text,
        }}
      >
        O₂
      </div>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 24 * u, color: burst && frame > bang ? C.red : C.dim, letterSpacing: 3 * u }}>{label}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Stars count={90} tint={alarmOn ? '#3B0A0A' : undefined} />
      <Hud left="DAY 3 · APRIL 13 · 9:08 PM EST" right="200,000 MI FROM EARTH" />
      <Center style={{ flexDirection: 'column', gap: 46 * u }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: (vertical ? 110 : 130) * u, color: frame > bang ? C.red : C.text, letterSpacing: 4 * u, opacity: 1 - quoteP * 0.8 }}>{clock}</div>
        <div style={{ fontFamily: mono, fontSize: 24 * u, color: C.dim, letterSpacing: 6 * u, marginTop: -30 * u, opacity: 1 - quoteP }}>MISSION ELAPSED TIME</div>
        <div style={{ display: 'flex', gap: 80 * u, alignItems: 'center', opacity: 1 - quoteP }}>
          {/* kalit */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u }}>
            <div style={{ width: 90 * u, height: 150 * u, borderRadius: 16 * u, border: `${5 * u}px solid ${C.accent}`, position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 16 * u, height: 70 * u, marginLeft: -8 * u, background: C.accent, borderRadius: 8 * u, transformOrigin: '50% 100%', transform: `translateY(-100%) rotate(${lerp(sw, 35, -35)}deg)` }} />
            </div>
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 24 * u, color: C.accent, letterSpacing: 3 * u }}>TANK STIR</div>
          </div>
          {tank('TANK 1', heat * 0.15, false)}
          {tank('TANK 2', heat, true)}
        </div>
      </Center>
      {/* Iqtibos */}
      <Center style={{ flexDirection: 'column', gap: 30 * u, opacity: quoteP, padding: 100 * u }}>
        <div style={{ fontFamily, fontWeight: 800, fontSize: (vertical ? 80 : 96) * u, color: C.text, textAlign: 'center', lineHeight: 1.15 }}>
          <TypeText text={'"Houston, we\'ve had a problem."'} from={0.7} to={0.9} />
        </div>
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 30 * u, color: C.accent, letterSpacing: 5 * u, opacity: prog(0.9, 0.94) }}>— APOLLO 13 CREW</div>
      </Center>
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <AbsoluteFill style={{ boxShadow: `inset 0 0 ${200 * u}px ${C.red}`, opacity: alarmOn ? 0.8 : 0 }} />
      <Sfx at={0.26} src="switch" volume={0.8} />
      <Sfx at={0.56} src="boom" volume={0.9} />
      <Sfx at={0.575} src="alarm" volume={0.35} />
      <Sfx at={0.68} src="beep" volume={0.3} />
      <TypeSfx from={0.7} to={0.9} chars={30} volume={0.3} />
      <Sfx at={0.92} src="beep" volume={0.3} />
    </AbsoluteFill>
  );
};

// 6. ZARAR — panel uchadi, kislorod va quvvat tushadi, missiya o'zgaradi
const Gauge: React.FC<{ label: string; level: number }> = ({ label, level }) => {
  const { u, vertical } = useScene();
  const col = level > 0.5 ? C.green : level > 0.25 ? C.accent : C.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 * u }}>
      <div style={{ width: 170 * u, fontFamily: mono, fontWeight: 700, fontSize: 26 * u, color: C.dim, letterSpacing: 2 * u }}>{label}</div>
      <div style={{ width: (vertical ? 560 : 520) * u, height: 34 * u, borderRadius: 17 * u, background: C.line, overflow: 'hidden' }}>
        <div style={{ width: `${level * 100}%`, height: '100%', background: col, borderRadius: 17 * u }} />
      </div>
    </div>
  );
};

export const Damage: React.FC = () => {
  const { u, prog, vertical, pop } = useScene();
  const dmg = prog(0.0, 0.3);
  const fall = prog(0.25, 0.58);
  const stamp = pop(0.66, 10);
  const mission = pop(0.82, 12);
  return (
    <AbsoluteFill>
      <Stars count={90} />
      <Hud left="SERVICE MODULE · DAMAGE" right="OXYGEN VENTING" />
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: 60 * u, padding: 80 * u }}>
        <div style={{ width: (vertical ? 900 : 900) * u, height: (vertical ? 400 : 420) * u, opacity: 1 - prog(0.58, 0.64) * 0.7 }}>
          <Spacecraft hi="sm" damage={dmg} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 * u, opacity: prog(0.22, 0.28) * (1 - prog(0.58, 0.64) * 0.7) }}>
          <Gauge label="OXYGEN" level={lerp(fall, 1, 0.08)} />
          <Gauge label="POWER" level={lerp(prog(0.3, 0.6), 1, 0.12)} />
          <Gauge label="WATER" level={lerp(prog(0.35, 0.6), 1, 0.4)} />
        </div>
      </AbsoluteFill>
      <Center style={{ flexDirection: 'column', gap: 40 * u }}>
        <div style={{ opacity: Math.min(1, stamp), transform: `rotate(-6deg) scale(${lerp(stamp, 2.2, 1)})`, border: `${8 * u}px solid ${C.red}`, borderRadius: 18 * u, padding: `${18 * u}px ${40 * u}px`, fontFamily, fontWeight: 800, fontSize: (vertical ? 70 : 90) * u, color: C.red, letterSpacing: 4 * u, background: 'rgba(5,8,22,0.85)' }}>
          MOON LANDING: ABORTED
        </div>
        <div style={{ opacity: Math.min(1, mission), transform: `translateY(${(1 - mission) * 40 * u}px)`, fontFamily, fontWeight: 800, fontSize: (vertical ? 60 : 72) * u, color: C.green, background: 'rgba(5,8,22,0.85)', padding: `${10 * u}px ${30 * u}px`, borderRadius: 14 * u }}>
          NEW MISSION: GET HOME ALIVE
        </div>
      </Center>
      <Sfx at={0.02} src="static" volume={0.25} />
      <Sfx at={0.3} src="powerdown" volume={0.45} />
      <Sfx at={0.66} src="boom" volume={0.45} />
      <Sfx at={0.82} src="ding" volume={0.35} />
    </AbsoluteFill>
  );
};

// 7. QUTQARUV QAYIG'I — Aquarius: 2 kishi / 2 kun → 3 kishi / 4 kun
const Person: React.FC<{ p: number; color: string }> = ({ p, color }) => {
  const { u } = useScene();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 * u, opacity: Math.min(1, p * 1.4), transform: `scale(${0.6 + 0.4 * p})` }}>
      <div style={{ width: 54 * u, height: 54 * u, borderRadius: 54 * u, background: color }} />
      <div style={{ width: 92 * u, height: 70 * u, borderRadius: `${46 * u}px ${46 * u}px ${12 * u}px ${12 * u}px`, background: color }} />
    </div>
  );
};

export const Lifeboat: React.FC = () => {
  const { u, prog, pop, vertical } = useScene();
  const showCompare = prog(0.4, 0.46);
  const row = (n: number, days: number, color: string, a: number, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 * u, flexDirection: vertical ? 'column' : 'row' }}>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 * u, color: C.dim, width: vertical ? 'auto' : 260 * u, letterSpacing: 3 * u }}>{label}</div>
      <div style={{ display: 'flex', gap: 20 * u, width: 340 * u, justifyContent: vertical ? 'center' : 'flex-start' }}>
        {new Array(n).fill(0).map((_, i) => (
          <Person key={i} p={pop(a + i * 0.03)} color={color} />
        ))}
      </div>
      <div style={{ fontFamily, fontWeight: 800, fontSize: 90 * u, color, width: 360 * u, textAlign: 'center', opacity: prog(a + 0.06, a + 0.1) }}>
        {days} DAYS
      </div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Stars count={90} />
      <Hud left="AQUARIUS · LIFEBOAT" right="ODYSSEY POWERED DOWN" />
      <Center style={{ flexDirection: 'column', gap: 30 * u, opacity: 1 - showCompare }}>
        <div style={{ width: 1100 * u, height: 480 * u }}>
          <Spacecraft hi={prog(0.28, 0.29) > 0 ? 'lm' : null} dim={prog(0.05, 0.06) > 0 ? ['cm', 'sm'] : []} />
        </div>
        <div style={{ opacity: prog(0.3, 0.36) }}>
          <Tag color={C.accent} size={34}>LIFEBOAT</Tag>
        </div>
      </Center>
      <Center style={{ flexDirection: 'column', gap: 50 * u, opacity: showCompare }}>
        {row(2, 2, C.dim, 0.46, 'BUILT FOR')}
        <div style={{ width: 700 * u, height: 3 * u, background: C.line }} />
        {row(3, 4, C.accent, 0.76, 'NOW NEEDED')}
      </Center>
      <Sfx at={0.05} src="powerdown" volume={0.4} />
      <Sfx at={0.28} src="ding" volume={0.3} />
      <Sfx at={0.46} src="pulse" volume={0.4} />
      <Sfx at={0.76} src="pulse" volume={0.5} />
      <Sfx at={0.84} src="boom" volume={0.25} />
    </AbsoluteFill>
  );
};

// 8. TRAEKTORIYA — Oy ortidan aylanib qaytish (sxematik, masshtabsiz)
const SEGS: Seg[] = [
  [[345, 395], [650, 280], [1000, 620], [1250, 540]],
  [[1250, 540], [1400, 500], [1500, 330], [1320, 345]],
  [[1320, 345], [1140, 360], [700, 620], [345, 505]],
];
export const Trajectory: React.FC = () => {
  const { frame, dur, prog, vertical } = useScene();
  const draw = interpolate(frame / dur, [0.06, 0.74, 0.9, 1], [0, 0.42, 0.6, 0.68], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [sx, sy] = pointOn(SEGS, draw);
  const behind = draw > 0.4 && draw < 0.6;
  const earthPulse = 1 + 0.03 * Math.sin(frame / 8);
  return (
    <AbsoluteFill>
      <Stars count={120} />
      <Hud left="FREE-RETURN TRAJECTORY" right="NOT TO SCALE" />
      <Center>
        <svg viewBox="0 0 1600 900" style={{ width: vertical ? '100%' : '92%', overflow: 'visible' }}>
          <defs>
            <radialGradient id="earth" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="70%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#0B1F5C" />
            </radialGradient>
            <radialGradient id="moon" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#64748B" />
            </radialGradient>
          </defs>
          {/* rejalashtirilgan qo'nish yo'li (xira) */}
          <path d={pathOf(SEGS)} stroke={C.line} strokeWidth={4} fill="none" strokeDasharray="10 14" />
          <path d={pathOf(SEGS)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} stroke={C.accent} strokeWidth={6} fill="none" strokeLinecap="round" />
          <circle cx={260} cy={450} r={100 * earthPulse} fill="url(#earth)" />
          <circle cx={1320} cy={450} r={50} fill="url(#moon)" />
          <text x={260} y={600} fill={C.text} fontFamily={mono} fontWeight={700} fontSize={30} textAnchor="middle" letterSpacing={4}>EARTH</text>
          <text x={1320} y={545} fill={C.text} fontFamily={mono} fontWeight={700} fontSize={30} textAnchor="middle" letterSpacing={4} opacity={prog(0.1, 0.15)}>MOON</text>
          {/* kema */}
          <circle cx={sx} cy={sy} r={22 + 6 * Math.sin(frame / 4)} fill={C.accent} opacity={0.25} />
          <circle cx={sx} cy={sy} r={12} fill={behind ? C.red : C.accent} />
          {/* aloqa chizig'i */}
          {!behind && draw > 0.02 ? <line x1={260} y1={450} x2={sx} y2={sy} stroke={C.green} strokeWidth={2} strokeDasharray="4 10" opacity={0.6} /> : null}
          <text x={1320} y={260} fill={C.red} fontFamily={mono} fontWeight={700} fontSize={32} textAnchor="middle" letterSpacing={3} opacity={behind ? 1 : 0}>RADIO LOST</text>
          <text x={800} y={140} fill={C.text} fontFamily={fontFamily} fontWeight={800} fontSize={46} textAnchor="middle" opacity={prog(0.45, 0.5)}>
            Moon's gravity slings them home
          </text>
        </svg>
      </Center>
      <Sfx at={0.06} src="whoosh" volume={0.4} />
      <Sfx at={0.75} src="static" volume={0.35} />
      <Sfx at={0.91} src="beep" volume={0.35} />
    </AbsoluteFill>
  );
};

// 9. REKORD — 400,171 km
export const Record: React.FC = () => {
  const { u, prog, vertical, pop } = useScene();
  const bar = prog(0.6, 0.85);
  return (
    <AbsoluteFill>
      <Stars count={160} drift={0.4} />
      <Hud left="APRIL 14–15, 1970" right="FAR SIDE OF THE MOON" />
      <Center style={{ flexDirection: 'column', gap: 26 * u, padding: 60 * u }}>
        <div style={{ fontFamily, fontWeight: 800, fontSize: (vertical ? 140 : 190) * u, color: C.accent, lineHeight: 1 }}>
          <Count to={400171} a={0.04} b={0.4} suffix=" km" />
        </div>
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 32 * u, color: C.dim, letterSpacing: 6 * u, opacity: prog(0.3, 0.36) }}>248,655 MILES FROM EARTH</div>
        <div style={{ marginTop: 20 * u }}>
          <Words text="Farther than any *humans* had ever been" at={0.42} size={(vertical ? 54 : 62) * u} />
        </div>
        <div style={{ marginTop: 50 * u, width: (vertical ? 880 : 1100) * u, opacity: prog(0.58, 0.62) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontWeight: 700, fontSize: 30 * u, color: C.text, marginBottom: 14 * u }}>
            <span>1970 · APOLLO 13</span>
            <span style={{ opacity: prog(0.82, 0.86), color: C.cyan }}>2026 · ARTEMIS II</span>
          </div>
          <div style={{ height: 14 * u, borderRadius: 7 * u, background: C.line, overflow: 'hidden' }}>
            <div style={{ width: `${bar * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.cyan})` }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 18 * u, fontFamily, fontWeight: 800, fontSize: 44 * u, color: C.text, opacity: Math.min(1, pop(0.78)) }}>
            Record held for <span style={{ color: C.accent }}>56 years</span>
          </div>
        </div>
      </Center>
      <Sfx at={0.04} src="pulse" volume={0.4} />
      <Sfx at={0.4} src="ding" volume={0.35} />
      <Sfx at={0.6} src="whoosh" volume={0.3} />
      <Sfx at={0.78} src="ding" volume={0.3} />
    </AbsoluteFill>
  );
};
