import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
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
import type { ExtractedRecipe } from '../../src/types/ai';

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

  function handleClose() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function handleImported(recipe: ExtractedRecipe) {
    setTypeForm(typeFormFromExtracted(recipe));
    setImportedFromDomain(safeHostname(recipe.source_url));
    setActiveTab('type');
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
});

export default withErrorBoundary(ImportRecipeScreen, 'Recipe import crashed');
