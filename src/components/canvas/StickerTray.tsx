import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Sticker } from '../stickers/Sticker';
import { PACK_METADATA, getStickersByPack } from '../../lib/stickerRegistry';
import { useUserTier } from '../../hooks/useUserTier';

interface Props {
  onAdd: (id: string) => void;
}

export function StickerTray({ onAdd }: Props) {
  const router = useRouter();
  const tier = useUserTier();
  const [activePackId, setActivePackId] = useState<string>('core');

  const stickers = getStickersByPack(activePackId);
  const activePack = PACK_METADATA.find((p) => p.id === activePackId);

  const handlePackTap = (packId: string, isPremium: boolean) => {
    if (isPremium && tier !== 'premium') {
      router.push('/upgrade');
      return;
    }
    setActivePackId(packId);
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {PACK_METADATA.map((pack) => {
          const locked = pack.isPremium && tier !== 'premium';
          const active = activePackId === pack.id;
          return (
            <TouchableOpacity
              key={pack.id}
              onPress={() => handlePackTap(pack.id, pack.isPremium)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {pack.name}
              </Text>
              {locked ? (
                <Feather name="lock" size={11} color="rgba(250,244,230,0.7)" style={styles.tabLock} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tray}
      >
        {stickers.length === 0 ? (
          <View style={styles.emptyTray}>
            <Text style={styles.emptyTrayText}>
              {activePack?.name ?? 'Pack'} stickers are coming soon.
            </Text>
          </View>
        ) : (
          stickers.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.tile}
              onPress={() => onAdd(s.id)}
              activeOpacity={0.65}
            >
              <Sticker kind={s.id} size={46} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tabLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgba(250,244,230,0.65)',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#faf4e6',
  },
  tabLock: {
    marginLeft: 1,
  },
  tray: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    minHeight: 78,
  },
  tile: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTray: {
    flex: 1,
    minWidth: 280,
    paddingHorizontal: 24,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTrayText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: 'rgba(250,244,230,0.55)',
    textAlign: 'center',
  },
});
