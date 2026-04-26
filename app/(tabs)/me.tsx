import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ActivityIndicator, TouchableOpacity, Switch, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { signOut } from '../../src/api/auth';
import {
  generateTelegramToken,
  disconnectTelegram,
  BOT_USERNAME,
  BOT_CHAT_URL,
  type TelegramTokenResult,
} from '../../src/api/telegramAuth';
import { useTelegramConnection } from '../../src/hooks/useTelegramConnection';
import { useConsents, useSetConsent } from '../../src/hooks/useConsents';
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
      // https://t.me/... routes to the Telegram app via OS Universal Links
      // when installed, falls back to web otherwise. Avoids tg:// which
      // requires LSApplicationQueriesSchemes (not honored in Expo Go).
      try {
        await Linking.openURL(result.fallbackUrl);
      } catch (e: any) {
        Alert.alert(
          'Could not open Telegram',
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
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Me</Text>

      {/* Privacy card */}
      <PrivacyCard />

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
              label={`Open @${BOT_USERNAME}`}
              onPress={() => {
                void Linking.openURL(BOT_CHAT_URL).catch((e: any) =>
                  Alert.alert('Could not open Telegram', e?.message ?? 'Unknown error'),
                );
              }}
            />
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

      <View style={{ height: 24 }} />

      <ClayButton label="Sign out" variant="secondary" loading={busy} onPress={handleSignOut} />
    </ScrollView>
  );
}

function PrivacyCard() {
  const { data: consents, isLoading } = useConsents();
  const setConsentMutation = useSetConsent();

  if (isLoading || !consents) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔐 Privacy</Text>
        <ActivityIndicator color={colors.terracotta} />
      </View>
    );
  }

  function toggle(kind: 'ai' | 'print' | 'marketing', value: boolean) {
    setConsentMutation.mutate({ kind, granted: value });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🔐 Privacy</Text>
      <Text style={styles.cardSub}>
        Granular controls over how Spoon &amp; Sketch processes your data. Changes take effect immediately.
      </Text>

      <ConsentToggle
        label="AI processing"
        body="Send recipe text, photos, and PDFs to AI services (Anthropic, OpenAI) for extraction and stickers. Off = Paste Link / Photo / File / Make-me-Sketch / Watercolor are disabled. JSON tab still works."
        value={consents.ai}
        onValueChange={(v) => toggle('ai', v)}
        disabled={setConsentMutation.isPending}
      />
      <ConsentToggle
        label="Print orders"
        body="Use your mailing address to fulfil printed-book orders (sent to Lulu xPress)."
        value={consents.print}
        onValueChange={(v) => toggle('print', v)}
        disabled={setConsentMutation.isPending}
      />
      <ConsentToggle
        label="Marketing"
        body="Product updates and tips by email or push. Order status emails always send regardless."
        value={consents.marketing}
        onValueChange={(v) => toggle('marketing', v)}
        disabled={setConsentMutation.isPending}
      />

      <Text style={styles.consentMeta}>
        ToS / Privacy Policy version{' '}
        <Text style={styles.consentMetaStrong}>{consents.ppVersion ?? 'unset'}</Text>. To revoke
        ToS, delete your account.
      </Text>
    </View>
  );
}

interface ConsentToggleProps {
  label: string;
  body: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

function ConsentToggle({ label, body, value, onValueChange, disabled }: ConsentToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleBody}>{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.terracotta }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32, gap: 20 },
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 2 },
  toggleBody: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  consentMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginTop: 6, lineHeight: 16 },
  consentMetaStrong: { fontFamily: fonts.bodyMedium, color: colors.inkSoft },
});

export default withErrorBoundary(MeScreen, 'Profile crashed');
