import React from 'react';
import { Group } from '@shopify/react-native-skia';
import { DrawingStroke } from './DrawingStroke';
import type { DrawingLayer as DrawingLayerType, StrokePoint, BlendMode } from '../../types/drawing';

// blendMode prop expects lowercase-first SkEnum strings, not numeric enum values
const BLEND_MAP: Record<BlendMode, string> = {
  'normal':     'srcOver',
  'multiply':   'multiply',
  'overlay':    'overlay',
  'screen':     'screen',
  'soft-light': 'softLight',
};

interface Props {
  layer: DrawingLayerType;
  livePoints?: StrokePoint[];
  liveWidth?: number;
  liveColor?: string;
  liveOpacity?: number;
  liveIsEraser?: boolean;
}

export function DrawingLayer({ layer, livePoints, liveWidth, liveColor, liveOpacity, liveIsEraser }: Props) {
  if (!layer.visible) return null;
  return (
    <Group opacity={layer.opacity} blendMode={BLEND_MAP[layer.blendMode] as any} layer>
      {layer.strokes.map(s => (
        <DrawingStroke key={s.id} points={s.points} width={s.width} color={s.color} opacity={s.opacity} isEraser={s.isEraser} />
      ))}
      {livePoints && livePoints.length > 1 && liveWidth !== undefined && liveColor && liveOpacity !== undefined && (
        <DrawingStroke
          points={livePoints}
          width={liveIsEraser ? liveWidth * 2 : liveWidth}
          color={liveColor}
          opacity={liveOpacity}
          isEraser={liveIsEraser}
        />
      )}
    </Group>
  );
}
