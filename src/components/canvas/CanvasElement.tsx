import React, { useMemo, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Sticker } from '../stickers/Sticker';
import type { CanvasEl } from '../../lib/canvasStore';

const SIZE = 64;
const HANDLE = 22;
const ACCENT = '#c46a4c';

interface Props {
  el: CanvasEl;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<CanvasEl>) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function CanvasElement({ el, selected, disabled = false, onSelect, onUpdate, onDelete, onDragStart, onDragEnd }: Props) {
  const x = useSharedValue(el.x);
  const y = useSharedValue(el.y);
  const rot = useSharedValue(el.rotation);
  const sc = useSharedValue(el.scale);
  const savedRot = useSharedValue(el.rotation);
  const savedSc = useSharedValue(el.scale);

  // Keep latest callbacks in refs — updating a ref never triggers useMemo.
  // This breaks the dep chain that was causing gesture objects to be recreated
  // every time onDragStart fired and scrollEnabled changed (re-render → new props
  // → useMemo fired → mid-gesture reset → pinch/rotate never completed).
  const onUpdateRef = useRef(onUpdate);
  const onSelectRef = useRef(onSelect);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  onUpdateRef.current = onUpdate;
  onSelectRef.current = onSelect;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  // Stable wrappers — identity never changes across renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableUpdate = useCallback((patch: Partial<CanvasEl>) => onUpdateRef.current(patch), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSelect = useCallback(() => onSelectRef.current(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDragStart = useCallback(() => onDragStartRef.current(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDragEnd = useCallback(() => onDragEndRef.current(), []);

  // Main gesture: pan + two-finger pinch/rotate (all simultaneous), exclusive with tap.
  // deps are [] because all referenced functions are the stable wrappers above,
  // and shared values (x, y, rot, sc, …) never change identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin(() => runOnJS(stableDragStart)())
      .onChange(e => {
        x.value += e.changeX;
        y.value += e.changeY;
      })
      .onEnd(() => {
        runOnJS(stableUpdate)({ x: x.value, y: y.value });
        runOnJS(stableDragEnd)();
      });

    const rotation = Gesture.Rotation()
      .onStart(() => { savedRot.value = rot.value; })
      .onChange(e => { rot.value = savedRot.value + e.rotation; })
      .onEnd(() => { runOnJS(stableUpdate)({ rotation: rot.value }); });

    const pinch = Gesture.Pinch()
      .onStart(() => { savedSc.value = sc.value; })
      .onChange(e => { sc.value = Math.max(0.3, Math.min(4, savedSc.value * e.scale)); })
      .onEnd(() => { runOnJS(stableUpdate)({ scale: sc.value }); });

    const tap = Gesture.Tap().onEnd(() => runOnJS(stableSelect)());

    return Gesture.Exclusive(
      Gesture.Simultaneous(pan, rotation, pinch),
      tap,
    );
  }, []);

  // Rotation handle: single-finger horizontal drag → rotate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rotHandle = useMemo(() =>
    Gesture.Pan()
      .onStart(() => { savedRot.value = rot.value; })
      .onChange(e => { rot.value = savedRot.value + e.translationX * 0.025; })
      .onEnd(() => { runOnJS(stableUpdate)({ rotation: rot.value }); }),
  []);

  // Scale handle: single-finger drag right/down = grow, left/up = shrink.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scaleHandle = useMemo(() =>
    Gesture.Pan()
      .onStart(() => { savedSc.value = sc.value; })
      .onChange(e => {
        const delta = (e.translationX + e.translationY) * 0.008;
        sc.value = Math.max(0.3, Math.min(4, savedSc.value * (1 + delta)));
      })
      .onEnd(() => { runOnJS(stableUpdate)({ scale: sc.value }); }),
  []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - SIZE / 2 },
      { translateY: y.value - SIZE / 2 },
      { rotate: `${rot.value}rad` },
      { scale: sc.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.el, { zIndex: el.zIndex }, animStyle]} pointerEvents={disabled ? 'none' : 'auto'}>
        <Sticker kind={el.stickerKey} size={SIZE} />

        {selected && <View style={styles.ring} pointerEvents="none" />}

        {/* Delete button */}
        {selected && (
          <TouchableOpacity style={styles.del} onPress={onDelete} hitSlop={8}>
            <Text style={styles.delText}>×</Text>
          </TouchableOpacity>
        )}

        {/* Rotation handle — top-center, drag left/right to rotate */}
        {selected && (
          <GestureDetector gesture={rotHandle}>
            <View style={styles.rotHandle}>
              <Text style={styles.rotIcon}>↻</Text>
            </View>
          </GestureDetector>
        )}

        {/* Scale handle — bottom-right corner, drag to resize */}
        {selected && (
          <GestureDetector gesture={scaleHandle}>
            <View style={styles.scaleHandle} />
          </GestureDetector>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  el: { position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, overflow: 'visible' },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 6,
    borderStyle: 'dashed',
  },
  del: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#d97b7b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delText: { color: '#fff', fontSize: 15, lineHeight: 17, fontWeight: '700' },
  rotHandle: {
    position: 'absolute',
    top: -(HANDLE + 6),
    left: SIZE / 2 - HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotIcon: { fontSize: 13, color: ACCENT },
  scaleHandle: {
    position: 'absolute',
    bottom: -HANDLE / 2,
    right: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
});
