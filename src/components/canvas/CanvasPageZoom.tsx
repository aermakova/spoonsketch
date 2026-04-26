// Canvas page zoom + pan wrapper.
//
// Wraps the page container in the editor and exposes a pinch + pan gesture.
// Scale clamped to [PAGE_MIN_SCALE, PAGE_MAX_SCALE]; pan clamped so the page
// can't be pushed past the visible window. Double-tap on empty paper resets
// to 100%.
//
// Gesture priority:
//   - This component's gestures only activate when `pinchEnabled` is true.
//   - The editor passes `pinchEnabled = selectedId === null` so a 2-finger
//     pinch on a selected sticker scales the sticker (CanvasElement gesture)
//     instead of the page. Tap empty paper to deselect, then pinch zooms.
//
// Saved snapshots (Done → Skia thumbnail) MUST render at scale = 1; zoom is
// editor-only state, never persisted.
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export const PAGE_MIN_SCALE = 1.0;
export const PAGE_MAX_SCALE = 3.0;

interface Props {
  width: number;
  height: number;
  pinchEnabled: boolean;
  onScaleChange?: (scale: number) => void;
  children: React.ReactNode;
}

export function CanvasPageZoom({
  width,
  height,
  pinchEnabled,
  onScaleChange,
  children,
}: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Clamp pan so the scaled page can't be dragged past the visible window.
  // At scale s, the page extends s*width by s*height. Centre-anchored, the
  // available pan room is ((s-1) * dim) / 2 in each direction. At s=1 → 0.
  const clampPan = (
    rawX: number,
    rawY: number,
    s: number,
  ): { x: number; y: number } => {
    'worklet';
    const maxX = Math.max(0, ((s - 1) * width) / 2);
    const maxY = Math.max(0, ((s - 1) * height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, rawX)),
      y: Math.max(-maxY, Math.min(maxY, rawY)),
    };
  };

  const reportScale = (s: number) => {
    onScaleChange?.(s);
  };

  const pinch = Gesture.Pinch()
    .enabled(pinchEnabled)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onChange((e) => {
      const next = Math.max(
        PAGE_MIN_SCALE,
        Math.min(PAGE_MAX_SCALE, savedScale.value * e.scale),
      );
      scale.value = next;
      // Re-clamp the current translation so zooming out can never expose
      // out-of-bounds areas.
      const clamped = clampPan(tx.value, ty.value, next);
      tx.value = clamped.x;
      ty.value = clamped.y;
    })
    .onEnd(() => {
      runOnJS(reportScale)(scale.value);
    });

  const pan = Gesture.Pan()
    .enabled(pinchEnabled)
    .minPointers(1)
    // Engage pan only after some movement; otherwise quick taps on stickers
    // get eaten by this gesture.
    .activateAfterLongPress(0)
    .averageTouches(true)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onChange((e) => {
      // Pan is meaningful only when zoomed in.
      if (scale.value <= PAGE_MIN_SCALE + 0.001) return;
      const clamped = clampPan(
        savedTx.value + e.translationX,
        savedTy.value + e.translationY,
        scale.value,
      );
      tx.value = clamped.x;
      ty.value = clamped.y;
    });

  // Double-tap on empty paper → animate back to 100%.
  const doubleTap = Gesture.Tap()
    .enabled(pinchEnabled)
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(1, { duration: 220 });
      tx.value = withTiming(0, { duration: 220 });
      ty.value = withTiming(0, { duration: 220 });
      runOnJS(reportScale)(1);
    });

  // Pinch + pan run together (multitouch); double-tap is a separate single-finger
  // gesture so a quick double-tap fires regardless of where the user's free hand is.
  const composed = Gesture.Simultaneous(
    pinch,
    Gesture.Exclusive(doubleTap, pan),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.host, { width, height }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  host: {
    // The page itself owns its appearance — this wrapper just transforms.
  },
});
