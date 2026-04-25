import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useThemeStore } from '../../lib/store';
import { useExtractFromImages } from '../../hooks/useExtractFromImages';
import { uploadRecipeScreenshot } from '../../api/storage';
import { AiError } from '../../api/ai';
import type { ExtractedRecipe, ExtractErrorCode } from '../../types/ai';

export interface PhotoTabPickedItem {
  /** Local file URI (`file://...`) returned by ImagePicker. */
  localUri: string;
}
export interface PhotoTabInlineError {
  code: ExtractErrorCode;
  message: string;
}
export interface PhotoTabCapped {
  used: number;
  limit: number;
}

const MAX_PHOTOS = 10;

interface Props {
  picked: PhotoTabPickedItem[];
  onPickedChange: (next: PhotoTabPickedItem[]) => void;
  inlineError: PhotoTabInlineError | null;
  onInlineErrorChange: (err: PhotoTabInlineError | null) => void;
  capped: PhotoTabCapped | null;
  onCappedChange: (capped: PhotoTabCapped | null) => void;
  onImported: (recipe: ExtractedRecipe) => void;
  onUpgradePress: () => void;
}

export function PhotoTab({
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
  const extract = useExtractFromImages();
  const [uploading, setUploading] = React.useState(false);
  const busy = uploading || extract.isPending;

  async function handlePickFromLibrary() {
    onInlineErrorChange(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow access to your photo library in Settings to import recipes from screenshots.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const remaining = MAX_PHOTOS - picked.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    const next = [
      ...picked,
      ...result.assets.map((a) => ({ localUri: a.uri })),
    ].slice(0, MAX_PHOTOS);
    onPickedChange(next);
  }

  async function handleTakePhoto() {
    onInlineErrorChange(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access in Settings to snap a recipe.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (picked.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    onPickedChange([...picked, ...result.assets.map((a) => ({ localUri: a.uri }))]);
  }

  function removeAt(idx: number) {
    onPickedChange(picked.filter((_, i) => i !== idx));
  }

  async function handleImport() {
    if (picked.length === 0) return;
    onInlineErrorChange(null);
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        picked.map((p) => uploadRecipeScreenshot(p.localUri)),
      );
      const imageUrls = uploaded.map((u) => u.signedUrl);
      setUploading(false);
      const recipe = await extract.mutateAsync({ imageUrls });
      onImported(recipe);
      // Don't clear the picked photos — the user might want to retry. Parent
      // resets when the modal closes.
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
      onInlineErrorChange({ code: 'unknown', message: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  }

  const canImport = picked.length > 0 && !busy;
  const room = MAX_PHOTOS - picked.length;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Import from photos</Text>
      <Text style={styles.subcopy}>
        Pick up to {MAX_PHOTOS} screenshots of one recipe — multiple pages get combined.
      </Text>

      {picked.length === 0 ? (
        <View style={styles.pickerColumn}>
          <ClayButton label="Choose Photos" size="lg" onPress={handlePickFromLibrary} disabled={busy} />
          <View style={{ height: 10 }} />
          <Pressable style={styles.secondaryRow} onPress={handleTakePhoto} disabled={busy} hitSlop={6}>
            <Feather name="camera" size={16} color={palette.accent} />
            <Text style={[styles.secondaryText, { color: palette.accent }]}>Take a Photo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.thumbRow}>
            {picked.map((item, idx) => (
              <View key={item.localUri + idx} style={styles.thumbWrap}>
                <Image source={{ uri: item.localUri }} style={styles.thumb} />
                <Pressable
                  style={[styles.thumbRemove, { backgroundColor: colors.ink }]}
                  onPress={() => removeAt(idx)}
                  hitSlop={6}
                >
                  <Feather name="x" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {room > 0 ? (
              <Pressable style={styles.thumbAdd} onPress={handlePickFromLibrary} disabled={busy}>
                <Feather name="plus" size={20} color={colors.inkSoft} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.counter}>
            {picked.length} of {MAX_PHOTOS} {picked.length === 1 ? 'photo' : 'photos'}
          </Text>
        </>
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
      ) : picked.length > 0 ? (
        <View style={styles.importWrap}>
          <ClayButton
            label={uploading ? 'Uploading…' : extract.isPending ? 'Reading photos…' : 'Import Recipe'}
            size="lg"
            loading={busy}
            disabled={!canImport}
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
      return "Couldn't read those right now. Try again in a minute.";
    case 'rate_limited':
      return "You're going a bit fast — try again in a moment.";
    case 'network':
      return "You're offline. Try again when you're back.";
    default:
      return fallback || 'Something went wrong.';
  }
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
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: colors.line,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbAdd: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.bg2,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 10,
    textAlign: 'center',
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
