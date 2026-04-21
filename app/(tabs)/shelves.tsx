import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, Modal, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { fetchRecipes } from '../../src/api/recipes';
import { fetchCookbooks, createCookbook, updateCookbook, deleteCookbook } from '../../src/api/cookbooks';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { RecipeCard } from '../../src/components/ui/RecipeCard';
import { FoodImage } from '../../src/components/ui/FoodImage';
import { CookbookCard } from '../../src/components/book/CookbookCard';
import { useThemeStore } from '../../src/lib/store';
import type { Palette } from '../../src/lib/store';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import type { Recipe } from '../../src/types/recipe';
import type { Cookbook } from '../../src/types/cookbook';

type ViewMode = 'shelf' | 'index';

const FILTER_TAGS = ['All', 'Favorites', 'Quick', 'Veg', 'Baking', 'Soups'];
const PALETTES: Array<Cookbook['palette']> = ['terracotta', 'sage', 'blush', 'cobalt'];
const PALETTE_ACCENT: Record<string, string> = {
  terracotta: '#c46a4c', sage: '#6f8a52', blush: '#c66a78', cobalt: '#2f5c8f',
};

// ─── Sub-components ───────────────────────────────────────────────

function ShelfDivider() {
  return (
    <View style={styles.shelfDivider}>
      <View style={styles.shelfBar} />
      <View style={styles.shelfShadow} />
    </View>
  );
}

function RecipeRow({ recipe, palette, onPress }: { recipe: Recipe; palette: Palette; onPress: () => void }) {
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <FoodImage width={78} height={78} borderRadius={10} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={styles.rowMeta}>
          {totalTime > 0 && <Text style={styles.metaText}>{totalTime}m</Text>}
          {recipe.servings && <Text style={styles.metaText}>· {recipe.servings} servings</Text>}
        </View>
        <View style={styles.rowTags}>
          {recipe.tags.slice(0, 3).map(tag => (
            <View key={tag} style={[styles.tag, { backgroundColor: palette.bg2 }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      {recipe.is_favorite && <Text style={styles.heart}>♥</Text>}
    </TouchableOpacity>
  );
}

// ─── Cookbook form modal (create + edit) ─────────────────────────

function CookbookFormModal({
  visible,
  onClose,
  onSave,
  mode,
  submitting = false,
  initialTitle = '',
  initialPalette = 'terracotta',
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, palette: Cookbook['palette']) => void;
  mode: 'create' | 'edit';
  submitting?: boolean;
  initialTitle?: string;
  initialPalette?: Cookbook['palette'];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [palette, setPalette] = useState<Cookbook['palette']>(initialPalette);

  function handleSave() {
    if (submitting || !title.trim()) return;
    onSave(title.trim(), palette);
  }

  const saveBlocked = submitting || !title.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modal.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modal.sheet}>
          <Text style={modal.heading}>{mode === 'create' ? 'New Cookbook' : 'Edit Cookbook'}</Text>

          <TextInput
            style={modal.input}
            placeholder="Cookbook title…"
            placeholderTextColor={colors.inkFaint}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={modal.label}>Colour theme</Text>
          <View style={modal.swatches}>
            {PALETTES.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPalette(p)}
                style={[
                  modal.swatch,
                  { backgroundColor: PALETTE_ACCENT[p] },
                  palette === p && modal.swatchActive,
                ]}
              />
            ))}
          </View>

          <View style={modal.actions}>
            <TouchableOpacity
              style={modal.cancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modal.createBtn,
                { backgroundColor: PALETTE_ACCENT[palette] },
                saveBlocked && modal.disabled,
              ]}
              onPress={handleSave}
              disabled={saveBlocked}
            >
              {submitting
                ? <ActivityIndicator color={colors.paper} />
                : <Text style={modal.createText}>{mode === 'create' ? 'Create' : 'Save'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────

export default function ShelvesScreen() {
  const { palette } = useThemeStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('shelf');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCookbook, setEditingCookbook] = useState<Cookbook | null>(null);

  const { data: cookbooks = [], isRefetching: cbRefetching, refetch: refetchCookbooks } = useQuery({
    queryKey: ['cookbooks'],
    queryFn: fetchCookbooks,
  });

  const { data: recipes = [], isRefetching: recRefetching, refetch: refetchRecipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
    enabled: showAllRecipes,
  });

  const createMutation = useMutation({
    mutationFn: createCookbook,
    onSuccess: (cookbook) => {
      queryClient.invalidateQueries({ queryKey: ['cookbooks'] });
      setShowCreateModal(false);
      router.push(`/book/${cookbook.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title, palette }: { id: string; title: string; palette: Cookbook['palette'] }) =>
      updateCookbook(id, { title, palette }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cookbooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCookbook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cookbooks'] }),
  });

  const filtered = useMemo(() => {
    let list = recipes;
    if (activeTag === 'Favorites') list = list.filter(r => r.is_favorite);
    else if (activeTag !== 'All') list = list.filter(r =>
      r.tags.some(t => t.toLowerCase().includes(activeTag.toLowerCase()))
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [recipes, activeTag, search]);

  const gridRows = useMemo(() => {
    const rows: Recipe[][] = [];
    for (let i = 0; i < filtered.length; i += 2) rows.push(filtered.slice(i, i + 2));
    return rows;
  }, [filtered]);

  function handleDeleteCookbook(cb: Cookbook) {
    if (deleteMutation.isPending) return;
    Alert.alert('Delete cookbook?', 'This will delete all pages. Recipes are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(cb.id) },
    ]);
  }

  return (
    <PaperGrain style={{ ...styles.root, backgroundColor: palette.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSub}>my kitchen</Text>
            <Text style={styles.headerTitle}>My Books</Text>
          </View>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: palette.accent }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={cbRefetching || recRefetching}
            onRefresh={() => { void refetchCookbooks(); if (showAllRecipes) void refetchRecipes(); }}
            tintColor={palette.accent}
          />
        }
      >
        {/* All Recipes row */}
        <TouchableOpacity
          style={[styles.allRecipesRow, { borderColor: palette.bg2 }]}
          onPress={() => setShowAllRecipes(v => !v)}
        >
          <Text style={styles.allRecipesIcon}>📖</Text>
          <View style={styles.allRecipesInfo}>
            <Text style={styles.allRecipesTitle}>All Recipes</Text>
            <Text style={styles.allRecipesSub}>Browse your full recipe collection</Text>
          </View>
          <Text style={[styles.allRecipesChevron, { color: palette.accent }]}>
            {showAllRecipes ? '∧' : '›'}
          </Text>
        </TouchableOpacity>

        {/* Recipe browser (expanded) */}
        {showAllRecipes && (
          <View style={styles.recipeBrowser}>
            <View style={[styles.searchWrap, { backgroundColor: colors.paper }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search recipes…"
                placeholderTextColor={colors.inkFaint}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {FILTER_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.pill,
                    activeTag === tag
                      ? { backgroundColor: palette.accent }
                      : { backgroundColor: palette.bg2 },
                  ]}
                  onPress={() => setActiveTag(tag)}
                >
                  <Text style={[
                    styles.pillText,
                    { color: activeTag === tag ? colors.paper : colors.inkSoft },
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.viewToggleRow}
              onPress={() => setViewMode(v => v === 'shelf' ? 'index' : 'shelf')}
            >
              <Text style={[styles.viewToggleText, { color: palette.accent }]}>
                {viewMode === 'shelf' ? '≡ List view' : '⊞ Grid view'}
              </Text>
            </TouchableOpacity>

            {filtered.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No recipes found</Text>
              </View>
            )}

            {viewMode === 'shelf' ? (
              gridRows.map((row, rowIdx) => (
                <View key={rowIdx}>
                  <View style={styles.gridRow}>
                    {row.map((recipe, i) => (
                      <View key={recipe.id} style={styles.gridCell}>
                        <RecipeCard
                          recipe={recipe}
                          index={rowIdx * 2 + i}
                          palette={palette}
                          onPress={() => router.push(`/recipe/${recipe.id}`)}
                        />
                      </View>
                    ))}
                    {row.length === 1 && <View style={styles.gridCell} />}
                  </View>
                  {rowIdx < gridRows.length - 1 && <ShelfDivider />}
                </View>
              ))
            ) : (
              <>
                <Text style={styles.recipeCount}>{filtered.length} recipes</Text>
                {filtered.map(recipe => (
                  <RecipeRow
                    key={recipe.id}
                    recipe={recipe}
                    palette={palette}
                    onPress={() => router.push(`/recipe/${recipe.id}`)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Cookbooks section */}
        <Text style={styles.sectionLabel}>Cookbooks</Text>

        {cookbooks.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No cookbooks yet</Text>
            <Text style={styles.emptySub}>Tap + New to build your first one</Text>
          </View>
        )}

        {cookbooks.map(cb => (
          <ReanimatedSwipeable
            key={cb.id}
            friction={2}
            rightThreshold={40}
            renderRightActions={() => (
              <View style={swipe.actions}>
                <TouchableOpacity
                  style={[swipe.editBtn, updateMutation.isPending && swipe.disabled]}
                  onPress={() => setEditingCookbook(cb)}
                  disabled={updateMutation.isPending}
                >
                  <Text style={swipe.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[swipe.deleteBtn, deleteMutation.isPending && swipe.disabled]}
                  onPress={() => handleDeleteCookbook(cb)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={swipe.deleteText}>Delete</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          >
            <CookbookCard
              cookbook={cb}
              onPress={() => router.push(`/book/${cb.id}`)}
            />
          </ReanimatedSwipeable>
        ))}
      </ScrollView>

      <CookbookFormModal
        visible={showCreateModal}
        mode="create"
        submitting={createMutation.isPending}
        onClose={() => {
          if (createMutation.isPending) return;
          setShowCreateModal(false);
        }}
        onSave={(title, pal) => createMutation.mutate({ title, palette: pal })}
      />

      {editingCookbook && (
        <CookbookFormModal
          key={editingCookbook.id}
          visible
          mode="edit"
          submitting={updateMutation.isPending}
          initialTitle={editingCookbook.title}
          initialPalette={editingCookbook.palette}
          onClose={() => {
            if (updateMutation.isPending) return;
            setEditingCookbook(null);
          }}
          onSave={(title, pal) => {
            updateMutation.mutate(
              { id: editingCookbook.id, title, palette: pal },
              { onSuccess: () => setEditingCookbook(null) },
            );
          }}
        />
      )}
    </PaperGrain>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerSub: { fontFamily: fonts.hand, fontSize: 18, color: colors.inkSoft },
  headerTitle: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  newBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper },
  content: { padding: 16, paddingBottom: 100 },
  allRecipesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  allRecipesIcon: { fontSize: 24 },
  allRecipesInfo: { flex: 1 },
  allRecipesTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  allRecipesSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  allRecipesChevron: { fontSize: 20, fontFamily: fonts.body },
  recipeBrowser: { marginBottom: 20 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  clearBtn: { color: colors.inkFaint, fontSize: 14, paddingLeft: 8 },
  filters: { marginBottom: 10 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  viewToggleRow: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 8 },
  viewToggleText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
  },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.inkSoft },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  emptyText: { fontFamily: fonts.hand, fontSize: 20, color: colors.inkFaint },
  gridRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  gridCell: { flex: 1 },
  shelfDivider: { marginVertical: 18 },
  shelfBar: {
    height: 10,
    backgroundColor: '#c4a882',
    borderRadius: 3,
    shadowColor: '#6e4820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  shelfShadow: {
    height: 4,
    backgroundColor: 'rgba(100,60,20,0.12)',
    borderRadius: 2,
    marginTop: 1,
    marginHorizontal: 4,
  },
  recipeCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink, marginBottom: 4 },
  rowMeta: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  rowTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft },
  heart: { fontSize: 16, color: '#d97b7b', alignSelf: 'center' },
});

const swipe = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  editBtn: {
    backgroundColor: '#4a90d9',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
  deleteBtn: {
    backgroundColor: colors.tomato,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
  disabled: { opacity: 0.55 },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  heading: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.paper,
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft },
  swatches: { flexDirection: 'row', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchActive: { borderWidth: 3, borderColor: colors.ink },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft },
  createBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper },
  disabled: { opacity: 0.55 },
});
