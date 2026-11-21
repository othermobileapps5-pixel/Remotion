import React from 'react';
import { AbsoluteFill, random } from 'remotion';
import type { CustomScene, Theme } from '../../types';
import { Center, Count, TypeText, Words, lerp, useScene } from '../apollo13/kit';
import { B, BSfx, ClipScene, Dusk, Era, fontFamily, mono, serif } from './kit';

type P = { theme: Theme; scene: CustomScene };

// ---------- AI klip sahnalari (Gemini Omni) ----------
const Hook: React.FC<P> = ({ scene }) => (
  <ClipScene scene={scene} era="4,000 YEARS AGO" right="EUPHRATES RIVER" beats={[{ at: 0.56, text: 'BABYLON', kind: 'big' }]} sfx={[{ at: 0.02, src: 'wind', volume: 0.4 }]} />
);
const Hammurabi: React.FC<P> = ({ scene }) => (
  <ClipScene scene={scene} era="c. 1792 BC" right="OLD BABYLONIAN PERIOD" beats={[{ at: 0.18, text: 'HAMMURABI', kind: 'title' }, { at: 0.52, text: 'UNITES MESOPOTAMIA', kind: 'tag' }, { at: 0.8, text: 'CAPITAL OF AN EMPIRE', kind: 'tag' }]} />
);
const Ishtar: React.FC<P> = ({ scene }) => (
  <ClipScene
    scene={scene}
    tone="lapis"
    era="c. 575 BC"
    right="NEBUCHADNEZZAR II"
    beats={[
      { at: 0.12, text: 'THE ISHTAR GATE', kind: 'title' },
      { at: 0.36, text: 'BLUE GLAZED BRICKS', kind: 'tag' },
      { at: 0.55, text: 'DRAGONS · BULLS', kind: 'tag' },
      { at: 0.78, text: 'PROCESSIONAL WAY', kind: 'tag' },
    ]}
  />
);
const Ziggurat: React.FC<P> = ({ scene }) => (
  <ClipScene
    scene={scene}
    era="HEART OF THE CITY"
    right="TEMPLE OF MARDUK"
    beats={[
      { at: 0.14, text: 'ETEMENANKI', kind: 'title' },
      { at: 0.4, text: 'FOUNDATION OF HEAVEN AND EARTH', kind: 'tag' },
      { at: 0.82, text: 'TOWER OF BABEL?', kind: 'big' },
    ]}
  />
);
const Gardens: React.FC<P> = ({ scene }) => (
  <ClipScene
    scene={scene}
    era="SEVEN WONDERS"
    right="OF THE ANCIENT WORLD"
    beats={[
      { at: 0.06, text: 'THE HANGING GARDENS', kind: 'title' },
      { at: 0.24, text: '1 OF 7 WONDERS', kind: 'tag' },
      { at: 0.5, text: 'NO CLEAR PROOF FOUND', kind: 'tag' },
      { at: 0.8, text: 'OR WAS IT NINEVEH?', kind: 'tag' },
    ]}
  />
);
const Fall: React.FC<P> = ({ scene }) => (
  <ClipScene scene={scene} era="539 BC" right="PERSIAN CONQUEST" beats={[{ at: 0.2, text: 'CYRUS THE GREAT', kind: 'title' }, { at: 0.55, text: 'NEW EMPIRE: PERSIA', kind: 'tag' }, { at: 0.8, text: 'ALMOST WITHOUT A FIGHT', kind: 'tag' }]} sfx={[{ at: 0.02, src: 'drum', volume: 0.6 }, { at: 0.1, src: 'drum', volume: 0.5 }]} />
);
const Ruins: React.FC<P> = ({ scene }) => (
  <ClipScene
    scene={scene}
    era="CENTURIES LATER"
    right="IRAQ"
    beats={[
      { at: 0.08, text: 'BURIED IN SAND', kind: 'title' },
      { at: 0.35, text: '1899 · ROBERT KOLDEWEY', kind: 'tag' },
      { at: 0.75, text: 'EXCAVATIONS 1899–1917', kind: 'tag' },
    ]}
    sfx={[{ at: 0.02, src: 'wind', volume: 0.45 }, { at: 0.36, src: 'chisel', volume: 0.5 }, { at: 0.4, src: 'chisel', volume: 0.5 }]}
  />
);

// ---------- Motion-graphics sahnalari ----------

// Nom: Bab-ilim = "Xudolar darvozasi", keyin xarita
const Name: React.FC<P> = () => {
  const { u, prog, pop, vertical } = useScene();
  const mapP = prog(0.55, 0.62);
  const draw = prog(0.58, 0.8);
  return (
    <AbsoluteFill>
      <Dusk tone="lapis" />
      <Era text="THE NAME" right="AKKADIAN" />
      <Center style={{ flexDirection: 'column', gap: 40 * u, opacity: 1 - mapP }}>
        <div style={{ display: 'flex', gap: 30 * u, alignItems: 'flex-end' }}>
          {[
            ['BĀB', 'GATE', 0.2],
            ['ILIM', 'OF THE GODS', 0.3],
          ].map(([w, m, a]) => (
            <div key={w as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u, transform: `translateY(${(1 - pop(a as number)) * 60 * u}px)`, opacity: Math.min(1, pop(a as number) * 1.4) }}>
              <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 120 : 170) * u, color: B.gold }}>{w}</div>
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 32 * u, letterSpacing: 5 * u, color: B.text, opacity: prog((a as number) + 0.12, (a as number) + 0.16) }}>{m}</div>
            </div>
          ))}
        </div>
        <Words text="“Gate of the *Gods*”" at={0.4} size={(vertical ? 60 : 70) * u} font={serif} hi={B.gold} />
      </Center>
      {/* Sxematik xarita (masshtabsiz): Dajla va Frot, Bag'dod va Bobil */}
      <Center style={{ opacity: mapP }}>
        <svg viewBox="0 0 1000 700" style={{ width: (vertical ? 1000 : 1150) * u, overflow: 'visible' }}>
          <path d="M300 40 C 360 200, 300 320, 420 430 S 560 600, 640 680" stroke="#60A5FA" strokeWidth={10} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinecap="round" />
          <path d="M620 30 C 600 160, 680 260, 610 380 S 680 560, 660 680" stroke="#60A5FA" strokeWidth={10} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinecap="round" opacity={0.75} />
          <text x={250} y={140} fill="#93C5FD" fontFamily={mono} fontWeight={700} fontSize={26} letterSpacing={3} opacity={draw}>EUPHRATES</text>
          <text x={650} y={130} fill="#93C5FD" fontFamily={mono} fontWeight={700} fontSize={26} letterSpacing={3} opacity={draw}>TIGRIS</text>
          <g opacity={prog(0.72, 0.76)}>
            <circle cx={560} cy={300} r={12} fill={B.text} />
            <text x={585} y={308} fill={B.text} fontFamily={fontFamily} fontWeight={700} fontSize={32}>Baghdad</text>
          </g>
          <g opacity={prog(0.76, 0.8)}>
            <circle cx={420} cy={430} r={26 + 6 * Math.sin(prog(0, 1, (x) => x) * 40)} fill={B.gold} opacity={0.3} />
            <circle cx={420} cy={430} r={16} fill={B.gold} />
            <text x={230} y={500} fill={B.gold} fontFamily={serif} fontWeight={900} fontSize={46}>BABYLON</text>
          </g>
          <g opacity={prog(0.8, 0.85)}>
            <line x1={560} y1={300} x2={420} y2={430} stroke={B.sand} strokeWidth={3} strokeDasharray="8 10" />
            <text x={520} y={390} fill={B.sand} fontFamily={mono} fontWeight={700} fontSize={28}>~94 km</text>
          </g>
          <text x={500} y={690} textAnchor="middle" fill={B.dim} fontFamily={mono} fontSize={22} letterSpacing={4} opacity={draw}>MODERN IRAQ · NOT TO SCALE</text>
        </svg>
      </Center>
      <BSfx at={0.2} src="drum" volume={0.5} />
      <BSfx at={0.3} src="drum" volume={0.5} />
      <BSfx at={0.4} src="ding" volume={0.25} />
      <BSfx at={0.58} src="whoosh" volume={0.35} />
      <BSfx at={0.76} src="pulse" volume={0.4} />
    </AbsoluteFill>
  );
};

// Hammurapi qonunlari: tosh ustun chiziladi, mixxat belgilari, 282, "Ko'zga ko'z"
const Code: React.FC<P> = () => {
  const { u, prog, pop, vertical, frame } = useScene();
  const draw = prog(0, 0.25);
  const rows = 14;
  const cuneiform = Math.floor(prog(0.12, 0.5, (x) => x) * rows * 6);
  return (
    <AbsoluteFill>
      <Dusk />
      <Era text="THE CODE OF HAMMURABI" right="BLACK STONE STELE" />
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: 110 * u }}>
        <svg viewBox="0 0 300 560" style={{ height: (vertical ? 620 : 720) * u }}>
          <path d="M40 550 L40 120 Q40 20 150 20 Q260 20 260 120 L260 550 Z" fill="#111827" stroke={B.gold} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          {/* tepadagi tasvir: shoh va xudo (sxematik) */}
          <g opacity={prog(0.12, 0.18)} stroke={B.gold} strokeWidth={3} fill="none">
            <circle cx={110} cy={80} r={14} />
            <path d="M110 94 L110 150 M95 115 L130 110" />
            <circle cx={195} cy={75} r={16} />
            <path d="M195 91 L190 160 M175 160 L215 160 L205 110 Z" />
          </g>
          {new Array(rows * 6).fill(0).map((_, i) => {
            if (i >= cuneiform) return null;
            const r = Math.floor(i / 6);
            const c = i % 6;
            const x = 62 + c * 32 + random(`cx${i}`) * 6;
            const y = 200 + r * 24;
            const rot = random(`cr${i}`) > 0.5 ? 0 : 90;
            return <path key={i} d={`M${x} ${y} l12 0 l-6 8 z M${x + 6} ${y + 8} l0 8`} transform={`rotate(${rot} ${x + 6} ${y + 6})`} stroke={B.sand} strokeWidth={2} fill={B.sand} opacity={0.85} />;
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: vertical ? 'center' : 'flex-start', gap: 26 * u }}>
          <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 200 : 240) * u, color: B.gold, lineHeight: 0.9, opacity: prog(0.24, 0.28) }}>
            <Count to={282} a={0.26} b={0.45} />
          </div>
          <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 36 * u, letterSpacing: 8 * u, color: B.text, opacity: prog(0.3, 0.34) }}>LAWS</div>
          <div style={{ marginTop: 40 * u, opacity: prog(0.54, 0.58), transform: `scale(${lerp(pop(0.54, 12), 1.3, 1)})`, transformOrigin: vertical ? 'center' : 'left' }}>
            <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 70 : 80) * u, color: B.text, borderLeft: `${8 * u}px solid ${B.gold}`, paddingLeft: 26 * u }}>
              <TypeText text="AN EYE FOR AN EYE" from={0.56} to={0.66} cursor={false} />
            </div>
          </div>
          <div style={{ opacity: Math.min(1, pop(0.78)), fontFamily: mono, fontWeight: 700, fontSize: 28 * u, letterSpacing: 3 * u, color: B.sand, border: `${3 * u}px solid ${B.sand}`, borderRadius: 10 * u, padding: `${8 * u}px ${18 * u}px` }}>NOBLE · COMMONER · SLAVE</div>
        </div>
      </AbsoluteFill>
      <BSfx at={0.15} src="chisel" volume={0.5} />
      <BSfx at={0.25} src="chisel" volume={0.5} />
      <BSfx at={0.35} src="chisel" volume={0.5} />
      <BSfx at={0.45} src="ding" volume={0.35} />
      <BSfx at={0.55} src="gong" volume={0.55} />
      <BSfx at={0.78} src="drum" volume={0.5} />
    </AbsoluteFill>
  );
};

// Dunyoning eng katta shahri: 200 000+ odam (nuqtalar to'ri)
const Largest: React.FC<P> = () => {
  const { u, prog, vertical } = useScene();
  const cols = vertical ? 20 : 40;
  const rowsN = vertical ? 14 : 10;
  const fill = prog(0.25, 0.85, (x) => x);
  return (
    <AbsoluteFill>
      <Dusk />
      <Era text="c. 1755 BC" right="POPULATION ESTIMATE" />
      <Center style={{ flexDirection: 'column', gap: 40 * u }}>
        <Words text="The *largest* city in the world" at={0.08} size={(vertical ? 60 : 72) * u} font={serif} hi={B.gold} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${18 * u}px)`, gap: 10 * u }}>
          {new Array(cols * rowsN).fill(0).map((_, i) => {
            const on = random(`p${i}`) < fill * 1.05;
            return <div key={i} style={{ width: 18 * u, height: 18 * u, borderRadius: 18 * u, background: on ? B.gold : B.line, transform: `scale(${on ? 1 : 0.6})` }} />;
          })}
        </div>
        <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 110 : 130) * u, color: B.text, opacity: prog(0.4, 0.45) }}>
          <Count to={200000} a={0.42} b={0.8} suffix="+" />
        </div>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 30 * u, letterSpacing: 6 * u, color: B.dim, marginTop: -20 * u, opacity: prog(0.45, 0.5) }}>PEOPLE</div>
      </Center>
      <BSfx at={0.08} src="drum" volume={0.5} />
      <BSfx at={0.42} src="pulse" volume={0.4} />
      <BSfx at={0.8} src="ding" volume={0.35} />
    </AbsoluteFill>
  );
};

// Vaqt chizig'i: Hammurapi → 1000+ yil → Navuxodonosor II
const Rebirth: React.FC<P> = () => {
  const { u, prog, pop, vertical } = useScene();
  const line = prog(0.18, 0.54);
  const w = (vertical ? 860 : 1400) * u;
  const dot = (x: number, a: number, date: string, label: string, col: string) => (
    <div style={{ position: 'absolute', left: x * w, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * u, opacity: Math.min(1, pop(a) * 1.4) }}>
      <div style={{ fontFamily: serif, fontWeight: 900, fontSize: 56 * u, color: col }}>{date}</div>
      <div style={{ width: 36 * u, height: 36 * u, transform: 'rotate(45deg)', background: col, border: `${6 * u}px solid ${B.bg}` }} />
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 * u, letterSpacing: 3 * u, color: B.text, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Dusk />
      <Era text="THE EMPIRE FADES…" right="…AND RETURNS" />
      <Center>
        <div style={{ position: 'relative', width: w, height: 220 * u }}>
          <div style={{ position: 'absolute', top: 96 * u, left: 0, width: w, height: 6 * u, background: B.line }} />
          <div style={{ position: 'absolute', top: 96 * u, left: 0, width: w * line, height: 6 * u, background: `linear-gradient(90deg, ${B.gold}, ${B.lapis})` }} />
          {dot(0, 0.05, '1750 BC', 'HAMMURABI', B.gold)}
          {dot(1, 0.55, '605 BC', 'NEBUCHADNEZZAR II', '#60A5FA')}
          <div style={{ position: 'absolute', left: w * 0.5, top: 140 * u, transform: 'translateX(-50%)', fontFamily: serif, fontWeight: 700, fontSize: 44 * u, color: B.dim, opacity: prog(0.35, 0.42), whiteSpace: 'nowrap' }}>
            1,000+ years
          </div>
        </div>
      </Center>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: vertical ? 420 * u : 150 * u, display: 'flex', justifyContent: 'center', opacity: prog(0.78, 0.82) }}>
        <Words text="A new *golden age*" at={0.78} size={(vertical ? 64 : 76) * u} font={serif} hi={B.gold} />
      </div>
      <BSfx at={0.05} src="drum" volume={0.5} />
      <BSfx at={0.2} src="whoosh" volume={0.35} />
      <BSfx at={0.55} src="gong" volume={0.45} />
    </AbsoluteFill>
  );
};

// Ishtar darvozasi Berlinda: yoy chizig'i
const Berlin: React.FC<P> = () => {
  const { u, prog, vertical } = useScene();
  const arc = prog(0.5, 0.85);
  return (
    <AbsoluteFill>
      <Dusk tone="lapis" />
      <Era text="THE ISHTAR GATE TODAY" right="ORIGINAL GLAZED BRICKS" />
      <Center style={{ flexDirection: 'column', gap: 20 * u }}>
        <svg viewBox="0 0 1200 520" style={{ width: (vertical ? 1000 : 1350) * u, overflow: 'visible' }}>
          <path d="M1000 420 Q 600 -80 200 220" stroke={B.gold} strokeWidth={6} fill="none" strokeDasharray="4 14" strokeLinecap="round" pathLength={1} />
          <path d="M1000 420 Q 600 -80 200 220" stroke={B.gold} strokeWidth={7} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arc} strokeLinecap="round" />
          <g opacity={prog(0.05, 0.1)}>
            <circle cx={1000} cy={420} r={18} fill={B.gold} />
            <text x={1000} y={485} textAnchor="middle" fill={B.text} fontFamily={serif} fontWeight={900} fontSize={44}>BABYLON</text>
            <text x={1000} y={360} textAnchor="middle" fill={B.dim} fontFamily={mono} fontWeight={700} fontSize={24}>IRAQ</text>
          </g>
          <g opacity={prog(0.3, 0.35)}>
            <circle cx={200} cy={220} r={18} fill="#60A5FA" />
            <text x={200} y={290} textAnchor="middle" fill={B.text} fontFamily={serif} fontWeight={900} fontSize={44}>BERLIN</text>
            <text x={200} y={170} textAnchor="middle" fill={B.dim} fontFamily={mono} fontWeight={700} fontSize={24}>GERMANY</text>
          </g>
        </svg>
        <div style={{ opacity: prog(0.36, 0.42), fontFamily: mono, fontWeight: 700, fontSize: 34 * u, letterSpacing: 6 * u, color: B.bg, background: B.gold, padding: `${10 * u}px ${26 * u}px`, borderRadius: 10 * u }}>PERGAMON MUSEUM</div>
        <div style={{ opacity: prog(0.86, 0.9), fontFamily: serif, fontWeight: 900, fontSize: 56 * u, color: B.text, marginTop: 20 * u }}>Brick by brick</div>
      </Center>
      <BSfx at={0.3} src="ding" volume={0.35} />
      <BSfx at={0.5} src="whoosh" volume={0.45} />
      <BSfx at={0.86} src="chisel" volume={0.4} />
    </AbsoluteFill>
  );
};

// 60 lik sanoq: soat va doira
const Math60: React.FC<P> = () => {
  const { u, prog, pop, vertical } = useScene();
  const ticks = Math.floor(prog(0.5, 0.72, (x) => x) * 60);
  const circ = prog(0.82, 0.95);
  return (
    <AbsoluteFill>
      <Dusk tone="lapis" />
      <Era text="SCIENCE OF BABYLON" right="ASTRONOMY · MATHEMATICS" />
      <Center style={{ flexDirection: 'column', gap: 40 * u }}>
        <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 120 : 150) * u, color: B.gold, transform: `scale(${pop(0.26, 12)})`, opacity: Math.min(1, pop(0.26)) }}>BASE 60</div>
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 120 * u, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u, opacity: prog(0.48, 0.52) }}>
            <svg viewBox="-110 -110 220 220" style={{ width: 300 * u, height: 300 * u }}>
              <circle r={100} fill="none" stroke={B.line} strokeWidth={4} />
              {new Array(ticks).fill(0).map((_, i) => {
                const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
                const long = i % 5 === 0;
                return <line key={i} x1={Math.cos(a) * (long ? 78 : 88)} y1={Math.sin(a) * (long ? 78 : 88)} x2={Math.cos(a) * 98} y2={Math.sin(a) * 98} stroke={long ? B.gold : B.sand} strokeWidth={long ? 4 : 2} />;
              })}
              <line x1={0} y1={0} x2={Math.cos((ticks / 60) * Math.PI * 2 - Math.PI / 2) * 70} y2={Math.sin((ticks / 60) * Math.PI * 2 - Math.PI / 2) * 70} stroke={B.text} strokeWidth={5} strokeLinecap="round" />
            </svg>
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 30 * u, color: B.text, letterSpacing: 3 * u }}>
              <Count to={60} a={0.5} b={0.72} /> MINUTES
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u, opacity: prog(0.8, 0.84) }}>
            <svg viewBox="-110 -110 220 220" style={{ width: 300 * u, height: 300 * u }}>
              <circle r={95} fill="none" stroke={B.line} strokeWidth={4} />
              <circle r={95} fill="none" stroke={B.gold} strokeWidth={8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circ} transform="rotate(-90)" />
            </svg>
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 30 * u, color: B.text, letterSpacing: 3 * u }}>
              <Count to={360} a={0.82} b={0.95} />° CIRCLE
            </div>
          </div>
        </div>
      </Center>
      <BSfx at={0.26} src="gong" volume={0.45} />
      <BSfx at={0.5} src="pulse" volume={0.35} />
      <BSfx at={0.72} src="ding" volume={0.3} />
      <BSfx at={0.95} src="ding" volume={0.3} />
    </AbsoluteFill>
  );
};

// Iskandar: 539 → 323 BC
const Alexander: React.FC<P> = () => {
  const { u, prog, pop, vertical } = useScene();
  return (
    <AbsoluteFill>
      <Dusk />
      <Era text="TWO CENTURIES LATER" right="323 BC" />
      <Center style={{ flexDirection: 'column', gap: 36 * u, padding: 80 * u }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 30 * u, letterSpacing: 8 * u, color: B.dim, opacity: prog(0.05, 0.1) }}>
          <Count to={323} start={539} from={539} a={0.05} b={0.3} /> BC
        </div>
        <div style={{ fontFamily: serif, fontWeight: 900, fontSize: (vertical ? 90 : 120) * u, color: B.text, textAlign: 'center', letterSpacing: lerp(prog(0.25, 0.4), 20, 3) * u, opacity: prog(0.25, 0.3) }}>
          ALEXANDER <span style={{ color: B.gold }}>THE GREAT</span>
        </div>
        <div style={{ display: 'flex', gap: 30 * u, flexDirection: vertical ? 'column' : 'row', alignItems: 'center' }}>
          <div style={{ opacity: Math.min(1, pop(0.5)), fontFamily: mono, fontWeight: 700, fontSize: 32 * u, letterSpacing: 3 * u, color: B.text, border: `${3 * u}px solid ${B.sand}`, borderRadius: 10 * u, padding: `${10 * u}px ${22 * u}px`, textDecoration: prog(0.7, 0.72) > 0 ? 'line-through' : 'none' }}>
            PLANNED CAPITAL
          </div>
          <div style={{ opacity: Math.min(1, pop(0.75)), transform: `scale(${pop(0.75, 10)})`, fontFamily: mono, fontWeight: 700, fontSize: 32 * u, letterSpacing: 3 * u, color: B.bg, background: B.gold, borderRadius: 10 * u, padding: `${10 * u}px ${22 * u}px` }}>
            DIED IN BABYLON · 323 BC
          </div>
        </div>
      </Center>
      <BSfx at={0.05} src="pulse" volume={0.35} />
      <BSfx at={0.25} src="drum" volume={0.55} />
      <BSfx at={0.5} src="whoosh" volume={0.3} />
      <BSfx at={0.75} src="gong" volume={0.5} />
    </AbsoluteFill>
  );
};

// Xulosa: UNESCO 2019, "Gate of the Gods", obuna
const Outro: React.FC<P> = () => {
  const { u, prog, pop, vertical, frame, at } = useScene();
  const stamp = pop(0.04, 10);
  const cta = pop(0.76, 12);
  const click = frame - at(0.88);
  return (
    <AbsoluteFill>
      <Dusk tone="lapis" />
      <Center style={{ flexDirection: 'column', gap: 50 * u, padding: 60 * u }}>
        <div style={{ opacity: Math.min(1, stamp) * (1 - prog(0.36, 0.4) * 0.6), transform: `rotate(-4deg) scale(${lerp(stamp, 2, 1)})`, border: `${6 * u}px solid ${B.gold}`, borderRadius: 16 * u, padding: `${14 * u}px ${36 * u}px`, textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 28 * u, letterSpacing: 6 * u, color: B.gold }}>UNESCO WORLD HERITAGE</div>
          <div style={{ fontFamily: serif, fontWeight: 900, fontSize: 80 * u, color: B.text }}>2019</div>
        </div>
        <div style={{ opacity: prog(0.38, 0.44) }}>
          <Words text="The Gate of the Gods *still stands*" at={0.38} size={(vertical ? 64 : 80) * u} font={serif} hi={B.gold} />
        </div>
        <div style={{ position: 'relative', opacity: Math.min(1, cta), transform: `scale(${lerp(cta, 0.7, 1) * (click > 0 && click < 8 ? 0.94 : 1)})` }}>
          <div style={{ fontFamily, fontWeight: 800, fontSize: 46 * u, color: '#fff', background: click > 0 ? '#334155' : '#DC2626', padding: `${20 * u}px ${54 * u}px`, borderRadius: 60 * u }}>{click > 0 ? '✓ SUBSCRIBED' : 'SUBSCRIBE'}</div>
          {click > 0 && click < 20 ? (
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: click * 8 * u, height: click * 8 * u, marginLeft: -click * 4 * u, marginTop: -click * 4 * u, borderRadius: '50%', border: `${4 * u}px solid #fff`, opacity: 1 - click / 20 }} />
          ) : null}
        </div>
        <div style={{ fontFamily, fontWeight: 600, fontSize: 32 * u, color: B.dim, opacity: prog(0.8, 0.85) }}>More stories from history</div>
      </Center>
      <BSfx at={0.04} src="gong" volume={0.5} />
      <BSfx at={0.38} src="ding" volume={0.25} />
      <BSfx at={0.88} src="switch" volume={0.6} />
      <BSfx at={0.9} src="ding" volume={0.4} />
    </AbsoluteFill>
  );
};

export const BOBIL: Record<string, React.FC<P>> = {
  'bobil/hook': Hook,
  'bobil/name': Name,
  'bobil/hammurabi': Hammurabi,
  'bobil/code': Code,
  'bobil/largest': Largest,
  'bobil/rebirth': Rebirth,
  'bobil/ishtar': Ishtar,
  'bobil/berlin': Berlin,
  'bobil/ziggurat': Ziggurat,
  'bobil/gardens': Gardens,
  'bobil/math': Math60,
  'bobil/fall': Fall,
  'bobil/alexander': Alexander,
  'bobil/ruins': Ruins,
  'bobil/outro': Outro,
};
