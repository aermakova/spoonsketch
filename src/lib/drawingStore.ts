import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import storage from './canvasStorage';
import type { BlendMode, DrawingLayer, DrawingStroke, StrokePoint } from '../types/drawing';

interface DrawingState {
  recipeId: string | null;
  layers: DrawingLayer[];
  activeLayerId: string | null;
  activeTool: 'brush' | 'eraser';
  strokeWidth: number;
  color: string;
  opacity: number;
  history: DrawingLayer[][];

  init: (recipeId: string) => void;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
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

const DEFAULT_LAYERS = () => [
  makeLayer('Layer 1', 1),
  makeLayer('Layer 2', 2),
  makeLayer('Layer 3', 3),
];

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      recipeId: null,
      layers: DEFAULT_LAYERS(),
      activeLayerId: null,
      activeTool: 'brush',
      strokeWidth: 6,
      color: '#3b2a1f',
      opacity: 1,
      history: [],

      init(recipeId) {
        const state = get();
        if (state.recipeId === recipeId) {
          // Same recipe — just make sure activeLayerId points at a real layer
          // (it isn't persisted, so a reload resets it to null and drawing silently fails).
          if (!state.activeLayerId && state.layers.length > 0) {
            set({ activeLayerId: state.layers[0].id });
          }
          return;
        }
        const layers = DEFAULT_LAYERS();
        set({ recipeId, layers, activeLayerId: layers[0].id, history: [] });
      },

      addLayer() {
        const { layers } = get();
        if (layers.length >= 5) return;
        const maxZ = Math.max(...layers.map(l => l.zIndex));
        const layer = makeLayer(`Layer ${layers.length + 1}`, maxZ + 1);
        set({ layers: [...layers, layer], activeLayerId: layer.id });
      },

      removeLayer(id) {
        const { layers, activeLayerId, history } = get();
        if (layers.length <= 1) return;
        const next = layers.filter(l => l.id !== id);
        const nextActive = activeLayerId === id ? (next[next.length - 1]?.id ?? null) : activeLayerId;
        set({ layers: next, activeLayerId: nextActive, history: [...history, layers] });
      },

      setActiveLayer(id) { set({ activeLayerId: id }); },

      reorderLayer(id, dir) {
        const { layers } = get();
        const idx = layers.findIndex(l => l.id === id);
        if (idx < 0) return;
        const swapIdx = dir === 'up' ? idx + 1 : idx - 1;
        if (swapIdx < 0 || swapIdx >= layers.length) return;
        const next = [...layers];
        const tmpZ = next[idx].zIndex;
        next[idx] = { ...next[idx], zIndex: next[swapIdx].zIndex };
        next[swapIdx] = { ...next[swapIdx], zIndex: tmpZ };
        set({ layers: next.sort((a, b) => a.zIndex - b.zIndex) });
      },

      toggleVisible(id) {
        set(s => ({ layers: s.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l) }));
      },

      setLayerOpacity(id, opacity) {
        set(s => ({ layers: s.layers.map(l => l.id === id ? { ...l, opacity } : l) }));
      },

      setLayerBlendMode(id, mode) {
        set(s => ({ layers: s.layers.map(l => l.id === id ? { ...l, blendMode: mode } : l) }));
      },

      commitStroke(points) {
        const { layers, activeLayerId, history, strokeWidth, color, opacity, activeTool } = get();
        if (!activeLayerId || points.length < 2) return;
        const stroke: DrawingStroke = {
          id: Math.random().toString(36).slice(2, 9),
          points,
          width: activeTool === 'eraser' ? strokeWidth * 2 : strokeWidth,
          color,
          opacity,
          isEraser: activeTool === 'eraser',
        };
        set({
          layers: layers.map(l => l.id === activeLayerId
            ? { ...l, strokes: [...l.strokes, stroke] }
            : l
          ),
          history: [...history, layers],
        });
      },

      undo() {
        const { history } = get();
        if (!history.length) return;
        set({ layers: history[history.length - 1], history: history.slice(0, -1) });
      },

      setTool(tool) { set({ activeTool: tool }); },
      setStrokeWidth(strokeWidth) { set({ strokeWidth }); },
      setColor(color) { set({ color }); },
      setOpacity(opacity) { set({ opacity }); },
    }),
    {
      name: 'spoonsketch-drawing',
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ recipeId: s.recipeId, layers: s.layers, activeLayerId: s.activeLayerId }),
    }
  )
);
