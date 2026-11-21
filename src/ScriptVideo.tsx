import React from 'react';
import { AbsoluteFill, interpolate, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import type { Scene, Theme, VideoProps } from './types';
import { resolveSrc, sceneFrames, themeOf, transitionFrames } from './util';
import { TitleSceneView } from './scenes/TitleSceneView';
import { TextSceneView } from './scenes/TextSceneView';
import { ImageSceneView, VideoSceneView } from './scenes/MediaScenes';
import { CUSTOM_SCENES } from './videos/registry';

const SceneView: React.FC<{ scene: Scene; theme: Theme }> = ({ scene, theme }) => {
  switch (scene.type) {
    case 'title':
      return <TitleSceneView scene={scene} theme={theme} />;
    case 'text':
      return <TextSceneView scene={scene} theme={theme} />;
    case 'image':
      return <ImageSceneView scene={scene} theme={theme} />;
    case 'video':
      return <VideoSceneView scene={scene} theme={theme} />;
    case 'custom': {
      const Comp = CUSTOM_SCENES[scene.name];
      return Comp ? <Comp theme={theme} scene={scene} /> : null;
    }
    default:
      return null;
  }
};

// Ssenariy (videos/*.json) bo'yicha butun video: sahnalar ketma-ket, orasida yumshoq o'tish, ovoz va musiqa.
export const ScriptVideo: React.FC<VideoProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const theme = themeOf(props);
  const t = transitionFrames(props);
  const frames = props.scenes.map((s) => sceneFrames(s.duration));
  const musicVolume = props.musicVolume ?? 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <TransitionSeries>
        {props.scenes.map((scene, i) => {
          const overlap = i > 0 ? Math.min(t, frames[i - 1] - 1, frames[i] - 1) : 0;
          return (
            <React.Fragment key={i}>
              {overlap > 0 ? (
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: overlap })} />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={frames[i]} premountFor={fps}>
                <SceneView scene={scene} theme={theme} />
                {scene.ovozFayl ? <Audio src={resolveSrc(scene.ovozFayl)} /> : null}
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {props.voiceover ? <Audio src={resolveSrc(props.voiceover)} /> : null}
      {props.music ? (
        <Audio
          src={resolveSrc(props.music)}
          loop
          // boshida sekin kuchayadi, oxirida sekin pasayadi
          volume={(f) =>
            interpolate(
              f,
              [0, fps, Math.max(fps + 1, durationInFrames - 2 * fps), durationInFrames],
              [0, musicVolume, musicVolume, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            )
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
