import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { PaperPattern } from './PaperPattern';
import type { CookbookPaperType } from '../../types/cookbook';

const PAPER_OPTIONS: { key: CookbookPaperType; label: string }[] = [
  { key: 'blank',  label: 'Blank' },
  { key: 'lined',  label: 'Lined' },
  { key: 'dotted', label: 'Dotted' },
  { key: 'grid',   label: 'Grid' },
];

interface Props {
  selected: CookbookPaperType;
  onSelect: (key: CookbookPaperType) => void;
}

// Preview tile dimensions — kept compact to match TemplatePicker/FontPicker rows.
// The PaperPattern below uses its own absolute px geometry (lines every 28px,
// dots every 16px); at 54×72 the tile shows a representative sample.
const TILE_W = 54;
const TILE_H = 72;

export function PaperPicker({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {PAPER_OPTIONS.map(opt => {
        const active = opt.key === selected;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.preview, active && styles.previewActive]}>
              <PaperPattern type={opt.key} width={TILE_W} height={TILE_H} />
            </View>
            <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
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
    width: TILE_W,
    height: TILE_H,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  previewActive: {
    borderColor: colors.terracotta,
    borderWidth: 2,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
  },
  labelActive: {
    color: colors.terracotta,
    fontFamily: fonts.bodyMedium,
  },
});
