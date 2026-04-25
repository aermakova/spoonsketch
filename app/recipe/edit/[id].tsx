import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRecipe, fetchRecipe, updateRecipe } from '../../../src/api/recipes';
import { ClayButton } from '../../../src/components/ui/ClayButton';
import { withErrorBoundary } from '../../../src/components/ui/ErrorBoundary';
import { RecipeFormFields } from '../../../src/components/recipe/RecipeFormFields';
import { TouchableOpacity } from 'react-native';
import {
  EMPTY_TYPE_FORM,
  type TypeFormValues,
} from '../../../src/components/import/TypeTab';
import { recipeToFormValues, valuesToRecipeInput } from '../../../src/lib/recipeForm';
import { colors } from '../../../src/theme/colors';
import { fonts } from '../../../src/theme/fonts';

function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [values, setValues] = useState<TypeFormValues>(EMPTY_TYPE_FORM);
  const [hydrated, setHydrated] = useState(false);

  const recipeQuery = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => fetchRecipe(id),
    enabled: !!id,
  });

  // Hydrate the form once the recipe loads. Don't re-hydrate on subsequent
  // refetches — would clobber unsaved edits.
  useEffect(() => {
    if (!hydrated && recipeQuery.data) {
      setValues(recipeToFormValues(recipeQuery.data));
      setHydrated(true);
    }
  }, [hydrated, recipeQuery.data]);

  const mutation = useMutation({
    mutationFn: () => updateRecipe(id, valuesToRecipeInput(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', id] });
      router.back();
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : 'Save failed';
      Alert.alert('Error', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.removeQueries({ queryKey: ['recipe', id] });
      // Detail screen is gone — pop both edit AND detail off the stack.
      // Falls back to library if there's nowhere to dismiss to.
      if (router.canGoBack()) router.back();
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : 'Delete failed';
      Alert.alert('Error', message);
    },
  });

  function confirmDelete() {
    Alert.alert(
      'Delete this recipe?',
      "This can't be undone. Anything you've decorated will also be lost.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }

  const busy = mutation.isPending || deleteMutation.isPending;
  const canSave = values.title.trim().length > 0 && !busy && hydrated;

  if (recipeQuery.isLoading || !hydrated) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator color={colors.terracotta} />
      </View>
    );
  }
  if (recipeQuery.error || !recipeQuery.data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.errorText}>Couldn't load recipe.</Text>
        <ClayButton label="Go back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Text style={[styles.navBackText, { color: colors.terracotta }]}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Edit recipe</Text>
        <View style={styles.navRight} />
      </View>

      <RecipeFormFields values={values} onChange={setValues} />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ClayButton
          label="Save changes"
          size="lg"
          loading={mutation.isPending}
          disabled={!canSave}
          onPress={() => mutation.mutate()}
        />
        <TouchableOpacity
          style={styles.deleteBtn}
          disabled={busy}
          onPress={confirmDelete}
          hitSlop={8}
        >
          <Text style={[styles.deleteText, busy && { opacity: 0.4 }]}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete recipe'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 },
  errorText: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBack: { minWidth: 80 },
  navBackText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  navTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink },
  navRight: { minWidth: 80 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    gap: 10,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: '#c46a4c',
    textDecorationLine: 'underline',
  },
});

export default withErrorBoundary(EditRecipeScreen, 'Edit recipe crashed');
