import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { TEMPLATES } from './PageTemplates';
import type { TemplateKey } from '../../lib/canvasStore';

// Visual diagram cell types
const CELL_COLORS: Record<string, string> = {
  'wide':        colors.line,
  'wide-img':    colors.terracottaSoft,
  'wide-hand':   colors.butter,
  'wide-ruled':  colors.line,
  'wide-accent': colors.terracotta,
  'img':         colors.terracottaSoft,
  'img-col':     colors.terracottaSoft,
  'ing':         colors.line,
  'ing-col': colors.line,
  'step':        colors.bg2,
  'step-col':    colors.bg2,
};

function TemplateDiagram({ diagram, active }: { diagram: string[][]; active: boolean }) {
  return (
    <View style={[diag.frame, active && diag.frameActive]}>
      {diagram.map((row, ri) => (
        <View key={ri} style={diag.row}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[
                diag.cell,
                { backgroundColor: CELL_COLORS[cell] ?? colors.line },
                row.length === 1 && diag.cellFull,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface Props {
  selected: TemplateKey;
  onSelect: (key: TemplateKey) => void;
}

export function TemplatePicker({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {TEMPLATES.map(tmpl => {
        const active = tmpl.key === selected;
        return (
          <TouchableOpacity
            key={tmpl.key}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onSelect(tmpl.key)}
            activeOpacity={0.75}
          >
            <TemplateDiagram diagram={tmpl.diagram} active={active} />
            <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{tmpl.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const diag = StyleSheet.create({
  frame: {
    width: 52,
    height: 68,
    backgroundColor: colors.paper,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: 4,
    gap: 3,
    overflow: 'hidden',
  },
  frameActive: {
    borderColor: colors.terracotta,
    borderWidth: 2,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    flex: 1,
    borderRadius: 2,
  },
  cellFull: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
