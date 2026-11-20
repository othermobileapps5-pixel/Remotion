import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C, Center, Count, Hud, Sfx, Stars, Tag, TypeSfx, TypeText, Words, fontFamily, lerp, mono, shake, useScene } from './kit';
import { Spacecraft, type Part } from './Spacecraft';

// 1. HOOK — sana yoziladi, masofa sanaladi, portlash
export const Hook: React.FC = () => {
  const { frame, u, prog, at, vertical } = useScene();
  const bang = at(0.82);
  const flash = interpolate(frame, [bang, bang + 3, bang + 20], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sh = shake(frame, bang, 24, 26 * u);
  const zoom = lerp(prog(0, 0.82), 1, 1.08);
  return (
    <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Stars />
      </AbsoluteFill>
      <Center style={{ flexDirection: 'column', gap: 30 * u }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: (vertical ? 70 : 86) * u, color: C.text, letterSpacing: 6 * u }}>
          <TypeText text="APRIL 13, 1970" from={0.03} to={0.22} />
        </div>
        <div style={{ opacity: prog(0.3, 0.36), fontFamily, fontWeight: 800, fontSize: (vertical ? 120 : 150) * u, color: C.accent, lineHeight: 1 }}>
          <Count to={200000} a={0.32} b={0.62} />
        </div>
        <div style={{ opacity: prog(0.34, 0.4), fontFamily: mono, fontWeight: 500, fontSize: 34 * u, color: C.dim, letterSpacing: 8 * u }}>MILES FROM EARTH</div>
      </Center>
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle, transparent 40%, ${C.red}55 100%)`, opacity: prog(0.82, 0.86) * (1 - prog(0.92, 1)) }} />
      <TypeSfx from={0.03} to={0.22} chars={14} />
      <Sfx at={0.32} src="pulse" volume={0.5} />
      <Sfx at={0.46} src="pulse" volume={0.5} />
      <Sfx at={0.6} src="pulse" volume={0.5} />
      <Sfx at={0.82} src="boom" volume={0.9} />
    </AbsoluteFill>
  );
};

// 2. SARLAVHA — APOLLO 13, harf oralig'i yig'iladi
export const Title: React.FC = () => {
  const { u, prog, pop, vertical } = useScene();
  const p = prog(0.02, 0.3);
  const sp = lerp(p, 80, 14) * u;
  return (
    <AbsoluteFill>
      <Stars drift={2} />
      <Center style={{ flexDirection: 'column', gap: 40 * u, padding: 80 * u }}>
        <div style={{ fontFamily, fontWeight: 800, fontSize: (vertical ? 150 : 210) * u, letterSpacing: sp, color: C.text, opacity: p, transform: `scale(${lerp(pop(0.02, 20), 1.3, 1)})`, whiteSpace: 'nowrap', textShadow: `0 0 ${60 * u}px ${C.accent}55` }}>
          APOLLO <span style={{ color: C.accent }}>13</span>
        </div>
        <div style={{ height: 6 * u, width: 520 * u, background: C.accent, borderRadius: 3 * u, transform: `scaleX(${prog(0.2, 0.34)})` }} />
        <Words text="The *Moon* landing that never happened" at={0.32} size={(vertical ? 54 : 56) * u} weight={700} />
        <Words text="…and the rescue that became *legend*" at={0.6} size={(vertical ? 54 : 56) * u} weight={700} color={C.dim} />
      </Center>
      <Sfx at={0.02} src="whoosh" volume={0.6} />
      <Sfx at={0.22} src="pulse" volume={0.6} />
      <Sfx at={0.78} src="ding" volume={0.25} />
    </AbsoluteFill>
  );
};

// 3. EKIPAJ — uchta kartochka, Mattingly almashtiriladi
const Card: React.FC<{ name: string; role: string; initials: string; p: number; hi?: boolean; crossed?: number; note?: string; noteP?: number }> = ({ name, role, initials, p, hi, crossed = 0, note, noteP = 0 }) => {
  const { u, vertical } = useScene();
  const col = hi ? C.accent : C.text;
  return (
    <div
      style={{
        width: (vertical ? 820 : 470) * u,
        padding: 34 * u,
        borderRadius: 26 * u,
        background: 'rgba(15,23,42,0.85)',
        border: `${3 * u}px solid ${hi ? C.accent : C.line}`,
        display: 'flex',
        flexDirection: vertical ? 'row' : 'column',
        alignItems: 'center',
        gap: 24 * u,
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 80 * u}px)`,
        position: 'relative',
      }}
    >
      <div style={{ width: 130 * u, height: 130 * u, flexShrink: 0, borderRadius: 130 * u, border: `${4 * u}px solid ${col}`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily, fontWeight: 800, fontSize: 52 * u, color: col }}>
        {initials}
      </div>
      <div style={{ textAlign: vertical ? 'left' : 'center' }}>
        <div style={{ fontFamily, fontWeight: 800, fontSize: 46 * u, color: C.text, position: 'relative', display: 'inline-block' }}>
          {name}
          {crossed > 0 ? <div style={{ position: 'absolute', left: -6 * u, top: '52%', height: 6 * u, width: `${crossed * 105}%`, background: C.red, borderRadius: 3 * u }} /> : null}
        </div>
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 24 * u, color: C.dim, marginTop: 10 * u, letterSpacing: 2 * u }}>{role}</div>
        {note ? (
          <div style={{ marginTop: 18 * u, opacity: noteP, transform: `scale(${0.8 + 0.2 * noteP})` }}>
            <Tag color={C.accent} size={22}>{note}</Tag>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Crew: React.FC = () => {
  const { u, prog, pop, vertical } = useScene();
  const out = prog(0.48, 0.53);
  const inn = prog(0.53, 0.58);
  return (
    <AbsoluteFill>
      <Stars count={90} />
      <Hud left="LAUNCH · APRIL 11, 1970" right="KENNEDY SPACE CENTER" />
      <Center style={{ flexDirection: 'column', gap: 50 * u }}>
        <Words text="The *crew*" at={0.0} size={70 * u} />
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 36 * u, alignItems: 'center' }}>
          <Card initials="JL" name="Jim Lovell" role="COMMANDER" p={pop(0.12)} />
          <Card initials="FH" name="Fred Haise" role="LUNAR MODULE PILOT" p={pop(0.24)} />
          <div style={{ position: 'relative' }}>
            {/* Mattingly kartasi chetga suriladi, o'rniga Swigert keladi */}
            <div style={{ opacity: 1 - out, transform: `translateY(${out * -100 * u}px)` }}>
              <Card initials="KM" name="Ken Mattingly" role="COMMAND MODULE PILOT" p={pop(0.34)} crossed={prog(0.4, 0.48)} />
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: inn, transform: `translateY(${(1 - inn) * 100 * u}px)` }}>
              <Card initials="JS" name="Jack Swigert" role="COMMAND MODULE PILOT" p={1} hi note="JOINED 3 DAYS BEFORE LAUNCH" noteP={prog(0.6, 0.66)} />
            </div>
          </div>
        </div>
        <div style={{ opacity: prog(0.78, 0.84), fontFamily, fontWeight: 600, fontSize: 32 * u, color: C.dim, marginTop: 60 * u }}>Mattingly was exposed to German measles</div>
      </Center>
      <Sfx at={0.12} src="whoosh" volume={0.35} />
      <Sfx at={0.24} src="whoosh" volume={0.35} />
      <Sfx at={0.34} src="whoosh" volume={0.35} />
      <Sfx at={0.4} src="switch" volume={0.5} />
      <Sfx at={0.48} src="whoosh" volume={0.5} />
      <Sfx at={0.6} src="ding" volume={0.3} />
    </AbsoluteFill>
  );
};

// 4. KEMA — sxema chiziladi, qismlar navbat bilan yorishadi
const PartLabel: React.FC<{ title: string; sub: string; p: number; color?: string }> = ({ title, sub, p, color = C.accent }) => {
  const { u } = useScene();
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 30 * u}px)`, textAlign: 'center' }}>
      <div style={{ fontFamily, fontWeight: 800, fontSize: 64 * u, color }}>{title}</div>
      <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 28 * u, color: C.dim, letterSpacing: 3 * u, marginTop: 8 * u }}>{sub}</div>
    </div>
  );
};

export const Ship: React.FC = () => {
  const { u, prog, vertical, frame, at } = useScene();
  const draw = prog(0, 0.16);
  const hi: Part = frame < at(0.16) ? null : frame < at(0.4) ? 'cm' : frame < at(0.62) ? 'sm' : 'lm';
  const label = (a: number, b: number) => prog(a, a + 0.04) * (1 - prog(b - 0.03, b));
  return (
    <AbsoluteFill>
      <Stars count={90} />
      <Hud left="THE SPACECRAFT" right="3 PARTS" />
      <Center style={{ flexDirection: 'column', gap: 30 * u }}>
        <div style={{ width: (vertical ? 1000 : 1400) * u, height: (vertical ? 450 : 560) * u, transform: `scale(${lerp(prog(0, 1), 0.96, 1.04)})` }}>
          <Spacecraft draw={draw} hi={hi} />
        </div>
        <div style={{ position: 'relative', height: 160 * u, width: '100%' }}>
          <Center>
            <PartLabel title="ODYSSEY" sub="COMMAND MODULE · CREW CABIN" p={label(0.16, 0.4)} />
          </Center>
          <Center>
            <PartLabel title="SERVICE MODULE" sub="OXYGEN · POWER · MAIN ENGINE" p={label(0.4, 0.62)} />
          </Center>
          <Center>
            <PartLabel title="AQUARIUS" sub="LUNAR MODULE · MOON LANDER" p={prog(0.62, 0.66)} />
          </Center>
        </div>
      </Center>
      <Sfx at={0.0} src="whoosh" volume={0.3} />
      <Sfx at={0.16} src="ding" volume={0.25} />
      <Sfx at={0.4} src="ding" volume={0.25} />
      <Sfx at={0.62} src="ding" volume={0.25} />
    </AbsoluteFill>
  );
};
