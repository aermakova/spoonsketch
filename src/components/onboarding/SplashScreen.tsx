import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { HeroSlot } from './HeroSlot';
import type { ScreenProps } from './OnboardingCarousel';

// To use a real GIF/PNG, add a source prop to <HeroSlot>:
//   source={require('../../../assets/onboarding/01-splash.gif')}

export function SplashScreen({ onAdvance, onSignIn }: ScreenProps) {
  const { width, height } = useWindowDimensions();
  const heroW = Math.min(width - 64, 320);
  const heroH = Math.min(height * 0.42, 360);

  return (
    <View style={styles.root}>
      <View style={styles.headerArea}>
        <Text style={styles.leaf}>❦</Text>
        <Text style={styles.wordmark}>Spoon & Sketch</Text>
        <Text style={styles.leaf}>❦</Text>
      </View>

      <Text style={styles.title}>Make a cookbook{'\n'}someone will keep forever</Text>

      <Text style={styles.body}>
        Turn family recipes, favourite dinners, and kitchen memories into a beautiful book — made by you.
      </Text>

      <View style={styles.heroWrap}>
        <HeroSlot
          width={heroW}
          height={heroH}
          rotate={-2}
          caption="Drop assets/onboarding/01-splash.gif"
        />
      </View>

      <View style={styles.footer}>
        <ClayButton
          label="Let's make one"
          variant="primary"
          size="lg"
          onPress={onAdvance}
          style={styles.cta}
        />
        <Pressable onPress={onSignIn} hitSlop={12}>
          <Text style={styles.signinLink}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  headerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  leaf: {
    fontSize: 18,
    color: colors.sage,
  },
  wordmark: {
    fontFamily: fonts.handBold,
    fontSize: 28,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 24,
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
    gap: 14,
  },
  cta: {
    width: '100%',
  },
  signinLink: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
});
