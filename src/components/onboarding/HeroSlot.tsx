// Visual slot used by every onboarding screen. Renders the image if a source
// is supplied (PNG or GIF — React Native's Image component handles both), or
// a paper-tone placeholder card if not. Swap to a real source once the asset
// is in place at assets/onboarding/.
//
// Example with a real asset:
//   <HeroSlot source={require('../../../assets/onboarding/01-splash.gif')} />
//
// The card is intentionally tilted slightly to match the painterly polaroid
// vocabulary in the marketing brief.
import React from 'react';
import { View, Image, StyleSheet, Text, type ImageSourcePropType, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export interface HeroSlotProps {
  source?: ImageSourcePropType;
  width: number;
  height: number;
  rotate?: number;          // degrees, default -2 (slight polaroid tilt)
  caption?: string;         // shown only on the placeholder, dev hint only
  style?: ViewStyle;
}

export function HeroSlot({
  source,
  width,
  height,
  rotate = -2,
  caption,
  style,
}: HeroSlotProps) {
  const transform: ViewStyle['transform'] = [{ rotate: `${rotate}deg` }];

  if (source) {
    return (
      <View style={[styles.frame, { width, height, transform }, style]}>
        <Image source={source} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.frame, styles.placeholder, { width, height, transform }, style]}>
      <Text style={styles.placeholderTitle}>Visual</Text>
      {caption && <Text style={styles.placeholderCaption}>{caption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    backgroundColor: colors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderTitle: {
    fontFamily: fonts.handBold,
    fontSize: 28,
    color: colors.inkFaint,
    marginBottom: 6,
  },
  placeholderCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});
