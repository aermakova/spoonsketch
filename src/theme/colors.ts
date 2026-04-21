export const colors = {
  bg: '#f4ecdc',
  bg2: '#ede2ce',
  paper: '#faf4e6',
  paperSoft: '#f7eedb',
  ink: '#3b2a1f',
  inkSoft: '#6b5747',
  inkFaint: '#a39080',
  line: '#e6d7bc',
  terracotta: '#c46a4c',
  terracottaSoft: '#e9a488',
  terracottaDark: '#b85a3e',
  ochre: '#d9a441',
  sage: '#8c9f6e',
  plum: '#8a5f7a',
  tomato: '#b94a38',
  butter: '#f2d98d',
  rose: '#d97b7b',
} as const;

export const palettes = {
  terracotta: {
    bg: '#f4ecdc',
    bg2: '#ede2ce',
    paper: '#faf4e6',
    accent: '#c46a4c',
    accentDark: '#b85a3e',
    accentLight: '#d87a5c',
  },
  sage: {
    bg: '#eef0e4',
    bg2: '#e4e8d4',
    paper: '#f7f8ec',
    accent: '#6f8a52',
    accentDark: '#567040',
    accentLight: '#88a06a',
  },
  blush: {
    bg: '#f5e7e1',
    bg2: '#eed6cd',
    paper: '#faefe9',
    accent: '#c66a78',
    accentDark: '#a84f5e',
    accentLight: '#d98598',
  },
  cobalt: {
    bg: '#e8e5dc',
    bg2: '#dcd8ca',
    paper: '#f5f1e6',
    accent: '#2f5c8f',
    accentDark: '#214470',
    accentLight: '#3f75b0',
  },
} as const;

export type PaletteName = keyof typeof palettes;
export type Palette = (typeof palettes)[PaletteName];
