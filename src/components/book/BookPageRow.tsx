import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { BookPage, PageType } from '../../types/cookbook';

const PAGE_ICONS: Record<PageType, string> = {
  cover: '📕',
  dedication: '💌',
  about: '✍️',
  chapter_divider: '🔖',
  recipe: '🍳',
  blank: '📄',
  table_of_contents: '📋',
  closing: '🎀',
};

const PAGE_LABELS: Record<PageType, string> = {
  cover: 'Cover',
  dedication: 'Dedication',
  about: 'About / Intro',
  chapter_divider: 'Chapter Divider',
  recipe: 'Recipe',
  blank: 'Blank Page',
  table_of_contents: 'Table of Contents',
  closing: 'Closing',
};

interface Props {
  page: BookPage;
  isActive: boolean;
  drag: () => void;
  onDelete: () => void;
  onPress: () => void;
}

export function BookPageRow({ page, isActive, drag, onDelete, onPress }: Props) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isActive ? 1.03 : 1, { damping: 14, stiffness: 200 }) }],
    shadowOpacity: withSpring(isActive ? 0.2 : 0.06, { damping: 14 }),
    zIndex: isActive ? 10 : 0,
    elevation: isActive ? 8 : 1,
  }));

  const label = page.page_type === 'recipe'
    ? (page.recipe_title ?? 'Recipe')
    : (page.title ?? PAGE_LABELS[page.page_type]);

  return (
    <Animated.View style={[styles.row, animStyle]}>
      {/* Drag handle */}
      <TouchableOpacity
        style={styles.handle}
        onLongPress={drag}
        delayLongPress={150}
        activeOpacity={0.6}
      >
        <Text style={styles.handleIcon}>≡</Text>
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.icon}>{PAGE_ICONS[page.page_type]}</Text>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>{label}</Text>
          <Text style={styles.type}>{PAGE_LABELS[page.page_type]}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteIcon}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    overflow: 'hidden',
  },
  handle: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleIcon: {
    fontSize: 18,
    color: colors.inkFaint,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  icon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 1,
  },
  type: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  chevron: {
    fontSize: 20,
    color: colors.inkFaint,
    paddingRight: 4,
  },
  deleteBtn: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 20,
    color: colors.rose,
  },
});
