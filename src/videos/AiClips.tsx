import React from 'react';
import { AbsoluteFill, CalculateMetadataFunction, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';

// Universal: AI clips (Runway / Google / fal) played back to back with their OWN sound (dialogue, music).
// videos/<nom>.json → "komponent": "AiClips"; each video scene's "duration" (seconds) sets its length.

type Scene = { type: string; src?: string; duration?: number; title?: string; subtitle?: string; boshi?: number; rasm?: string };
// musiqa.fayl bo'lsa — butun video ostida bitta kuy, kliplarning o'z ovozi o'chadi (kliplarOvozi bilan qisman qoldirsa bo'ladi)
export type AiClipsProps = { scenes?: Scene[]; musiqa?: { fayl?: string; balandlik?: number; kliplarOvozi?: number } };
const FPS = 30;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const clipsOf = (scenes: Scene[] = []) => scenes.filter((s) => s.type === 'video' || s.type === 'title' || s.type === 'poster');

export const aiClipsMetadata: CalculateMetadataFunction<AiClipsProps> = ({ props }) => {
  const total = clipsOf(props.scenes).reduce((a, s) => a + Math.round((s.duration || 8) * FPS), 0);
  return { durationInFrames: Math.max(FPS, total) };
};

export const AiClips: React.FC<AiClipsProps> = ({ scenes = [], musiqa }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const music = musiqa && musiqa.fayl;
  const clipVol = music ? musiqa!.kliplarOvozi ?? 0 : 1;
  let at = 0;
  const fade = Math.max(interpolate(f, [0, 12], [1, 0], clamp), interpolate(f, [durationInFrames - 8, durationInFrames], [0, 1], clamp));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {clipsOf(scenes).map((s, i) => {
        const len = Math.round((s.duration || 8) * FPS);
        const from = at;
        at += len;
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            {s.type === 'poster' && s.rasm ? (
              <Poster rasm={s.rasm} subtitle={s.subtitle || ''} len={len} />
            ) : s.type === 'title' ? (
              <TitleCard title={s.title || ''} subtitle={s.subtitle || ''} len={len} />
            ) : s.src ? (
              <OffthreadVideo src={staticFile(s.src)} trimBefore={Math.round((s.boshi || 0) * FPS)} volume={clipVol === 0 ? 0 : s.boshi !== undefined ? (fr: number) => clipVol * interpolate(fr, [0, 4, len - 4, len], [0, 1, 1, 0], clamp) : clipVol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <AbsoluteFill style={{ background: '#140a24', color: '#fff', justifyContent: 'center', alignItems: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>AI clip not generated yet</AbsoluteFill>
            )}
          </Sequence>
        );
      })}
      {music && (
        <Audio src={staticFile(music)} volume={(fr: number) => (musiqa!.balandlik ?? 1) * interpolate(fr, [0, 15, durationInFrames - 45, durationInFrames], [0, 1, 1, 0], clamp)} />
      )}
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  );
};

// Poster (nom va rasm): sekin yaqinlashadi, ostida qisqa yozuv
const Poster: React.FC<{ rasm: string; subtitle: string; len: number }> = ({ rasm, subtitle, len }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12], [0, 1], clamp);
  const z = interpolate(f, [0, len], [1.0, 1.07], clamp);
  const o2 = interpolate(f, [24, 38], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: '#000', opacity: o }}>
      <Img src={staticFile(rasm)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})` }} />
      {subtitle && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', opacity: o2, color: '#FFF4DA', fontFamily: 'Georgia, serif', fontSize: 54, fontWeight: 700, letterSpacing: 12, textShadow: '0 0 24px rgba(0,0,0,.9), 0 0 30px rgba(243,190,90,.5)' }}>{subtitle}</div>
      )}
    </AbsoluteFill>
  );
};

// Final title card: black, title fades/zooms in (no AI — always crisp text)
const TitleCard: React.FC<{ title: string; subtitle: string; len: number }> = ({ title, subtitle, len }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [2, 10, len - 4, len], [0, 1, 1, 0.6], clamp);
  const z = interpolate(f, [0, len], [1.08, 1], clamp);
  const o2 = interpolate(f, [8, 18], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
      <div style={{ opacity: o, transform: `scale(${z})`, color: '#F3D58A', fontSize: 150, letterSpacing: 24, fontWeight: 700, textShadow: '0 0 40px rgba(243,190,90,.55)' }}>{title}</div>
      <div style={{ opacity: Math.min(o, o2), color: '#FFF4DA', fontSize: 62, fontWeight: 700, letterSpacing: 10, marginTop: 30, textShadow: '0 0 24px rgba(243,190,90,.45)' }}>{subtitle}</div>
    </AbsoluteFill>
  );
};
