import React from 'react';
import { AbsoluteFill, interpolate, random } from 'remotion';
import { C, Center, Hud, Sfx, Stars, Tag, Words, fontFamily, lerp, mono, useScene } from './kit';
import { Spacecraft } from './Spacecraft';

// 10. CO₂ — dumaloq teshik, kvadrat filtr, qo'lbola yechim
export const Co2: React.FC = () => {
  const { frame, u, prog, pop, vertical, at } = useScene();
  const rise = prog(0.0, 0.3);
  const fixed = prog(0.92, 1);
  const level = lerp(rise, 0.25, 0.85) * (1 - fixed) + fixed * 0.3;
  const col = level > 0.6 ? C.red : level > 0.4 ? C.accent : C.green;
  // kvadrat filtr dumaloq teshikka urinadi va qaytadi (ikki marta)
  const tryP = (a: number) => {
    const f = frame - at(a);
    if (f < 0) return 0;
    return Math.max(0, Math.sin(Math.min(Math.PI, (f / 14) * Math.PI)));
  };
  const push = Math.max(tryP(0.38), tryP(0.46));
  const partsP = prog(0.56, 0.6);
  const items = ['PLASTIC BAGS', 'CARDBOARD', 'DUCT TAPE'];
  return (
    <AbsoluteFill>
      <Stars count={70} />
      <Hud left="AQUARIUS · CABIN AIR" right="CO₂ RISING" />
      {/* CO₂ ko'rsatkichi — chap yoki yuqori chetda (raqamsiz) */}
      <div style={{ position: 'absolute', left: vertical ? 90 * u : 110 * u, top: vertical ? 180 * u : 200 * u, bottom: vertical ? undefined : 200 * u, height: vertical ? 70 * u : undefined, right: vertical ? 90 * u : undefined, width: vertical ? undefined : 70 * u, display: 'flex', flexDirection: vertical ? 'row' : 'column-reverse', alignItems: 'center', gap: 16 * u }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 28 * u, color: col }}>CO₂</div>
        <div style={{ flex: 1, alignSelf: 'stretch', borderRadius: 35 * u, background: C.line, display: 'flex', flexDirection: vertical ? 'row' : 'column-reverse', overflow: 'hidden' }}>
          <div style={{ [vertical ? 'width' : 'height']: `${level * 100}%`, [vertical ? 'height' : 'width']: '100%', background: col, borderRadius: 35 * u } as React.CSSProperties} />
        </div>
      </div>
      <Center style={{ flexDirection: 'column', gap: 50 * u, opacity: 1 - partsP }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 60 * u }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u, opacity: prog(0.24, 0.28) }}>
            <div style={{ width: 240 * u, height: 240 * u, borderRadius: 240 * u, border: `${10 * u}px dashed ${C.cyan}` }} />
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 * u, color: C.cyan, letterSpacing: 3 * u }}>AQUARIUS · ROUND</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u, opacity: prog(0.32, 0.36), transform: `translateX(${-push * 150 * u}px) rotate(${push * -4}deg)` }}>
            <div style={{ width: 230 * u, height: 230 * u, borderRadius: 18 * u, background: `${C.accent}33`, border: `${10 * u}px solid ${C.accent}` }} />
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 * u, color: C.accent, letterSpacing: 3 * u }}>ODYSSEY · SQUARE</div>
          </div>
        </div>
        <div style={{ opacity: prog(0.5, 0.53), fontFamily, fontWeight: 800, fontSize: (vertical ? 60 : 70) * u, color: C.red }}>✕ IT DOESN'T FIT</div>
      </Center>
      <Center style={{ flexDirection: 'column', gap: 40 * u, opacity: partsP }}>
        <Words text="Built from what was *on board*" at={0.58} size={(vertical ? 58 : 66) * u} />
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: 30 * u }}>
          {items.map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 ? <div style={{ fontFamily, fontWeight: 800, fontSize: 60 * u, color: C.dim, opacity: pop(0.74 + i * 0.06) }}>+</div> : null}
              <div style={{ transform: `scale(${pop(0.74 + i * 0.06)})` }}>
                <Tag color={C.text} size={36}>{t}</Tag>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ opacity: Math.min(1, pop(0.93)), transform: `scale(${pop(0.93, 10)})`, fontFamily, fontWeight: 800, fontSize: (vertical ? 76 : 90) * u, color: C.green }}>IT WORKED</div>
      </Center>
      <Sfx at={0.02} src="pulse" volume={0.3} />
      <Sfx at={0.16} src="pulse" volume={0.35} />
      <Sfx at={0.38} src="switch" volume={0.6} />
      <Sfx at={0.46} src="switch" volume={0.6} />
      <Sfx at={0.5} src="alarm" volume={0.2} />
      <Sfx at={0.74} src="key" volume={0.6} />
      <Sfx at={0.8} src="key" volume={0.6} />
      <Sfx at={0.86} src="key" volume={0.6} />
      <Sfx at={0.93} src="ding" volume={0.4} />
    </AbsoluteFill>
  );
};

// 11. SOVUQ — tizimlar o'chadi, termometr tushadi, sovuq parda
export const Cold: React.FC = () => {
  const { u, prog, vertical } = useScene();
  const systems = ['HEATERS', 'COMPUTERS', 'DISPLAYS', 'LIGHTS'];
  const temp = prog(0.3, 0.7);
  const frost = prog(0.35, 0.85);
  return (
    <AbsoluteFill>
      <Stars count={70} tint="#0C2340" />
      <Hud left="POWER SAVING MODE" right="WATER RATIONED" />
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: 110 * u }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 * u }}>
          {systems.map((s, i) => {
            const off = prog(0.04 + i * 0.07, 0.07 + i * 0.07);
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 26 * u }}>
                <div style={{ width: 100 * u, height: 52 * u, borderRadius: 26 * u, background: off > 0.5 ? C.line : C.green, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 6 * u, left: lerp(off, 54, 6) * u, width: 40 * u, height: 40 * u, borderRadius: 40 * u, background: C.text }} />
                </div>
                <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 36 * u, color: off > 0.5 ? '#475569' : C.text, letterSpacing: 3 * u }}>{s}</div>
              </div>
            );
          })}
        </div>
        {/* termometr (raqamsiz) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u }}>
          <div style={{ width: 70 * u, height: 380 * u, borderRadius: 35 * u, border: `${5 * u}px solid ${C.text}`, display: 'flex', flexDirection: 'column-reverse', padding: 8 * u }}>
            <div style={{ height: `${lerp(temp, 80, 18)}%`, borderRadius: 30 * u, background: temp > 0.6 ? C.cyan : C.accent }} />
          </div>
          <div style={{ width: 120 * u, height: 120 * u, borderRadius: 120 * u, marginTop: -40 * u, background: temp > 0.6 ? C.cyan : C.accent, border: `${5 * u}px solid ${C.text}` }} />
          <div style={{ fontFamily, fontWeight: 800, fontSize: 48 * u, color: C.cyan, opacity: prog(0.55, 0.6) }}>NEAR FREEZING</div>
        </div>
      </AbsoluteFill>
      {/* qirov: chetlardan oq-ko'k parda va zarrachalar */}
      <AbsoluteFill style={{ boxShadow: `inset 0 0 ${260 * u}px rgba(186,230,253,${0.55 * frost})` }} />
      <Snow amount={frost} />
      <Sfx at={0.04} src="powerdown" volume={0.35} />
      <Sfx at={0.11} src="switch" volume={0.4} />
      <Sfx at={0.18} src="switch" volume={0.4} />
      <Sfx at={0.25} src="switch" volume={0.4} />
      <Sfx at={0.6} src="ding" volume={0.2} />
    </AbsoluteFill>
  );
};

const Snow: React.FC<{ amount: number }> = ({ amount }) => {
  const { frame, W, H, u } = useScene();
  return (
    <AbsoluteFill style={{ opacity: amount }}>
      {new Array(50).fill(0).map((_, i) => {
        const x = random(`sx${i}`) * W + Math.sin(frame / 30 + i) * 20 * u;
        const y = ((random(`sy${i}`) * H + frame * (0.6 + random(`sv${i}`)) * u) % H);
        const s = (3 + random(`ss${i}`) * 5) * u;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, background: '#E0F2FE', opacity: 0.7 }} />;
      })}
    </AbsoluteFill>
  );
};

// 12. QAYTISH — SM tashlanadi (zarar ko'rinadi), Aquarius qo'yib yuboriladi, Odyssey qiziydi
export const Reentry: React.FC = () => {
  const { u, prog, vertical, frame } = useScene();
  const sm = prog(0.16, 0.58);
  const lm = prog(0.55, 0.8);
  const fallP = prog(0.8, 1);
  const glow = prog(0.84, 1);
  return (
    <AbsoluteFill>
      <Stars count={110} />
      <Hud left="FINAL DAY · APRIL 17" right="SEPARATION" />
      {/* Yer pastdan ko'tariladi */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          width: 3000 * u,
          height: 3000 * u,
          marginLeft: -1500 * u,
          top: `${lerp(fallP, 115, 72)}%`,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 10%, #3B82F6 0%, #1E3A8A 30%, #0B1F5C 60%)',
          boxShadow: `0 ${-20 * u}px ${80 * u}px #60A5FA88`,
        }}
      />
      <Center>
        <div
          style={{
            width: (vertical ? 900 : 1200) * u,
            height: (vertical ? 400 : 520) * u,
            transform: `translateY(${fallP * 120 * u}px) scale(${lerp(fallP, 1, 0.7)}) rotate(${fallP * 20 + Math.sin(frame / 3) * glow * 1.5}deg)`,
          }}
        >
          <Spacecraft hi={sm < 1 ? 'sm' : null} damage={1} split={sm} splitLm={lm} glow={glow} />
        </div>
      </Center>
      <div style={{ position: 'absolute', top: vertical ? 300 * u : 170 * u, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ opacity: prog(0.3, 0.34) * (1 - prog(0.52, 0.55)) }}>
          <Tag color={C.red} size={38}>AN ENTIRE PANEL BLOWN AWAY</Tag>
        </div>
      </div>
      <div style={{ position: 'absolute', top: vertical ? 300 * u : 170 * u, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ opacity: prog(0.6, 0.64) * (1 - prog(0.78, 0.82)) }}>
          <Tag color={C.accent} size={38}>GOODBYE, AQUARIUS</Tag>
        </div>
      </div>
      <Sfx at={0.16} src="switch" volume={0.7} />
      <Sfx at={0.18} src="whoosh" volume={0.4} />
      <Sfx at={0.55} src="switch" volume={0.7} />
      <Sfx at={0.57} src="whoosh" volume={0.4} />
      <Sfx at={0.84} src="static" volume={0.3} />
    </AbsoluteFill>
  );
};

// 13. JIMLIK — aloqa uzilishi, kutish, signal
export const Blackout: React.FC = () => {
  const { frame, u, prog, at, vertical, W } = useScene();
  const sig = at(0.8);
  const got = frame >= sig;
  // signal chizig'i: avval tekis shovqin, keyin keskin to'lqin
  const pts = new Array(120).fill(0).map((_, i) => {
    const x = (i / 119) * 1400;
    const noise = (random(`n${i}-${Math.floor(frame / 2)}`) - 0.5) * 10;
    const wave = got ? Math.sin(i / 4 + frame / 3) * 90 * Math.min(1, (frame - sig) / 10) : 0;
    return `${x},${100 + noise + wave}`;
  });
  const blink = Math.floor(frame / 15) % 2 === 0;
  void W;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={{ opacity: got ? 0.5 : 0.12 }}>
        <Stars count={60} />
      </AbsoluteFill>
      <Center style={{ flexDirection: 'column', gap: 50 * u }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 40 * u, letterSpacing: 8 * u, color: got ? C.green : C.red, opacity: got || blink ? 1 : 0.25 }}>
          {got ? '● SIGNAL ACQUIRED' : '○ NO SIGNAL'}
        </div>
        <svg viewBox="0 0 1400 200" style={{ width: (vertical ? 950 : 1300) * u }}>
          <polyline points={pts.join(' ')} fill="none" stroke={got ? C.green : '#334155'} strokeWidth={5} />
        </svg>
        <div style={{ height: 140 * u, position: 'relative', width: '100%' }}>
          <Center style={{ opacity: prog(0.2, 0.25) * (1 - prog(0.76, 0.8)) }}>
            <Words text="Silence…" at={0.2} size={(vertical ? 90 : 110) * u} color={C.dim} />
          </Center>
          <Center style={{ opacity: got ? 1 : 0 }}>
            <Words text="Odyssey was *alive*" at={0.84} size={(vertical ? 90 : 110) * u} hi={C.green} />
          </Center>
        </div>
      </Center>
      <Sfx at={0.0} src="static" volume={0.4} />
      <Sfx at={0.28} src="pulse" volume={0.45} />
      <Sfx at={0.42} src="pulse" volume={0.45} />
      <Sfx at={0.56} src="pulse" volume={0.45} />
      <Sfx at={0.8} src="beep" volume={0.45} />
      <Sfx at={0.84} src="ding" volume={0.4} />
    </AbsoluteFill>
  );
};

// 14. SUVGA TUSHISH — uchta parashyut, okean
const Chute: React.FC<{ x: number; delay: number; fade: number }> = ({ x, delay, fade }) => {
  const { u, pop, frame } = useScene();
  const open = pop(delay, 12);
  const sway = Math.sin(frame / 25 + x) * 4;
  return (
    <svg viewBox="-110 -20 220 220" style={{ position: 'absolute', left: `calc(50% + ${x * u}px - ${150 * u}px)`, top: 0, width: 300 * u, height: 300 * u, opacity: 1 - fade, transform: `rotate(${sway + fade * 25 * Math.sign(x || 1)}deg) scale(${open * (1 - fade * 0.3)})`, transformOrigin: '50% 100%' }}>
      <path d="M-100 60 Q0 -60 100 60 Z" fill="#F97316" />
      <path d="M-100 60 Q-50 30 -33 60 Q0 20 33 60 Q50 30 100 60" fill="#FFF" opacity={0.85} />
      <path d="M-100 60 L0 200 M-33 60 L0 200 M33 60 L0 200 M100 60 L0 200" stroke="#E2E8F0" strokeWidth={2} />
    </svg>
  );
};

export const Splashdown: React.FC = () => {
  const { frame, u, prog, vertical, H, pop } = useScene();
  const fall = prog(0.0, 0.72);
  const splash = prog(0.72, 0.8);
  const groupY = lerp(fall, -0.15, vertical ? 0.42 : 0.3) * H;
  const bob = splash > 0 ? Math.sin(frame / 10) * 6 * u : 0;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 55%, #0EA5E9 56%, #075985 100%)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: groupY + bob, height: 480 * u }}>
        <Chute x={-230} delay={0.02} fade={splash} />
        <Chute x={0} delay={0.06} fade={splash} />
        <Chute x={230} delay={0.1} fade={splash} />
        {/* kapsula */}
        <svg viewBox="0 0 100 80" style={{ position: 'absolute', left: `calc(50% - ${60 * u}px)`, top: 300 * u, width: 120 * u, height: 96 * u }}>
          <path d="M20 70 L50 10 L80 70 Z" fill="#CBD5E1" stroke="#475569" strokeWidth={3} />
        </svg>
      </div>
      {/* to'lqinlar */}
      {new Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: `${-10 + ((i * 23 + frame * 0.3) % 120)}%`, top: `${60 + (i % 3) * 9}%`, width: 260 * u, height: 8 * u, borderRadius: 4 * u, background: '#E0F2FE', opacity: 0.35 }} />
      ))}
      {/* sachrash halqalari */}
      {[0, 1, 2].map((i) => {
        const p = prog(0.72 + i * 0.03, 0.92 + i * 0.03);
        return <div key={i} style={{ position: 'absolute', left: '50%', top: groupY + 350 * u, width: p * 700 * u, height: p * 120 * u, marginLeft: -p * 350 * u, marginTop: -p * 60 * u, borderRadius: '50%', border: `${4 * u}px solid #fff`, opacity: (1 - p) * 0.9 }} />;
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: vertical ? 420 * u : 110 * u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * u }}>
        <div style={{ fontFamily, fontWeight: 800, fontSize: (vertical ? 96 : 120) * u, color: '#fff', textShadow: `0 ${6 * u}px ${30 * u}px #0C4A6E`, transform: `scale(${pop(0.82, 10)})` }}>HOME.</div>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 32 * u, color: '#E0F2FE', letterSpacing: 5 * u, opacity: prog(0.85, 0.9) }}>SPLASHDOWN · APRIL 17, 1970 · SOUTH PACIFIC</div>
      </div>
      <Sfx at={0.02} src="whoosh" volume={0.4} />
      <Sfx at={0.06} src="whoosh" volume={0.3} />
      <Sfx at={0.72} src="boom" volume={0.4} />
      <Sfx at={0.82} src="ding" volume={0.45} />
    </AbsoluteFill>
  );
};

// 15. SABAB — 28 V uchun kalit, 65 V berilgan
export const Cause: React.FC = () => {
  const { frame, u, prog, pop, vertical, at } = useScene();
  const bars = prog(0.44, 0.54);
  const spark = frame > at(0.66) && frame < at(0.76) && Math.floor(frame / 3) % 2 === 0;
  const maxH = 420 * u;
  const bar = (label: string, v: number, color: string, p: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * u }}>
      <div style={{ fontFamily, fontWeight: 800, fontSize: 70 * u, color, opacity: p }}>{v} V</div>
      <div style={{ width: 170 * u, height: maxH, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', height: (v / 65) * maxH * p, background: color, borderRadius: `${14 * u}px ${14 * u}px 0 0` }} />
      </div>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 * u, color: C.dim, letterSpacing: 2 * u, textAlign: 'center', width: 300 * u }}>{label}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Stars count={60} />
      <Hud left="THE INVESTIGATION" right="OXYGEN TANK NO. 2" />
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: 100 * u, padding: 80 * u }}>
        <div style={{ display: 'flex', gap: 60 * u, alignItems: 'flex-end' }}>
          {bar('SWITCH RATED FOR', 28, C.green, bars)}
          {bar('GROUND TEST POWER', 65, C.red, prog(0.56, 0.66))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 * u, maxWidth: 640 * u }}>
          <div style={{ transform: `scale(${pop(0.66)})`, transformOrigin: 'left' }}>
            <Tag color={spark ? '#FDE047' : C.red} size={40}>⚡ SWITCH WELDED SHUT</Tag>
          </div>
          <div style={{ transform: `scale(${pop(0.76)})`, transformOrigin: 'left' }}>
            <Tag color={C.accent} size={40}>WIRES DAMAGED</Tag>
          </div>
          <div style={{ opacity: prog(0.84, 0.88) }}>
            <Words text="A *hidden* fault, waiting for one routine stir" at={0.84} size={(vertical ? 50 : 54) * u} align="left" />
          </div>
        </div>
      </AbsoluteFill>
      <Sfx at={0.44} src="pulse" volume={0.35} />
      <Sfx at={0.56} src="pulse" volume={0.45} />
      <Sfx at={0.66} src="static" volume={0.35} />
      <Sfx at={0.76} src="switch" volume={0.5} />
    </AbsoluteFill>
  );
};

// 16. XULOSA — "Successful failure", vaqt chizig'i, CTA
export const Outro: React.FC = () => {
  const { u, prog, pop, vertical, frame, at } = useScene();
  const events = [
    ['APR 11', 'LAUNCH'],
    ['APR 13', 'EXPLOSION'],
    ['APR 15', 'AROUND THE MOON'],
    ['APR 17', 'SPLASHDOWN'],
  ];
  const line = prog(0.3, 0.6);
  const cta = pop(0.78, 12);
  const click = frame - at(0.88);
  return (
    <AbsoluteFill>
      <Stars count={140} drift={0.5} />
      <Center style={{ flexDirection: 'column', gap: 60 * u, padding: 60 * u }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 30 * u, color: C.dim, letterSpacing: 6 * u, opacity: prog(0.0, 0.05) }}>NASA CALLED IT A</div>
          <div style={{ fontFamily, fontWeight: 800, fontSize: (vertical ? 100 : 130) * u, color: C.text, letterSpacing: lerp(prog(0.03, 0.2), 30, 4) * u, opacity: prog(0.03, 0.1), whiteSpace: vertical ? 'normal' : 'nowrap', lineHeight: 1.05 }}>
            SUCCESSFUL <span style={{ color: C.accent }}>FAILURE</span>
          </div>
        </div>
        {/* vaqt chizig'i */}
        <div style={{ position: 'relative', width: (vertical ? 900 : 1400) * u, height: 160 * u }}>
          <div style={{ position: 'absolute', top: 40 * u, left: 0, height: 6 * u, width: `${line * 100}%`, background: C.accent, borderRadius: 3 * u }} />
          {events.map(([d, t], i) => {
            const x = i / (events.length - 1);
            const p = prog(0.3 + x * 0.3, 0.33 + x * 0.3);
            return (
              <div key={d} style={{ position: 'absolute', left: `${x * 100}%`, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * u, opacity: p }}>
                <div style={{ width: 34 * u, height: 34 * u, borderRadius: 34 * u, marginTop: 26 * u, background: i === 1 ? C.red : i === 3 ? C.green : C.accent, border: `${5 * u}px solid ${C.bg}` }} />
                <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 26 * u, color: C.text }}>{d}</div>
                <div style={{ fontFamily: mono, fontWeight: 500, fontSize: (vertical ? 18 : 22) * u, color: C.dim, letterSpacing: 1 * u, whiteSpace: 'nowrap' }}>{t}</div>
              </div>
            );
          })}
        </div>
        {/* CTA */}
        <div style={{ position: 'relative', opacity: Math.min(1, cta), transform: `scale(${lerp(cta, 0.7, 1) * (click > 0 && click < 8 ? 0.94 : 1)})` }}>
          <div style={{ fontFamily, fontWeight: 800, fontSize: 48 * u, color: '#fff', background: click > 0 ? '#334155' : '#DC2626', padding: `${22 * u}px ${56 * u}px`, borderRadius: 60 * u }}>
            {click > 0 ? '✓ SUBSCRIBED' : 'SUBSCRIBE'}
          </div>
          {/* kursor va bosish to'lqini */}
          <div style={{ position: 'absolute', right: interpolate(prog(0.8, 0.88), [0, 1], [-260, 40]) * u, top: interpolate(prog(0.8, 0.88), [0, 1], [180, 50]) * u, fontSize: 60 * u, color: '#fff', filter: 'drop-shadow(0 4px 8px #000)' }}>➤</div>
          {click > 0 && click < 20 ? (
            <div style={{ position: 'absolute', right: (40 - (click * 6) / 2 + 20) * u, top: (50 - (click * 6) / 2 + 10) * u, width: click * 6 * u, height: click * 6 * u, borderRadius: '50%', border: `${4 * u}px solid #fff`, opacity: 1 - click / 20 }} />
          ) : null}
        </div>
        <div style={{ fontFamily, fontWeight: 600, fontSize: 32 * u, color: C.dim, opacity: prog(0.8, 0.85) }}>More true stories from history</div>
      </Center>
      <Sfx at={0.03} src="whoosh" volume={0.5} />
      <Sfx at={0.3} src="ding" volume={0.2} />
      <Sfx at={0.78} src="pulse" volume={0.4} />
      <Sfx at={0.88} src="switch" volume={0.6} />
      <Sfx at={0.9} src="ding" volume={0.4} />
    </AbsoluteFill>
  );
};
