import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Alert } from 'react-native';
import storage from './canvasStorage';
import type { BlockOverride } from './blockDefs';

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
  addSticker: (key: string, x: number, y: number) => void;
  updateEl: (id: string, patch: Partial<CanvasEl>) => void;
  removeEl: (id: string) => void;
  select: (id: string | null) => void;
  setScrollEnabled: (v: boolean) => void;
  setTemplateKey: (key: TemplateKey) => void;
  setRecipeFont: (key: FontPresetKey) => void;
  setBlockOverride: (blockId: string, patch: Partial<BlockOverride>) => void;
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

      setTemplateKey(key) {
        const { blockOverrides } = get();
        const hasOverrides = Object.keys(blockOverrides).length > 0;
        if (!hasOverrides) {
          pushSnap();
          set({ templateKey: key });
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
