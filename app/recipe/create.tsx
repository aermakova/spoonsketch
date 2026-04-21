import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecipe } from '../../src/api/recipes';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { PaperGrain } from '../../src/components/ui/PaperGrain';
import { useThemeStore } from '../../src/lib/store';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

export default function CreateRecipeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useThemeStore();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [ingredientsRaw, setIngredientsRaw] = useState('');
  const [stepsRaw, setStepsRaw] = useState('');

  const mutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      router.replace(`/recipe/${recipe.id}`);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please give your recipe a name.');
      return;
    }

    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const ingredients = ingredientsRaw
      .split('\n')
      .filter(Boolean)
      .map((line, i) => ({ id: String(i), name: line.trim(), amount: '', unit: '', group: null }));
    const instructions = stepsRaw
      .split('\n')
      .filter(Boolean)
      .map((line, i) => ({ step: i + 1, text: line.trim(), tip: null, image_url: null }));

    mutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      servings: servings ? parseInt(servings) : null,
      prep_minutes: prepMinutes ? parseInt(prepMinutes) : null,
      cook_minutes: cookMinutes ? parseInt(cookMinutes) : null,
      tags,
      ingredients,
      instructions,
      source_url: null,
      source_type: 'manual',
      cookbook_id: null,
    });
  }

  return (
    <PaperGrain style={{ ...styles.root, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Text style={[styles.cancel, { color: palette.accent }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>New recipe</Text>
          <ClayButton
            label={mutation.isPending ? '…' : 'Save'}
            size="sm"
            onPress={handleSave}
            disabled={mutation.isPending || !title.trim()}
          />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="Title *">
            <TextInput
              style={styles.input}
              placeholder="e.g. Grandma's apple pie"
              placeholderTextColor={colors.inkFaint}
              value={title}
              onChangeText={setTitle}
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="A short note about this recipe…"
              placeholderTextColor={colors.inkFaint}
              value={description}
              onChangeText={setDescription}
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
                  value={servings}
                  onChangeText={setServings}
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
                  value={prepMinutes}
                  onChangeText={setPrepMinutes}
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
                  value={cookMinutes}
                  onChangeText={setCookMinutes}
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
              value={tagsRaw}
              onChangeText={setTagsRaw}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Ingredients (one per line)">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={'800g tomatoes\n1 large onion\n2 tbsp olive oil'}
              placeholderTextColor={colors.inkFaint}
              value={ingredientsRaw}
              onChangeText={setIngredientsRaw}
              multiline
              numberOfLines={6}
            />
          </Field>

          <Field label="Instructions (one step per line)">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={'Dice the onion and fry for 5 minutes.\nAdd tomatoes and simmer for 25 minutes.'}
              placeholderTextColor={colors.inkFaint}
              value={stepsRaw}
              onChangeText={setStepsRaw}
              multiline
              numberOfLines={8}
            />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </PaperGrain>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cancel: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  topTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  form: { padding: 20, paddingBottom: 80, gap: 4 },
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
});
