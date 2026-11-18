import React from 'react';
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { fontFamily } from '../../fonts';
import { C, G, S as AD, TopBar, HomeScreen, TasksScreen, MoneyScreen, Wordmark } from './HomePilotAd';
import T from './whip-timeline.json';

// HomePilot — 15 s «Sirpanish → Zoom → Whip» (skill: reklama-sirpanish-zoom). 9:16, 2D, shisha uslub.
// Ilova ekranlari HomePilotAd dagi bilan bir xil, kadrni siljitib tayyor holatda ko'rsatiladi.

const S = T.scenes;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const K = 2.2;
const W = 390 * K;
const WHIP = 9; // kadr

// Panel: o'ngdan blur bilan kiradi (sakrash), oxirida 1→1.2 zoom va chapga whip
const Panel: React.FC<{ from: number; to: number; freeze: number; scroll?: number; children: React.ReactNode }> = ({ from, to, freeze, scroll = 0, children }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const inS = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 120 } });
  const enterX = interpolate(inS, [0, 1], [1200, 0]);
  const enterBlur = interpolate(f - from, [0, 10], [24, 0], clamp);
  const zoom = interpolate(f, [to - WHIP - 18, to - WHIP], [1, 1.2], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outX = interpolate(f, [to - WHIP, to], [0, -1300], { ...clamp, easing: Easing.in(Easing.cubic) });
  const outBlur = interpolate(f, [to - WHIP, to], [0, 24], clamp);
  return (
    <div style={{ position: 'absolute', left: (1080 - W) / 2, top: 400, width: W, height: 560 * K, transform: `translateX(${enterX + outX}px) scale(${zoom})`, filter: `blur(${enterBlur + outBlur}px)`, transformOrigin: '50% 35%' }}>
      <div style={{ width: 390, height: 560, borderRadius: 28, overflow: 'hidden', transform: `scale(${K})`, transformOrigin: '0 0', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 30px 80px rgba(0,0,0,0.45)', position: 'relative' }}>
        <div style={{ height: 8 }} />
        <TopBar />
        <div style={{ position: 'absolute', top: 64, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0 16px', transform: `translateY(${-scroll}px)` }}>
            {/* Freeze kompozitsiya uzunligidan (450) katta kadrni qisqartiradi, shuning uchun Sequence siljitish:
                ichkarida useCurrentFrame() = freeze (ekran tayyor holatda) */}
            <Sequence from={f - freeze} layout="none">
              {children}
            </Sequence>
          </div>
        </div>
      </div>
    </div>
  );
};

// So'zma-so'z sarlavha (whip bilan birga chiqib ketadi)
const Words: React.FC<{ from: number; to: number; text: string; hi: string }> = ({ from, to, text, hi }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const outX = interpolate(f, [to - WHIP, to], [0, -1300], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 150, textAlign: 'center', transform: `translateX(${outX}px)` }}>
      {text.split(' ').map((w, i) => {
        const p = spring({ frame: f - from - 8 - i * 4, fps: 30, config: { damping: 12, stiffness: 180 } });
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: 20, fontSize: 80, fontWeight: 800, color: w.replace(/[.,]/g, '') === hi ? C.bright : C.text, opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})` }}>{w}</span>
        );
      })}
    </div>
  );
};

// Birinchi sarlavha harfma-harf yoziladi
const Typed: React.FC = () => {
  const f = useCurrentFrame();
  const t = T.typing[0];
  if (f >= S.s2) return null;
  const shown = t.text.slice(0, Math.max(0, Math.floor(((f - t.start) * t.cps) / 30)));
  const outX = interpolate(f, [S.s2 - WHIP, S.s2], [0, -1300], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 160, textAlign: 'center', fontSize: 80, fontWeight: 800, color: C.text, transform: `translateX(${outX}px)` }}>
      {shown}
      <span style={{ color: C.bright, opacity: Math.floor(f / 15) % 2 ? 0 : 1 }}>▍</span>
    </div>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.cta) return null;
  const logo = spring({ frame: f - S.cta - 12, fps: 30, config: { damping: 10, stiffness: 110 } });
  const glow = interpolate(f, [S.cta + 20, S.cta + 50], [0, 1], clamp);
  const word = spring({ frame: f - S.cta - 30, fps: 30, config: { damping: 14 } });
  const btnIn = spring({ frame: f - S.cta - 60, fps: 30, config: { damping: 12 } });
  const pulse = 1 + 0.08 * (Math.max(0, Math.sin(((f - 392) / 15) * Math.PI)) * (f >= 392 && f < 407 ? 1 : 0) + Math.max(0, Math.sin(((f - 422) / 15) * Math.PI)) * (f >= 422 && f < 437 ? 1 : 0));
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 300 }}>
      <div style={{ width: 360, height: 360, borderRadius: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${logo})`, ...G, boxShadow: `inset 0 2px 0 rgba(255,255,255,0.3), 0 0 ${140 * glow}px rgba(96,165,250,${0.55 * glow})` }}>
        <Img src={staticFile('homepilot/logo.png')} style={{ width: 260, height: 260 }} />
      </div>
      <div style={{ marginTop: 40, opacity: word, transform: `translateY(${(1 - word) * 30}px)` }}>
        <Wordmark size={100} />
      </div>
      <div style={{ marginTop: 50, opacity: btnIn, transform: `scale(${(0.7 + 0.3 * btnIn) * pulse})`, padding: '30px 70px', borderRadius: 999, background: C.blue, color: C.text, fontSize: 52, fontWeight: 800, boxShadow: '0 20px 60px rgba(59,130,246,0.5)' }}>Coming soon</div>
    </AbsoluteFill>
  );
};

const Bg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #0f172a, #1e40af)' }}>
      {[
        { c: 'rgba(34,211,238,0.35)', x: 80, y: 30, r: 440, sp: 60 },
        { c: 'rgba(139,92,246,0.35)', x: 20, y: 75, r: 480, sp: 75 },
      ].map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: `${b.x + Math.sin(f / b.sp + i) * 8}%`, top: `${b.y + Math.cos(f / b.sp) * 6}%`, width: b.r * 2, height: b.r * 2, marginLeft: -b.r, marginTop: -b.r, borderRadius: 9999, background: `radial-gradient(circle, ${b.c}, transparent 70%)`, filter: 'blur(40px)' }} />
      ))}
    </AbsoluteFill>
  );
};

type VoiceScene = { id?: string; ovozFayl?: string };
export const HomePilotWhip: React.FC<{ scenes?: VoiceScene[] }> = ({ scenes = [] }) => {
  const voiced = scenes.some((v) => v.ovozFayl);
  const ids = Object.keys(S) as (keyof typeof S)[];
  return (
    <AbsoluteFill style={{ fontFamily, overflow: 'hidden' }}>
      <Bg />
      <Typed />
      <Panel from={S.s1} to={S.s2} freeze={AD.systems - 1}>
        <HomeScreen />
      </Panel>
      <Words from={S.s2} to={S.s3} text="Never miss maintenance." hi="maintenance" />
      <Panel from={S.s2} to={S.s3} freeze={AD.money - 1}>
        <TasksScreen />
      </Panel>
      <Words from={S.s3} to={S.cta} text="Track every repair cost." hi="cost" />
      <Panel from={S.s3} to={S.cta} freeze={AD.ask - 1} scroll={300}>
        <MoneyScreen />
      </Panel>
      <Cta />
      <Sequence from={0}>
        <Audio src={staticFile('homepilot/whip-sfx.mp3')} volume={voiced ? 0.45 : 1} />
      </Sequence>
      {scenes.map((v, i) => {
        const id = (v.id ?? ids[i]) as keyof typeof S;
        return v.ovozFayl && S[id] !== undefined ? (
          <Sequence key={i} from={S[id] + 6}>
            <Audio src={staticFile(v.ovozFayl)} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
