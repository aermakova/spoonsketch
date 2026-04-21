import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ScrollView, Pressable,
} from 'react-native';
import { useDrawingStore } from '../../lib/drawingStore';
import { fonts } from '../../theme/fonts';
import type { BlendMode } from '../../types/drawing';

const BLEND_MODES: BlendMode[] = ['normal', 'multiply', 'overlay', 'screen', 'soft-light'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LayerPanel({ visible, onClose }: Props) {
  const translateY = useRef(new Animated.Value(300)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: 300,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  const { layers, activeLayerId, setActiveLayer, toggleVisible, setLayerOpacity, setLayerBlendMode, reorderLayer, removeLayer, addLayer } = useDrawingStore();
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Layers</Text>
          {layers.length < 5 && (
            <TouchableOpacity style={styles.addBtn} onPress={addLayer}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {sorted.map((layer) => {
            const isActive = layer.id === activeLayerId;
            const modeIdx = BLEND_MODES.indexOf(layer.blendMode);
            const nextMode = BLEND_MODES[(modeIdx + 1) % BLEND_MODES.length];
            return (
              <TouchableOpacity
                key={layer.id}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => setActiveLayer(layer.id)}
                activeOpacity={0.7}
              >
                {/* Visibility toggle */}
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => toggleVisible(layer.id)}
                  hitSlop={8}
                >
                  <Text style={[styles.eyeIcon, !layer.visible && styles.eyeOff]}>
                    {layer.visible ? '◉' : '○'}
                  </Text>
                </TouchableOpacity>

                {/* Name */}
                <Text style={[styles.layerName, isActive && styles.layerNameActive]} numberOfLines={1}>
                  {layer.name}
                </Text>

                {/* Blend mode pill */}
                <TouchableOpacity
                  style={styles.blendPill}
                  onPress={() => setLayerBlendMode(layer.id, nextMode)}
                  hitSlop={4}
                >
                  <Text style={styles.blendText}>{layer.blendMode}</Text>
                </TouchableOpacity>

                {/* Opacity */}
                <Text style={styles.opacityText}>{Math.round(layer.opacity * 100)}%</Text>

                {/* Reorder */}
                <View style={styles.reorderBtns}>
                  <TouchableOpacity onPress={() => reorderLayer(layer.id, 'up')} hitSlop={6}>
                    <Text style={styles.reorderIcon}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => reorderLayer(layer.id, 'down')} hitSlop={6}>
                    <Text style={styles.reorderIcon}>↓</Text>
                  </TouchableOpacity>
                </View>

                {/* Delete (only if more than 1 layer) */}
                {layers.length > 1 && (
                  <TouchableOpacity onPress={() => removeLayer(layer.id)} hitSlop={6}>
                    <Text style={styles.deleteIcon}>×</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#1e140a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 12,
    zIndex: 100,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 8, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  addBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(196,106,76,0.3)' },
  addText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#c46a4c' },
  list: { flex: 1, paddingHorizontal: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 10,
    borderRadius: 10, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowActive: {
    backgroundColor: 'rgba(196,106,76,0.15)',
    borderLeftWidth: 3, borderLeftColor: '#c46a4c',
  },
  eyeBtn: { width: 24, alignItems: 'center' },
  eyeIcon: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  eyeOff: { color: 'rgba(255,255,255,0.2)' },
  layerName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  layerNameActive: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.bodyMedium },
  blendPill: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  blendText: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  opacityText: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 32, textAlign: 'right' },
  reorderBtns: { flexDirection: 'row', gap: 2 },
  reorderIcon: { fontSize: 14, color: 'rgba(255,255,255,0.3)', paddingHorizontal: 2 },
  deleteIcon: { fontSize: 16, color: '#d97b7b', paddingHorizontal: 2 },
});
