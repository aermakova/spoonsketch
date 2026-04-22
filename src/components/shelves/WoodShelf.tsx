// Wooden shelf plank placed under each row of books.
//
// Phase 1 ships with a CSS-gradient placeholder that reads as a wood plank
// even without a PNG. When the real PNG arrives, drop it at
// `assets/shelves/wood-shelf.png` and replace the View with an <Image>.

import React from 'react';
import { View, StyleSheet, ImageSourcePropType } from 'react-native';

interface Props {
  width: number;
}

// const WOOD_SOURCE: ImageSourcePropType = require('../../../assets/shelves/wood-shelf.png');
const WOOD_SOURCE: ImageSourcePropType | null = null;

export function WoodShelf({ width }: Props) {
  if (WOOD_SOURCE) {
    const { Image } = require('react-native');
    return (
      <View style={{ width }}>
        <Image source={WOOD_SOURCE} style={[styles.image, { width }]} resizeMode="stretch" />
        <View style={styles.shadow} />
      </View>
    );
  }

  // Placeholder: a warm brown plank with simulated grain via stacked strips.
  return (
    <View style={{ width }}>
      <View style={styles.plank}>
        <View style={[styles.grain, { top: 3, opacity: 0.18 }]} />
        <View style={[styles.grain, { top: 7, opacity: 0.12 }]} />
      </View>
      <View style={styles.shadow} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    height: 14,
  },
  plank: {
    height: 14,
    backgroundColor: '#b78e5a',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
    shadowColor: '#6e4820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 2,
  },
  grain: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#6e4820',
  },
  shadow: {
    height: 6,
    marginTop: 2,
    marginHorizontal: 4,
    backgroundColor: 'rgba(80,50,20,0.12)',
    borderRadius: 3,
  },
});
