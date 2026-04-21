import React from 'react';
import { Pressable, Text, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { useThemeStore } from '../../lib/store';
import { fonts } from '../../theme/fonts';

interface ClayButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function ClayButton({ label, variant = 'primary', size = 'md', style, ...rest }: ClayButtonProps) {
  const { palette } = useThemeStore();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[size],
        variant === 'primary' && { backgroundColor: palette.accent },
        variant === 'secondary' && { backgroundColor: palette.bg2, borderColor: palette.accent, borderWidth: 1.5 },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          styles[`label_${size}`],
          variant === 'primary' && styles.labelPrimary,
          variant === 'secondary' && { color: palette.accent },
          variant === 'ghost' && { color: palette.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b2a1f',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  pressed: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 0.97 }],
  },
  sm: { paddingHorizontal: 16, paddingVertical: 8 },
  md: { paddingHorizontal: 24, paddingVertical: 13 },
  lg: { paddingHorizontal: 32, paddingVertical: 17 },
  label: {
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.2,
  },
  label_sm: { fontSize: 13 },
  label_md: { fontSize: 15 },
  label_lg: { fontSize: 17 },
  labelPrimary: { color: '#faf4e6' },
});
