// Pack preview card for the Stash page.
//
// Renders 2x2 thumbs of representative stickers in the pack, the pack name,
// and a "{count} stickers · {Free|Premium}" footer. Locked packs (premium for
// free users) show a 🔒 badge and dim the thumbs.
//
// Tap behavior is owned by the parent — this component is presentational.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Sticker } from '../stickers/Sticker';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { PackMetadata } from '../../lib/stickerRegistry';

interface Props {
  pack: PackMetadata;
  locked: boolean;
  onPress: () => void;
}

export function PackCard({ pack, locked, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name}>{pack.name}</Text>
        {locked ? (
          <View style={styles.lockBadge}>
            <Feather name="lock" size={11} color={colors.terracotta} />
          </View>
        ) : null}
      </View>

      <View style={[styles.thumbs, locked && styles.thumbsLocked]}>
        {pack.previewIds.slice(0, 4).map((id, i) => (
          <View key={id + i} style={styles.thumbCell}>
            <Sticker kind={id} size={36} />
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        {pack.stickerCount} stickers · <Text style={styles.footerEmph}>{pack.isPremium ? 'Premium' : 'Free'}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 168,
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flex: 1,
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.paperSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbsLocked: {
    opacity: 0.55,
  },
  thumbCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
  },
  footerEmph: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
});
