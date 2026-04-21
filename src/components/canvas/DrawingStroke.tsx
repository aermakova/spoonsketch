import React from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { getStroke } from 'perfect-freehand';
import type { StrokePoint } from '../../types/drawing';

function toSkiaPath(polygon: number[][]): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  if (polygon.length < 3) return path;
  const avg = (a: number, b: number) => (a + b) / 2;
  path.moveTo(
    avg(polygon[0][0], polygon[1][0]),
    avg(polygon[0][1], polygon[1][1]),
  );
  for (let i = 1; i < polygon.length - 1; i++) {
    path.quadTo(
      polygon[i][0], polygon[i][1],
      avg(polygon[i][0], polygon[i + 1][0]),
      avg(polygon[i][1], polygon[i + 1][1]),
    );
  }
  path.close();
  return path;
}

interface Props {
  points: StrokePoint[];
  width: number;
  color: string;
  opacity: number;
  isEraser?: boolean;
}

export function DrawingStroke({ points, width, color, opacity, isEraser }: Props) {
  const polygon = getStroke(points, {
    size: width,
    thinning: isEraser ? 0 : 0.7,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: false,
  });
  const path = toSkiaPath(polygon);
  return (
    <Path
      path={path}
      color={isEraser ? '#000000' : color}
      style="fill"
      opacity={isEraser ? 1 : opacity}
      blendMode={isEraser ? 'clear' : undefined}
    />
  );
}
