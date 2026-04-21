export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  group: string | null;
}

export interface Instruction {
  step: number;
  text: string;
  tip: string | null;
  image_url: string | null;
}

export interface Recipe {
  id: string;
  cookbook_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_type: 'manual' | 'url_import' | 'screenshot_import' | 'telegram_link' | 'telegram_screenshot';
  cover_image_url: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  tags: string[];
  is_favorite: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type RecipeInsert = Pick<Recipe,
  'title' | 'description' | 'servings' | 'prep_minutes' |
  'cook_minutes' | 'tags' | 'ingredients' | 'instructions' |
  'source_url' | 'source_type' | 'cookbook_id'
>;
