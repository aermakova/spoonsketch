import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

interface PaperGrainProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  opacity?: number;
}

/**
 * Wraps content with a subtle paper-grain overlay tint.
 * Full SVG feTurbulence grain is applied in the web bundle via CSS;
 * on native this provides the warm bg color base.
 */
export function PaperGrain({ children, style, opacity = 0.4 }: PaperGrainProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
      <View style={[styles.grain, { opacity }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 140, 100, 0.06)',
  },
});
