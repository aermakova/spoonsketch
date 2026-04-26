// Pack detail — grid of all stickers in one pack with preview-on-tap.
//
// Tapping a sticker opens a bottom sheet showing the sticker large + a
// "Use in a recipe →" CTA that opens the recipe picker. Picking a recipe
// navigates to the editor with `?dropSticker=<key>`; the editor reads the
// param on mount and drops the sticker centred on the canvas.
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Sticker } from '../stickers/Sticker';
import { ClayButton } from '../ui/ClayButton';
import {
  getPackMetadata,
  getStickersByPack,
} from '../../lib/stickerRegistry';
import { fetchRecipes } from '../../api/recipes';
import { useUserTier } from '../../hooks/useUserTier';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface Props {
  packId: string;
}

export function PackDetailScreen({ packId }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tier = useUserTier();
  const meta = getPackMetadata(packId);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Premium gate — if a free user lands here via deep link, kick to upgrade.
  if (meta?.isPremium && tier !== 'premium') {
    router.replace('/upgrade');
    return null;
  }

  if (!meta) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Pack not found.</Text>
      </View>
    );
  }

  const stickers = getStickersByPack(packId);

  const handleUseInRecipe = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const handleRecipePicked = useCallback((recipeId: string) => {
    if (!previewKey) return;
    setPickerOpen(false);
    setPreviewKey(null);
    router.push(`/editor/${recipeId}?dropSticker=${encodeURIComponent(previewKey)}` as never);
  }, [previewKey, router]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{meta.name}</Text>
          <Text style={styles.tag}>
            {meta.stickerCount} stickers · {meta.isPremium ? 'Premium' : 'Free'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{meta.description}</Text>

      {stickers.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="image" size={32} color={colors.inkFaint} />
          <Text style={styles.emptyTitle}>Coming soon</Text>
          <Text style={styles.emptyBody}>
            This pack will appear here once the stickers are added to the app.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {stickers.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => setPreviewKey(s.id)}
            >
              <Sticker kind={s.id} size={64} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Sticker preview sheet */}
      <Modal
        visible={previewKey !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewKey(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPreviewKey(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            {previewKey && (
              <>
                <View style={styles.previewArea}>
                  <Sticker kind={previewKey} size={140} />
                </View>
                <Text style={styles.previewName}>
                  {stickers.find((s) => s.id === previewKey)?.label ?? previewKey}
                </Text>
                <ClayButton
                  label="Use in a recipe →"
                  variant="primary"
                  size="lg"
                  onPress={handleUseInRecipe}
                  style={styles.previewCta}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Recipe picker sheet */}
      <RecipePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleRecipePicked}
      />
    </View>
  );
}

function RecipePickerSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (recipeId: string) => void;
}) {
  const { data: recipes = [], isLoading, error } = useQuery({
    queryKey: ['recipes-stash-picker'],
    queryFn: fetchRecipes,
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, styles.pickerSheet]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.pickerTitle}>Pick a recipe</Text>
          <Text style={styles.pickerSubtitle}>
            We'll open the editor and drop this sticker on the page.
          </Text>

          {isLoading ? (
            <Text style={styles.pickerEmpty}>Loading…</Text>
          ) : error ? (
            <Text style={styles.pickerEmpty}>Couldn't load recipes.</Text>
          ) : recipes.length === 0 ? (
            <View style={styles.pickerEmptyWrap}>
              <Text style={styles.pickerEmpty}>You don't have any recipes yet.</Text>
              <Text style={styles.pickerEmptyHint}>Add one from the + tab first.</Text>
            </View>
          ) : (
            <ScrollView style={styles.pickerList}>
              {recipes.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => onPick(r.id)}
                  style={({ pressed }) => [styles.recipeRow, pressed && styles.recipeRowPressed]}
                >
                  <Text style={styles.recipeRowTitle} numberOfLines={1}>
                    {r.title || 'Untitled'}
                  </Text>
                  <Feather name="chevron-right" size={18} color={colors.inkFaint} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginVertical: 12,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 32,
  },
  tile: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.paper,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tilePressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: colors.paperSoft,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.inkSoft,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  // bottom sheets
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(59,42,31,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 16,
  },
  previewArea: {
    width: 200,
    height: 200,
    backgroundColor: colors.paperSoft,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewName: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 18,
  },
  previewCta: {
    width: '100%',
  },
  pickerSheet: {
    alignItems: 'stretch',
    minHeight: 360,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 18,
  },
  pickerList: { flex: 1 },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.paper,
    borderRadius: 12,
    marginBottom: 8,
  },
  recipeRowPressed: { backgroundColor: colors.paperSoft },
  recipeRowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  pickerEmptyWrap: { padding: 24, alignItems: 'center' },
  pickerEmpty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  pickerEmptyHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 4,
  },
});
