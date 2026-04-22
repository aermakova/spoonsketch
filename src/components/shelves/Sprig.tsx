// Sprig illustration placed on each book cover.
//
// Phase 1 ships with a simple emoji placeholder so the layout is reviewable
// without real assets. When the PNGs arrive, drop them at
// `assets/sprigs/sprig-1.png` … `sprig-6.png` and replace this component's
// body with the commented `<Image>` version.

import React from 'react';
import { View, Text, StyleSheet, ImageSourcePropType } from 'react-native';

interface Props {
  // `sprig-1` … `sprig-6`
  sprigKey: string;
  size: number;
  // Tint for the emoji placeholder so it reads on any cover. Ignored once we
  // move to PNG assets (those are pre-coloured).
  tint: string;
}

// When you're ready to wire real PNGs, populate this map:
// const SPRIG_SOURCES: Record<string, ImageSourcePropType> = {
//   'sprig-1': require('../../../assets/sprigs/sprig-1.png'),
//   'sprig-2': require('../../../assets/sprigs/sprig-2.png'),
//   'sprig-3': require('../../../assets/sprigs/sprig-3.png'),
//   'sprig-4': require('../../../assets/sprigs/sprig-4.png'),
//   'sprig-5': require('../../../assets/sprigs/sprig-5.png'),
//   'sprig-6': require('../../../assets/sprigs/sprig-6.png'),
// };
const SPRIG_SOURCES: Record<string, ImageSourcePropType> = {};

// Rotating placeholder glyphs so each sprigKey is visually distinct in
// Phase 1. Order matches the 6 keys.
const PLACEHOLDER_EMOJI: Record<string, string> = {
  'sprig-1': '🌿',
  'sprig-2': '🌾',
  'sprig-3': '🍃',
  'sprig-4': '🌱',
  'sprig-5': '🌸',
  'sprig-6': '🌺',
};

export function Sprig({ sprigKey, size, tint }: Props) {
  const source = SPRIG_SOURCES[sprigKey];
  if (source) {
    // Real asset path — swap placeholder once PNGs land.
    const { Image } = require('react-native');
    return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />;
  }

  const glyph = PLACEHOLDER_EMOJI[sprigKey] ?? '🌿';
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Text style={[styles.glyph, { fontSize: size * 0.7, color: tint, opacity: 0.75 }]}>{glyph}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
