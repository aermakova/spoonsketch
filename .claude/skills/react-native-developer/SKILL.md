---
name: react-native-developer
description: Write and review React Native code for the Spoon & Sketch app — an Expo SDK 54 project using Expo Router v6, TanStack Query v5, Zustand v5, Supabase, and TypeScript strict mode. Use this skill whenever the user mentions React Native, Expo, Expo Router, navigation, screens, mobile app code, Supabase queries, mutations, hooks, components, styling, or anything touching the Spoon & Sketch codebase — even if they don't name the skill. Also use it when reviewing existing code, debugging build errors, or planning new features. The skill enforces stack-specific patterns so generated code actually compiles, types correctly, and follows the conventions of this exact project instead of mixing patterns from older SDKs or alternative stacks.
---

# React Native Developer (Spoon & Sketch)

This skill is a quality gate for the Spoon & Sketch codebase. Spoon & Sketch is a cozy scrapbook cookbook app — millennials decorate recipes and either print at home or order a bound physical copy. The user is a QA Automation Engineer with a frontend background, so code quality, type safety, and predictable patterns matter more to her than clever shortcuts.

The default failure mode without this skill is mixing patterns from older Expo SDKs, older Reanimated versions, or generic "React Native tutorial" style — code that *looks* correct but breaks at build time, throws TypeScript errors, or uses APIs that were renamed/removed.

Read this entire file before writing any code for this project. Then keep it in mind for every code block you produce — not just the first one.

## The exact stack (do not deviate)

```
expo                              ~54.0.33
react-native                      0.81.5
react                             19.2.5
expo-router                       ~6.0.23   ← file-based routing, typed routes
react-native-reanimated           ~4.1.1    ← v4, NEW architecture only
react-native-gesture-handler      ~2.28.0
react-native-screens              ~4.16.0
react-native-safe-area-context    ~5.6.0
react-native-svg                  ^15.12.1
@supabase/supabase-js             ^2.103.3
@tanstack/react-query             ^5.99.0
zustand                           ^5.0.12
@react-native-async-storage/async-storage  2.2.0
expo-secure-store                 ~15.0.8
expo-font + @expo-google-fonts/{caveat,fraunces,nunito}
typescript                        ~5.9.2
```

The user runs `expo start` (managed workflow, not bare CLI). Assume the New Architecture is enabled — Reanimated 4 requires it.

## Hard rules — never violate these

These are the patterns Claude gets wrong most often. Treat them as non-negotiable.

### 1. Imports

- **Navigation:** import from `expo-router`, never from `@react-navigation/native` directly. Use `<Link>`, `useRouter()`, `useLocalSearchParams()`, `useSegments()`, `<Redirect>`, `<Stack>`, `<Tabs>`.
- **Reanimated:** import from `react-native-reanimated`. Do **not** add `react-native-reanimated/plugin` to `babel.config.js` — `babel-preset-expo` handles it automatically in SDK 54. Adding it manually breaks the build.
- **Storage:** use `expo-secure-store` for tokens/credentials, `@react-native-async-storage/async-storage` for non-sensitive cache. Never use `localStorage` (doesn't exist in RN).
- **Supabase auth persistence:** the Supabase client must use AsyncStorage as its `storage` option in RN — not the browser default. See the Supabase pattern below.

### 2. Navigation (Expo Router v6)

- Always navigate with typed hrefs: `<Link href="/(app)/recipe/[id]" params={{ id }} />` or `router.push({ pathname: '/(app)/recipe/[id]', params: { id } })`.
- Read params with `useLocalSearchParams<{ id: string }>()` — not `route.params`, that's old React Navigation.
- Auth guard pattern goes in `(app)/_layout.tsx`:
  ```tsx
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  ```
- Never wrap the app in `<NavigationContainer>` — Expo Router does this for you.

### 3. Data layer (Supabase + TanStack Query + Zustand)

Strict separation of concerns:

- **Server state** → TanStack Query. Anything that lives in Supabase (recipes, cookbooks, user profile, images). Never put server data in Zustand.
- **Client state** → Zustand. UI state that doesn't belong in URL or server: editor draft state, theme, undo/redo stacks, selected sticker, etc.
- **URL state** → Expo Router params. Selected recipe ID, current tab, filter values when shareable.
- **Form state** → local `useState` or react-hook-form. Don't reach for Zustand for one form.

Never call Supabase directly from a component. Always wrap in a query/mutation hook.

```tsx
// ✅ src/features/recipes/hooks/useRecipes.ts
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, cover_image_url, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
```

Mutation pattern with cache invalidation:

```tsx
export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRecipe) => {
      const { data, error } = await supabase
        .from('recipes')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });
}
```

Query keys are arrays. Use a hierarchy: `['recipes']`, `['recipes', id]`, `['recipes', id, 'pages']`. This makes invalidation predictable.

### 4. Supabase client setup (RN-specific)

```tsx
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // required in RN
    },
  }
);
```

Env vars in Expo must be prefixed `EXPO_PUBLIC_` to be available at runtime. Without that prefix they're `undefined` in the bundle.

### 5. TypeScript discipline

- `strict: true` in tsconfig is assumed. No implicit any.
- Always type Supabase responses. Either use generated types (`supabase gen types typescript`) or write explicit row types in `src/types/`.
- Never use `as any` to silence errors. If you're tempted, the type model is wrong — fix the source.
- Component props get an explicit `Props` type or interface. No inline `({ foo, bar }: { foo: string; bar: number })` for anything reused.
- Hooks return inferred types — don't manually annotate return values unless the inference is wrong.

### 6. Styling

- `StyleSheet.create({...})` at the bottom of the file. Don't inline style objects on every render — they break referential equality and hurt FlatList performance.
- For dynamic styles, build them inside `useMemo`.
- Use `react-native-safe-area-context` (`useSafeAreaInsets()`) — never hardcode status bar padding.
- Fonts: load via `useFonts()` from `expo-font` in the root `_layout.tsx`. Show a splash/null until loaded. Available font families in this project: Caveat, Fraunces, Nunito.
- For animations, use Reanimated 4 (`useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`). Don't use the legacy `Animated` API from `react-native`.

### 7. File and folder structure

```
src/
├── app/                  ← Expo Router screens (this is the only `app` dir)
├── components/           ← shared dumb components
├── features/
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       └── types.ts
├── lib/                  ← supabase, query client, etc.
├── stores/               ← Zustand stores
├── theme/                ← colors, spacing, typography tokens
└── types/                ← shared types
```

If the project uses `src/app/` for routes, the Expo config needs `"main": "expo-router/entry"` and the `app.json` must point routes there. If you see `app/` at the root instead of `src/app/`, follow whichever the project already uses — don't restructure.

### 8. Performance defaults that are easy to forget

- Use `FlatList` (or `FlashList` if installed) for any list > ~10 items. Never `.map()` a long array inside a `ScrollView`.
- Provide `keyExtractor` and a stable `key` — never use array index as key.
- Wrap callbacks passed to memoized children in `useCallback`. Wrap expensive derived values in `useMemo`.
- Images: use `expo-image` if added (better caching). Otherwise plain `<Image>` with explicit `width`/`height` to avoid layout shift.

## Common Claude mistakes to actively avoid

| Wrong | Right |
|---|---|
| `import { NavigationContainer } from '@react-navigation/native'` | `expo-router` provides this; don't add it |
| `localStorage.setItem(...)` | `AsyncStorage.setItem(...)` (await it) |
| Adding `react-native-reanimated/plugin` to babel.config.js | Not needed in SDK 54 — handled by `babel-preset-expo` |
| `import { Animated } from 'react-native'` for new code | Use `react-native-reanimated` v4 hooks |
| Calling `supabase.from(...)` inside a component | Wrap in a `useQuery` / `useMutation` hook |
| Putting fetched data in a Zustand store | TanStack Query owns server state |
| `useState<any>(...)` | Type it properly |
| `route.params.id` | `useLocalSearchParams<{ id: string }>().id` |
| `process.env.SUPABASE_URL` | `process.env.EXPO_PUBLIC_SUPABASE_URL` |
| Hardcoding 44 / 24 / 20 for status bar padding | `useSafeAreaInsets()` |

## Workflow when generating code

Follow this order every time, even for small changes:

1. **State the assumption.** One sentence: "Adding a hook to fetch a single recipe by ID, called from `app/(app)/recipe/[id].tsx`."
2. **Identify the layer.** Is this a screen, a hook, a component, a store, a type, a utility? Put it in the right folder.
3. **Write the types first.** Define the shape of inputs and outputs before the implementation.
4. **Write the code.** Match existing project conventions. If you don't know one, ask before guessing.
5. **Show only what changed.** Don't dump the whole file if only a function changed — but show enough surrounding context that the user can drop it in without ambiguity.
6. **Flag follow-ups.** If your code requires a new dependency, an env var, an RLS policy, or a Supabase table change, list those at the end as a checklist.

## When reviewing existing code

Look for, in order:
1. Wrong-stack imports (old React Navigation, legacy `Animated`, browser APIs).
2. Server data leaking into Zustand or local component state.
3. Untyped Supabase responses or `any`.
4. Inline style objects on hot paths.
5. Missing safe area handling.
6. Missing query invalidation after mutations.
7. Race conditions in `useEffect` (set state on unmounted component).

Be direct in feedback — the user prefers honest critique over validation.

## When in doubt, ask

If a request is ambiguous (e.g., "add a recipes screen" — but the project might already have one, or the schema isn't clear), ask one focused question before writing code. Better one clarification than 200 lines of wrong code.