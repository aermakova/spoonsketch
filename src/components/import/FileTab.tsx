import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useThemeStore } from '../../lib/store';
import { useExtractFromDocument } from '../../hooks/useExtractFromImages';
import { uploadPdfForExtraction } from '../../api/storage';
import { AiError } from '../../api/ai';
import type { ExtractedRecipe, ExtractErrorCode } from '../../types/ai';

export interface FileTabPicked {
  /** Local file URI (`file://...`). */
  localUri: string;
  /** Display name (e.g. `recipe.pdf`). */
  name: string;
  /** Mime — narrowed to the two supported formats. */
  kind: 'pdf' | 'txt';
  /** Bytes; pdf is capped at 10MB on server too. */
  sizeBytes: number;
}
export interface FileTabInlineError {
  code: ExtractErrorCode;
  message: string;
}
export interface FileTabCapped {
  used: number;
  limit: number;
}

const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const TXT_MAX_BYTES = 100 * 1024; // 100KB

interface Props {
  picked: FileTabPicked | null;
  onPickedChange: (next: FileTabPicked | null) => void;
  inlineError: FileTabInlineError | null;
  onInlineErrorChange: (err: FileTabInlineError | null) => void;
  capped: FileTabCapped | null;
  onCappedChange: (capped: FileTabCapped | null) => void;
  onImported: (recipe: ExtractedRecipe) => void;
  onUpgradePress: () => void;
}

export function FileTab({
  picked,
  onPickedChange,
  inlineError,
  onInlineErrorChange,
  capped,
  onCappedChange,
  onImported,
  onUpgradePress,
}: Props) {
  const { palette } = useThemeStore();
  const extract = useExtractFromDocument();
  const [uploading, setUploading] = React.useState(false);
  const busy = uploading || extract.isPending;

  async function handlePick() {
    onInlineErrorChange(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    const isPdf = (asset.mimeType ?? '').includes('pdf') || asset.name.toLowerCase().endsWith('.pdf');
    const isTxt = (asset.mimeType ?? '').startsWith('text/') || asset.name.toLowerCase().endsWith('.txt');
    if (!isPdf && !isTxt) {
      onInlineErrorChange({ code: 'unknown', message: 'Only PDF and .txt files are supported.' });
      return;
    }

    const sizeBytes = asset.size ?? 0;
    const cap = isPdf ? PDF_MAX_BYTES : TXT_MAX_BYTES;
    if (sizeBytes > cap) {
      const capLabel = isPdf ? '10MB' : '100KB';
      onInlineErrorChange({ code: 'unknown', message: `File is too large (max ${capLabel}).` });
      return;
    }

    onPickedChange({
      localUri: asset.uri,
      name: asset.name,
      kind: isPdf ? 'pdf' : 'txt',
      sizeBytes,
    });
  }

  function clearPick() {
    onPickedChange(null);
    onInlineErrorChange(null);
  }

  async function handleImport() {
    if (!picked) return;
    onInlineErrorChange(null);
    try {
      let recipe: ExtractedRecipe;
      if (picked.kind === 'pdf') {
        setUploading(true);
        const { signedUrl } = await uploadPdfForExtraction(picked.localUri);
        setUploading(false);
        recipe = await extract.mutateAsync({ pdfUrl: signedUrl });
      } else {
        // .txt — read inline; no upload needed.
        const text = await FileSystem.readAsStringAsync(picked.localUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        recipe = await extract.mutateAsync({ textContent: text });
      }
      onImported(recipe);
    } catch (e) {
      setUploading(false);
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
      onInlineErrorChange({
        code: 'unknown',
        message: e instanceof Error ? e.message : 'Something went wrong.',
      });
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Import from a file</Text>
      <Text style={styles.subcopy}>
        PDF up to 10MB · text file up to 100KB.
      </Text>

      {picked ? (
        <View style={[styles.fileRow, { borderColor: palette.accent }]}>
          <Feather name={picked.kind === 'pdf' ? 'file-text' : 'file'} size={20} color={palette.accent} />
          <View style={styles.fileMeta}>
            <Text style={styles.fileName} numberOfLines={1}>{picked.name}</Text>
            <Text style={styles.fileSize}>{formatBytes(picked.sizeBytes)} · {picked.kind.toUpperCase()}</Text>
          </View>
          <Pressable onPress={clearPick} hitSlop={10}>
            <Feather name="x" size={18} color={colors.inkSoft} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.pickerColumn}>
          <ClayButton label="Choose File" size="lg" onPress={handlePick} disabled={busy} />
        </View>
      )}

      {inlineError ? (
        <Text style={[styles.inlineError, { color: colors.tomato }]}>
          {errorCopy(inlineError.code, inlineError.message)}
        </Text>
      ) : null}

      {capped ? (
        <View style={[styles.capCard, { backgroundColor: palette.bg2, borderColor: palette.accent }]}>
          <Text style={[styles.capHeader, { color: palette.accent }]}>
            You've used {capped.used} / {capped.limit} imports this month
          </Text>
          <Text style={styles.capBody}>
            Upgrade to Premium for unlimited recipe imports.
          </Text>
          <View style={{ height: 10 }} />
          <ClayButton label="Upgrade to Premium" onPress={onUpgradePress} />
        </View>
      ) : picked ? (
        <View style={styles.importWrap}>
          <ClayButton
            label={uploading ? 'Uploading…' : extract.isPending ? 'Reading file…' : 'Import Recipe'}
            size="lg"
            loading={busy}
            disabled={busy}
            onPress={handleImport}
          />
        </View>
      ) : null}
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
    case 'ai_unavailable':
      return "Couldn't read that file right now. Try again in a minute.";
    case 'rate_limited':
      return "You're going a bit fast — try again in a moment.";
    case 'network':
      return "You're offline. Try again when you're back.";
    default:
      return fallback || 'Something went wrong.';
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
    marginBottom: 24,
    lineHeight: 20,
  },
  pickerColumn: {
    alignItems: 'center',
    marginTop: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  fileSize: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
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
