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

// blockOverrides keys are blockId strings (scoped to current recipeId+templateKey via store lifecycle)
interface CanvasState {
  recipeId: string | null;
  elements: CanvasEl[];
  selectedId: string | null;
  history: CanvasEl[][];
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
    (set, get) => ({
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
        const { elements, history } = get();
        const maxZ = elements.length ? Math.max(...elements.map(e => e.zIndex)) : 0;
        const el: CanvasEl = {
          id: Math.random().toString(36).slice(2, 9),
          stickerKey: key,
          x, y,
          rotation: (Math.random() - 0.5) * 0.5,
          scale: 1,
          zIndex: maxZ + 1,
        };
        set({ elements: [...elements, el], history: [...history, elements], selectedId: el.id });
      },

      updateEl(id, patch) {
        set(s => ({ elements: s.elements.map(el => el.id === id ? { ...el, ...patch } : el) }));
      },

      removeEl(id) {
        const { elements, history } = get();
        set({ elements: elements.filter(el => el.id !== id), history: [...history, elements], selectedId: null });
      },

      select(id) { set({ selectedId: id }); },

      setScrollEnabled(v) { set({ scrollEnabled: v }); },

      setTemplateKey(key) {
        const { blockOverrides } = get();
        const hasOverrides = Object.keys(blockOverrides).length > 0;
        if (!hasOverrides) {
          set({ templateKey: key, blockOverrides: {}, layoutResetVersion: 0 });
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
              onPress: () => set({ templateKey: key, blockOverrides: {}, layoutResetVersion: 0 }),
            },
          ],
        );
      },

      setRecipeFont(key) { set({ recipeFont: key }); },

      setBlockOverride(blockId, patch) {
        set(s => ({
          blockOverrides: {
            ...s.blockOverrides,
            [blockId]: { ...(s.blockOverrides[blockId] ?? {}), ...patch } as BlockOverride,
          },
        }));
      },

      removeBlock(blockId) {
        set(s => ({
          blockOverrides: {
            ...s.blockOverrides,
            [blockId]: { ...(s.blockOverrides[blockId] ?? {}), hidden: true } as BlockOverride,
          },
        }));
      },

      clearBlockOverrides() {
        set(s => ({ blockOverrides: {}, layoutResetVersion: s.layoutResetVersion + 1, stepOverrides: {}, ingOverrides: {} }));
      },

      saveStepOverride(stepNum, o) {
        set(s => ({
          stepOverrides: { ...s.stepOverrides, [stepNum]: { ...(s.stepOverrides[stepNum] ?? {}), ...o } },
        }));
      },

      saveIngOverride(ingId, o) {
        set(s => ({
          ingOverrides: { ...s.ingOverrides, [ingId]: { ...(s.ingOverrides[ingId] ?? {}), ...o } },
        }));
      },

      undo() {
        const { history } = get();
        if (!history.length) return;
        set({ elements: history[history.length - 1], history: history.slice(0, -1), selectedId: null });
      },
    }),
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
