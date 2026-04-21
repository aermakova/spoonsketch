import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  FlatList, Pressable, TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { PageType } from '../../types/cookbook';
import type { Recipe } from '../../types/recipe';

interface PageTypeOption {
  type: PageType;
  icon: string;
  label: string;
  description: string;
}

const PAGE_OPTIONS: PageTypeOption[] = [
  { type: 'recipe',            icon: '🍳', label: 'Recipe',            description: 'Add a recipe from your collection' },
  { type: 'cover',             icon: '📕', label: 'Cover',             description: 'Title page with cookbook name' },
  { type: 'dedication',        icon: '💌', label: 'Dedication',        description: 'A personal note to the recipient' },
  { type: 'table_of_contents', icon: '📋', label: 'Table of Contents', description: 'Auto-generated from recipe pages' },
  { type: 'about',             icon: '✍️', label: 'About / Intro',     description: 'Your story behind this cookbook' },
  { type: 'chapter_divider',   icon: '🔖', label: 'Chapter Divider',   description: 'Separate sections visually' },
  { type: 'blank',             icon: '📄', label: 'Blank Page',        description: 'Free canvas for notes or photos' },
  { type: 'closing',           icon: '🎀', label: 'Closing',           description: 'A final message or sign-off' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: PageType, recipeId?: string) => void;
  recipes: Recipe[];
  existingPageTypes: PageType[];
}

export function PageTypePicker({ visible, onClose, onSelect, recipes, existingPageTypes }: Props) {
  const translateY = useRef(new Animated.Value(500)).current;
  const [mounted, setMounted] = useState(false);
  const [pickingRecipe, setPickingRecipe] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPickingRecipe(false);
      setRecipeSearch('');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: 500,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  const hasOne = (type: PageType) => existingPageTypes.includes(type);
  const isDisabled = (type: PageType) =>
    (type === 'cover' || type === 'table_of_contents') && hasOne(type);

  const handleOptionPress = (type: PageType) => {
    if (isDisabled(type)) return;
    if (type === 'recipe') {
      setPickingRecipe(true);
    } else {
      onSelect(type);
    }
  };

  const filteredRecipes = recipeSearch
    ? recipes.filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
    : recipes;

  if (!mounted) return null;

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        {pickingRecipe ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setPickingRecipe(false)} style={styles.backBtn}>
                <Text style={styles.backText}>‹ Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Choose Recipe</Text>
              <View style={{ width: 60 }} />
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes…"
              placeholderTextColor={colors.inkFaint}
              value={recipeSearch}
              onChangeText={setRecipeSearch}
              autoFocus
            />

            <FlatList
              data={filteredRecipes}
              keyExtractor={r => r.id}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recipeRow}
                  onPress={() => onSelect('recipe', item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recipeTitle}>{item.title}</Text>
                  {item.tags?.length > 0 && (
                    <Text style={styles.recipeTags}>{item.tags.slice(0, 3).join(' · ')}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No recipes found</Text>
              }
            />
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Add Page</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={PAGE_OPTIONS}
              keyExtractor={o => o.type}
              style={styles.list}
              renderItem={({ item }) => {
                const disabled = isDisabled(item.type);
                return (
                  <TouchableOpacity
                    style={[styles.option, disabled && styles.optionDisabled]}
                    onPress={() => handleOptionPress(item.type)}
                    activeOpacity={disabled ? 1 : 0.7}
                  >
                    <Text style={styles.optionIcon}>{item.icon}</Text>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, disabled && styles.labelDisabled]}>
                        {item.label}
                        {disabled ? '  ✓ Added' : ''}
                      </Text>
                      <Text style={styles.optionDesc}>{item.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 460,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    zIndex: 100,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginTop: 8, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.ink,
  },
  closeBtn: {
    fontSize: 16,
    color: colors.inkFaint,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.terracotta,
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    gap: 12,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 1,
  },
  labelDisabled: {
    color: colors.inkFaint,
  },
  optionDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bg,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  recipeRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  recipeTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  recipeTags: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 32,
  },
});
