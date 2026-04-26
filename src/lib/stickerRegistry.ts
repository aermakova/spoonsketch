import type { ImageSourcePropType } from 'react-native';

export interface StickerDef {
  id: string;
  source: ImageSourcePropType;
  label: string;
}

export interface StickerPack {
  id: string;
  name: string;
  isPremium: boolean;
  stickers: StickerDef[];
}

// Static requires are mandatory — Metro resolves these at bundle time.
// When adding a new pack: add entries here and drop PNGs into assets/stickers/<packId>/.
const CORE_STICKERS: StickerDef[] = [
  { id: 'tomato',     source: require('../../assets/stickers/core/tomato.png'),     label: 'Tomato' },
  { id: 'lemon',      source: require('../../assets/stickers/core/lemon.png'),      label: 'Lemon' },
  { id: 'garlic',     source: require('../../assets/stickers/core/garlic.png'),     label: 'Garlic' },
  { id: 'basil',      source: require('../../assets/stickers/core/basil.png'),      label: 'Basil' },
  { id: 'whisk',      source: require('../../assets/stickers/core/whisk.png'),      label: 'Whisk' },
  { id: 'spoon',      source: require('../../assets/stickers/core/spoon.png'),      label: 'Spoon' },
  { id: 'pan',        source: require('../../assets/stickers/core/pan.png'),        label: 'Pan' },
  { id: 'wheat',      source: require('../../assets/stickers/core/wheat.png'),      label: 'Wheat' },
  { id: 'strawberry', source: require('../../assets/stickers/core/strawberry.png'), label: 'Strawberry' },
  { id: 'flower',     source: require('../../assets/stickers/core/flower.png'),     label: 'Flower' },
  { id: 'leaf',       source: require('../../assets/stickers/core/leaf.png'),       label: 'Leaf' },
  { id: 'heart',      source: require('../../assets/stickers/core/heart.png'),      label: 'Heart' },
  { id: 'star',       source: require('../../assets/stickers/core/star.png'),       label: 'Star' },
  { id: 'mushroom',   source: require('../../assets/stickers/core/mushroom.png'),   label: 'Mushroom' },
  { id: 'bread',      source: require('../../assets/stickers/core/bread.png'),      label: 'Bread' },
  { id: 'cherry',     source: require('../../assets/stickers/core/cherry.png'),     label: 'Cherry' },
];

export const STICKER_PACKS: StickerPack[] = [
  { id: 'core', name: 'Essentials', isPremium: false, stickers: CORE_STICKERS },
  // Future packs:
  // { id: 'baking',  name: 'Baking',   isPremium: true, stickers: BAKING_STICKERS },
  // { id: 'herbs',   name: 'Herbs',    isPremium: true, stickers: HERBS_STICKERS },
  // { id: 'holiday', name: 'Holiday',  isPremium: true, stickers: HOLIDAY_STICKERS },
];

// Flat index for O(1) lookup by id — used by Sticker component and canvas renderer.
const _index = new Map<string, ImageSourcePropType>(
  STICKER_PACKS.flatMap(p => p.stickers.map(s => [s.id, s.source]))
);

export function getStickerSource(id: string): ImageSourcePropType | null {
  return _index.get(id) ?? null;
}

export function getFreeStickers(): StickerDef[] {
  return STICKER_PACKS.filter(p => !p.isPremium).flatMap(p => p.stickers);
}

export function getStickersByPack(packId: string): StickerDef[] {
  return STICKER_PACKS.find(p => p.id === packId)?.stickers ?? [];
}

// ─── Pack metadata (always present, regardless of whether PNGs are committed) ───
//
// Lives separately from STICKER_PACKS so the Stash page can render all 4 packs
// even before the premium PNGs are generated. As soon as the assets land + the
// matching arrays are added to STICKER_PACKS above, getStickersByPack() will
// return real stickers and the cards light up.

export interface PackMetadata {
  id: string;
  name: string;
  isPremium: boolean;
  // Expected total when fully populated. Used in pack-card footer.
  stickerCount: number;
  // 4 representative sticker IDs used as preview thumbnails on the pack card.
  // Each ID renders only if its PNG is in the registry (Sticker handles
  // missing sources gracefully — returns null).
  previewIds: readonly string[];
  description: string;
}

export const PACK_METADATA: readonly PackMetadata[] = [
  {
    id: 'core',
    name: 'Essentials',
    isPremium: false,
    stickerCount: 16,
    previewIds: ['tomato', 'lemon', 'wheat', 'heart'],
    description: 'The kitchen basics — fruits, herbs, and your everyday tools.',
  },
  {
    id: 'baking',
    name: 'Baking',
    isPremium: true,
    stickerCount: 20,
    previewIds: ['rolling-pin', 'cupcake', 'croissant', 'cookie'],
    description: 'Pastry, dough, and sweet finishes for cakes, cookies, and bread.',
  },
  {
    id: 'herbs',
    name: 'Herbs & Garnish',
    isPremium: true,
    stickerCount: 20,
    previewIds: ['rosemary', 'mint', 'lime', 'chili-pepper'],
    description: 'Fresh herbs, citrus, and seasonings to garnish any plate.',
  },
  {
    id: 'holiday',
    name: 'Holiday & Seasonal',
    isPremium: true,
    stickerCount: 20,
    previewIds: ['pumpkin', 'gingerbread-man', 'snowflake', 'wreath'],
    description: "For Mother's Day, Christmas, Easter, birthdays, and the rest.",
  },
];

export function getPackMetadata(id: string): PackMetadata | null {
  return PACK_METADATA.find(p => p.id === id) ?? null;
}
