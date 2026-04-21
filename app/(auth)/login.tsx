import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView,
} from 'react-native';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { Sticker } from '../../src/components/stickers/Sticker';
import { signIn, signUp } from '../../src/api/auth';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    if (mode === 'signup' && password !== confirmPassword) {
      Alert.alert("Passwords don't match", 'Please make sure both passwords are the same.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp(email.trim().toLowerCase(), password);
        Alert.alert('Account created!', 'Check your email to confirm your account, then sign in.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PaperGrain style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stickers}>
            <Sticker kind="spoon" size={48} rotate={-12} />
            <Sticker kind="heart" size={40} rotate={8} />
            <Sticker kind="leaf" size={44} rotate={-5} />
          </View>

          <Text style={styles.title}>Spoon & Sketch</Text>
          <Text style={styles.subtitle}>your cozy cookbook</Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create account</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.inkFaint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.inkFaint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.inkFaint}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              onSubmitEditing={handleSubmit}
            />
          )}

          <ClayButton
            label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!email.trim() || !password}
            style={styles.button}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </PaperGrain>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 32, paddingTop: 80 },
  stickers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.hand,
    fontSize: 22,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.paper,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.inkFaint,
  },
  tabTextActive: {
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
});
