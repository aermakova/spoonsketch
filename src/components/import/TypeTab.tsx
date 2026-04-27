import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { createRecipe } from '../../api/recipes';
import { track, type AnalyticsEventMap } from '../../lib/analytics';
import { ClayButton } from '../ui/ClayButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Recipe, RecipeInsert } from '../../types/recipe';

// Map the database source_type → the bucket used for analytics. Keep the
// analytics enum compact (5 buckets) — the DB enum has fine-grained values
// for legacy + provenance, but the funnel only cares about origin shape.
type AnalyticsSource = AnalyticsEventMap['recipe_created']['source'];

function analyticsSource(dbType: Recipe['source_type']): AnalyticsSource {
  switch (dbType) {
    case 'url_import': return 'url_import';
    case 'screenshot_import': return 'photo';
    case 'pdf_import':
    case 'text_import': return 'pdf';
    case 'json_import': return 'json';
    case 'telegram_link':
    case 'telegram_screenshot': return 'telegram';
    case 'manual':
    default: return 'manual';
  }
}

export interface TypeFormValues {
  title: string;
  description: string;
  servings: string;
  prepMinutes: string;
  cookMinutes: string;
  tagsRaw: string;
  ingredientsRaw: string;
  stepsRaw: string;
  sourceUrl: string | null;
  sourceType: 'manual' | 'url_import';
}

export const EMPTY_TYPE_FORM: TypeFormValues = {
  title: '',
  description: '',
  servings: '',
  prepMinutes: '',
  cookMinutes: '',
  tagsRaw: '',
  ingredientsRaw: '',
  stepsRaw: '',
  sourceUrl: null,
  sourceType: 'manual',
};

interface Props {
  values: TypeFormValues;
  onChange: (next: TypeFormValues) => void;
  importedFromDomain: string | null;
  onClearImport: () => void;
  onClose: () => void;
}

export function TypeTab({
  values,
  onChange,
  importedFromDomain,
  onClearImport,
  onClose,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: (recipe: Recipe) => {
      track('recipe_created', { source: analyticsSource(recipe.source_type) });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
      router.replace(`/recipe/${recipe.id}`);
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : 'Save failed';
      Alert.alert('Error', message);
    },
  });

  const canSave = values.title.trim().length > 0 && !mutation.isPending;

  function update<K extends keyof TypeFormValues>(
    key: K,
    value: TypeFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function handleSave() {
    if (!values.title.trim()) {
      Alert.alert('Title required', 'Please give your recipe a name.');
      return;
    }

    const tags = values.tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const ingredients = values.ingredientsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => ({
        id: String(i),
        name: line,
        amount: '',
        unit: '',
        group: null,
      }));
    const instructions = values.stepsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => ({
        step: i + 1,
        text: line,
        tip: null,
        image_url: null,
      }));

    const input: RecipeInsert = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      servings: values.servings ? parseInt(values.servings, 10) : null,
      prep_minutes: values.prepMinutes
        ? parseInt(values.prepMinutes, 10)
        : null,
      cook_minutes: values.cookMinutes
        ? parseInt(values.cookMinutes, 10)
        : null,
      tags,
      ingredients,
      instructions,
      source_url: values.sourceUrl,
      source_type: values.sourceType,
      cookbook_id: null,
    };
    mutation.mutate(input);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
    >
      {importedFromDomain ? (
        <View style={styles.importBanner}>
          <Feather name="check-circle" size={16} color={colors.sage} />
          <Text style={styles.importBannerText}>
            Imported from {importedFromDomain} — review and save.
          </Text>
          <Pressable onPress={onClearImport} hitSlop={10}>
            <Feather name="x" size={16} color={colors.inkSoft} />
          </Pressable>
        </View>
      ) : null}

      <Field label="Title *">
        <TextInput
          style={styles.input}
          placeholder="e.g. Grandma’s apple pie"
          placeholderTextColor={colors.inkFaint}
          value={values.title}
          onChangeText={(v) => update('title', v)}
        />
      </Field>

      <Field label="Description">
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="A short note about this recipe…"
          placeholderTextColor={colors.inkFaint}
          value={values.description}
          onChangeText={(v) => update('description', v)}
          multiline
          numberOfLines={3}
        />
      </Field>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Field label="Servings">
            <TextInput
              style={styles.input}
              placeholder="4"
              placeholderTextColor={colors.inkFaint}
              value={values.servings}
              onChangeText={(v) => update('servings', v)}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Prep (min)">
            <TextInput
              style={styles.input}
              placeholder="15"
              placeholderTextColor={colors.inkFaint}
              value={values.prepMinutes}
              onChangeText={(v) => update('prepMinutes', v)}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Cook (min)">
            <TextInput
              style={styles.input}
              placeholder="30"
              placeholderTextColor={colors.inkFaint}
              value={values.cookMinutes}
              onChangeText={(v) => update('cookMinutes', v)}
              keyboardType="number-pad"
            />
          </Field>
        </View>
      </View>

      <Field label="Tags (comma separated)">
        <TextInput
          style={styles.input}
          placeholder="soup, vegetarian, quick"
          placeholderTextColor={colors.inkFaint}
          value={values.tagsRaw}
          onChangeText={(v) => update('tagsRaw', v)}
          autoCapitalize="none"
        />
      </Field>

      <Field label="Ingredients (one per line)">
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder={'800g tomatoes\n1 large onion\n2 tbsp olive oil'}
          placeholderTextColor={colors.inkFaint}
          value={values.ingredientsRaw}
          onChangeText={(v) => update('ingredientsRaw', v)}
          multiline
          numberOfLines={6}
        />
      </Field>

      <Field label="Instructions (one step per line)">
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder={
            'Dice the onion and fry for 5 minutes.\nAdd tomatoes and simmer for 25 minutes.'
          }
          placeholderTextColor={colors.inkFaint}
          value={values.stepsRaw}
          onChangeText={(v) => update('stepsRaw', v)}
          multiline
          numberOfLines={8}
        />
      </Field>

      <View style={{ height: 12 }} />
      <ClayButton
        label="Save recipe"
        size="lg"
        loading={mutation.isPending}
        disabled={!canSave}
        onPress={handleSave}
      />
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * Converts an extracted recipe from the /extract-recipe Edge Function into
 * the string-shaped values this form renders.
 */
export function typeFormFromExtracted(
  values: {
    title?: string | null;
    description?: string | null;
    servings?: number | null;
    prep_minutes?: number | null;
    cook_minutes?: number | null;
    tags?: string[];
    ingredients?: Array<{
      name: string;
      amount?: string | null;
      unit?: string | null;
    }>;
    instructions?: Array<{ text: string }>;
    source_url?: string | null;
  },
): TypeFormValues {
  return {
    title: values.title ?? '',
    description: values.description ?? '',
    servings: values.servings != null ? String(values.servings) : '',
    prepMinutes: values.prep_minutes != null ? String(values.prep_minutes) : '',
    cookMinutes: values.cook_minutes != null ? String(values.cook_minutes) : '',
    tagsRaw: (values.tags ?? []).join(', '),
    ingredientsRaw: (values.ingredients ?? [])
      .map((i) => joinIngredient(i))
      .join('\n'),
    stepsRaw: (values.instructions ?? []).map((i) => i.text).join('\n'),
    sourceUrl: values.source_url ?? null,
    sourceType: values.source_url ? 'url_import' : 'manual',
  };
}

function joinIngredient(i: {
  name: string;
  amount?: string | null;
  unit?: string | null;
}): string {
  return [i.amount, i.unit, i.name].filter(Boolean).join(' ').trim();
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: 20, paddingBottom: 60, gap: 4 },
  field: { marginBottom: 16 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  importBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.paperSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.sage,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  importBannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
});
