import React from 'react';
import { CalculateMetadataFunction, Composition, Folder } from 'remotion';
import { ScriptVideo } from './ScriptVideo';
import { FPS, type VideoProps } from './types';
import { totalFrames } from './util';
import namuna from '../videos/namuna.json';
import { HomePilotAd } from './videos/homepilot/HomePilotAd';
import homepilotTimeline from './videos/homepilot/timeline.json';

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
    {/* Maxsus animatsion videolar (ssenariyda "komponent") */}
    <Composition id="HomePilotAd" component={HomePilotAd} width={1080} height={1920} fps={FPS} durationInFrames={homepilotTimeline.total} defaultProps={{ scenes: [] }} />
  </Folder>
);
