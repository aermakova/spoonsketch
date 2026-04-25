import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { TypeFormValues } from '../import/TypeTab';

interface Props {
  values: TypeFormValues;
  onChange: (next: TypeFormValues) => void;
  importedFromDomain?: string | null;
  onClearImport?: () => void;
  scrollContainerStyle?: object;
}

export function RecipeFormFields({
  values,
  onChange,
  importedFromDomain,
  onClearImport,
  scrollContainerStyle,
}: Props) {
  function update<K extends keyof TypeFormValues>(key: K, value: TypeFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.form, scrollContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {importedFromDomain ? (
        <View style={styles.importBanner}>
          <Feather name="check-circle" size={16} color={colors.sage} />
          <Text style={styles.importBannerText}>
            Imported from {importedFromDomain} — review and save.
          </Text>
          {onClearImport ? (
            <Pressable onPress={onClearImport} hitSlop={10}>
              <Feather name="x" size={16} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Field label="Title *">
        <TextInput
          style={styles.input}
          placeholder="e.g. Grandma's apple pie"
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
          placeholder={'Dice the onion and fry for 5 minutes.\nAdd tomatoes and simmer for 25 minutes.'}
          placeholderTextColor={colors.inkFaint}
          value={values.stepsRaw}
          onChangeText={(v) => update('stepsRaw', v)}
          multiline
          numberOfLines={8}
        />
      </Field>
    </ScrollView>
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
  multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
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
