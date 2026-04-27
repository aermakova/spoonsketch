import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useDrawingStore } from '../../lib/drawingStore';
import { fonts } from '../../theme/fonts';
import { ColorPickerModal } from './ColorPickerModal';

// 16 base swatches in two rows of 8. Curated for cookbook decoration:
// - Inks (charcoal, sepia, soft brown, navy)
// - Brand palette accents (terracotta, sage, plum, cobalt, rose, ochre)
// - Brights (tomato, butter, mint)
// - Neutrals (cream, white)
// Tap "+" at the end to open the full HSL grid for any other colour.
const COLORS = [
  // Row 1 — inks + warm brand
  '#3b2a1f', '#8B6547', '#c46a4c', '#d9a441',
  '#b94a38', '#d97b7b', '#c66a78', '#8a5f7a',
  // Row 2 — cool brand + neutrals
  '#6f8a52', '#88a06a', '#2f5c8f', '#3f75b0',
  '#f2d98d', '#e9a488', '#faf4e6', '#ffffff',
];

interface Props {
  onOpenLayers: () => void;
}

export function DrawingToolbar({ onOpenLayers }: Props) {
  const { activeTool, strokeWidth, color, opacity, setTool, setStrokeWidth, setColor, setOpacity, undo } = useDrawingStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.root}>
      {/* Row 1: tool toggles + actions */}
      <View style={styles.row}>
        <View style={styles.toolGroup}>
          <TouchableOpacity
            style={[styles.toolBtn, activeTool === 'brush' && styles.toolBtnActive]}
            onPress={() => setTool('brush')}
          >
            <Text style={[styles.toolIcon, activeTool === 'brush' && styles.toolIconActive]}>✏</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, activeTool === 'eraser' && styles.toolBtnActive]}
            onPress={() => setTool('eraser')}
          >
            <Text style={[styles.toolIcon, activeTool === 'eraser' && styles.toolIconActive]}>◻</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.actionBtn} onPress={onOpenLayers}>
            <Text style={styles.actionIcon}>⊞</Text>
            <Text style={styles.actionLabel}>Layers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={undo}>
            <Text style={styles.actionIcon}>↩</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rows 2–3: 16 colour swatches in two rows of 8 + "+" custom-picker tile.
          The active swatch shows a white ring; clicking "+" opens the HSL grid. */}
      <View style={styles.row}>
        {COLORS.slice(0, 8).map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              c === color && styles.swatchActive,
              c === '#ffffff' && styles.swatchBorder,
            ]}
          />
        ))}
        <View style={styles.previewContainer}>
          <View style={[styles.previewDot, { backgroundColor: color, width: strokeWidth, height: strokeWidth, borderRadius: strokeWidth / 2 }]} />
        </View>
      </View>
      <View style={styles.row}>
        {COLORS.slice(8, 16).map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              c === color && styles.swatchActive,
              c === '#ffffff' && styles.swatchBorder,
            ]}
          />
        ))}
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={styles.swatchPlus}
        >
          <Feather name="plus" size={14} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      <ColorPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={setColor}
      />

      {/* Row 3: sliders */}
      <View style={styles.slidersGroup}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Size</Text>
          <SliderTrack
            value={strokeWidth}
            min={1}
            max={40}
            onChange={setStrokeWidth}
          />
          <Text style={styles.sliderValue}>{strokeWidth}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Opacity</Text>
          <SliderTrack
            value={Math.round(opacity * 100)}
            min={10}
            max={100}
            onChange={v => setOpacity(v / 100)}
          />
          <Text style={styles.sliderValue}>{Math.round(opacity * 100)}%</Text>
        </View>
      </View>
    </View>
  );
}

function SliderTrack({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const trackWidth = useRef(0);

  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin(e => {
      const pct = Math.max(0, Math.min(1, e.x / trackWidth.current));
      onChange(Math.round(min + pct * (max - min)));
    })
    .onChange(e => {
      const pct = Math.max(0, Math.min(1, e.x / trackWidth.current));
      onChange(Math.round(min + pct * (max - min)));
    });

  const pct = (value - min) / (max - min);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={slider.track}
        onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
      >
        <View style={slider.fill}>
          <View style={[slider.filled, { flex: pct }]} />
          <View style={{ flex: 1 - pct }} />
        </View>
        <View style={[slider.thumb, { left: `${pct * 100}%` as any }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 2, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolGroup: { flexDirection: 'row', gap: 4 },
  toolBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  toolBtnActive: { backgroundColor: '#c46a4c' },
  toolIcon: { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
  toolIconActive: { color: '#fff' },
  actionGroup: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 6 },
  actionIcon: { color: 'rgba(255,255,255,0.75)', fontSize: 16 },
  actionLabel: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  swatchActive: { borderWidth: 2.5, borderColor: '#fff' },
  swatchBorder: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  swatchPlus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: { marginLeft: 'auto', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  previewDot: { opacity: 0.9 },
  slidersGroup: { gap: 0 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.75)', width: 42 },
  sliderValue: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.85)', width: 30, textAlign: 'right' },
});

const slider = StyleSheet.create({
  track: { flex: 1, height: 30, justifyContent: 'center' },
  fill: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', flexDirection: 'row', overflow: 'hidden' },
  filled: { backgroundColor: '#c46a4c' },
  thumb: {
    position: 'absolute',
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff',
    top: '50%' as any,
    marginTop: -9, marginLeft: -9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2,
  },
});
