import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchRecipe } from '../../src/api/recipes';
import { CanvasElement } from '../../src/components/canvas/CanvasElement';
import { StickerTray } from '../../src/components/canvas/StickerTray';
import { SkiaCanvas } from '../../src/components/canvas/SkiaCanvas';
import { DrawingToolbar } from '../../src/components/canvas/DrawingToolbar';
import { LayerPanel } from '../../src/components/canvas/LayerPanel';
import { PageTemplate } from '../../src/components/canvas/PageTemplates';
import { TemplatePicker } from '../../src/components/canvas/TemplatePicker';
import { FontPicker } from '../../src/components/canvas/FontPicker';
import { useCanvasStore } from '../../src/lib/canvasStore';
import type { BlockOverride } from '../../src/lib/blockDefs';

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
  const [blockEditMode, setBlockEditMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const canvasWidth = sw - 48;
  const canvasHeight = Math.round(canvasWidth * 1.4142);

  const { data: recipe } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipe(recipeId),
    enabled: !!recipeId,
  });

  const {
    elements, selectedId, scrollEnabled, templateKey, recipeFont,
    blockOverrides, layoutResetVersion,
    stepOverrides, ingOverrides,
    init, addSticker, updateEl, removeEl, select, setScrollEnabled,
    setTemplateKey, setRecipeFont,
    setBlockOverride, removeBlock, clearBlockOverrides,
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
    Gesture.Tap().onEnd(() => runOnJS(handleCanvasTap)()),
  [handleCanvasTap]);

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

  const hasBlockOverrides =
    Object.keys(blockOverrides).length > 0 ||
    Object.keys(stepOverrides).length > 0 ||
    Object.keys(ingOverrides).length > 0;

  // Panel height: layout mode grows to fit template + font pickers + arrange row
  const panelHeight = (editorMode === 'draw' ? 210 : editorMode === 'layout' ? 264 : 148) + insets.bottom;

  return (
    <ErrorBoundary fallbackLabel="Editor crashed — your work is safe">
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{recipe?.title ?? '…'}</Text>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.undoBtn} onPress={editorMode === 'draw' ? undoDrawing : undoSticker}>
            <Text style={styles.undoText}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: palette.accent }]} onPress={() => goBack()}>
            <Text style={styles.saveBtnText}>Done</Text>
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
            {/* Recipe content — rendered with selected template */}
            {recipe && (
              <PageTemplate
                recipe={recipe}
                pageWidth={canvasWidth}
                palette={palette}
                templateKey={templateKey}
                recipeFont={recipeFont}
                blockOverrides={blockOverrides}
                blockEditMode={blockEditMode}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onUpdateBlock={handleUpdateBlock}
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

            {/* Sticker elements — disabled while in block-edit mode */}
            {elements.map(el => (
              <CanvasElement
                key={el.id}
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
            <Text style={[styles.modeTabText, editorMode === 'layout' && styles.modeTabTextActive]}>
              ⊞ Layout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, editorMode === 'stickers' && styles.modeTabActive]}
            onPress={() => switchMode('stickers')}
          >
            <Text style={[styles.modeTabText, editorMode === 'stickers' && styles.modeTabTextActive]}>
              ✱ Stickers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, editorMode === 'draw' && styles.modeTabActive]}
            onPress={() => switchMode('draw')}
          >
            <Text style={[styles.modeTabText, editorMode === 'draw' && styles.modeTabTextActive]}>
              ✏ Draw
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpBtn} onPress={() => { /* TODO: show help overlay */ }}>
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Panel content */}
        {editorMode === 'layout' && (
          <>
            <TemplatePicker selected={templateKey} onSelect={setTemplateKey} />
            <FontPicker selected={recipeFont} onSelect={setRecipeFont} />

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
          </>
        )}
        {editorMode === 'stickers' && (
          <StickerTray onAdd={handleAddSticker} />
        )}
        {editorMode === 'draw' && (
          <DrawingToolbar onOpenLayers={() => setLayerPanelOpen(true)} />
        )}
      </View>

      {/* Layer panel (draw mode only) */}
      <LayerPanel visible={layerPanelOpen} onClose={() => setLayerPanelOpen(false)} />
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
  saveBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#fff' },
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
    paddingHorizontal: 14,
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
});
