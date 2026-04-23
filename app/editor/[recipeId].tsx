import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
  ActivityIndicator, Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRecipe } from '../../src/api/recipes';
import { fetchCookbook } from '../../src/api/cookbooks';
import { fetchRecipeCanvas, upsertRecipeCanvas } from '../../src/api/recipeCanvases';
import { CanvasElement } from '../../src/components/canvas/CanvasElement';
import { StickerTray } from '../../src/components/canvas/StickerTray';
import { MakeMeSketchButton } from '../../src/components/canvas/MakeMeSketchButton';
import { SkiaCanvas } from '../../src/components/canvas/SkiaCanvas';
import { DrawingToolbar } from '../../src/components/canvas/DrawingToolbar';
import { HelpSheet } from '../../src/components/canvas/HelpSheet';
import { LayerPanel } from '../../src/components/canvas/LayerPanel';
import { PageTemplate } from '../../src/components/canvas/PageTemplates';
import { PaperPattern } from '../../src/components/canvas/PaperPattern';
import { TemplatePicker } from '../../src/components/canvas/TemplatePicker';
import { FontPicker } from '../../src/components/canvas/FontPicker';
import { useCanvasStore } from '../../src/lib/canvasStore';
import type { BlockOverride } from '../../src/lib/blockDefs';
import { getBlockDefs, FONT_SCALE_MIN, FONT_SCALE_MAX } from '../../src/lib/blockDefs';

import { useDrawingStore } from '../../src/lib/drawingStore';
import { useThemeStore } from '../../src/lib/store';
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

type EditorMode = 'stickers' | 'draw' | 'layout';

export default function EditorScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const router = useRouter();
  const { palette } = useThemeStore();
  const insets = useSafeAreaInsets();
  const { width: sw } = useWindowDimensions();

  const [editorMode, setEditorMode] = useState<EditorMode>('stickers');
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [blockEditMode, setBlockEditMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const canvasWidth = sw - 48;
  const canvasHeight = Math.round(canvasWidth * 1.4142);

  const queryClient = useQueryClient();

  const { data: recipe } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipe(recipeId),
    enabled: !!recipeId,
  });

  // Per-recipe canvas override row — may not exist until the user picks
  // a template or font for this specific recipe.
  const { data: canvasRow } = useQuery({
    queryKey: ['recipeCanvas', recipeId],
    queryFn: () => fetchRecipeCanvas(recipeId),
    enabled: !!recipeId,
  });

  // Book defaults.
  const cookbookId = recipe?.cookbook_id ?? null;
  const { data: cookbook } = useQuery({
    queryKey: ['cookbook', cookbookId],
    queryFn: () => fetchCookbook(cookbookId!),
    enabled: !!cookbookId,
    // Book-level settings (section titles, paper type, defaults) are edited
    // elsewhere; pick up the latest values every time the editor opens.
    refetchOnMount: 'always',
  });

  const upsertCanvasMutation = useMutation({
    mutationFn: (patch: { template_key?: string | null; recipe_font?: string | null }) =>
      upsertRecipeCanvas(recipeId, patch as never),
    onSuccess: (row) => queryClient.setQueryData(['recipeCanvas', recipeId], row),
    // TanStack keeps mutations alive across unmount, so the save still
    // completes if the user taps Done mid-flight — but they'd never see
    // a failure. Surface it here so silent drops are visible.
    onError: (e: any) => Alert.alert('Save failed', e?.message ?? 'Could not save your changes.'),
  });

  const {
    elements, selectedId, scrollEnabled, templateKey, recipeFont,
    blockOverrides, layoutResetVersion,
    stepOverrides, ingOverrides,
    init, hydrateTemplateAndFont,
    addSticker, updateEl, removeEl, select, setScrollEnabled,
    setTemplateKey, setRecipeFont,
    setBlockOverride, setBlockHeightSilent, removeBlock, clearBlockOverrides,
    bumpBlockFontScale,
    saveStepOverride, saveIngOverride,
    undo: undoSticker,
  } = useCanvasStore();
  const { init: initDrawing, undo: undoDrawing } = useDrawingStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (recipeId) {
      init(recipeId);
      initDrawing(recipeId);
    }
  }, [recipeId]);

  // Precedence: per-recipe override (recipe_canvases) → cookbook default → fallback.
  // Server is authoritative; runs silently, without pushing a history snapshot.
  useEffect(() => {
    if (!recipe) return;
    const resolvedTemplate =
      canvasRow?.template_key ?? cookbook?.default_template_key ?? undefined;
    const resolvedFont =
      canvasRow?.recipe_font ?? cookbook?.default_recipe_font ?? undefined;
    hydrateTemplateAndFont({
      templateKey: resolvedTemplate ?? undefined,
      recipeFont: resolvedFont ?? undefined,
    });
  }, [
    recipe?.id,
    canvasRow?.template_key,
    canvasRow?.recipe_font,
    cookbook?.default_template_key,
    cookbook?.default_recipe_font,
    hydrateTemplateAndFont,
  ]);

  const switchMode = useCallback((mode: EditorMode) => {
    if (mode === 'draw') {
      setScrollEnabled(false);
      select(null);
    } else {
      setScrollEnabled(true);
    }
    setEditorMode(mode);
    setLayerPanelOpen(false);
    setBlockEditMode(false);
    setSelectedBlockId(null);
  }, [setScrollEnabled, select]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/recipe/${recipeId}`);
    }
  }

  const handleCanvasTap = useCallback(() => {
    if (editorMode === 'stickers') select(null);
    setSelectedBlockId(null);
  }, [editorMode, select]);

  const canvasTapGesture = useMemo(() =>
    Gesture.Tap()
      .enabled(editorMode !== 'draw')
      .onEnd(() => runOnJS(handleCanvasTap)()),
  [handleCanvasTap, editorMode]);

  const handleAddSticker = useCallback((key: string) => {
    const x = canvasWidth / 2 + (Math.random() - 0.5) * 80;
    const y = canvasHeight / 2 + (Math.random() - 0.5) * 80;
    addSticker(key, x, y);
  }, [canvasWidth, canvasHeight, addSticker]);

  const handleUpdateBlock = useCallback((blockId: string, patch: Partial<BlockOverride>) => {
    setBlockOverride(blockId, patch);
  }, [setBlockOverride]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    removeBlock(blockId);
    setSelectedBlockId(null);
  }, [removeBlock]);

  // Picker handlers: update Zustand + persist the override to recipe_canvases.
  // For template, the store's Alert gates the server write via the onApplied
  // callback — cancelling leaves the server row unchanged.
  const handleTemplateChange = useCallback((key: Parameters<typeof setTemplateKey>[0]) => {
    setTemplateKey(key, (applied) => {
      upsertCanvasMutation.mutate({ template_key: applied });
    });
  }, [setTemplateKey, upsertCanvasMutation]);

  const handleFontChange = useCallback((key: Parameters<typeof setRecipeFont>[0]) => {
    setRecipeFont(key);
    upsertCanvasMutation.mutate({ recipe_font: key });
  }, [setRecipeFont, upsertCanvasMutation]);

  const hasBlockOverrides =
    Object.keys(blockOverrides).length > 0 ||
    Object.keys(stepOverrides).length > 0 ||
    Object.keys(ingOverrides).length > 0;

  const selectedBlockDef = useMemo(() => {
    if (!selectedBlockId) return null;
    return getBlockDefs(templateKey).find(d => d.blockId === selectedBlockId) ?? null;
  }, [selectedBlockId, templateKey]);
  const selectedFontScale = selectedBlockId
    ? (blockOverrides[selectedBlockId]?.fontScale ?? 1)
    : 1;
  const showFontToolbar =
    editorMode === 'layout' && blockEditMode && !!selectedBlockId && !!selectedBlockDef?.isTextHeavy;

  // Panel height: layout mode grows to fit template + font pickers + arrange row
  // (+ font toolbar row when a text-heavy block is selected).
  const panelHeight = (
    editorMode === 'draw' ? 210
    : editorMode === 'layout' ? (showFontToolbar ? 312 : 264)
    : 148
  ) + insets.bottom;

  return (
    <ErrorBoundary fallbackLabel="Editor crashed — your work is safe">
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={[styles.closeBtn, upsertCanvasMutation.isPending && styles.disabledBtn]}
          disabled={upsertCanvasMutation.isPending}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{recipe?.title ?? '…'}</Text>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.undoBtn} onPress={editorMode === 'draw' ? undoDrawing : undoSticker}>
            <Text style={styles.undoText}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: palette.accent },
              upsertCanvasMutation.isPending && styles.disabledBtn,
            ]}
            onPress={() => goBack()}
            disabled={upsertCanvasMutation.isPending}
          >
            {upsertCanvasMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Done</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas area */}
      <ScrollView
        contentContainerStyle={styles.canvasScroll}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        <GestureDetector gesture={canvasTapGesture}>
          <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight, backgroundColor: colors.paper }]}>
            {/* Paper pattern — sits under all content */}
            <PaperPattern
              type={cookbook?.paper_type ?? 'blank'}
              width={canvasWidth}
              height={canvasHeight}
            />

            {/* Recipe content — rendered with selected template */}
            {recipe && (
              <PageTemplate
                recipe={recipe}
                pageWidth={canvasWidth}
                palette={palette}
                templateKey={templateKey}
                recipeFont={recipeFont}
                sectionTitles={cookbook?.section_titles}
                blockOverrides={blockOverrides}
                blockEditMode={blockEditMode}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onUpdateBlock={handleUpdateBlock}
                onMeasuredHeight={setBlockHeightSilent}
                onDeleteBlock={handleDeleteBlock}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
                layoutResetVersion={layoutResetVersion}
                stepOverrides={stepOverrides}
                ingOverrides={ingOverrides}
                onSaveStep={saveStepOverride}
                onSaveIng={saveIngOverride}
              />
            )}

            {/* Drawing layer — sits between page content and stickers */}
            <SkiaCanvas
              width={canvasWidth}
              height={canvasHeight}
              isDrawing={editorMode === 'draw'}
            />

            {/* Sticker elements — disabled while in block-edit mode.
                Keyed with layoutResetVersion so undo/reset triggers a remount
                that re-initialises CanvasElement's shared values from the
                reverted props (see BUG B1). */}
            {elements.map(el => (
              <CanvasElement
                key={`${el.id}-${layoutResetVersion}`}
                el={el}
                selected={selectedId === el.id}
                disabled={editorMode === 'draw' || blockEditMode}
                onSelect={() => select(el.id)}
                onUpdate={patch => updateEl(el.id, patch)}
                onDelete={() => removeEl(el.id)}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
              />
            ))}
          </View>
        </GestureDetector>
      </ScrollView>

      {/* Bottom panel */}
      <View style={[styles.panel, { height: panelHeight, paddingBottom: insets.bottom }]}>
        <View style={styles.panelHandle} />

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, editorMode === 'layout' && styles.modeTabActive]}
            onPress={() => switchMode('layout')}
          >
            <Text numberOfLines={1} style={[styles.modeTabText, editorMode === 'layout' && styles.modeTabTextActive]}>
              ⊞ Layout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, editorMode === 'stickers' && styles.modeTabActive]}
            onPress={() => switchMode('stickers')}
          >
            <Text numberOfLines={1} style={[styles.modeTabText, editorMode === 'stickers' && styles.modeTabTextActive]}>
              ✱ Stickers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, editorMode === 'draw' && styles.modeTabActive]}
            onPress={() => switchMode('draw')}
          >
            <Text numberOfLines={1} style={[styles.modeTabText, editorMode === 'draw' && styles.modeTabTextActive]}>
              ✏ Draw
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpBtn} onPress={() => setHelpOpen(true)}>
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Panel content */}
        {editorMode === 'layout' && (
          <>
            <TemplatePicker selected={templateKey} onSelect={handleTemplateChange} />
            <FontPicker selected={recipeFont} onSelect={handleFontChange} />

            {/* Arrange Blocks row */}
            <View style={styles.arrangeRow}>
              <TouchableOpacity
                style={[styles.arrangeBtn, blockEditMode && styles.arrangeBtnActive]}
                onPress={() => { setBlockEditMode(v => !v); setSelectedBlockId(null); }}
              >
                <Text style={[styles.arrangeBtnText, blockEditMode && styles.arrangeBtnTextActive]}>
                  ⊹ Arrange Blocks
                </Text>
              </TouchableOpacity>
              {hasBlockOverrides && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => { clearBlockOverrides(); setSelectedBlockId(null); setBlockEditMode(false); }}
                >
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {showFontToolbar && selectedBlockId && (
              <View style={styles.fontRow}>
                <TouchableOpacity
                  style={[styles.fontBtn, selectedFontScale <= FONT_SCALE_MIN + 1e-6 && styles.fontBtnDisabled]}
                  onPress={() => bumpBlockFontScale(selectedBlockId, -1)}
                  disabled={selectedFontScale <= FONT_SCALE_MIN + 1e-6}
                >
                  <Text style={styles.fontBtnTextSmall}>A−</Text>
                </TouchableOpacity>
                <Text style={styles.fontPct}>{Math.round(selectedFontScale * 100)}%</Text>
                <TouchableOpacity
                  style={[styles.fontBtn, selectedFontScale >= FONT_SCALE_MAX - 1e-6 && styles.fontBtnDisabled]}
                  onPress={() => bumpBlockFontScale(selectedBlockId, 1)}
                  disabled={selectedFontScale >= FONT_SCALE_MAX - 1e-6}
                >
                  <Text style={styles.fontBtnTextLarge}>A+</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        {editorMode === 'stickers' && (
          <>
            <MakeMeSketchButton
              recipeId={recipeId}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onUpgradePress={() => router.push('/upgrade')}
              disabled={!recipe?.title?.trim()}
            />
            <StickerTray onAdd={handleAddSticker} />
          </>
        )}
        {editorMode === 'draw' && (
          <DrawingToolbar onOpenLayers={() => setLayerPanelOpen(true)} />
        )}
      </View>

      {/* Layer panel (draw mode only) */}
      <LayerPanel visible={layerPanelOpen} onClose={() => setLayerPanelOpen(false)} />

      {/* Help sheet — mode-aware content */}
      <HelpSheet visible={helpOpen} mode={editorMode} onClose={() => setHelpOpen(false)} />
    </View>
    </ErrorBoundary>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1209' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#a89070', fontSize: 18 },
  topTitle: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: '#e8d8c0', textAlign: 'center', marginHorizontal: 8 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  undoBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: '#a89070', fontSize: 18 },
  saveBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 58, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },
  disabledBtn: { opacity: 0.55 },
  canvasScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  canvas: {
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  panel: {
    backgroundColor: '#241a0f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
    marginBottom: 6,
  },
  modeTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modeTabActive: { backgroundColor: 'rgba(196,106,76,0.25)' },
  helpBtn: {
    marginLeft: 'auto',
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  helpIcon: { fontFamily: fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  modeTabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
  modeTabTextActive: { color: '#c46a4c' },
  arrangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 8,
  },
  arrangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  arrangeBtnActive: {
    backgroundColor: 'rgba(196,106,76,0.25)',
    borderColor: '#c46a4c',
  },
  arrangeBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  arrangeBtnTextActive: { color: '#c46a4c' },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  resetBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: 'rgba(196,106,76,0.7)',
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 12,
  },
  fontBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  fontBtnDisabled: {
    opacity: 0.35,
  },
  fontBtnTextSmall: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#e8d8c0',
  },
  fontBtnTextLarge: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: '#e8d8c0',
  },
  fontPct: {
    minWidth: 56,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});
