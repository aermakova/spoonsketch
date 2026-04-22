import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../theme/fonts';
import { colors } from '../../theme/colors';

interface Props {
  width: number;
  height: number;
  onPress: () => void;
}

export function EmptySlot({ width, height, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ width, height }}>
      <View style={[styles.slot, { width, height }]}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label}>New{'\n'}Cookbook</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  slot: {
    borderRadius: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  plus: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.inkFaint,
    lineHeight: 40,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 16,
  },
});
