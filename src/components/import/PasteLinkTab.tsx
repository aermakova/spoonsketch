import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useThemeStore } from '../../lib/store';
import { useExtractRecipe } from '../../hooks/useExtractRecipe';
import { AiError } from '../../api/ai';
import type { ExtractedRecipe, ExtractErrorCode } from '../../types/ai';
import { SupportedSitesRow } from './SupportedSitesRow';
import { ImportTipCard } from './ImportTipCard';

export interface PasteLinkInlineError {
  code: ExtractErrorCode;
  message: string;
}
export interface PasteLinkCapped {
  used: number;
  limit: number;
}

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  inlineError: PasteLinkInlineError | null;
  onInlineErrorChange: (err: PasteLinkInlineError | null) => void;
  capped: PasteLinkCapped | null;
  onCappedChange: (capped: PasteLinkCapped | null) => void;
  onImported: (recipe: ExtractedRecipe) => void;
  onUpgradePress: () => void;
}

// State (url, inlineError, capped) is lifted to the parent ImportRecipeScreen
// so switching tabs doesn't unmount this component and lose the user's input.
// See CODE_REVIEW R4.
export function PasteLinkTab({
  url,
  onUrlChange,
  inlineError,
  onInlineErrorChange,
  capped,
  onCappedChange,
  onImported,
  onUpgradePress,
}: Props) {
  const { palette } = useThemeStore();
  const extract = useExtractRecipe();

  const canSubmit = url.trim().length > 0 && !extract.isPending;

  async function handleImport() {
    Keyboard.dismiss();
    onInlineErrorChange(null);
    try {
      const recipe = await extract.mutateAsync({ url: url.trim() });
      onImported(recipe);
    } catch (e) {
      if (e instanceof AiError) {
        if (e.errorCode === 'monthly_limit_reached') {
          onCappedChange({
            used: e.details?.used ?? 0,
            limit: e.details?.limit ?? 20,
          });
          return;
        }
        onInlineErrorChange({
          code: mapToExtractCode(e.errorCode),
          message: e.message,
        });
        return;
      }
      onInlineErrorChange({ code: 'unknown', message: 'Something went wrong.' });
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Paste the link to any recipe</Text>
      <Text style={styles.subcopy}>
        We’ll grab the ingredients, instructions, and photos for you.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={(t) => {
            onUrlChange(t);
            if (inlineError) onInlineErrorChange(null);
          }}
          placeholder="Paste a recipe URL"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={canSubmit ? handleImport : undefined}
          editable={!extract.isPending}
        />
        {url.length > 0 ? (
          <Pressable
            onPress={() => onUrlChange('')}
            hitSlop={10}
            style={styles.clearBtn}
          >
            <Feather name="x" size={16} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {inlineError ? (
        <Text style={[styles.inlineError, { color: colors.tomato }]}>
          {errorCopy(inlineError.code, inlineError.message)}
        </Text>
      ) : null}

      {capped ? (
        <View
          style={[
            styles.capCard,
            { backgroundColor: palette.bg2, borderColor: palette.accent },
          ]}
        >
          <Text style={[styles.capHeader, { color: palette.accent }]}>
            You’ve used {capped.used} / {capped.limit} imports this month
          </Text>
          <Text style={styles.capBody}>
            Upgrade to Premium for unlimited recipe imports.
          </Text>
          <View style={{ height: 10 }} />
          <ClayButton label="Upgrade to Premium" onPress={onUpgradePress} />
        </View>
      ) : (
        <View style={styles.buttonWrap}>
          <ClayButton
            label="Import Recipe"
            loading={extract.isPending}
            disabled={!canSubmit}
            onPress={handleImport}
            size="lg"
            style={styles.primaryBtn}
          />
          <View
            style={[
              styles.sparkleLeft,
              { borderColor: palette.accent },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.sparkleRight,
              { borderColor: palette.accent },
            ]}
            pointerEvents="none"
          />
        </View>
      )}

      <SupportedSitesRow />

      <View style={{ height: 20 }} />
      <ImportTipCard />
    </ScrollView>
  );
}

const EXTRACT_CODES: readonly ExtractErrorCode[] = [
  'invalid_url',
  'monthly_limit_reached',
  'rate_limited',
  'ai_unavailable',
  'network',
  'unknown',
] as const;

function mapToExtractCode(code: string): ExtractErrorCode {
  return (EXTRACT_CODES as readonly string[]).includes(code)
    ? (code as ExtractErrorCode)
    : 'unknown';
}

function errorCopy(code: ExtractErrorCode, fallback: string): string {
  switch (code) {
    case 'invalid_url':
      return 'That doesn’t look like a recipe URL.';
    case 'ai_unavailable':
      return 'Couldn’t read that page right now. Try again in a minute.';
    case 'rate_limited':
      return 'You’re going a bit fast — try again in a moment.';
    case 'network':
      return 'You’re offline. Try again when you’re back.';
    default:
      return fallback || 'Something went wrong.';
  }
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 8,
  },
  subcopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 12,
  },
  clearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  inlineError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 8,
  },
  buttonWrap: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    width: '100%',
  },
  // Little sparkle accents top-right / top-left of the button, matching the
  // mockup's three radiating dashes.
  sparkleLeft: {
    position: 'absolute',
    top: -6,
    left: 10,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    transform: [{ rotate: '-20deg' }],
    opacity: 0.6,
  },
  sparkleRight: {
    position: 'absolute',
    top: -6,
    right: 10,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '20deg' }],
    opacity: 0.6,
  },
  capCard: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  capHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  capBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
  },
});
