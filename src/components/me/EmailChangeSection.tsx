// Email change — Me-tab section.
//
// Tap "Change email" → modal with current email (read-only) + new email
// input + Save. On success, Supabase sends a confirmation link to the new
// address; the change isn't applied until the user clicks that link.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ClayButton } from '../ui/ClayButton';
import { changeEmail } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export function EmailChangeSection() {
  const { session } = useAuth();
  const currentEmail = session?.user.email ?? '';

  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setNewEmail('');
    setErr(null);
  }

  async function handleSave() {
    if (busy) return;
    setErr(null);
    const next = newEmail.trim().toLowerCase();
    if (!next) return setErr('Enter a new email address.');
    if (next === currentEmail.toLowerCase()) {
      return setErr('That\'s already your email.');
    }
    setBusy(true);
    try {
      await changeEmail(next);
      setBusy(false);
      setOpen(false);
      setNewEmail('');
      Alert.alert(
        'Check your inbox',
        `We sent a link to ${next}. Tap it to confirm — your email won't change until you do.`,
      );
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? 'Something went wrong. Try again.');
    }
  }

  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value} numberOfLines={1}>
            {currentEmail || '—'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setOpen(true)} hitSlop={6}>
          <Text style={styles.changeLink}>Change</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Change email</Text>
            <Text style={styles.body}>
              We'll send a confirmation link to your new address. Your current email stays active until you click that link.
            </Text>

            <Text style={styles.fieldLabel}>Current</Text>
            <Text style={styles.currentEmail} numberOfLines={1}>{currentEmail || '—'}</Text>

            <Text style={styles.fieldLabel}>New email</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={(t) => { setNewEmail(t); setErr(null); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <View style={styles.btnRow}>
              <ClayButton label="Cancel" variant="secondary" onPress={close} disabled={busy} style={styles.btn} />
              <ClayButton
                label={busy ? 'Sending…' : 'Save'}
                onPress={handleSave}
                loading={busy}
                disabled={!newEmail.trim() || busy}
                style={styles.btn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  rowText: { flex: 1 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  changeLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.terracotta,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(59,42,31,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: 20,
    padding: 22,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  currentEmail: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginBottom: 4,
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
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  btn: { flex: 1 },
});
