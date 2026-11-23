import React from 'react';
import { CalculateMetadataFunction, Composition, Folder } from 'remotion';
import { ScriptVideo } from './ScriptVideo';
import { FPS, type VideoProps } from './types';
import { totalFrames } from './util';
import namuna from '../videos/namuna.json';
import { UZUN_DEFAULT, UzunImzo, type UzunProps } from './videos/uzun/UzunImzo';
import { Muqova, MUQOVA_DEFAULT } from './videos/muqova/Muqova';
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
import { TomyFilm, tomyMetadata } from './videos/tomy/TomyFilm';
import tomyScript from '../videos/tomy-robot.json';
import { LolaFilm, lolaMetadata } from './videos/lola/LolaFilm';
import lolaScript from '../videos/lola-film.json';

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
    {/* Maxsus animatsion videolar (ssenariyda "komponent") */}
    {/* YouTube muqovasi — still: npx remotion still src/index.ts Muqova out.jpg --props=... */}
    <Composition id="Muqova" component={Muqova} width={1280} height={720} fps={FPS} durationInFrames={1} defaultProps={MUQOVA_DEFAULT} />
    <Composition id="HomePilotAd" component={HomePilotAd} width={1080} height={1920} fps={FPS} durationInFrames={homepilotTimeline.total} defaultProps={{ scenes: [] }} />
    <Composition id="HomePilotWhip" component={HomePilotWhip} width={1080} height={1920} fps={FPS} durationInFrames={whipTimeline.total} defaultProps={{ scenes: [] }} />
    <Composition id="VenusRomance" component={VenusRomance} width={1920} height={1080} fps={FPS} durationInFrames={venusTimeline.total} defaultProps={{ scenes: [] }} />
    <Composition id="VenusDialog" component={VenusDialog} width={1920} height={1080} fps={FPS} durationInFrames={DIALOG_TOTAL} defaultProps={{ scenes: [] }} />
    <Composition id="AiClips" component={AiClips} width={1920} height={1080} fps={FPS} durationInFrames={240} defaultProps={{ scenes: [] }} calculateMetadata={aiClipsMetadata} />
    <Composition id="TradingShort" component={TradingShort} width={1080} height={1920} fps={FPS} durationInFrames={1200} defaultProps={{ scenes: tradingScript.scenes }} calculateMetadata={tradingMetadata} />
    {/* Tomy the Robot — ovozli 2D multfilm (videos/tomy-robot.json, "komponent": "TomyFilm") */}
    <Composition id="TomyFilm" component={TomyFilm} width={1080} height={1920} fps={FPS} durationInFrames={2100} defaultProps={tomyScript as unknown as VideoProps} calculateMetadata={tomyMetadata} />
    {/* Lola and the Perfect Picture — oq-qora chiziqli 2D multfilm (videos/lola-film.json, "komponent": "LolaFilm") */}
    <Composition id="LolaFilm" component={LolaFilm} width={1080} height={1920} fps={FPS} durationInFrames={2100} defaultProps={lolaScript as unknown as VideoProps} calculateMetadata={lolaMetadata} />
  </Folder>
);
