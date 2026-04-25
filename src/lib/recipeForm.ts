// Pure helpers that bridge the editor form (TypeFormValues — string-shaped)
// and the DB shape (Recipe / RecipeInsert). Used by both the Create flow
// (`src/components/import/TypeTab.tsx`) and the Edit flow
// (`app/recipe/edit/[id].tsx`) so the two surfaces stay in sync.

import type { TypeFormValues } from '../components/import/TypeTab';
import type { Recipe, RecipeInsert, Ingredient, Instruction } from '../types/recipe';

/**
 * Parse the form's string-shaped values into the structured `RecipeInsert`
 * the API layer expects. Used by both create (`createRecipe`) and edit
 * (`updateRecipe`) flows — both APIs accept the same shape (Partial in the
 * edit case is fine since RecipeInsert is assignable).
 *
 * Multi-line fields (ingredients, steps) are flattened to "one per line"
 * text. Structured ingredient data (amount/unit/group) from AI extraction
 * is preserved in `name` as a single string after a save — losing some
 * structure but keeping the visible content intact.
 */
export function valuesToRecipeInput(values: TypeFormValues): RecipeInsert {
  const tags = values.tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const ingredients: Ingredient[] = values.ingredientsRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({
      id: makeId(i),
      name: line,
      amount: '',
      unit: '',
      group: null,
    }));

  const instructions: Instruction[] = values.stepsRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({
      step: i + 1,
      text: line,
      tip: null,
      image_url: null,
    }));

  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    servings: values.servings ? parseInt(values.servings, 10) : null,
    prep_minutes: values.prepMinutes ? parseInt(values.prepMinutes, 10) : null,
    cook_minutes: values.cookMinutes ? parseInt(values.cookMinutes, 10) : null,
    tags,
    ingredients,
    instructions,
    source_url: values.sourceUrl,
    source_type: values.sourceType,
    cookbook_id: null,
  };
}

/**
 * Hydrate the form from a stored Recipe (DB shape) — inverse of
 * valuesToRecipeInput. Used by the edit screen to pre-fill the form
 * with the user's existing recipe data.
 *
 * Structured ingredients (amount, unit, name) are joined to "200g flour"
 * style lines so the user sees the existing data clearly. Lossy on save
 * (round-tripping through this + valuesToRecipeInput collapses the
 * structure into `name` only), but acceptable v1 — the visible text is
 * preserved.
 */
export function recipeToFormValues(recipe: Recipe): TypeFormValues {
  return {
    title: recipe.title ?? '',
    description: recipe.description ?? '',
    servings: recipe.servings != null ? String(recipe.servings) : '',
    prepMinutes: recipe.prep_minutes != null ? String(recipe.prep_minutes) : '',
    cookMinutes: recipe.cook_minutes != null ? String(recipe.cook_minutes) : '',
    tagsRaw: (recipe.tags ?? []).join(', '),
    ingredientsRaw: (recipe.ingredients ?? []).map(joinIngredient).join('\n'),
    stepsRaw: (recipe.instructions ?? []).map((i) => i.text).join('\n'),
    sourceUrl: recipe.source_url ?? null,
    sourceType:
      recipe.source_type === 'url_import' || recipe.source_type === 'manual'
        ? recipe.source_type
        : 'manual',
  };
}

function joinIngredient(i: Ingredient): string {
  return [i.amount, i.unit, i.name].filter(Boolean).join(' ').trim();
}

function makeId(seed: number): string {
  return globalThis.crypto?.randomUUID?.() ?? `ing-${seed}-${Math.random().toString(36).slice(2, 7)}`;
}
