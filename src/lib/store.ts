import { create } from 'zustand';
import { palettes, type PaletteName, type Palette } from '../theme/colors';

export type { Palette };

interface ThemeStore {
  paletteName: PaletteName;
  palette: Palette;
  setPalette: (name: PaletteName) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  paletteName: 'terracotta',
  palette: palettes.terracotta,
  setPalette: (name) => set({ paletteName: name, palette: palettes[name] }),
}));
