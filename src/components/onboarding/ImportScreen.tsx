import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { ScreenProps } from './OnboardingCarousel';

interface RowDef {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
}

const ROWS: RowDef[] = [
  { icon: 'link',      title: 'Paste a link',     body: 'From any recipe website.' },
  { icon: 'camera',    title: 'Snap a photo',     body: 'Capture a page from a cookbook or magazine.' },
  { icon: 'file-text', title: 'Upload a file',    body: 'PDFs, text files, or AI-extracted JSON.' },
  { icon: 'edit-2',    title: 'Type it yourself', body: 'Start from a blank page.' },
];

export function ImportScreen({ onAdvance }: ScreenProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Bring your recipes in</Text>
      <Text style={styles.body}>
        Paste a link, snap a photo, upload a file, or type your own.
      </Text>

      <View style={styles.rows}>
        {ROWS.map((r) => (
          <Row key={r.icon} {...r} />
        ))}
      </View>

      <View style={styles.footer}>
        <ClayButton label="Next" variant="primary" size="lg" onPress={onAdvance} style={styles.cta} />
      </View>
    </View>
  );
}

function Row({ icon, title, body }: RowDef) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={22} color={colors.terracotta} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 76,
    paddingBottom: 32,
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 320,
    alignSelf: 'center',
  },
  rows: {
    flex: 1,
    gap: 18,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.paper,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  rowBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    width: '100%',
  },
});
