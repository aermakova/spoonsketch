// Stash tab — the user's decoration library.
//
// Today: shows the 4 sticker packs (Essentials free, 3 premium) with locks
// for free-tier users + placeholder cards for "Your favorites" and "Your
// photos" (Phase 8.5B/C will populate those).
//
// Tap a free pack → /stash/pack/<id>. Tap a locked pack → upgrade modal.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PACK_METADATA } from '../../lib/stickerRegistry';
import { useUserTier } from '../../hooks/useUserTier';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { PackCard } from './PackCard';

export function StashScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tier = useUserTier();

  const handlePackPress = (packId: string, isPremium: boolean) => {
    if (isPremium && tier !== 'premium') {
      router.push('/upgrade');
    } else {
      router.push(`/stash/pack/${packId}` as never);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <Text style={styles.title}>Your stash</Text>
        <Text style={styles.subtitle}>
          Stickers, photos, and the things you come back to.
        </Text>
      </View>

      <Section title="Sticker packs">
        <View style={styles.packGrid}>
          {PACK_METADATA.map((pack, i) => {
            const locked = pack.isPremium && tier !== 'premium';
            // Two-column grid: pair items into rows so each row is a flex pair.
            // (Could use FlatList numColumns but simpler to render manually.)
            return (
              <View key={pack.id} style={styles.packCell}>
                <PackCard
                  pack={pack}
                  locked={locked}
                  onPress={() => handlePackPress(pack.id, pack.isPremium)}
                />
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Your favorites">
        <PlaceholderCard
          icon="heart"
          text="Heart a sticker in the editor to save it here."
        />
      </Section>

      <Section title="Your photos">
        <PlaceholderCard
          icon="camera"
          text="Photos you upload to a recipe land here. Coming with the next update."
        />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PlaceholderCard({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.placeholder}>
      <Feather name={icon} size={20} color={colors.inkFaint} />
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerArea: {
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.handBold,
    fontSize: 32,
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 12,
  },
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  packCell: {
    // 2 columns with the gap accounted for.
    width: '48%',
    flexGrow: 1,
  },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paperSoft,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  placeholderText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
});
