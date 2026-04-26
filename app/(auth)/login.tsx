import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { Sticker } from '../../src/components/stickers/Sticker';
import { signIn, signInWithApple, signUp, ApiError } from '../../src/api/auth';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

interface ConsentRowProps {
  value: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}

function ConsentRow({ value, onChange, label, required }: ConsentRowProps) {
  return (
    <TouchableOpacity
      style={consentStyles.row}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <View style={[consentStyles.box, value && consentStyles.boxChecked]}>
        {value ? <Text style={consentStyles.check}>✓</Text> : null}
      </View>
      <View style={consentStyles.labelWrap}>
        {label}
        {required ? <Text style={consentStyles.required}> · required</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const consentStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  check: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  labelWrap: {
    flex: 1,
  },
  required: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  // Granular consents — required for Ukraine + EU sign-up. ToS+PP is the
  // gate; AI / print / marketing are optional opt-ins.
  const [consentTos, setConsentTos] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [consentPrint, setConsentPrint] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  // Apple Sign In is iOS-only AND requires iOS 13+. Older devices
  // (rare in 2026 but possible) fall back to email/password.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      await signInWithApple();
      // Auth state change listener (set up in app/_layout.tsx) takes
      // it from here — no manual nav.
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'cancelled') return; // user dismissed
      Alert.alert('Apple sign in failed', e?.message ?? 'Please try again.');
    } finally {
      setAppleLoading(false);
    }
  }

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
        if (!consentTos) {
          Alert.alert('Required', 'Please agree to the Terms and Privacy Policy to create an account.');
          return;
        }
        await signUp(email.trim().toLowerCase(), password, {
          ai: consentAi,
          print: consentPrint,
          marketing: consentMarketing,
        });
        Alert.alert('Account created!', 'Check your email to confirm your account, then sign in.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        // Clear consents — next sign-up starts fresh.
        setConsentTos(false);
        setConsentAi(false);
        setConsentPrint(false);
        setConsentMarketing(false);
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

          {mode === 'signup' && (
            <View style={styles.consents}>
              <ConsentRow
                value={consentTos}
                onChange={setConsentTos}
                required
                label={
                  <Text style={styles.consentLabel}>
                    I agree to the <Text style={styles.consentLink}>Terms of Service</Text> and{' '}
                    <Text style={styles.consentLink}>Privacy Policy</Text>.
                  </Text>
                }
              />
              <ConsentRow
                value={consentAi}
                onChange={setConsentAi}
                label={
                  <Text style={styles.consentLabel}>
                    Use AI to read my recipes and generate stickers (Anthropic, OpenAI). Optional —
                    you can change this in Settings.
                  </Text>
                }
              />
              <ConsentRow
                value={consentPrint}
                onChange={setConsentPrint}
                label={
                  <Text style={styles.consentLabel}>
                    Use my mailing address to fulfil printed-book orders. Only matters when you
                    place an order.
                  </Text>
                }
              />
              <ConsentRow
                value={consentMarketing}
                onChange={setConsentMarketing}
                label={
                  <Text style={styles.consentLabel}>
                    Send me product updates and tips by email or push. Order status emails always
                    send regardless.
                  </Text>
                }
              />
            </View>
          )}

          <ClayButton
            label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={handleSubmit}
            loading={loading}
            disabled={
              !email.trim() ||
              !password ||
              appleLoading ||
              (mode === 'signup' && !consentTos)
            }
            style={styles.button}
          />

          {appleAvailable ? (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  mode === 'signin'
                    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            </>
          ) : null}
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    marginHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  consents: {
    marginTop: 4,
    marginBottom: 4,
  },
  consentLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  consentLink: {
    fontFamily: fonts.bodyMedium,
    color: colors.terracotta,
    textDecorationLine: 'underline',
  },
});
