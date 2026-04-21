export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen' | 'soft-light';

export interface DrawingStroke {
  id: string;
  points: StrokePoint[];
  width: number;
  color: string;
  opacity: number;
  isEraser?: boolean;
}

export interface DrawingLayer {
  id: string;
  name: string;
  strokes: DrawingStroke[];
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  zIndex: number;
}
