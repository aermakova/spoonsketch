import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking, ActivityIndicator, TouchableOpacity, Switch, ScrollView, Modal, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { signOut, deleteAccount, exportUserData } from '../../src/api/auth';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  generateTelegramToken,
  disconnectTelegram,
  BOT_USERNAME,
  BOT_CHAT_URL,
  type TelegramTokenResult,
} from '../../src/api/telegramAuth';
import { useTelegramConnection } from '../../src/hooks/useTelegramConnection';
import { useConsents, useSetConsent } from '../../src/hooks/useConsents';
import { useTrackingConsent } from '../../src/lib/trackingConsent';
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

      <ExportDataLink />
      <DeleteAccountSection />
    </ScrollView>
  );
}

function ExportDataLink() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportUserData();
      // Write to documentDirectory + share sheet handoff.
      const filename = `spoonsketch-export-${Date.now()}.json`;
      const uri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2));
      const sharingOk = await Sharing.isAvailableAsync();
      if (sharingOk) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export your Spoon & Sketch data',
          UTI: 'public.json',
        });
      } else {
        Alert.alert(
          'Saved',
          `Export written to: ${uri}\n\nSharing isn't available on this device — open Files to find it.`,
        );
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again later.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <TouchableOpacity
      style={styles.exportRow}
      onPress={handleExport}
      disabled={exporting}
      hitSlop={6}
    >
      <Text style={styles.exportText}>
        {exporting ? 'Preparing your data…' : 'Export my data'}
      </Text>
      <Text style={styles.exportHint}>
        Saves all your recipes, cookbooks, and account data as a JSON file you can save or email
        to yourself. Limited to once per 24 hours.
      </Text>
    </TouchableOpacity>
  );
}

function DeleteAccountSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      // Auth listener in app/_layout.tsx routes to /login on signout.
    } catch (e: any) {
      setDeleting(false);
      Alert.alert(
        'Could not delete account',
        e?.message ?? 'Please try again or contact support.',
      );
    }
  }

  function handleClose() {
    if (deleting) return;
    setModalOpen(false);
    setConfirmText('');
  }

  return (
    <>
      <View style={styles.dangerZone}>
        <Text style={styles.dangerHeading}>Danger zone</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} hitSlop={6}>
          <Text style={styles.dangerLink}>Delete my account</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalBody}>
              This will permanently remove your account, all your recipes, cookbooks, drawings,
              uploaded photos, print orders, and every other piece of data tied to you. We cannot
              undo this.
            </Text>
            <Text style={styles.modalBody}>
              Type{' '}
              <Text style={styles.modalEmphasis}>DELETE</Text>{' '}
              below to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
            />
            <View style={styles.modalRow}>
              <ClayButton
                label="Cancel"
                variant="secondary"
                onPress={handleClose}
                disabled={deleting}
                style={styles.modalBtn}
              />
              <ClayButton
                label={deleting ? 'Deleting…' : 'Delete forever'}
                onPress={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                loading={deleting}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PrivacyCard() {
  const { data: consents, isLoading } = useConsents();
  const setConsentMutation = useSetConsent();
  const trackingStatus = useTrackingConsent((s) => s.status);
  const acceptTracking = useTrackingConsent((s) => s.accept);
  const rejectTracking = useTrackingConsent((s) => s.reject);

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
      <ConsentToggle
        label="Analytics"
        body="Anonymous product-usage data (screens opened, features tapped) — no recipe content. Crash reports always send regardless. This is a device-level choice; changes apply immediately."
        value={trackingStatus === 'accepted'}
        onValueChange={(v) => (v ? acceptTracking() : rejectTracking())}
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
  dangerZone: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    alignItems: 'center',
  },
  dangerHeading: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  dangerLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: '#c44141',
    textDecorationLine: 'underline',
    paddingVertical: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 22,
    gap: 12,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
  },
  modalBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  modalEmphasis: {
    fontFamily: fonts.bodyBold,
    color: '#c44141',
  },
  modalInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalBtn: { flex: 1 },
  exportRow: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  exportText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.terracotta,
    marginBottom: 4,
  },
  exportHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
  },
});

export default withErrorBoundary(MeScreen, 'Profile crashed');
