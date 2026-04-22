import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../theme/fonts';
import type { Cookbook } from '../../types/cookbook';
import { pickCoverColour, pickSprigKey } from './coverColours';
import { Sprig } from './Sprig';

interface Props {
  cookbook: Cookbook;
  recipeCount: number;
  width: number;
  height: number;
  onPress: () => void;
  onLongPress: () => void;
}

export function BookCover({ cookbook, recipeCount, width, height, onPress, onLongPress }: Props) {
  const colour = pickCoverColour(cookbook);
  const sprigKey = pickSprigKey(cookbook);
  const sprigSize = Math.round(width * 0.58);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={380}
      activeOpacity={0.85}
      style={[styles.shadow, { width, height }]}
    >
      <View style={[styles.cover, { width, height, backgroundColor: colour.bg }]}>
        {/* Subtle spine shading on the left edge — 4pt dark gradient */}
        <View pointerEvents="none" style={styles.spine} />

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, { color: colour.title }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {cookbook.title}
          </Text>
        </View>

        {/* Sprig — centered in the lower portion */}
        <View style={[styles.sprigWrap, { height: sprigSize }]}>
          <Sprig sprigKey={sprigKey} size={sprigSize} tint={colour.title} />
        </View>

        {/* Recipe count pill in the bottom-right corner */}
        <View style={[styles.countBadge, { backgroundColor: colour.countBadgeBg }]}>
          <Text style={[styles.countText, { color: colour.countBadgeText }]}>{recipeCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    // Book-under-shelf shadow; softer than a card drop shadow.
    shadowColor: '#3b2a1f',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  cover: {
    borderRadius: 4,
    overflow: 'hidden',
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 12,
    position: 'relative',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  sprigWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
