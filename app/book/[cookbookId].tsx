import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Animated, Keyboard, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { fetchCookbook, updateCookbook } from '../../src/api/cookbooks';
import { fetchBookPages, addBookPage, deleteBookPage, reorderBookPages } from '../../src/api/bookPages';
import { fetchRecipes } from '../../src/api/recipes';
import { BookPageRow } from '../../src/components/book/BookPageRow';
import { PageTypePicker } from '../../src/components/book/PageTypePicker';
import { TemplatePicker } from '../../src/components/canvas/TemplatePicker';
import { FontPicker } from '../../src/components/canvas/FontPicker';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import type { BookPage, PageType, Cookbook, CookbookTemplateKey, CookbookFontKey, CookbookSectionTitles } from '../../src/types/cookbook';
import { DEFAULT_SECTION_TITLES } from '../../src/types/cookbook';

function TocModal({ pages, onClose }: { pages: BookPage[]; onClose: () => void }) {
  const entries = pages
    .filter(p => p.page_type === 'recipe')
    .map((p, i) => ({ title: p.recipe_title ?? p.title ?? 'Recipe', pageNum: i + 1 }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={toc.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={toc.modal}>
        <Text style={toc.heading}>Table of Contents</Text>
        {entries.length === 0 ? (
          <Text style={toc.empty}>No recipe pages yet</Text>
        ) : (
          entries.map((e, i) => (
            <View key={i} style={toc.row}>
              <Text style={toc.entryTitle} numberOfLines={1}>{e.title}</Text>
              <Text style={toc.pageNum}>{e.pageNum}</Text>
            </View>
          ))
        )}
        <TouchableOpacity style={toc.closeBtn} onPress={onClose}>
          <Text style={toc.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Book-level defaults for new recipes. A recipe can still override template +
// font per-page via the editor; that override lives in recipe_canvases.
function SettingsModal({
  cookbook,
  onClose,
  onSave,
  saving,
}: {
  cookbook: Cookbook;
  onClose: () => void;
  onSave: (patch: {
    default_template_key: CookbookTemplateKey;
    default_recipe_font: CookbookFontKey;
    section_titles: CookbookSectionTitles;
  }) => void;
  saving: boolean;
}) {
  // Draft state so the user can preview without committing; only
  // Save writes to the server. Prevents the "did it save?" confusion.
  const initialTemplate = (cookbook.default_template_key ?? 'classic') as CookbookTemplateKey;
  const initialFont = (cookbook.default_recipe_font ?? 'caveat') as CookbookFontKey;
  const initialTitles = cookbook.section_titles ?? DEFAULT_SECTION_TITLES;
  const [template, setTemplate] = useState<CookbookTemplateKey>(initialTemplate);
  const [font, setFont] = useState<CookbookFontKey>(initialFont);
  const [ingredientsLabel, setIngredientsLabel] = useState<string>(initialTitles.ingredients);
  const [methodLabel, setMethodLabel] = useState<string>(initialTitles.method);

  const dirty =
    template !== initialTemplate ||
    font !== initialFont ||
    ingredientsLabel !== initialTitles.ingredients ||
    methodLabel !== initialTitles.method;

  // Modal is absolute-positioned, so KeyboardAvoidingView won't reliably
  // shift it. Use the same Keyboard listener + animated offset pattern as
  // PageTypePicker — translates the modal upward when the keyboard opens.
  const kbY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      Animated.timing(kbY, {
        toValue: -e.endCoordinates.height * 0.4,
        duration: e.duration ?? 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', (e) => {
      Animated.timing(kbY, {
        toValue: 0,
        duration: e.duration ?? 250,
        useNativeDriver: true,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [kbY]);

  const handleSave = () => {
    if (!dirty || saving) { onClose(); return; }
    // Persist exactly what the user typed; empty strings render as the
    // fallback at read-time so the DB stays faithful to their input.
    onSave({
      default_template_key: template,
      default_recipe_font: font,
      section_titles: {
        ingredients: ingredientsLabel,
        method: methodLabel,
      },
    });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={settings.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[settings.modal, { transform: [{ translateY: kbY }] }]}>
        <View style={settings.headerRow}>
          <Text style={settings.heading}>Book settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} disabled={saving}>
            <Text style={settings.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={settings.section}>Default template</Text>
        <Text style={settings.hint}>Applied to every new recipe added to this book.</Text>
        <TemplatePicker selected={template} onSelect={setTemplate} />

        <Text style={[settings.section, { marginTop: 12 }]}>Default handwriting font</Text>
        <Text style={settings.hint}>Used for recipe headings and flourishes.</Text>
        <FontPicker selected={font} onSelect={setFont} />

        <Text style={[settings.section, { marginTop: 12 }]}>Section titles</Text>
        <Text style={settings.hint}>Used on every recipe page. Leave blank to use the defaults.</Text>
        <View style={settings.labelRow}>
          <Text style={settings.labelTag}>Ingredients</Text>
          <TextInput
            style={settings.labelInput}
            value={ingredientsLabel}
            onChangeText={setIngredientsLabel}
            placeholder={DEFAULT_SECTION_TITLES.ingredients}
            placeholderTextColor={colors.inkFaint}
            editable={!saving}
            returnKeyType="next"
            maxLength={40}
          />
        </View>
        <View style={settings.labelRow}>
          <Text style={settings.labelTag}>Method</Text>
          <TextInput
            style={settings.labelInput}
            value={methodLabel}
            onChangeText={setMethodLabel}
            placeholder={DEFAULT_SECTION_TITLES.method}
            placeholderTextColor={colors.inkFaint}
            editable={!saving}
            returnKeyType="done"
            maxLength={40}
          />
        </View>

        <View style={settings.actions}>
          <TouchableOpacity onPress={onClose} style={settings.cancelBtn} disabled={saving}>
            <Text style={settings.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[settings.saveBtn, (!dirty || saving) && settings.saveBtnIdle]}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={settings.saveText}>{dirty ? 'Save' : 'Done'}</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={settings.comingSoonText}>
          Paper type is coming next.
        </Text>
      </Animated.View>
    </View>
  );
}

const settings = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    position: 'absolute', left: 16, right: 16, top: '8%',
    backgroundColor: colors.paper, borderRadius: 16, padding: 18,
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  heading: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  closeX: { fontSize: 18, color: colors.inkFaint, paddingHorizontal: 4 },
  section: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginBottom: 4 },
  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 6,
    backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  labelTag: {
    fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft,
    width: 72,
  },
  labelInput: {
    flex: 1,
    fontFamily: fonts.body, fontSize: 14, color: colors.ink,
    paddingVertical: 0,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.bg2, alignItems: 'center',
  },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft },
  saveBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.terracotta, alignItems: 'center',
  },
  saveBtnIdle: { opacity: 0.55 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' },
  comingSoonText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: 10 },
});

const toc = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    position: 'absolute', left: 32, right: 32, top: '20%',
    backgroundColor: colors.paper, borderRadius: 16, padding: 20,
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  heading: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink, marginBottom: 12 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  entryTitle: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  pageNum: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint, marginLeft: 8 },
  closeBtn: { marginTop: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.bg2 },
  closeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
});

function BookBuilderScreen() {
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const { data: cookbook, isLoading: loadingBook } = useQuery({
    queryKey: ['cookbook', cookbookId],
    queryFn: () => fetchCookbook(cookbookId),
    enabled: !!cookbookId,
  });

  const { data: pages = [], isLoading: loadingPages } = useQuery({
    queryKey: ['book-pages', cookbookId],
    queryFn: () => fetchBookPages(cookbookId),
    enabled: !!cookbookId,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
  });

  const reorderMutation = useMutation({
    mutationFn: reorderBookPages,
    onMutate: async (newOrder) => {
      await qc.cancelQueries({ queryKey: ['book-pages', cookbookId] });
      const prev = qc.getQueryData<BookPage[]>(['book-pages', cookbookId]);
      qc.setQueryData<BookPage[]>(['book-pages', cookbookId], old => {
        if (!old) return old;
        return newOrder.map(({ id, position }) => {
          const page = old.find(p => p.id === id)!;
          return { ...page, position };
        });
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['book-pages', cookbookId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['book-pages', cookbookId] }),
  });

  const addMutation = useMutation({
    mutationFn: addBookPage,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['book-pages', cookbookId] });
      // addBookPage backfills recipes.cookbook_id on first-add, so the
      // recipe query needs to refetch for the editor to see the link.
      if (vars.page_type === 'recipe' && vars.recipe_id) {
        qc.invalidateQueries({ queryKey: ['recipe', vars.recipe_id] });
        qc.invalidateQueries({ queryKey: ['recipes'] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBookPage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['book-pages', cookbookId] });
      qc.invalidateQueries({ queryKey: ['cookbooks'] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateCookbook(id, { title }),
    // Shelves list also shows the title.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cookbook', cookbookId] });
      qc.invalidateQueries({ queryKey: ['cookbooks'] });
    },
  });

  // Optimistic patch — the picker feels instant even on slow networks.
  // On error we fall back to refetch so the UI doesn't lie.
  const settingsMutation = useMutation({
    mutationFn: (patch: {
      default_template_key?: CookbookTemplateKey;
      default_recipe_font?: CookbookFontKey;
      section_titles?: CookbookSectionTitles;
    }) =>
      updateCookbook(cookbookId, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['cookbook', cookbookId] });
      const prev = qc.getQueryData<Cookbook>(['cookbook', cookbookId]);
      if (prev) qc.setQueryData<Cookbook>(['cookbook', cookbookId], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['cookbook', cookbookId], ctx.prev);
    },
    // Keep shelves list in sync in case it starts surfacing defaults later.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cookbook', cookbookId] });
      qc.invalidateQueries({ queryKey: ['cookbooks'] });
    },
  });

  const handleDragEnd = useCallback(({ data }: { data: BookPage[] }) => {
    const reordered = data.map((p, i) => ({ id: p.id, position: i }));
    reorderMutation.mutate(reordered);
  }, [reorderMutation]);

  const handleAddPage = useCallback((type: PageType, recipeId?: string) => {
    setPickerOpen(false);
    addMutation.mutate({
      cookbook_id: cookbookId,
      page_type: type,
      position: pages.length,
      recipe_id: recipeId ?? null,
    });
  }, [cookbookId, pages.length, addMutation]);

  const handleDeletePage = useCallback((page: BookPage) => {
    Alert.alert(
      'Remove page?',
      page.page_type === 'recipe'
        ? 'The recipe will not be deleted — only removed from this cookbook.'
        : 'This page will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(page.id) },
      ],
    );
  }, [deleteMutation]);

  const handlePagePress = useCallback((page: BookPage) => {
    if (page.page_type === 'table_of_contents') {
      setTocOpen(true);
    } else if (page.page_type === 'recipe' && page.recipe_id) {
      router.push(`/editor/${page.recipe_id}`);
    } else {
      router.push(`/book/page-stub?type=${page.page_type}&backTo=/book/${cookbookId}`);
    }
  }, [router, cookbookId]);

  const startTitleEdit = () => {
    setTitleDraft(cookbook?.title ?? '');
    setEditingTitle(true);
  };

  const commitTitleEdit = () => {
    setEditingTitle(false);
    if (cookbook && titleDraft.trim() && titleDraft.trim() !== cookbook.title) {
      renameMutation.mutate({ id: cookbookId, title: titleDraft.trim() });
    }
  };

  const existingPageTypes = useMemo(() => pages.map(p => p.page_type), [pages]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<BookPage>) => (
    <BookPageRow
      page={item}
      isActive={isActive}
      drag={drag}
      onDelete={() => handleDeletePage(item)}
      onPress={() => handlePagePress(item)}
    />
  ), [handleDeletePage, handlePagePress]);

  if (loadingBook) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.terracotta} />
      </View>
    );
  }

  return (
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          {editingTitle ? (
            <TextInput
              style={styles.titleInput}
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={commitTitleEdit}
              onSubmitEditing={commitTitleEdit}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <TouchableOpacity onPress={startTitleEdit} style={styles.titleBtn}>
              <Text style={styles.title} numberOfLines={1}>{cookbook?.title ?? '…'}</Text>
              <Text style={styles.editHint}>✎</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.gearBtn}
            onPress={() => setSettingsOpen(true)}
            hitSlop={8}
          >
            <Text style={styles.gearIcon}>⚙︎</Text>
          </TouchableOpacity>

          {/* Export stub */}
          <TouchableOpacity style={styles.exportBtn} onPress={() =>
            Alert.alert('Coming soon', 'PDF export will be available in a future update.')
          }>
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Page list */}
        {loadingPages ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.terracotta} />
          </View>
        ) : (
          <DraggableFlatList
            data={pages}
            keyExtractor={p => p.id}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📖</Text>
                <Text style={styles.emptyTitle}>Empty cookbook</Text>
                <Text style={styles.emptyDesc}>Tap "+ Add page" below to start building</Text>
              </View>
            }
          />
        )}

        {/* Add page button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setPickerOpen(true)}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>+ Add page</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Page type picker */}
        <PageTypePicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAddPage}
          recipes={recipes}
          existingPageTypes={existingPageTypes}
        />

        {/* TOC modal */}
        {tocOpen && <TocModal pages={pages} onClose={() => setTocOpen(false)} />}

        {/* Book settings modal */}
        {settingsOpen && cookbook && (
          <SettingsModal
            cookbook={cookbook}
            onClose={() => setSettingsOpen(false)}
            saving={settingsMutation.isPending}
            onSave={(patch) => settingsMutation.mutate(patch, {
              onSuccess: () => setSettingsOpen(false),
            })}
          />
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
    gap: 8,
  },
  backBtn: {
    width: 36,
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.inkSoft,
    lineHeight: 32,
  },
  titleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
    flexShrink: 1,
  },
  editHint: {
    fontSize: 14,
    color: colors.inkFaint,
  },
  titleInput: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.terracotta,
    paddingVertical: 2,
  },
  gearBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  gearIcon: {
    fontSize: 18,
    color: colors.inkSoft,
  },
  exportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  exportText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  addBtn: {
    backgroundColor: colors.terracotta,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: '#fff',
  },
});

export default withErrorBoundary(BookBuilderScreen, 'Book builder crashed');
