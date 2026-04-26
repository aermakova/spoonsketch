import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { HeroSlot } from './HeroSlot';
import type { ScreenProps } from './OnboardingCarousel';

// To use a real GIF/PNG, add a source prop to <HeroSlot>:
//   source={require('../../../assets/onboarding/04-dedication.gif')}

export function DedicationScreen({ onAdvance }: ScreenProps) {
  const { width, height } = useWindowDimensions();
  const heroW = Math.min(width - 64, 320);
  const heroH = Math.min(height * 0.5, 420);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Add the note they'll{'\n'}read first</Text>
      <Text style={styles.body}>
        Write a dedication, drop in a photo, and make it personal — in your own handwriting.
      </Text>

      <View style={styles.heroWrap}>
        <HeroSlot
          width={heroW}
          height={heroH}
          rotate={-2}
          caption="Drop assets/onboarding/04-dedication.gif"
        />
      </View>

      <View style={styles.footer}>
        <ClayButton label="Next" variant="primary" size="lg" onPress={onAdvance} style={styles.cta} />
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
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    width: '100%',
  },
});
