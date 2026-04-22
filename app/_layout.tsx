import { useEffect } from 'react';
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

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/');
    }
  }, [session, loading, segments]);

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
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
