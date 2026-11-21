import React from 'react';
import type { CustomScene, Theme } from '../types';
import { Crew, Hook, Ship, Title } from './apollo13/Scenes1';
import { Damage, Explosion, Lifeboat, Record, Trajectory } from './apollo13/Scenes2';
import { Blackout, Cause, Co2, Cold, Outro, Reentry, Splashdown } from './apollo13/Scenes3';
import { BOBIL } from './bobil';
import { Klip } from './shorts/Klip';

// Koddan yasalgan sahnalar: ssenariyda { "type": "custom", "name": "<kalit>" }
export const CUSTOM_SCENES: Record<string, React.FC<{ theme: Theme; scene: CustomScene }>> = {
  'apollo13/hook': Hook,
  'apollo13/title': Title,
  'apollo13/crew': Crew,
  'apollo13/ship': Ship,
  'apollo13/explosion': Explosion,
  'apollo13/damage': Damage,
  'apollo13/lifeboat': Lifeboat,
  'apollo13/trajectory': Trajectory,
  'apollo13/record': Record,
  'apollo13/co2': Co2,
  'apollo13/cold': Cold,
  'apollo13/reentry': Reentry,
  'apollo13/blackout': Blackout,
  'apollo13/splashdown': Splashdown,
  'apollo13/cause': Cause,
  'apollo13/outro': Outro,
  ...BOBIL,
  'shorts/klip': Klip,
};
