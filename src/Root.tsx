import React from 'react';
import { CalculateMetadataFunction, Composition, Folder } from 'remotion';
import { ScriptVideo } from './ScriptVideo';
import { FPS, type VideoProps } from './types';
import { totalFrames } from './util';
import namuna from '../videos/namuna.json';
import { UZUN_DEFAULT, UzunImzo, type UzunProps } from './videos/uzun/UzunImzo';

// Uzunlik ssenariydan hisoblanadi: render paytida --props=videos/<nom>.json beriladi
const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: totalFrames(props),
  fps: FPS,
});

const defaults = namuna as VideoProps;

export const Root: React.FC = () => (
  <Folder name="Videolar">
    {/* YouTube — gorizontal 16:9 */}
    <Composition
      id="YouTube"
      component={ScriptVideo}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={totalFrames(defaults)}
      defaultProps={defaults}
      calculateMetadata={calculateMetadata}
    />
    {/* Shorts / Reels / TikTok — vertikal 9:16 */}
    <Composition
      id="Shorts"
      component={ScriptVideo}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={totalFrames(defaults)}
      defaultProps={defaults}
      calculateMetadata={calculateMetadata}
    />
    {/* Uzun video imzosi: bitta qisqa oyna (scripts/uzun-imzo.mjs render qiladi) */}
    <Composition
      id="UzunImzo"
      component={UzunImzo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={240}
      defaultProps={UZUN_DEFAULT}
      calculateMetadata={({ props }: { props: UzunProps }) => ({
        width: props.width,
        height: props.height,
        fps: props.fps,
        durationInFrames: Math.max(1, Math.round(props.len * props.fps)),
      })}
    />
  </Folder>
);
