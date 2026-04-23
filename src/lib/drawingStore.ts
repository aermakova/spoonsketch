import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import storage from './canvasStorage';
import type { BlendMode, DrawingLayer, DrawingStroke, StrokePoint } from '../types/drawing';

// Per-recipe drawing state. Each recipe has its own layers + active layer.
// The top-level `layers` / `activeLayerId` are the working copy for the
// *current* recipe; every mutation also snapshots into the `drawings` map so
// opening another recipe and coming back restores strokes.
interface RecipeDrawing {
  layers: DrawingLayer[];
  activeLayerId: string | null;
}

interface DrawingState {
  recipeId: string | null;
  // Canonical per-recipe drawings, persisted. Keyed by recipeId.
  drawings: Record<string, RecipeDrawing>;
  // Working copy for the current recipe — mirrors drawings[recipeId].
  layers: DrawingLayer[];
  activeLayerId: string | null;
  activeTool: 'brush' | 'eraser';
  strokeWidth: number;
  color: string;
  opacity: number;
  // Undo history is transient (not persisted) and scoped to the session.
  history: DrawingLayer[][];

  init: (recipeId: string) => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  // Empty every layer's strokes for the current recipe. Layers + settings
  // (visibility, opacity, blend) are preserved so the user has a clean
  // canvas to draw on without rebuilding their layer stack.
  clearRecipeStrokes: () => void;
  reorderLayer: (id: string, dir: 'up' | 'down') => void;
  toggleVisible: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  commitStroke: (points: StrokePoint[]) => void;
  undo: () => void;
  setTool: (tool: 'brush' | 'eraser') => void;
  setStrokeWidth: (w: number) => void;
  setColor: (c: string) => void;
  setOpacity: (o: number) => void;
}

function makeLayer(name: string, zIndex: number): DrawingLayer {
  return {
    id: Math.random().toString(36).slice(2, 9),
    name,
    strokes: [],
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    zIndex,
  };
}

const DEFAULT_LAYERS = (): DrawingLayer[] => [
  makeLayer('Layer 1', 1),
  makeLayer('Layer 2', 2),
  makeLayer('Layer 3', 3),
];

function snapshot(
  prev: Record<string, RecipeDrawing>,
  recipeId: string | null,
  layers: DrawingLayer[],
  activeLayerId: string | null,
): Record<string, RecipeDrawing> {
  if (!recipeId) return prev;
  return { ...prev, [recipeId]: { layers, activeLayerId } };
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      recipeId: null,
      drawings: {},
      layers: DEFAULT_LAYERS(),
      activeLayerId: null,
      activeTool: 'brush',
      strokeWidth: 6,
      color: '#3b2a1f',
      opacity: 1,
      history: [],

      init(recipeId) {
        const s = get();
        if (s.recipeId === recipeId) {
          // Same recipe — just ensure activeLayerId points at a real layer
          // (working copy can be out of sync after a reload).
          if (!s.activeLayerId && s.layers.length > 0) {
            set({ activeLayerId: s.layers[0].id });
          }
          return;
        }

        // Save the outgoing recipe's current working copy back into the map.
        const drawingsWithOutgoing = snapshot(s.drawings, s.recipeId, s.layers, s.activeLayerId);

        // Load incoming recipe's drawings (or create defaults).
        const existing = drawingsWithOutgoing[recipeId];
        const loadedLayers = existing?.layers ?? DEFAULT_LAYERS();
        const loadedActive = existing?.activeLayerId ?? loadedLayers[0]?.id ?? null;

        // Make sure the new recipe has an entry so it's persisted even before
        // any strokes land.
        const drawingsWithIncoming = existing
          ? drawingsWithOutgoing
          : { ...drawingsWithOutgoing, [recipeId]: { layers: loadedLayers, activeLayerId: loadedActive } };

        set({
          recipeId,
          drawings: drawingsWithIncoming,
          layers: loadedLayers,
          activeLayerId: loadedActive,
          history: [],
        });
      },

      addLayer() {
        const { layers, recipeId, drawings } = get();
        if (layers.length >= 5) return;
        const maxZ = Math.max(...layers.map(l => l.zIndex));
        const layer = makeLayer(`Layer ${layers.length + 1}`, maxZ + 1);
        const nextLayers = [...layers, layer];
        set({
          layers: nextLayers,
          activeLayerId: layer.id,
          drawings: snapshot(drawings, recipeId, nextLayers, layer.id),
        });
      },

      removeLayer(id) {
        const { layers, activeLayerId, history, recipeId, drawings } = get();
        if (layers.length <= 1) return;
        const next = layers.filter(l => l.id !== id);
        const nextActive = activeLayerId === id ? (next[next.length - 1]?.id ?? null) : activeLayerId;
        set({
          layers: next,
          activeLayerId: nextActive,
          history: [...history, layers],
          drawings: snapshot(drawings, recipeId, next, nextActive),
        });
      },

      setActiveLayer(id) {
        const { recipeId, drawings, layers } = get();
        set({ activeLayerId: id, drawings: snapshot(drawings, recipeId, layers, id) });
      },

      // Layer panel ops push a history snapshot so the editor's Undo button
      // can revert an accidental visibility / blend-mode / reorder change.
      // See BUG B10.

      reorderLayer(id, dir) {
        const { layers, recipeId, drawings, activeLayerId, history } = get();
        const idx = layers.findIndex(l => l.id === id);
        if (idx < 0) return;
        const swapIdx = dir === 'up' ? idx + 1 : idx - 1;
        if (swapIdx < 0 || swapIdx >= layers.length) return;
        const next = [...layers];
        const tmpZ = next[idx].zIndex;
        next[idx] = { ...next[idx], zIndex: next[swapIdx].zIndex };
        next[swapIdx] = { ...next[swapIdx], zIndex: tmpZ };
        const sorted = next.sort((a, b) => a.zIndex - b.zIndex);
        set({
          layers: sorted,
          history: [...history, layers],
          drawings: snapshot(drawings, recipeId, sorted, activeLayerId),
        });
      },

      toggleVisible(id) {
        set(s => {
          const next = s.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
          return {
            layers: next,
            history: [...s.history, s.layers],
            drawings: snapshot(s.drawings, s.recipeId, next, s.activeLayerId),
          };
        });
      },

      setLayerOpacity(id, opacity) {
        set(s => {
          const next = s.layers.map(l => l.id === id ? { ...l, opacity } : l);
          // NOTE: if we ever wire a draggable opacity slider, gate the
          // history push so only the drag-end state snapshots, otherwise
          // every slider tick floods history.
          return {
            layers: next,
            history: [...s.history, s.layers],
            drawings: snapshot(s.drawings, s.recipeId, next, s.activeLayerId),
          };
        });
      },

      setLayerBlendMode(id, mode) {
        set(s => {
          const next = s.layers.map(l => l.id === id ? { ...l, blendMode: mode } : l);
          return {
            layers: next,
            history: [...s.history, s.layers],
            drawings: snapshot(s.drawings, s.recipeId, next, s.activeLayerId),
          };
        });
      },

      commitStroke(points) {
        const { layers, activeLayerId, history, strokeWidth, color, opacity, activeTool, recipeId, drawings } = get();
        if (!activeLayerId || points.length < 2) return;
        const stroke: DrawingStroke = {
          id: Math.random().toString(36).slice(2, 9),
          points,
          width: activeTool === 'eraser' ? strokeWidth * 2 : strokeWidth,
          color,
          opacity,
          isEraser: activeTool === 'eraser',
        };
        const nextLayers = layers.map(l => l.id === activeLayerId
          ? { ...l, strokes: [...l.strokes, stroke] }
          : l,
        );
        set({
          layers: nextLayers,
          history: [...history, layers],
          drawings: snapshot(drawings, recipeId, nextLayers, activeLayerId),
        });
      },

      undo() {
        const { history, recipeId, drawings, activeLayerId } = get();
        if (!history.length) return;
        const prevLayers = history[history.length - 1];
        set({
          layers: prevLayers,
          history: history.slice(0, -1),
          drawings: snapshot(drawings, recipeId, prevLayers, activeLayerId),
        });
      },

      clearRecipeStrokes() {
        const { layers, recipeId, drawings, activeLayerId, history } = get();
        if (layers.every(l => l.strokes.length === 0)) return;
        const cleared = layers.map(l => ({ ...l, strokes: [] }));
        set({
          layers: cleared,
          history: [...history, layers],
          drawings: snapshot(drawings, recipeId, cleared, activeLayerId),
        });
      },

      setTool(tool) { set({ activeTool: tool }); },
      setStrokeWidth(strokeWidth) { set({ strokeWidth }); },
      setColor(color) { set({ color }); },
      setOpacity(opacity) { set({ opacity }); },
    }),
    {
      name: 'spoonsketch-drawing',
      storage: createJSONStorage(() => storage),
      // Persist the canonical `drawings` map (keyed by recipeId) and tool
      // preferences. Working copy (layers/activeLayerId) is restored from
      // `drawings[recipeId]` on init.
      version: 2,
      migrate: (persisted: any, from: number) => {
        if (!persisted) return persisted;
        if (from < 2) {
          // v1 persisted a single { recipeId, layers, activeLayerId }. Seed the
          // drawings map with that entry so the user's one recipe's drawings
          // aren't lost.
          const drawings: Record<string, RecipeDrawing> = {};
          if (persisted.recipeId && Array.isArray(persisted.layers)) {
            drawings[persisted.recipeId] = {
              layers: persisted.layers,
              activeLayerId: persisted.activeLayerId ?? persisted.layers[0]?.id ?? null,
            };
          }
          return { drawings, activeTool: persisted.activeTool ?? 'brush', strokeWidth: persisted.strokeWidth ?? 6, color: persisted.color ?? '#3b2a1f', opacity: persisted.opacity ?? 1 };
        }
        return persisted;
      },
      partialize: (s) => ({
        drawings: s.drawings,
        activeTool: s.activeTool,
        strokeWidth: s.strokeWidth,
        color: s.color,
        opacity: s.opacity,
      }),
    },
  ),
);
