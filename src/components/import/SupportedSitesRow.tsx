import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

// Styled wordmark approximations of popular recipe sites. These are *not*
// the sites' actual logos — they're stylised text in our palette — to avoid
// trademark misuse. Swap for real logos under a fair-use claim later if
// needed.
interface Site {
  label: string;
  color: string;
  font: 'display' | 'body' | 'bodyBold' | 'handwritten';
  italic?: boolean;
  all_caps?: boolean;
}

const SITES: Site[] = [
  { label: 'allrecipes', color: colors.terracotta, font: 'bodyBold', italic: true },
  { label: 'food', color: colors.tomato, font: 'display' },
  { label: 'delish', color: colors.ink, font: 'bodyBold', italic: true },
  { label: 'epicurious', color: colors.terracottaDark, font: 'bodyBold' },
  { label: 'NYT Cooking', color: colors.ink, font: 'display' },
  { label: 'Tasty', color: colors.terracotta, font: 'display', italic: true },
];

export function SupportedSitesRow() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Here are some we support:</Text>
      <View style={styles.grid}>
        {SITES.map((s) => (
          <View key={s.label} style={styles.cell}>
            <Text
              style={[
                styles.wordmark,
                {
                  color: s.color,
                  fontFamily: fontFamilyFor(s.font),
                  fontStyle: s.italic ? 'italic' : 'normal',
                },
              ]}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function fontFamilyFor(name: Site['font']): string {
  switch (name) {
    case 'display':
      return fonts.displayBold;
    case 'bodyBold':
      return fonts.bodyBold;
    case 'handwritten':
      return fonts.hand;
    default:
      return fonts.body;
  }
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 24,
    rowGap: 12,
  },
  cell: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
