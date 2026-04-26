import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { HeroSlot } from './HeroSlot';
import type { ScreenProps } from './OnboardingCarousel';

// To use a real GIF/PNG, add a source prop to <HeroSlot>:
//   source={require('../../../assets/onboarding/03-make-me-sketch.gif')}

export function SketchScreen({ onAdvance }: ScreenProps) {
  const { width, height } = useWindowDimensions();
  const heroW = Math.min(width - 80, 280);
  const heroH = Math.min(height * 0.46, 380);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Beautiful with one tap</Text>
      <Text style={styles.body}>
        Hit <Text style={styles.bodyEmph}>"Make me Sketch"</Text> and your plain recipe becomes a scrapbook page.
      </Text>

      <View style={styles.heroWrap}>
        <HeroSlot
          width={heroW}
          height={heroH}
          rotate={-1.5}
          caption="Drop assets/onboarding/03-make-me-sketch.gif"
        />

        {/* Sample of the in-app button — visual reinforcement of what the user
            will tap inside the editor. Non-interactive on this screen. */}
        <View style={styles.sampleButton} pointerEvents="none">
          <Feather name="star" size={14} color="#fff6e8" />
          <Text style={styles.sampleButtonText}>Make me Sketch</Text>
        </View>
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
    marginBottom: 8,
    maxWidth: 320,
  },
  bodyEmph: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  sampleButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#fff6e8',
    letterSpacing: 0.2,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    width: '100%',
  },
});
