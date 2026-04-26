import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { useThemeStore } from '../../src/lib/store';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import { ImportTabs, type ImportTabKey } from '../../src/components/import/ImportTabs';
import {
  PasteLinkTab,
  type PasteLinkCapped,
  type PasteLinkInlineError,
} from '../../src/components/import/PasteLinkTab';
import {
  TypeTab,
  EMPTY_TYPE_FORM,
  typeFormFromExtracted,
  type TypeFormValues,
} from '../../src/components/import/TypeTab';
import {
  PhotoTab,
  type PhotoTabPickedItem,
  type PhotoTabInlineError,
  type PhotoTabCapped,
} from '../../src/components/import/PhotoTab';
import {
  FileTab,
  type FileTabPicked,
  type FileTabInlineError,
  type FileTabCapped,
} from '../../src/components/import/FileTab';
import {
  JsonTab,
  type JsonTabInlineError,
  type JsonTabCapped,
} from '../../src/components/import/JsonTab';
import { useConsents } from '../../src/hooks/useConsents';
import type { ExtractedRecipe } from '../../src/types/ai';
import type { JsonImportResult } from '../../src/api/ai';

const VALID_TABS: ImportTabKey[] = ['paste', 'type', 'photo', 'file'];

function parseTab(raw: string | undefined): ImportTabKey {
  return raw && (VALID_TABS as string[]).includes(raw)
    ? (raw as ImportTabKey)
    : 'paste';
}

function safeHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function ImportRecipeScreen() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useThemeStore();

  const [activeTab, setActiveTab] = useState<ImportTabKey>(parseTab(tabParam));
  const [typeForm, setTypeForm] = useState<TypeFormValues>(EMPTY_TYPE_FORM);
  const [importedFromDomain, setImportedFromDomain] = useState<string | null>(
    null,
  );
  // Paste Link tab state lives here so switching tabs doesn't wipe the URL
  // the user just pasted. See CODE_REVIEW R4.
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteInlineError, setPasteInlineError] =
    useState<PasteLinkInlineError | null>(null);
  const [pasteCapped, setPasteCapped] = useState<PasteLinkCapped | null>(null);

  // Photo tab state — same lifting pattern so picked photos survive a
  // tab switch.
  const [photoPicked, setPhotoPicked] = useState<PhotoTabPickedItem[]>([]);
  const [photoInlineError, setPhotoInlineError] =
    useState<PhotoTabInlineError | null>(null);
  const [photoCapped, setPhotoCapped] = useState<PhotoTabCapped | null>(null);

  // File tab state.
  const [filePicked, setFilePicked] = useState<FileTabPicked | null>(null);
  const [fileInlineError, setFileInlineError] =
    useState<FileTabInlineError | null>(null);
  const [fileCapped, setFileCapped] = useState<FileTabCapped | null>(null);

  // JSON tab state.
  const [jsonText, setJsonText] = useState('');
  const [jsonInlineError, setJsonInlineError] =
    useState<JsonTabInlineError | null>(null);
  const [jsonCapped, setJsonCapped] = useState<JsonTabCapped | null>(null);

  const { data: consents } = useConsents();
  const aiOff = consents?.ai === false;

  function handleClose() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function handleImported(recipe: ExtractedRecipe) {
    setTypeForm(typeFormFromExtracted(recipe));
    setImportedFromDomain(safeHostname(recipe.source_url));
    setActiveTab('type');
  }

  function handleJsonImported(result: JsonImportResult) {
    // Bulk imports go straight to library — no Type-tab review.
    // The Library refreshes via TanStack invalidation in the mutation hook
    // and Realtime fires INSERT events for each new row.
    const failedNote =
      result.failed.length > 0
        ? `\n${result.failed.length} skipped: ${result.failed
            .slice(0, 3)
            .map((f) => f.reason)
            .join(', ')}${result.failed.length > 3 ? '…' : ''}`
        : '';
    Alert.alert(
      `Imported ${result.inserted} ${result.inserted === 1 ? 'recipe' : 'recipes'}`,
      result.inserted > 0 ? `Open Library to see them.${failedNote}` : `No recipes imported.${failedNote}`,
      [{ text: 'OK', onPress: handleClose }],
    );
  }

  function handleUpgradePress() {
    router.push('/upgrade');
  }

  return (
    <PaperGrain style={{ ...styles.root, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Feather name="x" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Import a Recipe</Text>
          <View style={styles.headerAction} />
        </View>

        <ImportTabs active={activeTab} onChange={setActiveTab} />

        {aiOff && activeTab !== 'type' && activeTab !== 'json' ? (
          <View style={styles.aiOffBanner}>
            <Text style={styles.aiOffText}>
              AI processing is paused for your account — Paste Link, Photo, and File need it. Use{' '}
              <Text style={styles.aiOffStrong}>Type</Text> or{' '}
              <Text style={styles.aiOffStrong}>JSON</Text> instead, or enable AI in Me → Privacy.
            </Text>
          </View>
        ) : null}

        <View style={styles.body}>
          {activeTab === 'paste' ? (
            <PasteLinkTab
              url={pasteUrl}
              onUrlChange={setPasteUrl}
              inlineError={pasteInlineError}
              onInlineErrorChange={setPasteInlineError}
              capped={pasteCapped}
              onCappedChange={setPasteCapped}
              onImported={handleImported}
              onUpgradePress={handleUpgradePress}
            />
          ) : null}
          {activeTab === 'type' ? (
            <TypeTab
              values={typeForm}
              onChange={setTypeForm}
              importedFromDomain={importedFromDomain}
              onClearImport={() => setImportedFromDomain(null)}
              onClose={handleClose}
            />
          ) : null}
          {activeTab === 'photo' ? (
            <PhotoTab
              picked={photoPicked}
              onPickedChange={setPhotoPicked}
              inlineError={photoInlineError}
              onInlineErrorChange={setPhotoInlineError}
              capped={photoCapped}
              onCappedChange={setPhotoCapped}
              onImported={(recipe) => {
                // Imports flow into the Type tab pre-filled, same as Paste Link.
                // Keep the picked photos around in case the user edits and wants
                // to re-extract; they're cleared when the modal closes.
                handleImported(recipe);
              }}
              onUpgradePress={handleUpgradePress}
            />
          ) : null}
          {activeTab === 'file' ? (
            <FileTab
              picked={filePicked}
              onPickedChange={setFilePicked}
              inlineError={fileInlineError}
              onInlineErrorChange={setFileInlineError}
              capped={fileCapped}
              onCappedChange={setFileCapped}
              onImported={handleImported}
              onUpgradePress={handleUpgradePress}
            />
          ) : null}
          {activeTab === 'json' ? (
            <JsonTab
              jsonText={jsonText}
              onJsonTextChange={setJsonText}
              inlineError={jsonInlineError}
              onInlineErrorChange={setJsonInlineError}
              capped={jsonCapped}
              onCappedChange={setJsonCapped}
              onImported={handleJsonImported}
              onUpgradePress={handleUpgradePress}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </PaperGrain>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
  },
  body: {
    flex: 1,
  },
  aiOffBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg2,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.terracotta,
  },
  aiOffText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
  },
  aiOffStrong: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
});

export default withErrorBoundary(ImportRecipeScreen, 'Recipe import crashed');
