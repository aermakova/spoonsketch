export type PageType =
  | 'cover'
  | 'dedication'
  | 'about'
  | 'chapter_divider'
  | 'recipe'
  | 'blank'
  | 'table_of_contents'
  | 'closing';

export type CookbookTemplateKey =
  | 'classic' | 'photo-hero' | 'minimal' | 'two-column' | 'journal' | 'recipe-card';
export type CookbookFontKey = 'caveat' | 'marck' | 'bad-script' | 'amatic';

export interface Cookbook {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  palette: 'terracotta' | 'sage' | 'blush' | 'cobalt';
  default_template_key: CookbookTemplateKey | null;
  default_recipe_font: CookbookFontKey | null;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CookbookInsert = Pick<Cookbook, 'title' | 'palette'> & {
  description?: string | null;
  default_template_key?: CookbookTemplateKey | null;
  default_recipe_font?: CookbookFontKey | null;
};

export interface BookPage {
  id: string;
  cookbook_id: string;
  page_type: PageType;
  recipe_id: string | null;
  canvas_id: string | null;
  title: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  recipe_title?: string;  // joined from recipes, never written to DB
}

export type BookPageInsert = Pick<BookPage, 'cookbook_id' | 'page_type' | 'position'> & {
  recipe_id?: string | null;
  title?: string | null;
};
