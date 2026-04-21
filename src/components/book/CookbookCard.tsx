import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Cookbook } from '../../types/cookbook';

const PALETTE_ACCENT: Record<string, string> = {
  terracotta: '#c46a4c',
  sage: '#6f8a52',
  blush: '#c66a78',
  cobalt: '#2f5c8f',
};

interface Props {
  cookbook: Cookbook;
  pageCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function CookbookCard({ cookbook, pageCount, onPress, onLongPress }: Props) {
  const accent = PALETTE_ACCENT[cookbook.palette] ?? PALETTE_ACCENT.terracotta;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.82}>
      {/* Book spine */}
      <View style={[styles.spine, { backgroundColor: accent }]} />

      {/* Content */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{cookbook.title}</Text>
        {cookbook.description ? (
          <Text style={styles.desc} numberOfLines={1}>{cookbook.description}</Text>
        ) : null}
        <Text style={styles.meta}>
          {pageCount != null ? `${pageCount} page${pageCount !== 1 ? 's' : ''}` : '—'}
        </Text>
      </View>

      <Text style={[styles.chevron, { color: accent }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  spine: {
    width: 10,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 2,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  chevron: {
    fontSize: 24,
    paddingRight: 14,
    fontFamily: fonts.body,
  },
});
