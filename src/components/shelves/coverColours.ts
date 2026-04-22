// Predefined cover colour + paired title colour.
// Each pair hand-picked so the title stays legible on its background —
// we never auto-contrast.

import type { Cookbook } from '../../types/cookbook';

export interface CoverColour {
  key: string;           // stable id, stored on the cookbook as cover_color in Phase 2
  bg: string;            // cover background hex
  title: string;         // title text colour on this cover
  countBadgeBg: string;  // small recipe-count badge background
  countBadgeText: string;
}

export const COVER_COLOURS: CoverColour[] = [
  // Dark teal + light cream — like the "Family Favorites" book in the mockup.
  {
    key: 'teal',
    bg: '#3c5a5e',
    title: '#e6d9b8',
    countBadgeBg: '#f5efdc',
    countBadgeText: '#3b2a1f',
  },
  // Terracotta + paper cream — "Sunday Suppers".
  {
    key: 'terracotta',
    bg: '#b4613e',
    title: '#faf4e6',
    countBadgeBg: '#f5efdc',
    countBadgeText: '#3b2a1f',
  },
  // Cream with botanical — "Grandma's Recipes".
  {
    key: 'cream',
    bg: '#efe2c4',
    title: '#6e4820',
    countBadgeBg: '#ffffff',
    countBadgeText: '#3b2a1f',
  },
  // Sage green + butter yellow — "Cozy Comforts".
  {
    key: 'sage',
    bg: '#5a6e4a',
    title: '#f2d98d',
    countBadgeBg: '#f5efdc',
    countBadgeText: '#3b2a1f',
  },
  // Warm sand + dark ink — "Holiday Magic".
  {
    key: 'sand',
    bg: '#eae0c8',
    title: '#3b2a1f',
    countBadgeBg: '#ffffff',
    countBadgeText: '#3b2a1f',
  },
  // Plum + paper cream — rounds out the set.
  {
    key: 'plum',
    bg: '#8a5f7a',
    title: '#faf4e6',
    countBadgeBg: '#f5efdc',
    countBadgeText: '#3b2a1f',
  },
];

// Phase 1: deterministic mapping from cookbook.id → cover colour so covers
// look consistent across reloads without a DB change. Phase 2 replaces this
// with a stored `cover_color` column.
export function pickCoverColour(cookbook: Pick<Cookbook, 'id'>): CoverColour {
  const idx = hashString(cookbook.id) % COVER_COLOURS.length;
  return COVER_COLOURS[idx];
}

export function pickSprigKey(cookbook: Pick<Cookbook, 'id'>): string {
  const idx = (hashString(cookbook.id) >> 3) % 6; // shift so it doesn't correlate with colour
  return `sprig-${idx + 1}`;
}

// Deterministic 32-bit FNV-1a hash — enough entropy for our small colour pool.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
