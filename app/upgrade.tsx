import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { PaperGrain } from '../src/components/ui/PaperGrain';
import { ClayButton } from '../src/components/ui/ClayButton';
import { withErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { useThemeStore } from '../src/lib/store';
import { colors } from '../src/theme/colors';
import { fonts } from '../src/theme/fonts';

function UpgradeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useThemeStore();

  return (
    <PaperGrain style={{ ...styles.root, backgroundColor: palette.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={styles.close}
        >
          <Feather name="x" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Premium coming soon</Text>
        <Text style={styles.sub}>
          Unlimited recipe imports, unlimited AI sketches, and a few more
          surprises we’re cooking up.
        </Text>
        <View style={{ height: 24 }} />
        <ClayButton
          label="Got it, thanks"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
        />
      </View>
    </PaperGrain>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
    gap: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.ink,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default withErrorBoundary(UpgradeScreen, 'Upgrade screen crashed');
