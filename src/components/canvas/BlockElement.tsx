import React, { useMemo, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BlockOverride } from '../../lib/blockDefs';

const HANDLE = 22;
const ACCENT = '#c46a4c';

interface BlockProps {
  blockId: string;
  cx: number;        // center x, absolute px
  cy: number;        // center y, absolute px
  w: number;         // width, absolute px
  h: number;         // height, absolute px
  rotation: number;
  scale: number;
  selected: boolean;
  editMode: boolean; // false = static View, no gestures
  pageWidth: number;
  pageHeight: number;
  onSelect: () => void;
  onUpdate: (blockId: string, patch: Partial<BlockOverride>) => void;
  onDelete: (blockId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

// Fast path — no Reanimated, no gestures. Used when not in block-edit mode.
function StaticBlock({
  cx, cy, w, h, rotation, scale, children,
}: Pick<BlockProps, 'cx' | 'cy' | 'w' | 'h' | 'rotation' | 'scale' | 'children'>) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.block,
        { width: w, height: h },
        { transform: [{ translateX: cx - w / 2 }, { translateY: cy - h / 2 }, { rotate: `${rotation}rad` }, { scale }] },
      ]}
    >
      {children}
    </View>
  );
}

// Full gesture path — used when blockEditMode is active.
function GestureBlock({
  blockId, cx, cy, w, h, rotation, scale,
  selected, pageWidth, pageHeight,
  onSelect, onUpdate, onDelete, onDragStart, onDragEnd,
  children,
}: BlockProps) {
  const x = useSharedValue(cx);
  const y = useSharedValue(cy);
  const rot = useSharedValue(rotation);
  const sc = useSharedValue(scale);
  const savedRot = useSharedValue(rotation);
  const savedSc = useSharedValue(scale);

  // Stable refs — same pattern as CanvasElement to prevent gesture reset on re-render.
  const onUpdateRef = useRef(onUpdate);
  const onSelectRef = useRef(onSelect);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  onUpdateRef.current = onUpdate;
  onSelectRef.current = onSelect;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableUpdate = useCallback((patch: Partial<BlockOverride>) => onUpdateRef.current(blockId, patch), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSelect = useCallback(() => onSelectRef.current(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDragStart = useCallback(() => onDragStartRef.current(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDragEnd = useCallback(() => onDragEndRef.current(), []);

  // Normalise absolute px to fractions for storage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCommit = useCallback(() => {
    onUpdateRef.current(blockId, {
      cx: x.value / pageWidth,
      cy: y.value / pageHeight,
      w: w / pageWidth,
      h: h / pageWidth,
      rotation: rot.value,
      scale: sc.value,
    });
  }, [pageWidth, pageHeight, w, h]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin(() => runOnJS(stableDragStart)())
      .onChange(e => {
        x.value += e.changeX;
        y.value += e.changeY;
      })
      .onEnd(() => {
        runOnJS(stableCommit)();
        runOnJS(stableDragEnd)();
      });

    const rotation = Gesture.Rotation()
      .onStart(() => { savedRot.value = rot.value; })
      .onChange(e => { rot.value = savedRot.value + e.rotation; })
      .onEnd(() => { runOnJS(stableCommit)(); });

    const pinch = Gesture.Pinch()
      .onStart(() => { savedSc.value = sc.value; })
      .onChange(e => { sc.value = Math.max(0.4, Math.min(3, savedSc.value * e.scale)); })
      .onEnd(() => { runOnJS(stableCommit)(); });

    const tap = Gesture.Tap().onEnd(() => runOnJS(stableSelect)());

    return Gesture.Exclusive(
      Gesture.Simultaneous(pan, rotation, pinch),
      tap,
    );
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rotHandle = useMemo(() =>
    Gesture.Pan()
      .onStart(() => { savedRot.value = rot.value; })
      .onChange(e => { rot.value = savedRot.value + e.translationX * 0.025; })
      .onEnd(() => { runOnJS(stableCommit)(); }),
  []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scaleHandle = useMemo(() =>
    Gesture.Pan()
      .onStart(() => { savedSc.value = sc.value; })
      .onChange(e => {
        const delta = (e.translationX + e.translationY) * 0.008;
        sc.value = Math.max(0.4, Math.min(3, savedSc.value * (1 + delta)));
      })
      .onEnd(() => { runOnJS(stableCommit)(); }),
  []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - w / 2 },
      { translateY: y.value - h / 2 },
      { rotate: `${rot.value}rad` },
      { scale: sc.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      {/* overflow: 'visible' so rotation/scale handles can extend outside bounds */}
      <Animated.View style={[styles.block, { width: w, height: h, overflow: 'visible' }, animStyle]}>
        {/* inner clip keeps recipe content from overflowing the block */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, overflow: 'hidden' }}>
          {children}
        </View>

        {selected && <View style={[styles.ring, { width: w, height: h }]} pointerEvents="none" />}

        {selected && (
          <TouchableOpacity style={styles.del} onPress={() => onDelete(blockId)} hitSlop={8}>
            <Text style={styles.delText}>×</Text>
          </TouchableOpacity>
        )}

        {selected && (
          <GestureDetector gesture={rotHandle}>
            <View style={[styles.handle, styles.rotHandle, { left: w / 2 - HANDLE / 2 }]}>
              <Text style={styles.rotIcon}>↻</Text>
            </View>
          </GestureDetector>
        )}

        {selected && (
          <GestureDetector gesture={scaleHandle}>
            <View style={[styles.handle, styles.scaleHandle]} />
          </GestureDetector>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function BlockElement(props: BlockProps) {
  if (!props.editMode) {
    return (
      <StaticBlock
        cx={props.cx} cy={props.cy}
        w={props.w} h={props.h}
        rotation={props.rotation} scale={props.scale}
      >
        {props.children}
      </StaticBlock>
    );
  }
  return <GestureBlock {...props} />;
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 4,
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
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotHandle: {
    top: -(HANDLE + 6),
    // left is set inline: w/2 - HANDLE/2
  },
  scaleHandle: {
    bottom: -(HANDLE / 2),
    right: -(HANDLE / 2),
    borderRadius: 5,
  },
  rotIcon: { fontSize: 13, color: ACCENT },
});
