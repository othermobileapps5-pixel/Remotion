import React from 'react';
import { CalculateMetadataFunction, Composition, Folder } from 'remotion';
import { ScriptVideo } from './ScriptVideo';
import { FPS, type VideoProps } from './types';
import { totalFrames } from './util';
import namuna from '../videos/namuna.json';
import { HollywoodShort, HOLLYWOOD_FRAMES } from './videos/hollywood/Hollywood';

// Uzunlik ssenariydan hisoblanadi: render paytida --props=videos/<nom>.json beriladi
const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: totalFrames(props),
  fps: FPS,
});

const defaults = namuna as VideoProps;

export const Root: React.FC = () => (
  <>
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
  </Folder>
  {/* Multfilm: Hollywood yozuvi (three.js, vertikal) */}
  <Folder name="Multfilm">
    <Composition id="HollywoodShort" component={HollywoodShort} width={1080} height={1920} fps={30} durationInFrames={HOLLYWOOD_FRAMES} />
  </Folder>
  </>
);
