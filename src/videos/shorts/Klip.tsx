import React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CustomScene, Theme } from '../../types';
import { resolveSrc } from '../../util';
import { fontFamily } from '../../fonts';
import { Sfx } from '../apollo13/kit';

// Tayyor kesilgan Shorts: hook sarlavha + kinetik subtitr + 2–3 zoom + oxirida «Obuna bo'ling»
const YELLOW = '#FFE600';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const OBUNA: Record<string, [string, string]> = {
  uz: ["Obuna bo'ling", "Obuna bo'lindi"],
  en: ['Subscribe', 'Subscribed'],
  ru: ['Подпишись', 'Вы подписаны'],
  tr: ['Abone ol', 'Abone olundu'],
};

type Word = { w: string; s: number; e: number };
// So'zlarni 1–3 tadan guruhlash: pauza yoki gap oxirida yangi guruh
const groupWords = (words: Word[]) => {
  const groups: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const gap = prev ? w.s - prev.e : 0;
    if (cur.length && (cur.length >= 3 || gap > 0.35 || /[.!?,;:]$/.test(prev?.w || ''))) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) groups.push(cur);
  return groups;
};

export const Klip: React.FC<{ theme: Theme; scene: CustomScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const t = frame / fps;
  const dur = durationInFrames / fps;
  const u = Math.min(width, height) / 1080;
  const src = scene.src ? resolveSrc(scene.src) : '';

  // --- Zoom (faqat 2–3 joyda): tez kirish, ushlab turish, silliq chiqish ---
  let zoom = 1;
  let ox = 0.5;
  let oy = 0.5;
  for (const z of scene.zoomlar || []) {
    const k = interpolate(t, [z.t - 0.1, z.t + 0.15, z.t + 1.4, z.t + 1.8], [0, 1, 1, 0], clamp);
    if (k > 0) {
      zoom = Math.max(zoom, 1 + 0.2 * k);
      ox = z.x;
      oy = z.y;
    }
  }

  // --- Hook: 0–2.8 s, tepada ---
  const hookIn = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const hookOut = interpolate(t, [2.6, 3.0], [0, 1], clamp);

  // --- Subtitr ---
  const groups = groupWords(scene.subtitr || []);
  const gi = groups.findIndex((g, i) => t >= g[0].s - 0.05 && t < (groups[i + 1]?.[0].s ?? g[g.length - 1].e + 0.4));
  const group = gi >= 0 ? groups[gi] : null;
  const groupPop = group ? spring({ frame: frame - Math.round(group[0].s * fps), fps, config: { damping: 14, mass: 0.5 } }) : 0;

  // --- Obuna: oxirgi 2.4 s ---
  const ctaStart = Math.max(0, dur - 2.4);
  const ctaIn = spring({ frame: frame - Math.round(ctaStart * fps), fps, config: { damping: 11, mass: 0.6 } });
  const tapT = ctaStart + 1.2;
  const tapped = t >= tapT;
  const [obuna, obunaDone] = scene.obuna ? [scene.obuna, scene.obuna] : OBUNA[scene.til || 'en'] || OBUNA.en;
  const ring = interpolate(t, [tapT, tapT + 0.5], [0, 1], clamp);

  const stroke = { WebkitTextStroke: `${6 * u}px #000`, paintOrder: 'stroke fill' } as React.CSSProperties;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      {/* fon: xira nusxa (gorizontal videoda bo'sh joyni to'ldiradi) */}
      {src && !scene.vertikal ? (
        <OffthreadVideo src={src} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.55)', transform: 'scale(1.15)' }} />
      ) : null}
      {src ? (
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
          <OffthreadVideo src={src} muted={scene.muted ?? false} style={{ width: '100%', height: '100%', objectFit: scene.vertikal ? 'cover' : 'contain' }} />
        </AbsoluteFill>
      ) : null}

      {/* Hook sarlavha */}
      {scene.hook && hookOut < 1 ? (
        <div style={{ position: 'absolute', top: height * 0.12, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - hookOut, transform: `translateY(${-hookOut * 80 * u}px)` }}>
          <div
            style={{
              maxWidth: width * 0.86,
              background: '#fff',
              color: '#000',
              fontFamily,
              fontWeight: 900,
              fontSize: 76 * u,
              lineHeight: 1.08,
              textAlign: 'center',
              padding: `${18 * u}px ${30 * u}px`,
              borderRadius: 22 * u,
              boxShadow: `0 ${10 * u}px ${40 * u}px rgba(0,0,0,0.5)`,
              transform: `rotate(-2deg) scale(${0.6 + 0.4 * hookIn})`,
            }}
          >
            {scene.hook}
          </div>
        </div>
      ) : null}

      {/* Kinetik subtitr: guruh sakrab chiqadi, aytilayotgan so'z sariq */}
      {group && t < ctaStart + 0.3 ? (
        <div style={{ position: 'absolute', top: height * 0.6, left: width * 0.06, right: width * 0.12, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${22 * u}px`, transform: `scale(${0.75 + 0.25 * groupPop})` }}>
          {group.map((w, i) => {
            const active = t >= w.s && t < w.e + 0.05;
            return (
              <span key={i} style={{ fontFamily, fontWeight: 900, fontSize: 92 * u, lineHeight: 1.1, color: active ? YELLOW : '#fff', textTransform: 'uppercase', transform: `scale(${active ? 1.12 : 1})`, display: 'inline-block', textShadow: `0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.6)`, ...stroke }}>
                {w.w}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Obuna bo'ling */}
      {t >= ctaStart ? (
        <div style={{ position: 'absolute', top: height * 0.13, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - ctaIn) * -200 * u}px) scale(${tapped && t < tapT + 0.25 ? 0.93 : 1})` }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 * u, background: tapped ? '#3F3F46' : '#E11D24', color: '#fff', fontFamily, fontWeight: 900, fontSize: 64 * u, padding: `${22 * u}px ${46 * u}px`, borderRadius: 80 * u, boxShadow: `0 ${10 * u}px ${40 * u}px rgba(0,0,0,0.5)` }}>
            <span style={{ fontSize: 50 * u }}>{tapped ? '✓' : '▶'}</span>
            {tapped ? obunaDone : obuna}
            {ring > 0 && ring < 1 ? (
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 400 * u * ring, height: 400 * u * ring, marginLeft: -200 * u * ring, marginTop: -200 * u * ring, borderRadius: '50%', border: `${6 * u}px solid #fff`, opacity: 1 - ring }} />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* SFX */}
      {scene.hook ? <Sfx at={0} src="whoosh" volume={0.35} /> : null}
      {(scene.zoomlar || []).map((z, i) => (
        <Sfx key={i} at={Math.max(0, (z.t - 0.1) / dur)} src="whoosh" volume={0.2} />
      ))}
      <Sfx at={ctaStart / dur} src="pulse" volume={0.4} />
      <Sfx at={tapT / dur} src="switch" volume={0.6} />
    </AbsoluteFill>
  );
};
