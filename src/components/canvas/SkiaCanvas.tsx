import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { DrawingLayer } from './DrawingLayer';
import { useDrawingStore } from '../../lib/drawingStore';
import type { StrokePoint } from '../../types/drawing';

interface Props {
  width: number;
  height: number;
  isDrawing: boolean;
}

export function SkiaCanvas({ width, height, isDrawing }: Props) {
  const [livePoints, setLivePoints] = useState<StrokePoint[]>([]);
  const liveRef = useRef<StrokePoint[]>([]);

  const { layers, activeLayerId, activeTool, strokeWidth, color, opacity, commitStroke } = useDrawingStore();
  const sorted = useMemo(() => [...layers].sort((a, b) => a.zIndex - b.zIndex), [layers]);

  const beginStroke = useCallback((pt: StrokePoint) => {
    liveRef.current = [pt];
    setLivePoints([pt]);
  }, []);

  const addPoint = useCallback((pt: StrokePoint) => {
    liveRef.current = [...liveRef.current, pt];
    setLivePoints([...liveRef.current]);
  }, []);

  const endStroke = useCallback(() => {
    commitStroke(liveRef.current);
    liveRef.current = [];
    setLivePoints([]);
  }, [commitStroke]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drawGesture = useMemo(() =>
    Gesture.Pan()
      .minDistance(0)
      .onBegin(e => runOnJS(beginStroke)({ x: e.x, y: e.y, pressure: (e as any).pressure ?? 0.5 }))
      .onChange(e => runOnJS(addPoint)({ x: e.x, y: e.y, pressure: (e as any).pressure ?? 0.5 }))
      .onEnd(() => runOnJS(endStroke)()),
  []);

  const canvasContent = (
    <Canvas style={{ width, height }}>
      {sorted.map(layer => (
        <DrawingLayer
          key={layer.id}
          layer={layer}
          livePoints={layer.id === activeLayerId ? livePoints : undefined}
          liveWidth={strokeWidth}
          liveColor={color}
          liveOpacity={opacity}
          liveIsEraser={activeTool === 'eraser'}
        />
      ))}
    </Canvas>
  );

  if (!isDrawing) {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', width, height }}>
        {canvasContent}
      </View>
    );
  }

  return (
    <GestureDetector gesture={drawGesture}>
      <View style={{ position: 'absolute', width, height }}>
        {canvasContent}
      </View>
    </GestureDetector>
  );
}
