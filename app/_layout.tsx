import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Fraunces_400Regular,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { MarckScript_400Regular } from '@expo-google-fonts/marck-script';
import { BadScript_400Regular } from '@expo-google-fonts/bad-script';
import { AmaticSC_400Regular, AmaticSC_700Bold } from '@expo-google-fonts/amatic-sc';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/hooks/useAuth';
import { TrackingConsentBanner } from '../src/components/TrackingConsentBanner';
import { isOnboardingComplete } from '../src/lib/onboardingFlag';
import { ensureI18n } from '../src/i18n';

// Bootstrap i18next once per app launch. Idempotent — safe to call from
// module top-level so the very first render already has translations.
ensureI18n();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',  // React Native's NetInfo online detector can give false negatives
      retry: 3,
      retryDelay: 1000,
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // undefined = still reading; true/false = resolved
  const [onboardingDone, setOnboardingDone] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    isOnboardingComplete().then(setOnboardingDone);
  }, []);

  useEffect(() => {
    if (loading || onboardingDone === undefined) return;
    const inAuth = segments[0] === '(auth)';
    // segments tuple is loose — index 1 may not exist; cast string|undefined.
    const onOnboarding = inAuth && (segments as string[])[1] === 'onboarding';

    if (!session) {
      // Not signed in. First-time visitors land on onboarding; returning ones go straight to login.
      if (!onboardingDone && !onOnboarding) {
        router.replace('/(auth)/onboarding');
      } else if (onboardingDone && !inAuth) {
        router.replace('/(auth)/login');
      } else if (onboardingDone && onOnboarding) {
        // Edge case: user finished onboarding mid-render but hasn't navigated yet.
        router.replace('/(auth)/login');
      }
      return;
    }

    // Signed in — never show onboarding or login.
    if (inAuth) router.replace('/');
  }, [session, loading, segments, onboardingDone]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_700Bold,
    Caveat_400Regular,
    Caveat_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    MarckScript_400Regular,
    BadScript_400Regular,
    AmaticSC_400Regular,
    AmaticSC_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.terracotta} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="recipe/import"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
        </Stack>
        {/* Cookie consent — must render BEFORE any non-essential tracker
            initializes. Currently no tracker SDK is wired (PostHog deferred);
            having the banner ready means consent state already exists when
            we add one. */}
        <TrackingConsentBanner />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
