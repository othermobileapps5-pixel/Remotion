import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { resolveSrc } from '../../util';
import { fontFamily } from '../../fonts';

// Uzun video uchun imzo: butun video emas, faqat bitta qisqa oyna (boshi / o'rtasi / oxiri) render qilinadi.
// scripts/uzun-imzo.mjs har oynani alohida render qilib, ffmpeg bilan asl video ustiga qo'yadi.
export type UzunProps = {
  src: string; // asl video (public/ ga nisbatan)
  start: number; // oyna boshlanishi asl videoda, sek
  len: number; // oyna uzunligi, sek
  kind: 'bosh' | 'orta' | 'oxir';
  width: number;
  height: number;
  fps: number;
  hook?: string;
  til?: string;
  obuna?: string;
  subtitr?: { w: string; s: number; e: number }[]; // oyna ichidagi vaqtlar
  zoomlar?: { t: number; x: number; y: number }[]; // oyna ichidagi vaqtlar
};

export const UZUN_DEFAULT: UzunProps = { src: 'test/shorts-sinov.mp4', start: 0, len: 8, kind: 'bosh', width: 1920, height: 1080, fps: 30, hook: 'Hook' };

const YELLOW = '#FFE600';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const OBUNA: Record<string, [string, string]> = {
  uz: ["Obuna bo'ling", "Obuna bo'lindi"],
  en: ['Subscribe', 'Subscribed'],
  ru: ['Подпишись', 'Вы подписаны'],
  tr: ['Abone ol', 'Abone olundu'],
};

const Sfx: React.FC<{ sec: number; src: string; volume?: number }> = ({ sec, src, volume = 0.5 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(sec * fps))} layout="none">
      <Audio src={staticFile(`audio/shorts/${src}.wav`)} volume={volume} />
    </Sequence>
  );
};

type Word = { w: string; s: number; e: number };
const groupWords = (words: Word[], max: number) => {
  const groups: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && (cur.length >= max || w.s - (prev?.e ?? w.s) > 0.35 || /[.!?,;:]$/.test(prev?.w || ''))) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) groups.push(cur);
  return groups;
};

// Obuna tugmasi: bosiladi va «Obuna bo'lindi» bo'ladi
const ObunaBtn: React.FC<{ t: number; at: number; tap: number; size: number; til?: string; obuna?: string }> = ({ t, at, tap, size, til, obuna }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 11, mass: 0.6 } });
  const tapped = t >= tap;
  const [a, b] = obuna ? [obuna, obuna] : OBUNA[til || 'en'] || OBUNA.en;
  const ring = interpolate(t, [tap, tap + 0.5], [0, 1], clamp);
  if (t < at) return null;
  return (
    <div style={{ position: 'relative', transform: `scale(${p * (tapped && t < tap + 0.25 ? 0.93 : 1)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3, background: tapped ? '#3F3F46' : '#E11D24', color: '#fff', fontFamily, fontWeight: 900, fontSize: size, padding: `${size * 0.35}px ${size * 0.75}px`, borderRadius: size * 1.2, boxShadow: `0 ${size * 0.15}px ${size * 0.6}px rgba(0,0,0,0.5)`, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: size * 0.8 }}>{tapped ? '✓' : '▶'}</span>
        {tapped ? b : a}
      </div>
      {ring > 0 && ring < 1 ? (
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: size * 6 * ring, height: size * 6 * ring, marginLeft: -size * 3 * ring, marginTop: -size * 3 * ring, borderRadius: '50%', border: `${size * 0.1}px solid #fff`, opacity: 1 - ring }} />
      ) : null}
    </div>
  );
};

export const UzunImzo: React.FC<UzunProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const vertical = height > width;
  const u = Math.min(width, height) / 1080;

  // zoom (oyna ichida 1 ta)
  let zoom = 1;
  let ox = 0.5;
  let oy = 0.5;
  for (const z of p.zoomlar || []) {
    const k = interpolate(t, [z.t - 0.1, z.t + 0.15, z.t + 1.5, z.t + 1.9], [0, 1, 1, 0], clamp);
    if (k > 0) {
      zoom = Math.max(zoom, 1 + 0.15 * k);
      ox = z.x;
      oy = z.y;
    }
  }
  // chegaralarda asl videoga silliq qaytish uchun zoom oyna chetida 1 bo'ladi (yuqoridagi interpolatsiya shuni ta'minlaydi)

  const groups = groupWords(p.subtitr || [], vertical ? 3 : 5);
  const gi = groups.findIndex((g, i) => t >= g[0].s - 0.05 && t < (groups[i + 1]?.[0].s ?? g[g.length - 1].e + 0.4));
  const group = gi >= 0 ? groups[gi] : null;
  const groupPop = group ? spring({ frame: frame - Math.round(group[0].s * fps), fps, config: { damping: 14, mass: 0.5 } }) : 0;

  // matnlar oyna chetlarida yumshoq kirib-chiqadi (asl videoga sakrash bo'lmasin)
  const edge = interpolate(t, [0, 0.3, p.len - 0.35, p.len], [0, 1, 1, 0], clamp);
  const hookIn = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const hookOut = interpolate(t, [3.4, 3.8], [0, 1], clamp);
  const ctaAt = p.kind === 'oxir' ? Math.max(0.5, p.len - 4.5) : 1.0;
  const ctaTap = ctaAt + 1.4;
  const stroke = { WebkitTextStroke: `${(vertical ? 6 : 5) * u}px #000`, paintOrder: 'stroke fill' } as React.CSSProperties;
  const showSubs = group && !(p.kind === 'oxir' && t >= ctaAt);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
        <OffthreadVideo src={resolveSrc(p.src)} startFrom={Math.round(p.start * fps)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>

      {/* Boshi: hook sarlavha */}
      {p.kind === 'bosh' && p.hook && hookOut < 1 ? (
        <div style={{ position: 'absolute', top: height * (vertical ? 0.12 : 0.08), left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - hookOut, transform: `translateY(${-hookOut * 60 * u}px)` }}>
          <div style={{ maxWidth: width * (vertical ? 0.86 : 0.7), background: '#fff', color: '#000', fontFamily, fontWeight: 900, fontSize: (vertical ? 76 : 70) * u, lineHeight: 1.08, textAlign: 'center', padding: `${16 * u}px ${30 * u}px`, borderRadius: 20 * u, boxShadow: `0 ${10 * u}px ${40 * u}px rgba(0,0,0,0.5)`, transform: `rotate(-1.5deg) scale(${0.6 + 0.4 * hookIn})` }}>
            {p.hook}
          </div>
        </div>
      ) : null}

      {/* Kinetik subtitr */}
      {showSubs ? (
        <div style={{ position: 'absolute', top: height * (vertical ? 0.6 : 0.74), left: width * 0.08, right: width * 0.08, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${6 * u}px ${30 * u}px`, opacity: edge, transform: `scale(${0.8 + 0.2 * groupPop})` }}>
          {group!.map((w, i) => {
            const active = t >= w.s && t < w.e + 0.05;
            return (
              <span key={i} style={{ fontFamily, fontWeight: 900, fontSize: (vertical ? 92 : 78) * u, lineHeight: 1.1, color: active ? YELLOW : '#fff', textTransform: 'uppercase', display: 'inline-block', transform: `scale(${active ? 1.07 : 1})`, textShadow: `0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.6)`, ...stroke }}>
                {w.w}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* O'rtasi: kichik obuna eslatmasi (pastki o'ng burchak, YouTube tugmalaridan yuqorida) */}
      {p.kind === 'orta' ? (
        <div style={{ position: 'absolute', right: width * 0.04, bottom: height * (vertical ? 0.22 : 0.08), opacity: interpolate(t, [p.len - 1.2, p.len - 0.6], [1, 0], clamp) }}>
          <ObunaBtn t={t} at={ctaAt} tap={ctaTap} size={(vertical ? 52 : 44) * u} til={p.til} obuna={p.obuna} />
        </div>
      ) : null}

      {/* Oxiri: katta obuna */}
      {p.kind === 'oxir' && t >= ctaAt ? (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: `rgba(0,0,0,${0.45 * interpolate(t, [ctaAt, ctaAt + 0.4], [0, 1], clamp) * edge})` }}>
          <div style={{ opacity: edge }}>
            <ObunaBtn t={t} at={ctaAt} tap={ctaTap} size={(vertical ? 72 : 66) * u} til={p.til} obuna={p.obuna} />
          </div>
        </AbsoluteFill>
      ) : null}

      {p.kind === 'bosh' && p.hook ? <Sfx sec={0} src="whoosh" volume={0.35} /> : null}
      {(p.zoomlar || []).map((z, i) => (
        <Sfx key={i} sec={Math.max(0, z.t - 0.1)} src="whoosh" volume={0.2} />
      ))}
      {p.kind !== 'bosh' ? <Sfx sec={ctaAt} src="pulse" volume={0.4} /> : null}
      {p.kind !== 'bosh' ? <Sfx sec={ctaTap} src="switch" volume={0.6} /> : null}
    </AbsoluteFill>
  );
};
