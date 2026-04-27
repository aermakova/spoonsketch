// Cook Mode — full-screen, big-text, screen-on view of one recipe.
//
// Activates `expo-keep-awake` so the device doesn't dim during a long bake.
// Single step at a time; tap "Done · next step →" to advance. The last step
// flips the button to "Finished! 🎉" → close to detail.
//
// Closing mid-cook (✕ tap or hardware back) prompts a confirm so the user
// doesn't lose their place by accident. Background/foreground transitions
// preserve currentStep silently (in-process state — no persistence needed).
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useQuery } from '@tanstack/react-query';
import { fetchRecipe } from '../../api/recipes';
import { fetchCookbook } from '../../api/cookbooks';
import { ClayButton } from '../ui/ClayButton';
import { useThemeStore } from '../../lib/store';
import {
  DEFAULT_SECTION_TITLES,
  type CookbookSectionTitles,
} from '../../types/cookbook';
import type { Ingredient, Instruction, Recipe } from '../../types/recipe';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface Props {
  recipeId: string;
}

export function CookModeScreen({ recipeId }: Props) {
  // Keep the screen awake the entire time the cook screen is mounted.
  // expo-keep-awake auto-releases on unmount.
  useKeepAwake();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useThemeStore();
  const { height } = useWindowDimensions();
  const [stepIdx, setStepIdx] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipe(recipeId),
    enabled: !!recipeId,
  });

  const { data: cookbook } = useQuery({
    queryKey: ['cookbook', recipe?.cookbook_id],
    queryFn: () => fetchCookbook(recipe!.cookbook_id!),
    enabled: !!recipe?.cookbook_id,
  });

  const sectionTitles: CookbookSectionTitles =
    cookbook?.section_titles ?? DEFAULT_SECTION_TITLES;
  const ingredientsTitle =
    sectionTitles.ingredients.trim() || DEFAULT_SECTION_TITLES.ingredients;

  const close = useCallback(
    (skipConfirm = false) => {
      if (skipConfirm || !recipe || stepIdx === 0) {
        router.back();
        return;
      }
      const totalSteps = (recipe.instructions as Instruction[]).length;
      // No need to confirm on the very last "Finished" tap (we route via finish()).
      if (stepIdx >= totalSteps - 1) {
        router.back();
        return;
      }
      Alert.alert(
        'Stop cooking?',
        "You're partway through. Your place won't be saved.",
        [
          { text: 'Keep cooking', style: 'cancel' },
          { text: 'Stop', style: 'destructive', onPress: () => router.back() },
        ],
      );
    },
    [recipe, stepIdx, router],
  );

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Couldn't load this recipe.</Text>
        <Pressable onPress={() => close(true)} hitSlop={12}>
          <Text style={[styles.errorLink, { color: palette.accent }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const steps = recipe.instructions as Instruction[];

  if (steps.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>This recipe has no steps yet.</Text>
        <Pressable onPress={() => close(true)} hitSlop={12}>
          <Text style={[styles.errorLink, { color: palette.accent }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const total = steps.length;
  const isLast = stepIdx >= total - 1;
  const currentStep = steps[stepIdx];

  const advance = () => {
    if (isLast) {
      close(true);
      return;
    }
    setStepIdx((s) => Math.min(s + 1, total - 1));
  };

  const back = () => setStepIdx((s) => Math.max(0, s - 1));

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => close()} hitSlop={12} style={styles.closeBtn}>
          <Feather name="x" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.counter}>
          Step <Text style={[styles.counterEmph, { color: palette.accent }]}>{stepIdx + 1}</Text> / {total}
        </Text>
        <View style={styles.closeBtn} />
      </View>

      {/* Recipe title — small reminder */}
      <Text style={styles.recipeTitle} numberOfLines={1}>
        {recipe.title}
      </Text>

      {/* Step body */}
      <ScrollView
        contentContainerStyle={[styles.bodyScroll, { minHeight: height * 0.45 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepText}>{currentStep.text}</Text>
        {currentStep.tip && (
          <View style={[styles.tipBox, { borderColor: palette.accent }]}>
            <Text style={[styles.tipLabel, { color: palette.accent }]}>Tip</Text>
            <Text style={styles.tipText}>{currentStep.tip}</Text>
          </View>
        )}
      </ScrollView>

      {/* Ingredients drawer toggle (collapsed by default — eyes-on-dish UX) */}
      <Pressable
        style={[styles.ingHeader, { borderColor: colors.line }]}
        onPress={() => setIngredientsOpen((v) => !v)}
      >
        <Text style={styles.ingHeaderText}>{ingredientsTitle}</Text>
        <Feather
          name={ingredientsOpen ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={colors.inkSoft}
        />
      </Pressable>
      {ingredientsOpen && (
        <ScrollView style={styles.ingList} contentContainerStyle={styles.ingListContent}>
          {(recipe.ingredients as Ingredient[]).map((ing, i) => (
            <View key={ing.id ?? `${i}`} style={styles.ingRow}>
              <View style={[styles.ingBullet, { backgroundColor: palette.accent }]} />
              <Text style={styles.ingText}>
                {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {stepIdx > 0 && (
          <Pressable onPress={back} hitSlop={10} style={styles.backStep}>
            <Feather name="chevron-left" size={20} color={colors.inkSoft} />
            <Text style={styles.backStepText}>Previous</Text>
          </Pressable>
        )}
        <ClayButton
          label={isLast ? 'Finished! 🎉' : 'Done · next step →'}
          variant="primary"
          size="lg"
          onPress={advance}
          style={styles.advanceBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.bg,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  errorLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.inkSoft,
    letterSpacing: 0.4,
  },
  counterEmph: {
    fontSize: 18,
  },
  recipeTitle: {
    fontFamily: fonts.handBold,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  bodyScroll: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  stepText: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 38,
    color: colors.ink,
  },
  tipBox: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    backgroundColor: colors.paper,
  },
  tipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  ingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  ingHeaderText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.inkSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ingList: {
    maxHeight: 180,
  },
  ingListContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  ingBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  backStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backStepText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  advanceBtn: {
    width: '100%',
  },
});
