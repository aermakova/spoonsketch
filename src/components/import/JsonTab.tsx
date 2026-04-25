import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather } from '@expo/vector-icons';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useThemeStore } from '../../lib/store';
import { useImportRecipesJson } from '../../hooks/useImportRecipesJson';
import { AiError } from '../../api/ai';
import type { JsonImportResult } from '../../api/ai';
import type { ExtractErrorCode } from '../../types/ai';
import { JSON_IMPORT_PROMPT } from '../../lib/jsonImportPrompt';

export interface JsonTabInlineError {
  code: ExtractErrorCode;
  message: string;
}
export interface JsonTabCapped {
  used: number;
  limit: number;
}

const MAX_RECIPES = 20;
const MAX_BYTES = 500 * 1024;

interface Props {
  jsonText: string;
  onJsonTextChange: (text: string) => void;
  inlineError: JsonTabInlineError | null;
  onInlineErrorChange: (err: JsonTabInlineError | null) => void;
  capped: JsonTabCapped | null;
  onCappedChange: (capped: JsonTabCapped | null) => void;
  onImported: (result: JsonImportResult) => void;
  onUpgradePress: () => void;
}

export function JsonTab({
  jsonText,
  onJsonTextChange,
  inlineError,
  onInlineErrorChange,
  capped,
  onCappedChange,
  onImported,
  onUpgradePress,
}: Props) {
  const { palette } = useThemeStore();
  const importMutation = useImportRecipesJson();
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const preview = React.useMemo(() => previewJson(jsonText), [jsonText]);

  async function handleCopyPrompt() {
    await Clipboard.setStringAsync(JSON_IMPORT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleChooseFile() {
    onInlineErrorChange(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    if ((asset.size ?? 0) > MAX_BYTES) {
      onInlineErrorChange({ code: 'unknown', message: 'File too large (max 500KB).' });
      return;
    }
    try {
      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      onJsonTextChange(text);
    } catch (e) {
      onInlineErrorChange({ code: 'unknown', message: 'Could not read that file.' });
    }
  }

  async function handleImport() {
    onInlineErrorChange(null);
    if (preview.empty) {
      onInlineErrorChange({ code: 'unknown', message: 'Paste JSON first.' });
      return;
    }
    if (!preview.ok) {
      onInlineErrorChange({ code: 'unknown', message: preview.error });
      return;
    }
    try {
      const result = await importMutation.mutateAsync({ recipes: preview.recipes });
      onImported(result);
    } catch (e) {
      if (e instanceof AiError) {
        if (e.errorCode === 'monthly_limit_reached') {
          onCappedChange({
            used: e.details?.used ?? 0,
            limit: e.details?.limit ?? 5,
          });
          return;
        }
        onInlineErrorChange({
          code: 'unknown',
          message: e.message,
        });
        return;
      }
      onInlineErrorChange({
        code: 'unknown',
        message: e instanceof Error ? e.message : 'Something went wrong.',
      });
    }
  }

  const canImport =
    !preview.empty && preview.ok && preview.recipes.length > 0 && !importMutation.isPending;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Bulk import from a PDF</Text>
      <Text style={styles.subcopy}>
        Got a PDF with multiple recipes? Use ChatGPT, Claude.ai, or Gemini to extract them — then paste the result here.
      </Text>

      <View style={[styles.howCard, { borderColor: colors.line }]}>
        <Text style={styles.howTitle}>How it works</Text>
        <View style={styles.howStep}><Text style={styles.howNum}>1.</Text><Text style={styles.howText}>Tap <Text style={styles.bold}>Copy prompt</Text> below.</Text></View>
        <View style={styles.howStep}><Text style={styles.howNum}>2.</Text><Text style={styles.howText}>Open ChatGPT / Claude / Gemini and paste it with your PDF attached.</Text></View>
        <View style={styles.howStep}><Text style={styles.howNum}>3.</Text><Text style={styles.howText}>Copy the JSON the AI returns.</Text></View>
        <View style={styles.howStep}><Text style={styles.howNum}>4.</Text><Text style={styles.howText}>Paste it below — up to {MAX_RECIPES} recipes per import.</Text></View>
      </View>

      <View style={styles.copyRow}>
        <ClayButton
          label={copied ? 'Copied ✓' : 'Copy prompt'}
          size="lg"
          onPress={handleCopyPrompt}
        />
        <Pressable onPress={() => setShowPrompt((v) => !v)} style={styles.showPromptBtn} hitSlop={6}>
          <Feather name={showPrompt ? 'chevron-up' : 'chevron-down'} size={14} color={colors.inkSoft} />
          <Text style={styles.showPromptText}>{showPrompt ? 'Hide prompt' : 'Show prompt'}</Text>
        </Pressable>
      </View>

      {showPrompt ? (
        <View style={styles.promptPreview}>
          <Text style={styles.promptPreviewText} selectable>
            {JSON_IMPORT_PROMPT}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Paste JSON</Text>
      <TextInput
        style={styles.jsonInput}
        value={jsonText}
        onChangeText={(t) => {
          onJsonTextChange(t);
          if (inlineError) onInlineErrorChange(null);
        }}
        placeholder={'[\n  { "title": "Tomato soup", ... }\n]'}
        placeholderTextColor={colors.inkFaint}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
      />

      <View style={styles.fileRow}>
        <Pressable onPress={handleChooseFile} style={styles.fileBtn} hitSlop={4}>
          <Feather name="upload" size={14} color={palette.accent} />
          <Text style={[styles.fileBtnText, { color: palette.accent }]}>Choose .json file</Text>
        </Pressable>
        <PreviewBadge preview={preview} accent={palette.accent} />
      </View>

      {inlineError ? (
        <Text style={[styles.inlineError, { color: colors.tomato }]}>
          {inlineError.message}
        </Text>
      ) : null}

      {capped ? (
        <View style={[styles.capCard, { backgroundColor: palette.bg2, borderColor: palette.accent }]}>
          <Text style={[styles.capHeader, { color: palette.accent }]}>
            You've used {capped.used} / {capped.limit} JSON imports this month
          </Text>
          <Text style={styles.capBody}>
            Upgrade to Premium for unlimited bulk imports.
          </Text>
          <View style={{ height: 10 }} />
          <ClayButton label="Upgrade to Premium" onPress={onUpgradePress} />
        </View>
      ) : (
        <View style={styles.importWrap}>
          <ClayButton
            label={importMutation.isPending ? 'Importing…' : 'Import All'}
            size="lg"
            loading={importMutation.isPending}
            disabled={!canImport}
            onPress={handleImport}
          />
        </View>
      )}
    </ScrollView>
  );
}

function PreviewBadge({
  preview,
  accent,
}: {
  preview: ParsedPreview;
  accent: string;
}) {
  if (preview.empty) {
    return <Text style={styles.previewMuted}>—</Text>;
  }
  if (!preview.ok) {
    return <Text style={[styles.previewBad, { color: colors.tomato }]} numberOfLines={1}>{preview.error}</Text>;
  }
  if (preview.recipes.length === 0) {
    return <Text style={styles.previewMuted}>0 recipes detected</Text>;
  }
  if (preview.truncated) {
    return (
      <Text style={[styles.previewGood, { color: accent }]} numberOfLines={1}>
        {preview.recipes.length} of {preview.originalCount} recipes — server will keep first {MAX_RECIPES}
      </Text>
    );
  }
  return (
    <Text style={[styles.previewGood, { color: accent }]} numberOfLines={1}>
      {preview.recipes.length} {preview.recipes.length === 1 ? 'recipe' : 'recipes'} detected
    </Text>
  );
}

type ParsedPreview =
  | { empty: true }
  | { empty: false; ok: true; recipes: unknown[]; originalCount: number; truncated: boolean }
  | { empty: false; ok: false; error: string };

function previewJson(text: string): ParsedPreview {
  if (!text || text.trim().length === 0) return { empty: true };
  let stripped = text.trim();
  // Tolerate accidental markdown fences if the AI wrapped the response.
  if (stripped.startsWith('```')) {
    stripped = stripped.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    return {
      empty: false,
      ok: false,
      error: e instanceof Error ? `Invalid JSON: ${e.message}` : 'Invalid JSON',
    };
  }
  if (!Array.isArray(parsed)) {
    return { empty: false, ok: false, error: 'Top-level value must be a JSON array.' };
  }
  return {
    empty: false,
    ok: true,
    recipes: parsed.slice(0, MAX_RECIPES),
    originalCount: parsed.length,
    truncated: parsed.length > MAX_RECIPES,
  };
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
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
    marginBottom: 18,
    lineHeight: 20,
  },
  howCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.paper,
  },
  howTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 8,
  },
  howStep: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  howNum: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
    width: 16,
  },
  howText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  bold: {
    fontFamily: fonts.bodyBold,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  showPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  showPromptText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  promptPreview: {
    backgroundColor: colors.bg2,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  promptPreviewText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.inkSoft,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 18,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  jsonInput: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Courier',
    fontSize: 12,
    color: colors.ink,
    minHeight: 180,
    maxHeight: 320,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    minHeight: 28,
  },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  fileBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  previewMuted: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  previewBad: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    flexShrink: 1,
    marginLeft: 8,
  },
  previewGood: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    flexShrink: 1,
    marginLeft: 8,
  },
  inlineError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 12,
  },
  importWrap: {
    marginTop: 24,
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
