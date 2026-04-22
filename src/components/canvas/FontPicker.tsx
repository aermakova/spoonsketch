import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { FONT_PRESETS } from './PageTemplates';
import type { FontPresetKey } from '../../lib/canvasStore';

interface Props {
  selected: FontPresetKey;
  onSelect: (key: FontPresetKey) => void;
}

export function FontPicker({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {FONT_PRESETS.map(preset => {
        const active = preset.key === selected;
        return (
          <TouchableOpacity
            key={preset.key}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onSelect(preset.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.preview, active && styles.previewActive]}>
              <Text style={[styles.previewText, { fontFamily: preset.title }]} numberOfLines={1}>
                {preset.preview}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{preset.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  item: {
    alignItems: 'center',
    gap: 5,
    opacity: 0.7,
  },
  itemActive: {
    opacity: 1,
  },
  preview: {
    width: 72,
    height: 36,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  previewActive: {
    borderColor: colors.terracotta,
    borderWidth: 2,
  },
  previewText: {
    fontSize: 17,
    color: colors.ink,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.inkFaint,
    textAlign: 'center',
    maxWidth: 88,
  },
  labelActive: {
    color: colors.terracotta,
    fontFamily: fonts.bodyMedium,
  },
});
