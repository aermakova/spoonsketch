import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { getStickerSource } from '../../lib/stickerRegistry';

interface StickerProps {
  kind: string;
  size?: number;
  rotate?: number;
  style?: import('react-native').ViewStyle;
}

export function Sticker({ kind, size = 56, rotate = 0, style }: StickerProps) {
  const source = getStickerSource(kind);
  if (!source) return null;

  return (
    <View style={[styles.shadow, { width: size, height: size, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#50321e',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
});
