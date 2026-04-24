import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { signOut } from '../../src/api/auth';
import {
  generateTelegramToken,
  disconnectTelegram,
  type TelegramTokenResult,
} from '../../src/api/telegramAuth';
import { useTelegramConnection } from '../../src/hooks/useTelegramConnection';
import { useSubmitGuard } from '../../src/lib/useSubmitGuard';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

function MeScreen() {
  const [busy, run] = useSubmitGuard();
  const { data: connection, isLoading: connLoading } = useTelegramConnection();
  const qc = useQueryClient();

  // Local state holds the most recently generated token so we can show the
  // fallback URL + copy button if Telegram isn't installed.
  const [pendingToken, setPendingToken] = useState<TelegramTokenResult | null>(null);

  const connectMutation = useMutation({
    mutationFn: generateTelegramToken,
    onSuccess: async (result) => {
      setPendingToken(result);
      const can = await Linking.canOpenURL(result.deepLink);
      if (can) {
        await Linking.openURL(result.deepLink);
      } else {
        // Telegram not installed — surface the fallback https link instead
        Alert.alert(
          'Telegram not installed',
          'Open this link in any browser:\n\n' + result.fallbackUrl,
          [{ text: 'OK' }],
        );
      }
    },
    onError: (e: any) => Alert.alert('Could not start connect', e?.message ?? 'Unknown error'),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectTelegram,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telegramConnection'] });
      setPendingToken(null);
    },
    onError: (e: any) => Alert.alert('Could not disconnect', e?.message ?? 'Unknown error'),
  });

  function handleSignOut() {
    void run(async () => {
      try {
        await signOut();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    });
  }

  async function handleCopyFallback() {
    if (!pendingToken) return;
    await Clipboard.setStringAsync(pendingToken.fallbackUrl);
    Alert.alert('Copied', 'Paste the link in any browser with Telegram installed.');
  }

  function confirmDisconnect() {
    Alert.alert(
      'Disconnect Telegram?',
      'You can reconnect anytime. Recipes already saved stay in your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnectMutation.mutate(),
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Me</Text>

      {/* Telegram card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📨 Telegram</Text>

        {connLoading ? (
          <ActivityIndicator color={colors.terracotta} />
        ) : connection ? (
          <>
            <Text style={styles.cardBody}>
              ✓ Connected as{' '}
              <Text style={styles.handle}>
                {connection.username ? `@${connection.username}` : `id ${connection.telegram_id}`}
              </Text>
            </Text>
            <Text style={styles.cardSub}>
              Send a recipe link or screenshot to your bot — it'll appear here.
            </Text>
            <ClayButton
              label="Disconnect"
              variant="secondary"
              onPress={confirmDisconnect}
              loading={disconnectMutation.isPending}
            />
          </>
        ) : (
          <>
            <Text style={styles.cardBody}>
              Send recipe links or screenshots to your bot and they'll show up
              in your library automatically.
            </Text>
            <ClayButton
              label="Connect Telegram"
              onPress={() => connectMutation.mutate()}
              loading={connectMutation.isPending}
            />
            {pendingToken && (
              <View style={styles.fallbackWrap}>
                <Text style={styles.fallbackLabel}>
                  Telegram should have opened. If not, copy this link into a browser:
                </Text>
                <TouchableOpacity onPress={handleCopyFallback} style={styles.fallbackLinkRow}>
                  <Text style={styles.fallbackUrl} numberOfLines={1} ellipsizeMode="middle">
                    {pendingToken.fallbackUrl}
                  </Text>
                  <Text style={styles.copyHint}>Tap to copy</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ flex: 1 }} />

      <ClayButton label="Sign out" variant="secondary" loading={busy} onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32, gap: 20 },
  heading: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink },
  cardBody: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 19 },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: -4 },
  handle: { fontFamily: fonts.bodyBold, color: colors.terracotta },
  fallbackWrap: { marginTop: 4, gap: 6 },
  fallbackLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  fallbackLinkRow: {
    backgroundColor: colors.bg2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fallbackUrl: { fontFamily: fonts.body, fontSize: 12, color: colors.ink, flex: 1 },
  copyHint: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.terracotta },
});

export default withErrorBoundary(MeScreen, 'Profile crashed');
