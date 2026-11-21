import React from 'react';
import type { CustomScene, Theme } from '../types';
import { Klip } from './shorts/Klip';

// Koddan yasalgan sahnalar: ssenariyda { "type": "custom", "name": "<kalit>" }
export const CUSTOM_SCENES: Record<string, React.FC<{ theme: Theme; scene: CustomScene }>> = {
  'shorts/klip': Klip,
};
