import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { HeroSlot } from './HeroSlot';
import type { ScreenProps } from './OnboardingCarousel';

// To use a real GIF/PNG, add a source prop to <HeroSlot>:
//   source={require('../../../assets/onboarding/05-printed-book.gif')}

type Format = 'hardcover' | 'softcover';

export function PrintedBookScreen({ onFinish }: ScreenProps) {
  const { width, height } = useWindowDimensions();
  const heroW = Math.min(width - 64, 320);
  const heroH = Math.min(height * 0.42, 360);

  // Visual-only choice for now — the actual print order flow (Phase 9) will
  // read this preference once Lulu integration ships.
  const [format, setFormat] = useState<Format>('hardcover');

  return (
    <View style={styles.root}>
      <Text style={styles.title}>A real book,{'\n'}in their hands</Text>
      <Text style={styles.body}>
        Choose hardcover or softcover, type their address, and we'll do the rest.
      </Text>

      <View style={styles.heroWrap}>
        <HeroSlot
          width={heroW}
          height={heroH}
          rotate={-2}
          caption="Drop assets/onboarding/05-printed-book.gif"
        />
      </View>

      <View style={styles.toggleRow}>
        <FormatPill
          label="Hardcover"
          active={format === 'hardcover'}
          onPress={() => setFormat('hardcover')}
        />
        <FormatPill
          label="Softcover"
          active={format === 'softcover'}
          onPress={() => setFormat('softcover')}
        />
      </View>

      <View style={styles.footer}>
        <ClayButton
          label="Get started"
          variant="primary"
          size="lg"
          onPress={onFinish}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

function FormatPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active && { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 76,
    paddingBottom: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
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
    marginBottom: 18,
    maxWidth: 320,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 18,
  },
  pill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  pillLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.inkSoft,
    letterSpacing: 0.2,
  },
  pillLabelActive: {
    color: '#fff6e8',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    width: '100%',
  },
});
