import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, useWindowDimensions, Alert,
} from 'react-native';
import { exportRecipePdf } from '../../src/lib/exportRecipePdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchRecipe } from '../../src/api/recipes';
import { fetchCookbook } from '../../src/api/cookbooks';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { FoodImage } from '../../src/components/ui/FoodImage';
import { Sticker } from '../../src/components/stickers/Sticker';
import { useThemeStore } from '../../src/lib/store';
import type { Palette } from '../../src/lib/store';
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { useCanvasStore } from '../../src/lib/canvasStore';
import { useDrawingStore } from '../../src/lib/drawingStore';
import { SkiaCanvas } from '../../src/components/canvas/SkiaCanvas';
import { PageTemplate } from '../../src/components/canvas/PageTemplates';
import { PaperPattern } from '../../src/components/canvas/PaperPattern';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import type { Ingredient, Instruction, Recipe } from '../../src/types/recipe';
import type { CookbookSectionTitles, CookbookPaperType } from '../../src/types/cookbook';
import { DEFAULT_SECTION_TITLES } from '../../src/types/cookbook';

type DetailView = 'clean' | 'scrapbook';

const STICKER_SIZE = 64;

// ─── Scrapbook View — A4 page preview ────────────────────────────
function ScrapbookView({ recipe, palette, sectionTitles, paperType, onExport, exporting }: { recipe: Recipe; palette: Palette; sectionTitles?: CookbookSectionTitles; paperType: CookbookPaperType; onExport: () => void; exporting: boolean }) {
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = screenWidth - 48;
  // Read per-recipe canvas + drawing state directly from the keyed maps so
  // the Scrapbook preview is correct even for recipes that aren't the
  // last-opened editor recipe. See BUG B2.
  const canvasRecord = useCanvasStore((s) => s.recipeStates[recipe.id]);
  const drawingRecord = useDrawingStore((s) => s.drawings[recipe.id]);
  const pageElements = canvasRecord?.elements ?? [];
  const recipeTemplateKey = canvasRecord?.templateKey ?? 'classic';
  const recipeFontKey = canvasRecord?.recipeFont ?? 'caveat';
  const blockOverrides = canvasRecord?.blockOverrides;
  const stepOverrides = canvasRecord?.stepOverrides;
  const ingOverrides = canvasRecord?.ingOverrides;
  const drawingLayers = drawingRecord?.layers;
  const hasDrawing = !!drawingLayers && drawingLayers.length > 0;
  const pageHeight = Math.round(pageWidth * 1.4142); // true A4 ratio
  const imgSize = Math.round(pageWidth * 0.38);

  return (
    <ScrollView
      contentContainerStyle={[sb.scroll, { paddingHorizontal: 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={sb.hint}>Page 1 preview · tap Decorate to edit</Text>

      {/* A4 page — fixed proportions */}
      <View style={[sb.page, { width: pageWidth, height: pageHeight, backgroundColor: colors.paper }]}>

        {/* Paper pattern — sits under all content */}
        <PaperPattern type={paperType} width={pageWidth} height={pageHeight} />

        {/* Washi tape decorations */}
        <View style={[sb.washi, sb.washiTop, { backgroundColor: palette.accentLight + 'cc' }]} />
        <View style={[sb.washi, sb.washiRight, { backgroundColor: palette.bg2 }]} />

        {/* Recipe content using selected template */}
        <PageTemplate
          recipe={recipe}
          pageWidth={pageWidth}
          palette={palette}
          templateKey={recipeTemplateKey}
          recipeFont={recipeFontKey}
          sectionTitles={sectionTitles}
          blockOverrides={blockOverrides}
          stepOverrides={stepOverrides}
          ingOverrides={ingOverrides}
        />

        {/* Corner sticker */}
        <View style={sb.corner}>
          <Sticker kind="leaf" size={34} rotate={15} />
        </View>

        {/* Page number */}
        <Text style={[sb.pageNum, { color: colors.inkFaint }]}>1</Text>

        {/* Drawing layer — renders from the per-recipe map directly so the
            preview works even when this isn't the last-opened editor recipe. */}
        {hasDrawing && (
          <SkiaCanvas
            width={pageWidth}
            height={pageHeight}
            isDrawing={false}
            layersOverride={drawingLayers}
          />
        )}

        {/* Stickers placed in the editor */}
        {pageElements.map(el => (
          <View
            key={el.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: STICKER_SIZE,
              height: STICKER_SIZE,
              zIndex: el.zIndex + 10,
              transform: [
                { translateX: el.x - STICKER_SIZE / 2 },
                { translateY: el.y - STICKER_SIZE / 2 },
                { rotate: `${el.rotation}rad` },
                { scale: el.scale },
              ],
            }}
          >
            <Sticker kind={el.stickerKey} size={STICKER_SIZE} />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[sb.exportBtn, { borderColor: palette.accent }, exporting && sb.exportBtnDisabled]}
        onPress={onExport}
        disabled={exporting}
      >
        <Text style={[sb.exportBtnText, { color: palette.accent }]}>
          {exporting ? 'Preparing…' : '⤓ Export PDF'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Clean View ───────────────────────────────────────────────────
function CleanView({ recipe, palette, sectionTitles, onExport, exporting }: { recipe: Recipe; palette: Palette; sectionTitles: CookbookSectionTitles; onExport: () => void; exporting: boolean }) {
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  const ingredientsTitle = sectionTitles.ingredients.trim() || DEFAULT_SECTION_TITLES.ingredients;
  const methodTitle = sectionTitles.method.trim() || DEFAULT_SECTION_TITLES.method;

  async function handleShare() {
    const text = [
      recipe.title,
      recipe.description ?? '',
      '',
      `${ingredientsTitle}:`,
      ...(recipe.ingredients as Ingredient[]).map(i => `• ${[i.amount, i.unit, i.name].filter(Boolean).join(' ')}`),
      '',
      `${methodTitle}:`,
      ...(recipe.instructions as Instruction[]).map(s => `${s.step}. ${s.text}`),
    ].join('\n');
    await Share.share({ message: text, title: recipe.title });
  }

  return (
    <ScrollView contentContainerStyle={cl.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={cl.hero}>
        <FoodImage width="100%" height={240} borderRadius={0} />
        <View style={cl.heroOverlay} />
      </View>

      {/* Content card */}
      <View style={[cl.card, { backgroundColor: palette.bg }]}>
        {/* Tags */}
        {recipe.tags.length > 0 && (
          <View style={cl.tags}>
            {recipe.tags.map(tag => (
              <View key={tag} style={[cl.tag, { backgroundColor: palette.bg2 }]}>
                <Text style={cl.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={cl.title}>{recipe.title}</Text>
        {recipe.description && <Text style={cl.description}>{recipe.description}</Text>}

        {/* Stats strip */}
        {(recipe.prep_minutes || recipe.cook_minutes || recipe.servings) && (
          <View style={[cl.statsStrip, { borderColor: colors.line }]}>
            {recipe.prep_minutes != null && (
              <CleanStat label="Prep" value={`${recipe.prep_minutes} min`} palette={palette} showDivider={false} />
            )}
            {recipe.cook_minutes != null && (
              <CleanStat label="Cook" value={`${recipe.cook_minutes} min`} palette={palette} showDivider />
            )}
            {recipe.servings != null && (
              <CleanStat label="Serves" value={String(recipe.servings)} palette={palette} showDivider />
            )}
            {totalTime > 0 && (
              <CleanStat label="Total" value={`${totalTime} min`} palette={palette} showDivider />
            )}
          </View>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <>
            <Text style={cl.sectionTitle}>{ingredientsTitle}</Text>
            {(recipe.ingredients as Ingredient[]).map((ing, i) => (
              <View key={ing.id ?? i} style={cl.ingredientRow}>
                <View style={[cl.bullet, { backgroundColor: palette.accent }]} />
                <Text style={cl.ingredientText}>
                  {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Instructions */}
        {recipe.instructions.length > 0 && (
          <>
            <Text style={cl.sectionTitle}>{methodTitle}</Text>
            {(recipe.instructions as Instruction[]).map((step) => (
              <View key={step.step} style={cl.stepRow}>
                <View style={[cl.stepNum, { backgroundColor: palette.accent }]}>
                  <Text style={cl.stepNumText}>{step.step}</Text>
                </View>
                <Text style={cl.stepText}>{step.text}</Text>
              </View>
            ))}
          </>
        )}

        {/* Share + Export */}
        <View style={cl.actionRow}>
          <TouchableOpacity style={[cl.shareBtn, { borderColor: palette.accent, flex: 1 }]} onPress={handleShare}>
            <Text style={[cl.shareBtnText, { color: palette.accent }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cl.shareBtn, { borderColor: palette.accent, flex: 1 }, exporting && cl.shareBtnDisabled]}
            onPress={onExport}
            disabled={exporting}
          >
            <Text style={[cl.shareBtnText, { color: palette.accent }]}>
              {exporting ? 'Preparing…' : '⤓ PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function CleanStat({ label, value, palette, showDivider }: { label: string; value: string; palette: Palette; showDivider: boolean }) {
  return (
    <View style={cl.statItem}>
      {showDivider && <View style={[cl.statDivider, { backgroundColor: colors.line }]} />}
      <View style={cl.statContent}>
        <Text style={[cl.statValue, { color: palette.accent }]}>{value}</Text>
        <Text style={cl.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────
export default function RecipeDetailScreen() {
  const { id, view: viewParam } = useLocalSearchParams<{ id: string; view?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, paletteName } = useThemeStore();
  const [view, setView] = useState<DetailView>(viewParam === 'scrapbook' ? 'scrapbook' : 'clean');
  const [exporting, setExporting] = useState(false);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => fetchRecipe(id),
    enabled: !!id,
  });

  // Cookbook section titles — only fetched when the recipe is linked to a book.
  // Standalone recipes render the English defaults.
  const cookbookId = recipe?.cookbook_id ?? null;
  const { data: cookbook } = useQuery({
    queryKey: ['cookbook', cookbookId],
    queryFn: () => fetchCookbook(cookbookId!),
    enabled: !!cookbookId,
    // Book-level settings (section titles, paper type) are edited elsewhere;
    // always refetch on mount so the detail view never shows stale labels.
    refetchOnMount: 'always',
  });
  const sectionTitles = cookbook?.section_titles ?? DEFAULT_SECTION_TITLES;
  const paperType: CookbookPaperType = cookbook?.paper_type ?? 'blank';

  const { width: screenWidth } = useWindowDimensions();
  const exportCanvasW = screenWidth - 48;
  const exportCanvasH = Math.round(exportCanvasW * 1.4142);

  async function handleExport() {
    if (!recipe || exporting) return;
    setExporting(true);
    try {
      await exportRecipePdf({
        recipe,
        cookbook: cookbook ?? null,
        palette,
        paletteName,
        canvasWidth: exportCanvasW,
        canvasHeight: exportCanvasH,
      });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  if (isLoading || !recipe) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.bg }]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary fallbackLabel="Recipe failed to load">
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      {/* Top nav */}
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.navBack}>
          <Text style={[styles.navBackText, { color: palette.accent }]}>← Back</Text>
        </TouchableOpacity>

        <View style={[styles.toggle, { backgroundColor: palette.bg2 }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'clean' && { backgroundColor: colors.paper }]}
            onPress={() => setView('clean')}
          >
            <Text style={[styles.toggleText, { color: view === 'clean' ? colors.ink : colors.inkFaint }]}>
              Clean
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'scrapbook' && { backgroundColor: colors.paper }]}
            onPress={() => setView('scrapbook')}
          >
            <Text style={[styles.toggleText, { color: view === 'scrapbook' ? colors.ink : colors.inkFaint }]}>
              Scrapbook
            </Text>
          </TouchableOpacity>
        </View>

        {view === 'scrapbook' ? (
          <TouchableOpacity
            style={[styles.decorateBtn, { backgroundColor: palette.accent }]}
            onPress={() => router.push(`/editor/${recipe.id}`)}
          >
            <Text style={styles.decorateBtnText}>✦ Decorate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navFav}>
            <Text style={styles.favIcon}>{recipe.is_favorite ? '♥' : '♡'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {view === 'clean'
        ? <CleanView recipe={recipe} palette={palette} sectionTitles={sectionTitles} onExport={handleExport} exporting={exporting} />
        : <ScrapbookView recipe={recipe} palette={palette} sectionTitles={sectionTitles} paperType={paperType} onExport={handleExport} exporting={exporting} />
      }
    </View>
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: fonts.hand, fontSize: 20, color: colors.inkSoft },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navBack: { minWidth: 64 },
  navBackText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  navFav: { minWidth: 64, alignItems: 'flex-end' },
  favIcon: { fontSize: 22, color: '#d97b7b' },
  decorateBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  decorateBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' },
});

const sb = StyleSheet.create({
  scroll: { alignItems: 'center', paddingTop: 10, paddingBottom: 80 },
  hint: {
    fontFamily: fonts.hand,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  page: {
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#2a1a08',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  washi: { position: 'absolute', opacity: 0.8 },
  washiTop: {
    top: 0, left: 24,
    width: 72, height: 11,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  washiRight: {
    top: 44, right: 0,
    width: 11, height: 60,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 9,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 21,
    color: colors.ink,
    marginBottom: 3,
  },
  desc: {
    fontFamily: fonts.hand,
    fontSize: 11,
    lineHeight: 15,
    color: colors.inkSoft,
    marginBottom: 6,
  },
  pills: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'baseline',
  },
  pillLabel: { fontFamily: fonts.body, fontSize: 8 },
  pillVal: { fontFamily: fonts.displayBold, fontSize: 10 },
  columns: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  imgCol: { flexShrink: 0 },
  polaroid: {
    backgroundColor: '#fff',
    padding: 5,
    paddingBottom: 14,
    borderRadius: 2,
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: colors.ink,
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    marginBottom: 5,
  },
  stickers: { flexDirection: 'row', justifyContent: 'flex-end' },
  ingCol: { flex: 1 },
  colHead: { fontFamily: fonts.hand, fontSize: 13, marginBottom: 5 },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 5, flexShrink: 0 },
  ingText: { fontFamily: fonts.body, fontSize: 10, color: colors.ink, flex: 1, lineHeight: 14 },
  divider: { height: 1, marginBottom: 9 },
  steps: { marginBottom: 8 },
  stepRow: { flexDirection: 'row', gap: 7, marginBottom: 5, alignItems: 'flex-start' },
  stepBadge: {
    width: 15, height: 15, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNum: { fontFamily: fonts.bodyBold, fontSize: 8, color: colors.paper },
  stepText: { fontFamily: fonts.body, fontSize: 10, color: colors.ink, flex: 1, lineHeight: 14 },
  sticky: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff9c4',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stickyText: { fontFamily: fonts.hand, fontSize: 10, color: colors.inkSoft },
  corner: { position: 'absolute', bottom: 10, right: 10 },
  pageNum: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.hand,
    fontSize: 9,
  },
  exportBtn: {
    marginTop: 20,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});

const cl = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  hero: { height: 240, position: 'relative' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,42,31,0.15)',
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    padding: 24,
    paddingTop: 28,
    flex: 1,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSoft },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginBottom: 8 },
  description: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, lineHeight: 22, marginBottom: 20 },
  statsStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 24,
    overflow: 'hidden',
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statDivider: { width: 1, alignSelf: 'stretch' },
  statContent: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 16 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  sectionTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.ink,
    marginBottom: 14, marginTop: 8,
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  ingredientText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1, lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper },
  stepText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1, lineHeight: 22 },
  shareBtn: {
    marginTop: 24,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
});
