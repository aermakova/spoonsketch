import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodImage } from './FoodImage';
import { Sticker } from '../stickers/Sticker';
import { getFreeStickers } from '../../lib/stickerRegistry';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Recipe } from '../../types/recipe';
import type { Palette } from '../../theme/colors';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  palette: Palette;
  onPress: () => void;
}

const TAG_STICKER_MAP: Record<string, string> = {
  soup: 'tomato', vegetarian: 'basil', veg: 'basil', baking: 'wheat',
  bread: 'bread', salad: 'leaf', dessert: 'strawberry', pasta: 'spoon',
  quick: 'whisk', breakfast: 'flower', favourite: 'heart',
};

function pickSticker(recipe: Recipe): string {
  const tag = recipe.tags[0] ?? '';
  const mapped = TAG_STICKER_MAP[tag.toLowerCase()];
  if (mapped) return mapped;
  const all = getFreeStickers();
  return all[recipe.title.length % all.length]?.id ?? 'tomato';
}

export function RecipeCard({ recipe, index, palette, onPress }: RecipeCardProps) {
  const rotation = index % 2 === 0 ? -0.6 : 0.6;
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  const stickerKind = pickSticker(recipe);

  return (
    <TouchableOpacity
      style={[styles.card, { transform: [{ rotate: `${rotation}deg` }] }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageWrap}>
        <FoodImage width="100%" height={140} borderRadius={0} />
        <View style={styles.stickerWrap}>
          <Sticker kind={stickerKind} size={40} rotate={rotation * -6} />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
        <View style={styles.meta}>
          {totalTime > 0 && (
            <Text style={styles.metaText}>{totalTime}m</Text>
          )}
          {recipe.tags[0] && (
            <View style={[styles.tag, { backgroundColor: palette.bg2 }]}>
              <Text style={styles.tagText}>{recipe.tags[0]}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    overflow: 'visible',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    flex: 1,
  },
  imageWrap: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  stickerWrap: {
    position: 'absolute',
    bottom: -14,
    left: 10,
  },
  info: {
    padding: 12,
    paddingTop: 20,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 6,
    lineHeight: 19,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft },
});
