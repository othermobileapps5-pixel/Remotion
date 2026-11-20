import React from 'react';
import { CalculateMetadataFunction, Composition, Folder } from 'remotion';
import { ScriptVideo } from './ScriptVideo';
import { FPS, type VideoProps } from './types';
import { totalFrames } from './util';
import namuna from '../videos/namuna.json';
import { HomePilotAd } from './videos/homepilot/HomePilotAd';
import { VenusRomance } from './videos/venus/VenusRomance';
import { VenusDialog, DIALOG_TOTAL } from './videos/venus/VenusDialog';
import { AiClips, aiClipsMetadata } from './videos/AiClips';
import venusTimeline from './videos/venus/timeline.json';
import homepilotTimeline from './videos/homepilot/timeline.json';
import { HomePilotWhip } from './videos/homepilot/HomePilotWhip';
import whipTimeline from './videos/homepilot/whip-timeline.json';
import { TradingShort, tradingMetadata } from './videos/trading/TradingShort';
import tradingScript from '../videos/trading-xatolar.json';

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
    <Composition id="HomePilotWhip" component={HomePilotWhip} width={1080} height={1920} fps={FPS} durationInFrames={whipTimeline.total} defaultProps={{ scenes: [] }} />
    <Composition id="VenusRomance" component={VenusRomance} width={1920} height={1080} fps={FPS} durationInFrames={venusTimeline.total} defaultProps={{ scenes: [] }} />
    <Composition id="VenusDialog" component={VenusDialog} width={1920} height={1080} fps={FPS} durationInFrames={DIALOG_TOTAL} defaultProps={{ scenes: [] }} />
    <Composition id="AiClips" component={AiClips} width={1920} height={1080} fps={FPS} durationInFrames={240} defaultProps={{ scenes: [] }} calculateMetadata={aiClipsMetadata} />
    <Composition id="TradingShort" component={TradingShort} width={1080} height={1920} fps={FPS} durationInFrames={1200} defaultProps={{ scenes: tradingScript.scenes }} calculateMetadata={tradingMetadata} />
  </Folder>
);
