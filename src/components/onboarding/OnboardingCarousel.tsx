import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { markOnboardingComplete } from '../../lib/onboardingFlag';
import { SplashScreen } from './SplashScreen';
import { ImportScreen } from './ImportScreen';
import { SketchScreen } from './SketchScreen';
import { DedicationScreen } from './DedicationScreen';
import { PrintedBookScreen } from './PrintedBookScreen';

const SCREEN_COUNT = 5;

export interface ScreenProps {
  onAdvance: () => void;
  onSignIn?: () => void;     // splash only
  onFinish?: () => void;     // last screen
}

export function OnboardingCarousel() {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const router = useRouter();

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== pageIdx) setPageIdx(idx);
  }, [width, pageIdx]);

  const advance = useCallback(() => {
    const next = Math.min(pageIdx + 1, SCREEN_COUNT - 1);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPageIdx(next);
  }, [pageIdx, width]);

  const signIn = useCallback(async () => {
    // User has an account — flip the flag (they shouldn't see onboarding again)
    // and route to login.
    await markOnboardingComplete();
    router.replace('/(auth)/login');
  }, [router]);

  const finish = useCallback(async () => {
    await markOnboardingComplete();
    router.replace('/(auth)/login');
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        bounces={false}
        // Prevent iOS bounce at the right edge from re-triggering finish.
        overScrollMode="never"
      >
        <View style={{ width, height }}>
          <SplashScreen onAdvance={advance} onSignIn={signIn} />
        </View>
        <View style={{ width, height }}>
          <ImportScreen onAdvance={advance} />
        </View>
        <View style={{ width, height }}>
          <SketchScreen onAdvance={advance} />
        </View>
        <View style={{ width, height }}>
          <DedicationScreen onAdvance={advance} />
        </View>
        <View style={{ width, height }}>
          <PrintedBookScreen onAdvance={advance} onFinish={finish} />
        </View>
      </ScrollView>

      {/* Progress dots — hidden on splash to keep it clean (matches design). */}
      {pageIdx > 0 && <Dots count={SCREEN_COUNT} active={pageIdx} />}
    </View>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dotsRow} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dotsRow: {
    position: 'absolute',
    bottom: 100,            // sits above the primary CTA on each screen
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.inkFaint,
    opacity: 0.5,
  },
  dotActive: {
    backgroundColor: colors.terracotta,
    opacity: 1,
    width: 18,
  },
});
