import React from 'react';
import { View, Image, StyleSheet, type ViewStyle, type ImageSourcePropType, type DimensionValue } from 'react-native';
import { colors } from '../../theme/colors';

interface FoodImageProps {
  source?: ImageSourcePropType;
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function FoodImage({ source, width = 100, height = 100, borderRadius = 12, style }: FoodImageProps) {
  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      {source ? (
        <Image source={source} style={[styles.image, { borderRadius }]} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { borderRadius }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.bg2,
  },
});
