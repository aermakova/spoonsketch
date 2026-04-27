// /(auth)/reset-password — landing screen after a user taps a reset link
// in their email. By the time we route here, useAuthDeepLink has already
// called supabase.auth.setSession() with the recovery tokens, so the user
// is in a "recovery" auth state where updateUser({ password }) succeeds.
//
// User picks a new password (twice), tap Save → updatePassword → routes to
// /(auth)/login. The session-listener on AuthGate will then route to home
// once they sign in normally with the new password.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { updatePassword } from '../../src/api/auth';
import { supabase } from '../../src/api/client';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    setErr(null);
    if (password.length < 6) {
      return setErr('Password must be at least 6 characters.');
    }
    if (password !== confirm) {
      return setErr("Passwords don't match.");
    }
    setBusy(true);
    try {
      await updatePassword(password);
      // Sign the user out of the recovery session so they go through a
      // normal sign-in next time. Avoids confusion where the recovery
      // session would otherwise persist as a "limited" session.
      await supabase.auth.signOut();
      Alert.alert(
        'Password updated',
        'Sign in with your new password.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? 'Could not update password. Try requesting a new reset link.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.body}>
          Pick something at least 6 characters. You can change it again later from the Me tab.
        </Text>

        <Text style={styles.fieldLabel}>New password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(t) => { setPassword(t); setErr(null); }}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />

        <Text style={styles.fieldLabel}>Confirm</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={(t) => { setConfirm(t); setErr(null); }}
          placeholder="Type it again"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <ClayButton
          label={busy ? 'Saving…' : 'Save new password'}
          onPress={handleSave}
          loading={busy}
          disabled={!password || !confirm || busy}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 32, paddingTop: 80 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  err: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#b94a38',
    marginTop: 12,
  },
  btn: {
    marginTop: 24,
  },
});
