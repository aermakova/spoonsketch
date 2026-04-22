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

// Per-recipe canvas slice. Everything under here is keyed by recipeId so
// opening a different recipe doesn't destroy the previous one's work.
export interface RecipeCanvasState {
  elements: CanvasEl[];
  blockOverrides: Record<string, BlockOverride>;
  stepOverrides: Record<number, StepOverride>;
  ingOverrides: Record<string, IngOverride>;
  templateKey: TemplateKey;
  recipeFont: FontPresetKey;
}

// A snapshot of the undoable slice. Selection, scroll state, history itself,
// and layoutResetVersion are intentionally excluded — they are UI-only or self-managed.
interface CanvasSnapshot extends RecipeCanvasState {}

const HISTORY_MAX = 50;

function defaultRecipeState(): RecipeCanvasState {
  return {
    elements: [],
    blockOverrides: {},
    stepOverrides: {},
    ingOverrides: {},
    templateKey: 'classic',
    recipeFont: 'caveat',
  };
}

interface CanvasState {
  // Canonical per-recipe state (persisted). Keyed by recipeId.
  recipeStates: Record<string, RecipeCanvasState>;

  // Working copy for the current recipe. Mirrors recipeStates[recipeId].
  recipeId: string | null;
  elements: CanvasEl[];
  blockOverrides: Record<string, BlockOverride>;
  stepOverrides: Record<number, StepOverride>;
  ingOverrides: Record<string, IngOverride>;
  templateKey: TemplateKey;
  recipeFont: FontPresetKey;

  // UI state (not persisted, scoped to current recipe).
  selectedId: string | null;
  history: CanvasSnapshot[];
  scrollEnabled: boolean;
  layoutResetVersion: number;

  init: (recipeId: string, els?: CanvasEl[]) => void;
  // Silent hydration from server-resolved cookbook default / recipe override.
  // Does not push history, does not alert — purely a client-state sync.
  hydrateTemplateAndFont: (patch: { templateKey?: TemplateKey; recipeFont?: FontPresetKey }) => void;
  addSticker: (key: string, x: number, y: number) => void;
  // Batch insert used by "Make me Sketch". A single history snapshot so
  // Cmd-Z / the undo action pops all at once.
  addStickersBatch: (
    inputs: Array<{ stickerKey: string; x: number; y: number; rotation: number; scale: number }>,
  ) => void;
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

// Snapshot the given working copy back into the recipeStates map.
function commitRecipeState(
  recipeStates: Record<string, RecipeCanvasState>,
  recipeId: string | null,
  patch: Partial<RecipeCanvasState>,
): Record<string, RecipeCanvasState> {
  if (!recipeId) return recipeStates;
  const prev = recipeStates[recipeId] ?? defaultRecipeState();
  return { ...recipeStates, [recipeId]: { ...prev, ...patch } };
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => {
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

      const snapshot = (patch: Partial<RecipeCanvasState>) => {
        const s = get();
        return commitRecipeState(s.recipeStates, s.recipeId, patch);
      };

      return {
        recipeStates: {},

        recipeId: null,
        elements: [],
        blockOverrides: {},
        stepOverrides: {},
        ingOverrides: {},
        templateKey: 'classic',
        recipeFont: 'caveat',

        selectedId: null,
        history: [],
        scrollEnabled: true,
        layoutResetVersion: 0,

        init(recipeId, els = []) {
          const s = get();
          if (s.recipeId === recipeId) return;

          // Save the outgoing recipe's working copy back into the map.
          const savedOutgoing = s.recipeId
            ? commitRecipeState(s.recipeStates, s.recipeId, {
                elements: s.elements,
                blockOverrides: s.blockOverrides,
                stepOverrides: s.stepOverrides,
                ingOverrides: s.ingOverrides,
                templateKey: s.templateKey,
                recipeFont: s.recipeFont,
              })
            : s.recipeStates;

          // Load incoming recipe. If we have a stored state, use it verbatim
          // (the `els` seed is only for brand-new recipes without a state
          // yet). If nothing stored, seed elements from caller + defaults.
          const existing = savedOutgoing[recipeId];
          const loaded: RecipeCanvasState = existing ?? {
            ...defaultRecipeState(),
            elements: els,
          };
          const recipeStates = existing
            ? savedOutgoing
            : { ...savedOutgoing, [recipeId]: loaded };

          set({
            recipeStates,
            recipeId,
            elements: loaded.elements,
            blockOverrides: loaded.blockOverrides,
            stepOverrides: loaded.stepOverrides,
            ingOverrides: loaded.ingOverrides,
            templateKey: loaded.templateKey,
            recipeFont: loaded.recipeFont,
            selectedId: null,
            history: [],
            layoutResetVersion: 0,
          });
        },

        hydrateTemplateAndFont(patch) {
          const s = get();
          const next: Partial<CanvasState> = {};
          if (patch.templateKey && patch.templateKey !== s.templateKey) next.templateKey = patch.templateKey;
          if (patch.recipeFont && patch.recipeFont !== s.recipeFont) next.recipeFont = patch.recipeFont;
          if (Object.keys(next).length) {
            set(next);
            set({ recipeStates: snapshot({
              templateKey: next.templateKey ?? s.templateKey,
              recipeFont: next.recipeFont ?? s.recipeFont,
            }) });
          }
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
          set(s => {
            const elements = [...s.elements, el];
            return {
              elements,
              selectedId: el.id,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { elements }),
            };
          });
        },

        addStickersBatch(inputs) {
          if (!inputs.length) return;
          pushSnap();
          const { elements } = get();
          const maxZ = elements.length ? Math.max(...elements.map(e => e.zIndex)) : 0;
          const newEls: CanvasEl[] = inputs.map((it, i) => ({
            id: Math.random().toString(36).slice(2, 9),
            stickerKey: it.stickerKey,
            x: it.x,
            y: it.y,
            rotation: it.rotation,
            scale: it.scale,
            zIndex: maxZ + 1 + i,
          }));
          set(s => {
            const merged = [...s.elements, ...newEls];
            return {
              elements: merged,
              selectedId: null,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { elements: merged }),
            };
          });
        },

        updateEl(id, patch) {
          pushSnap();
          set(s => {
            const elements = s.elements.map(el => el.id === id ? { ...el, ...patch } : el);
            return {
              elements,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { elements }),
            };
          });
        },

        removeEl(id) {
          pushSnap();
          set(s => {
            const elements = s.elements.filter(el => el.id !== id);
            return {
              elements,
              selectedId: null,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { elements }),
            };
          });
        },

        select(id) { set({ selectedId: id }); },

        setScrollEnabled(v) { set({ scrollEnabled: v }); },

        setTemplateKey(key, onApplied) {
          const { blockOverrides } = get();
          const hasOverrides = Object.keys(blockOverrides).length > 0;
          if (!hasOverrides) {
            pushSnap();
            set({ templateKey: key, recipeStates: snapshot({ templateKey: key }) });
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
                  set(s => ({
                    templateKey: key,
                    blockOverrides: {},
                    layoutResetVersion: s.layoutResetVersion + 1,
                    recipeStates: commitRecipeState(s.recipeStates, s.recipeId, {
                      templateKey: key,
                      blockOverrides: {},
                    }),
                  }));
                  onApplied?.(key);
                },
              },
            ],
          );
        },

        setRecipeFont(key) {
          pushSnap();
          set({ recipeFont: key, recipeStates: snapshot({ recipeFont: key }) });
        },

        setBlockOverride(blockId, patch) {
          pushSnap();
          set(s => {
            const blockOverrides = {
              ...s.blockOverrides,
              [blockId]: { ...(s.blockOverrides[blockId] ?? {}), ...patch } as BlockOverride,
            };
            return {
              blockOverrides,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { blockOverrides }),
            };
          });
        },

        setBlockHeightSilent(blockId, hFrac) {
          const current = get().blockOverrides[blockId]?.h;
          if (current != null && Math.abs(current - hFrac) < 0.0005) return;
          set(s => {
            const blockOverrides = {
              ...s.blockOverrides,
              [blockId]: { ...(s.blockOverrides[blockId] ?? {}), h: hFrac } as BlockOverride,
            };
            return {
              blockOverrides,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { blockOverrides }),
            };
          });
        },

        bumpBlockFontScale(blockId, direction) {
          const current = get().blockOverrides[blockId]?.fontScale ?? 1;
          const next = Math.max(
            FONT_SCALE_MIN,
            Math.min(FONT_SCALE_MAX, +(current + direction * FONT_SCALE_STEP).toFixed(2)),
          );
          if (next === current) return;
          pushSnap();
          set(s => {
            const blockOverrides = {
              ...s.blockOverrides,
              [blockId]: { ...(s.blockOverrides[blockId] ?? {}), fontScale: next } as BlockOverride,
            };
            return {
              blockOverrides,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { blockOverrides }),
            };
          });
        },

        removeBlock(blockId) {
          pushSnap();
          set(s => {
            const blockOverrides = {
              ...s.blockOverrides,
              [blockId]: { ...(s.blockOverrides[blockId] ?? {}), hidden: true } as BlockOverride,
            };
            return {
              blockOverrides,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { blockOverrides }),
            };
          });
        },

        clearBlockOverrides() {
          pushSnap();
          set(s => ({
            blockOverrides: {},
            stepOverrides: {},
            ingOverrides: {},
            layoutResetVersion: s.layoutResetVersion + 1,
            recipeStates: commitRecipeState(s.recipeStates, s.recipeId, {
              blockOverrides: {},
              stepOverrides: {},
              ingOverrides: {},
            }),
          }));
        },

        saveStepOverride(stepNum, o) {
          pushSnap();
          set(s => {
            const stepOverrides = { ...s.stepOverrides, [stepNum]: { ...(s.stepOverrides[stepNum] ?? {}), ...o } };
            return {
              stepOverrides,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { stepOverrides }),
            };
          });
        },

        saveIngOverride(ingId, o) {
          pushSnap();
          set(s => {
            const ingOverrides = { ...s.ingOverrides, [ingId]: { ...(s.ingOverrides[ingId] ?? {}), ...o } };
            return {
              ingOverrides,
              recipeStates: commitRecipeState(s.recipeStates, s.recipeId, { ingOverrides }),
            };
          });
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
            recipeStates: commitRecipeState(s.recipeStates, s.recipeId, {
              elements: snap.elements,
              blockOverrides: snap.blockOverrides,
              stepOverrides: snap.stepOverrides,
              ingOverrides: snap.ingOverrides,
              templateKey: snap.templateKey,
              recipeFont: snap.recipeFont,
            }),
          }));
        },
      };
    },
    {
      name: 'spoonsketch-canvas',
      storage: createJSONStorage(() => storage),
      // v2 (Phase A): `header` / `hero` / `banner` mega-blocks split.
      // v3 (Phase B): full atomization — all mega-blocks split into atoms.
      // v4 (BUG-015): canvas state restructured to a per-recipe map so opening
      // a different recipe no longer destroys the previous recipe's stickers,
      // block arrangement, step/ingredient edits, template, and font.
      version: 4,
      migrate: (persisted: any, from: number) => {
        if (!persisted) return persisted;
        if (from < 3) {
          // Pre-Phase B overrides were invalidated anyway; now also seed
          // recipeStates with whatever lone recipe's state we had.
          const seed: Record<string, RecipeCanvasState> = {};
          if (persisted.recipeId) {
            seed[persisted.recipeId] = {
              ...defaultRecipeState(),
              elements: Array.isArray(persisted.elements) ? persisted.elements : [],
              templateKey: persisted.templateKey ?? 'classic',
              recipeFont: persisted.recipeFont ?? 'caveat',
            };
          }
          return { recipeStates: seed };
        }
        if (from < 4) {
          // v3 shape: single top-level per-recipe fields. Seed the new map
          // with that one recipe's state so the current recipe doesn't
          // appear empty after upgrade.
          const seed: Record<string, RecipeCanvasState> = {};
          if (persisted.recipeId) {
            seed[persisted.recipeId] = {
              elements: Array.isArray(persisted.elements) ? persisted.elements : [],
              blockOverrides: persisted.blockOverrides ?? {},
              stepOverrides: persisted.stepOverrides ?? {},
              ingOverrides: persisted.ingOverrides ?? {},
              templateKey: persisted.templateKey ?? 'classic',
              recipeFont: persisted.recipeFont ?? 'caveat',
            };
          }
          return { recipeStates: seed };
        }
        return persisted;
      },
      // Persist only the canonical per-recipe map. The working copy at the
      // top level is restored from `recipeStates[recipeId]` on init.
      partialize: (s) => ({ recipeStates: s.recipeStates }),
    },
  ),
);
