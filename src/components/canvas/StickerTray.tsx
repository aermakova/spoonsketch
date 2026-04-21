import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Sticker } from '../stickers/Sticker';
import { getFreeStickers } from '../../lib/stickerRegistry';

interface Props {
  onAdd: (id: string) => void;
}

export function StickerTray({ onAdd }: Props) {
  const stickers = getFreeStickers();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tray}
    >
      {stickers.map(s => (
        <TouchableOpacity
          key={s.id}
          style={styles.tile}
          onPress={() => onAdd(s.id)}
          activeOpacity={0.65}
        >
          <Sticker kind={s.id} size={46} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tray: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tile: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
