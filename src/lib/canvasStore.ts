import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Alert } from 'react-native';
import storage from './canvasStorage';
import type { BlockOverride } from './blockDefs';
import { FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP } from './blockDefs';

export interface CanvasEl {
  id: string;
  stickerKey: string;
  x: number;
  y: number;
  rotation: number; // radians
  scale: number;
  zIndex: number;
}

export type TemplateKey = 'classic' | 'photo-hero' | 'minimal' | 'two-column' | 'journal' | 'recipe-card';
export type FontPresetKey = 'caveat' | 'marck' | 'bad-script' | 'amatic';

export interface StepOverride  { text?: string; hidden?: boolean; }
export interface IngOverride   { text?: string; hidden?: boolean; }

// A snapshot of the undoable slice. Selection, scroll state, history itself,
// and layoutResetVersion are intentionally excluded — they are UI-only or self-managed.
interface CanvasSnapshot {
  elements: CanvasEl[];
  blockOverrides: Record<string, BlockOverride>;
  stepOverrides: Record<number, StepOverride>;
  ingOverrides: Record<string, IngOverride>;
  templateKey: TemplateKey;
  recipeFont: FontPresetKey;
}

const HISTORY_MAX = 50;

// blockOverrides keys are blockId strings (scoped to current recipeId+templateKey via store lifecycle)
interface CanvasState {
  recipeId: string | null;
  elements: CanvasEl[];
  selectedId: string | null;
  history: CanvasSnapshot[];
  scrollEnabled: boolean;
  templateKey: TemplateKey;
  recipeFont: FontPresetKey;
  blockOverrides: Record<string, BlockOverride>;
  layoutResetVersion: number;
  stepOverrides: Record<number, StepOverride>;
  ingOverrides: Record<string, IngOverride>;

  init: (recipeId: string, els?: CanvasEl[]) => void;
  // Silent hydration from server-resolved cookbook default / recipe override.
  // Does not push history, does not alert — purely a client-state sync.
  hydrateTemplateAndFont: (patch: { templateKey?: TemplateKey; recipeFont?: FontPresetKey }) => void;
  addSticker: (key: string, x: number, y: number) => void;
  updateEl: (id: string, patch: Partial<CanvasEl>) => void;
  removeEl: (id: string) => void;
  select: (id: string | null) => void;
  setScrollEnabled: (v: boolean) => void;
  // onApplied fires after the new template is actually committed. When the
  // store shows the "Changing the template will reset…" Alert, onApplied
  // only runs if the user confirms — so it's the right hook for server
  // persistence (we shouldn't write to recipe_canvases if the user cancels).
  setTemplateKey: (key: TemplateKey, onApplied?: (key: TemplateKey) => void) => void;
  setRecipeFont: (key: FontPresetKey) => void;
  setBlockOverride: (blockId: string, patch: Partial<BlockOverride>) => void;
  // Silent height write — for onLayout-driven auto-measurement of text-heavy blocks.
  // Does NOT push a history snapshot: height is a derived quantity, not a user action.
  setBlockHeightSilent: (blockId: string, hFrac: number) => void;
  bumpBlockFontScale: (blockId: string, direction: 1 | -1) => void;
  removeBlock: (blockId: string) => void;
  clearBlockOverrides: () => void;
  saveStepOverride: (stepNum: number, o: StepOverride) => void;
  saveIngOverride: (ingId: string, o: IngOverride) => void;
  undo: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => {
      // Capture the current undoable slice and push it to history (capped).
      const pushSnap = () => {
        const s = get();
        const snap: CanvasSnapshot = {
          elements: s.elements,
          blockOverrides: s.blockOverrides,
          stepOverrides: s.stepOverrides,
          ingOverrides: s.ingOverrides,
          templateKey: s.templateKey,
          recipeFont: s.recipeFont,
        };
        set({ history: [...s.history.slice(-(HISTORY_MAX - 1)), snap] });
      };

      return {
      recipeId: null,
      elements: [],
      selectedId: null,
      history: [],
      scrollEnabled: true,
      templateKey: 'classic',
      recipeFont: 'caveat',
      blockOverrides: {},
      layoutResetVersion: 0,
      stepOverrides: {},
      ingOverrides: {},

      init(recipeId, els = []) {
        if (get().recipeId === recipeId) return;
        set({ recipeId, elements: els, selectedId: null, history: [], blockOverrides: {}, layoutResetVersion: 0, stepOverrides: {}, ingOverrides: {} });
      },

      hydrateTemplateAndFont(patch) {
        const s = get();
        const next: Partial<CanvasState> = {};
        if (patch.templateKey && patch.templateKey !== s.templateKey) next.templateKey = patch.templateKey;
        if (patch.recipeFont && patch.recipeFont !== s.recipeFont) next.recipeFont = patch.recipeFont;
        if (Object.keys(next).length) set(next);
      },

      addSticker(key, x, y) {
        pushSnap();
        const { elements } = get();
        const maxZ = elements.length ? Math.max(...elements.map(e => e.zIndex)) : 0;
        const el: CanvasEl = {
          id: Math.random().toString(36).slice(2, 9),
          stickerKey: key,
          x, y,
          rotation: (Math.random() - 0.5) * 0.5,
          scale: 1,
          zIndex: maxZ + 1,
        };
        set(s => ({ elements: [...s.elements, el], selectedId: el.id }));
      },

      updateEl(id, patch) {
        pushSnap();
        set(s => ({ elements: s.elements.map(el => el.id === id ? { ...el, ...patch } : el) }));
      },

      removeEl(id) {
        pushSnap();
        set(s => ({ elements: s.elements.filter(el => el.id !== id), selectedId: null }));
      },

      select(id) { set({ selectedId: id }); },

      setScrollEnabled(v) { set({ scrollEnabled: v }); },

      setTemplateKey(key, onApplied) {
        const { blockOverrides } = get();
        const hasOverrides = Object.keys(blockOverrides).length > 0;
        if (!hasOverrides) {
          pushSnap();
          set({ templateKey: key });
          onApplied?.(key);
          return;
        }
        Alert.alert(
          'Change template?',
          'Changing the template will reset your block arrangement.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Change',
              style: 'destructive',
              onPress: () => {
                pushSnap();
                set(s => ({ templateKey: key, blockOverrides: {}, layoutResetVersion: s.layoutResetVersion + 1 }));
                onApplied?.(key);
              },
            },
          ],
        );
      },

      setRecipeFont(key) {
        pushSnap();
        set({ recipeFont: key });
      },

      setBlockOverride(blockId, patch) {
        pushSnap();
        set(s => ({
          blockOverrides: {
            ...s.blockOverrides,
            [blockId]: { ...(s.blockOverrides[blockId] ?? {}), ...patch } as BlockOverride,
          },
        }));
      },

      setBlockHeightSilent(blockId, hFrac) {
        const current = get().blockOverrides[blockId]?.h;
        // Skip no-op writes and sub-pixel float noise.
        if (current != null && Math.abs(current - hFrac) < 0.0005) return;
        set(s => ({
          blockOverrides: {
            ...s.blockOverrides,
            [blockId]: { ...(s.blockOverrides[blockId] ?? {}), h: hFrac } as BlockOverride,
          },
        }));
      },

      bumpBlockFontScale(blockId, direction) {
        const current = get().blockOverrides[blockId]?.fontScale ?? 1;
        const next = Math.max(
          FONT_SCALE_MIN,
          Math.min(FONT_SCALE_MAX, +(current + direction * FONT_SCALE_STEP).toFixed(2)),
        );
        if (next === current) return;
        pushSnap();
        set(s => ({
          blockOverrides: {
            ...s.blockOverrides,
            [blockId]: { ...(s.blockOverrides[blockId] ?? {}), fontScale: next } as BlockOverride,
          },
        }));
      },

      removeBlock(blockId) {
        pushSnap();
        set(s => ({
          blockOverrides: {
            ...s.blockOverrides,
            [blockId]: { ...(s.blockOverrides[blockId] ?? {}), hidden: true } as BlockOverride,
          },
        }));
      },

      clearBlockOverrides() {
        pushSnap();
        set(s => ({ blockOverrides: {}, layoutResetVersion: s.layoutResetVersion + 1, stepOverrides: {}, ingOverrides: {} }));
      },

      saveStepOverride(stepNum, o) {
        pushSnap();
        set(s => ({
          stepOverrides: { ...s.stepOverrides, [stepNum]: { ...(s.stepOverrides[stepNum] ?? {}), ...o } },
        }));
      },

      saveIngOverride(ingId, o) {
        pushSnap();
        set(s => ({
          ingOverrides: { ...s.ingOverrides, [ingId]: { ...(s.ingOverrides[ingId] ?? {}), ...o } },
        }));
      },

      undo() {
        const { history } = get();
        if (!history.length) return;
        const snap = history[history.length - 1];
        set(s => ({
          elements: snap.elements,
          blockOverrides: snap.blockOverrides,
          stepOverrides: snap.stepOverrides,
          ingOverrides: snap.ingOverrides,
          templateKey: snap.templateKey,
          recipeFont: snap.recipeFont,
          history: history.slice(0, -1),
          selectedId: null,
          // Bump so BlockElement keys change and remount with fresh shared values.
          layoutResetVersion: s.layoutResetVersion + 1,
        }));
      },
      };
    },
    {
      name: 'spoonsketch-canvas',
      storage: createJSONStorage(() => storage),
      // Bump whenever a blockDefs schema change invalidates stored overrides.
      // v2 (Phase A): `header` / `hero` / `banner` mega-blocks split.
      // v3 (Phase B): full atomization — `ingredients` / `steps` / `meta` /
      // `left-col` / `right-col` / `banner` split into atomic blocks
      // (`ingredients-heading`, `ingredients-list`, `method-heading`,
      // `method-list`, `pills`, `image`, `title`). Any override keyed by a
      // removed id or positioned against the old layout no longer maps.
      version: 3,
      migrate: (persisted: any, from: number) => {
        if (!persisted) return persisted;
        if (from < 3) {
          return { ...persisted, blockOverrides: {} };
        }
        return persisted;
      },
      partialize: (s) => ({
        recipeId: s.recipeId,
        elements: s.elements,
        templateKey: s.templateKey,
        recipeFont: s.recipeFont,
        blockOverrides: s.blockOverrides,
        stepOverrides: s.stepOverrides,
        ingOverrides: s.ingOverrides,
      }),
    }
  )
);
