import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { DrawingLayer } from './DrawingLayer';
import { useDrawingStore } from '../../lib/drawingStore';
import type { StrokePoint, DrawingLayer as DrawingLayerType } from '../../types/drawing';

interface Props {
  width: number;
  height: number;
  isDrawing: boolean;
  // Optional static layers override. When provided, SkiaCanvas renders these
  // layers instead of the store's working copy — lets the Recipe Detail
  // preview show drawings for recipes that aren't the last-opened editor
  // recipe. Forces isDrawing=false semantics (no commit path here).
  layersOverride?: DrawingLayerType[];
}

export function SkiaCanvas({ width, height, isDrawing, layersOverride }: Props) {
  const [livePoints, setLivePoints] = useState<StrokePoint[]>([]);
  const liveRef = useRef<StrokePoint[]>([]);

  const storeLayers = useDrawingStore((s) => s.layers);
  const activeLayerId = useDrawingStore((s) => s.activeLayerId);
  const activeTool = useDrawingStore((s) => s.activeTool);
  const strokeWidth = useDrawingStore((s) => s.strokeWidth);
  const color = useDrawingStore((s) => s.color);
  const opacity = useDrawingStore((s) => s.opacity);
  const commitStroke = useDrawingStore((s) => s.commitStroke);
  const layers = layersOverride ?? storeLayers;
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

  // Apple Pencil sends a `pressure` field on every Pan event (0..1, low → hard).
  // Finger touches don't, so we fall back to 0.5 — that's a neutral middle
  // value perfect-freehand uses for uniform width when `simulatePressure:false`.
  // The cast is needed because RNGH's TS types don't expose `pressure` even
  // though the native side passes it through.
  const readPressure = (e: { pressure?: number }): number =>
    typeof e.pressure === 'number' ? e.pressure : 0.5;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drawGesture = useMemo(() =>
    Gesture.Pan()
      .minDistance(0)
      .onBegin(e => runOnJS(beginStroke)({ x: e.x, y: e.y, pressure: readPressure(e as { pressure?: number }) }))
      .onChange(e => runOnJS(addPoint)({ x: e.x, y: e.y, pressure: readPressure(e as { pressure?: number }) }))
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
