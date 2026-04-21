import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchRecipes } from '../../src/api/recipes';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { withErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { FoodImage } from '../../src/components/ui/FoodImage';
import { Sticker } from '../../src/components/stickers/Sticker';
import { useThemeStore } from '../../src/lib/store';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import type { Recipe } from '../../src/types/recipe';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  return 'good evening';
}

function totalTime(r: Recipe) {
  const t = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  return t > 0 ? `${t} min` : null;
}

function HomeScreen() {
  const { palette } = useThemeStore();
  const { session } = useAuth();
  const router = useRouter();
  const email = session?.user?.email ?? '';
  const firstName = email.split('@')[0];

  const { data: recipes = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
    enabled: !!session,
  });

  const todaysPick = recipes[0] ?? null;

  return (
    <PaperGrain style={{ ...styles.root, backgroundColor: palette.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <FoodImage width="100%" height={340} borderRadius={0} />
          <View style={styles.headerOverlay} />
          <View style={styles.headerContent}>
            <Sticker kind="leaf" size={48} rotate={8} style={styles.stickerLeaf} />
            <Sticker kind="tomato" size={44} rotate={-12} style={styles.stickerTomato} />
            <Text style={styles.greeting}>{greeting()}, {firstName}</Text>
            <Text style={styles.cookbookTitle}>My Cookbook</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Error state */}
          {isError && (
            <View style={styles.emptyState}>
              <Sticker kind="whisk" size={64} rotate={-8} />
              <Text style={styles.emptyTitle}>Couldn't load recipes.</Text>
              <Text style={styles.emptySub}>Check your connection and try again.</Text>
              <TouchableOpacity
                style={[styles.emptyButton, { borderColor: palette.accent }]}
                onPress={() => refetch()}
              >
                <Text style={[styles.emptyButtonText, { color: palette.accent }]}>Retry now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state */}
          {!isLoading && !isError && recipes.length === 0 && (
            <View style={styles.emptyState}>
              <Sticker kind="whisk" size={64} rotate={-8} />
              <Text style={styles.emptyTitle}>Your cookbook is ready.</Text>
              <Text style={styles.emptySub}>Add your first recipe to get started.</Text>
              <TouchableOpacity
                style={[styles.emptyButton, { borderColor: palette.accent }]}
                onPress={() => router.push('/recipe/create')}
              >
                <Text style={[styles.emptyButtonText, { color: palette.accent }]}>+ Add a recipe</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Today's pick */}
          {todaysPick && (
            <>
              <Text style={styles.sectionTitle}>Today's pick</Text>
              <TouchableOpacity
                style={styles.pickCard}
                onPress={() => router.push(`/recipe/${todaysPick.id}`)}
              >
                <FoodImage width={80} height={80} borderRadius={10} />
                <View style={styles.pickInfo}>
                  <Text style={styles.pickTitle} numberOfLines={2}>{todaysPick.title}</Text>
                  <View style={styles.pickMeta}>
                    {totalTime(todaysPick) && (
                      <Text style={styles.metaText}>{totalTime(todaysPick)}</Text>
                    )}
                    {todaysPick.tags[0] && (
                      <View style={[styles.tag, { backgroundColor: palette.bg2 }]}>
                        <Text style={styles.tagText}>{todaysPick.tags[0]}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.arrow, { color: palette.accent }]}>→</Text>
              </TouchableOpacity>
            </>
          )}

          {/* All recipes */}
          {recipes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All recipes</Text>
                <Text style={[styles.seeAll, { color: palette.accent }]}>{recipes.length} total</Text>
              </View>
              {recipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeRow}
                  onPress={() => router.push(`/recipe/${recipe.id}`)}
                >
                  <FoodImage width={56} height={56} borderRadius={8} />
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
                    {recipe.description && (
                      <Text style={styles.recipeDesc} numberOfLines={1}>{recipe.description}</Text>
                    )}
                  </View>
                  {recipe.is_favorite && (
                    <Text style={styles.favIcon}>♥</Text>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </PaperGrain>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 280, position: 'relative' },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,42,31,0.35)',
  },
  headerContent: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  stickerLeaf: { position: 'absolute', top: -180, right: 16 },
  stickerTomato: { position: 'absolute', top: -200, right: 72 },
  greeting: {
    fontFamily: fonts.hand,
    fontSize: 20,
    color: colors.paper,
    marginBottom: 4,
  },
  cookbookTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.paper,
  },
  content: { padding: 20, paddingBottom: 100 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
    marginTop: 24,
  },
  seeAll: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  pickCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  pickInfo: { flex: 1 },
  pickTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  pickMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metaText: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  arrow: { fontSize: 20, fontFamily: fonts.body },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  recipeInfo: { flex: 1 },
  recipeTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.ink,
  },
  recipeDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
  },
  favIcon: { fontSize: 16, color: '#d97b7b' },
});

export default withErrorBoundary(HomeScreen, 'Home crashed');
