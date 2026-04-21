import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BlockOverride } from '../../lib/blockDefs';

const HANDLE = 22;
const SIDE_HANDLE_H = 32;
const SIDE_HANDLE_W = 8;
const SIDE_HANDLE_HIT_SLOP = 18;
const MIN_W_FRAC = 0.3;          // minimum block width = 30% of page
const MIN_W_FOR_HANDLES = 80;    // hide side handles below this so touch targets stay reachable
const SIDE_PAD = 16;             // maximum block width is page minus this inset
const ACCENT = '#c46a4c';

interface BlockProps {
  blockId: string;
  cx: number;        // center x, absolute px
  cy: number;        // center y, absolute px
  w: number;         // width, absolute px
  h: number;         // height, absolute px (ignored when isTextHeavy — content drives)
  rotation: number;
  scale: number;
  isTextHeavy: boolean;
  selected: boolean;
  editMode: boolean; // false = static View, no gestures
  pageWidth: number;
  pageHeight: number;
  onSelect: () => void;
  onUpdate: (blockId: string, patch: Partial<BlockOverride>) => void;
  // Debounced commit of measured content height for text-heavy blocks.
  // Separate from onUpdate so it can skip the history snapshot.
  onMeasuredHeight?: (blockId: string, hFrac: number) => void;
  onDelete: (blockId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

// Fast path — no Reanimated, no gestures. Used when not in block-edit mode.
function StaticBlock({
  cx, cy, w, h, rotation, scale, isTextHeavy, children,
}: Pick<BlockProps, 'cx' | 'cy' | 'w' | 'h' | 'rotation' | 'scale' | 'isTextHeavy' | 'children'>) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.block,
        // Text-heavy blocks: only width is fixed; content drives height so reflowed text isn't clipped.
        // Other blocks keep fixed bounds with clip.
        isTextHeavy
          ? { width: w }
          : { width: w, height: h, overflow: 'hidden' },
        { transform: [{ translateX: cx - w / 2 }, { translateY: cy - h / 2 }, { rotate: `${rotation}rad` }, { scale }] },
      ]}
    >
      {children}
    </View>
  );
}

// Full gesture path — used when blockEditMode is active.
function GestureBlock({
  blockId, cx, cy, w, h, rotation, scale, isTextHeavy,
  selected, pageWidth, pageHeight,
  onSelect, onUpdate, onMeasuredHeight, onDelete, onDragStart, onDragEnd,
  children,
}: BlockProps) {
  const x = useSharedValue(cx);
  const y = useSharedValue(cy);
  const wShared = useSharedValue(w);
  const rot = useSharedValue(rotation);
  const sc = useSharedValue(scale);
  const savedRot = useSharedValue(rotation);
  const savedSc = useSharedValue(scale);
  const savedW = useSharedValue(w);
  const savedX = useSharedValue(cx);
  const savedY = useSharedValue(cy);

  // For text-heavy blocks: measured content height. Drives the outer view's height so the selection
  // ring hugs the reflowed text and translateY stays visually centered on (cx, cy).
  const measuredH = useSharedValue(h);

  // Sync external w changes (undo, template reset) back into the shared value.
  // Drag flows update wShared directly and commit at onEnd, so there's no fight.
  useEffect(() => { wShared.value = w; }, [w, wShared]);

  // Stable refs — prevent gesture reset on re-render (same pattern as CanvasElement).
  const onUpdateRef = useRef(onUpdate);
  const onMeasuredHeightRef = useRef(onMeasuredHeight);
  const onSelectRef = useRef(onSelect);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  onUpdateRef.current = onUpdate;
  onMeasuredHeightRef.current = onMeasuredHeight;
  onSelectRef.current = onSelect;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSelect = useCallback(() => onSelectRef.current(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDragStart = useCallback(() => onDragStartRef.current(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDragEnd = useCallback(() => onDragEndRef.current(), []);

  // Pan / rotation / pinch commit. Deliberately does NOT write `w` — body gestures
  // don't change width, and writing a default-equal `w` every time would make
  // `ov.w != null` meaningless as a "user resized" signal. Height for text-heavy
  // blocks is committed separately via the debounced onMeasuredHeight path.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCommit = useCallback(() => {
    onUpdateRef.current(blockId, {
      cx: x.value / pageWidth,
      cy: y.value / pageHeight,
      rotation: rot.value,
      scale: sc.value,
    });
  }, [pageWidth, pageHeight]);

  // Edge-drag commit — includes the new width (and the center shift that follows
  // from anchoring the opposite edge). `ov.w != null` after this call is the
  // authoritative signal that the user has resized this block.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCommitWidth = useCallback(() => {
    onUpdateRef.current(blockId, {
      cx: x.value / pageWidth,
      cy: y.value / pageHeight,
      w: wShared.value / pageWidth,
    });
  }, [pageWidth, pageHeight]);

  // Width clamps. Do not allow shrinking past readable bounds or growing past the page.
  const minW = Math.max(40, MIN_W_FRAC * pageWidth);
  const maxW = pageWidth - SIDE_PAD;

  // Body gesture — only active when selected, so tapping an unselected block selects it
  // without also moving it (matches existing behavior).
  const gesture = useMemo(() => {
    const tap = Gesture.Tap().onEnd(() => runOnJS(stableSelect)());

    if (!selected) return tap;

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

    const rotationG = Gesture.Rotation()
      .onStart(() => { savedRot.value = rot.value; })
      .onChange(e => { rot.value = savedRot.value + e.rotation; })
      .onEnd(() => { runOnJS(stableCommit)(); });

    const pinch = Gesture.Pinch()
      .onStart(() => { savedSc.value = sc.value; })
      .onChange(e => { sc.value = Math.max(0.4, Math.min(3, savedSc.value * e.scale)); })
      .onEnd(() => { runOnJS(stableCommit)(); });

    return Gesture.Exclusive(
      Gesture.Simultaneous(pan, rotationG, pinch),
      tap,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rotHandle = useMemo(() =>
    Gesture.Pan()
      .onStart(() => { savedRot.value = rot.value; })
      .onChange(e => { rot.value = savedRot.value + e.translationX * 0.025; })
      .onEnd(() => { runOnJS(stableCommit)(); }),
  []);

  // Right-edge width drag. Projects world translation onto the block's local +X axis so
  // dragging the "right edge" of a rotated block still extends along that rotated axis.
  const rightEdgePan = useMemo(() =>
    Gesture.Pan()
      .onBegin(() => {
        savedW.value = wShared.value;
        savedX.value = x.value;
        savedY.value = y.value;
        runOnJS(stableDragStart)();
      })
      .onChange(e => {
        const cos = Math.cos(rot.value);
        const sin = Math.sin(rot.value);
        const localDx = e.translationX * cos + e.translationY * sin;
        const newW = Math.max(minW, Math.min(maxW, savedW.value + localDx));
        // Right edge moved by (newW - savedW) in local X; center moves half of that.
        // After clamping, use the actual applied delta (newW - savedW) not localDx.
        const shift = (newW - savedW.value) / 2;
        wShared.value = newW;
        x.value = savedX.value + shift * cos;
        y.value = savedY.value + shift * sin;
      })
      .onEnd(() => {
        runOnJS(stableCommitWidth)();
        runOnJS(stableDragEnd)();
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [minW, maxW]);

  // Left-edge width drag. Opposite sign convention — dragging the left edge "right" (positive
  // local X) narrows the block; the center also shifts right by half the delta.
  const leftEdgePan = useMemo(() =>
    Gesture.Pan()
      .onBegin(() => {
        savedW.value = wShared.value;
        savedX.value = x.value;
        savedY.value = y.value;
        runOnJS(stableDragStart)();
      })
      .onChange(e => {
        const cos = Math.cos(rot.value);
        const sin = Math.sin(rot.value);
        const localDx = e.translationX * cos + e.translationY * sin;
        const newW = Math.max(minW, Math.min(maxW, savedW.value - localDx));
        // Left edge moved by (savedW - newW) in local X (positive when block narrows);
        // center shifts half of that.
        const leftMove = savedW.value - newW;
        const shift = leftMove / 2;
        wShared.value = newW;
        x.value = savedX.value + shift * cos;
        y.value = savedY.value + shift * sin;
      })
      .onEnd(() => {
        runOnJS(stableCommitWidth)();
        runOnJS(stableDragEnd)();
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [minW, maxW]);

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

  const animStyle = useAnimatedStyle(() => {
    const curH = isTextHeavy ? measuredH.value : h;
    // Text-heavy blocks are top-anchored by prop `h` so the vertical anchor matches
    // StaticBlock (which translates by `cy - h/2` and lets content grow downward).
    // Using measuredH here would shift the block when measured content height differs
    // from h at the Static→Gesture transition.
    const anchorH = isTextHeavy ? h : curH;
    return {
      width: wShared.value,
      height: curH,
      transform: [
        { translateX: x.value - wShared.value / 2 },
        { translateY: y.value - anchorH / 2 },
        { rotate: `${rot.value}rad` },
        { scale: sc.value },
      ],
    };
  });

  // Position the rotation handle horizontally centered on the current (possibly dragged) width.
  const rotHandleStyle = useAnimatedStyle(() => ({
    left: wShared.value / 2 - HANDLE / 2,
  }));

  // Debounce the silent commit of measured height. onLayout fires many times during
  // text changes / font loads / width drags — we only need the settled value.
  const heightCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHRef = useRef<number | null>(null);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    if (!isTextHeavy) return;
    const newH = e.nativeEvent.layout.height;
    measuredH.value = newH;
    pendingHRef.current = newH;
    if (heightCommitTimer.current) clearTimeout(heightCommitTimer.current);
    heightCommitTimer.current = setTimeout(() => {
      const committed = pendingHRef.current;
      heightCommitTimer.current = null;
      if (committed == null) return;
      // Height stored as fraction of pageWidth, matching the resolver convention.
      onMeasuredHeightRef.current?.(blockId, committed / pageWidth);
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTextHeavy, blockId, pageWidth]);

  useEffect(() => () => {
    if (heightCommitTimer.current) clearTimeout(heightCommitTimer.current);
  }, []);

  const showSideHandles = selected && isTextHeavy && w >= MIN_W_FOR_HANDLES;

  return (
    <GestureDetector gesture={gesture}>
      {/* overflow: 'visible' so rotation/scale/side handles can extend outside bounds */}
      <Animated.View style={[styles.block, { overflow: 'visible' }, animStyle]}>
        {/* Inner container. Text-heavy: no clip, onLayout drives measuredH. Other: fixed w/h with clip. */}
        {isTextHeavy ? (
          <View onLayout={onContentLayout}>
            {children}
          </View>
        ) : (
          <View style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, overflow: 'hidden' }}>
            {children}
          </View>
        )}

        {selected && <View style={styles.ring} pointerEvents="none" />}

        {selected && (
          <TouchableOpacity style={styles.del} onPress={() => onDelete(blockId)} hitSlop={8}>
            <Text style={styles.delText}>×</Text>
          </TouchableOpacity>
        )}

        {selected && (
          <GestureDetector gesture={rotHandle}>
            <Animated.View style={[styles.handle, styles.rotHandle, rotHandleStyle]}>
              <Text style={styles.rotIcon}>↻</Text>
            </Animated.View>
          </GestureDetector>
        )}

        {/* Corner scale handle stays on non-text-heavy blocks (photos) where width-drag isn't offered. */}
        {selected && !isTextHeavy && (
          <GestureDetector gesture={scaleHandle}>
            <View style={[styles.handle, styles.scaleHandle]} />
          </GestureDetector>
        )}

        {showSideHandles && (
          <GestureDetector gesture={leftEdgePan}>
            <View style={[styles.sideHandle, styles.leftHandle]} hitSlop={SIDE_HANDLE_HIT_SLOP} />
          </GestureDetector>
        )}

        {showSideHandles && (
          <GestureDetector gesture={rightEdgePan}>
            <View style={[styles.sideHandle, styles.rightHandle]} hitSlop={SIDE_HANDLE_HIT_SLOP} />
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
        isTextHeavy={props.isTextHeavy}
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
    zIndex: 2,
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
  },
  scaleHandle: {
    bottom: -(HANDLE / 2),
    right: -(HANDLE / 2),
    borderRadius: 5,
  },
  rotIcon: { fontSize: 13, color: ACCENT },
  sideHandle: {
    position: 'absolute',
    top: '50%',
    marginTop: -SIDE_HANDLE_H / 2,
    width: SIDE_HANDLE_W,
    height: SIDE_HANDLE_H,
    borderRadius: SIDE_HANDLE_W / 2,
    backgroundColor: ACCENT,
    zIndex: 2,
  },
  leftHandle: {
    left: -SIDE_HANDLE_W / 2,
  },
  rightHandle: {
    right: -SIDE_HANDLE_W / 2,
  },
});
