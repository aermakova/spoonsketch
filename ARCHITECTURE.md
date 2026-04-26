# Spoon & Sketch — Production Mobile Architecture

> Senior architect reference. Every decision here is justified for long-term scale.
> Read alongside PLAN.md (data model) and SCREENS.md (screen specs).

---

## Stack at a glance

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 54 + TypeScript strict | iOS + Android + Web, one codebase. Managed workflow until we hit a native wall. |
| Navigation | Expo Router v6 (file-based) | Deep links, web SSR, typed routes out of the box. No manual linking config. |
| Canvas / Drawing | @shopify/react-native-skia | GPU-accelerated, runs on web via CanvasKit WASM. Only option that handles blend modes + snapshot. |
| Server state | TanStack Query v5 | Caching, background refetch, optimistic updates. Kills 80% of manual loading/error state. |
| Client state | Zustand | Canvas transforms, undo/redo, theme, drawing tools. Tiny, no boilerplate, easy to test. |
| Backend | Supabase | Auth + DB + Storage + Realtime + Edge Functions. No custom server for v1. |
| Secure storage | expo-secure-store | Session tokens. OS keychain-backed. |
| Fast local cache | MMKV | Onboarding flags, last-viewed screen, palette preference. 10× faster than AsyncStorage. |
| Payments | RevenueCat | Handles App Store IAP + Google Play + Stripe web. Do not touch raw IAP. |
| Analytics | PostHog (self-hostable) | Event capture + funnels + session replays. Open source, GDPR-friendly. |
| Error tracking | Sentry | Crash reports + breadcrumbs + source maps. First thing you set up. |
| i18n | i18next + expo-localization | EN + UK. Device language auto-detected. |

---

## 1. Folder Structure

```
spoonsketch/
├── app/                          # Expo Router — screens live here
│   ├── (auth)/                   # Auth group — no tab bar
│   │   ├── onboarding/
│   │   │   ├── index.tsx         # Step 1 splash
│   │   │   ├── gift.tsx          # Step 2
│   │   │   ├── sketch.tsx        # Step 3
│   │   │   ├── import.tsx        # Step 4
│   │   │   ├── intent.tsx        # Step 5
│   │   │   ├── palette.tsx       # Step 6
│   │   │   └── signup.tsx        # Step 7
│   │   └── login.tsx
│   ├── (tabs)/                   # Tab bar group
│   │   ├── index.tsx             # Home
│   │   ├── shelves/
│   │   │   ├── index.tsx         # Collections
│   │   │   └── [id].tsx          # Single collection
│   │   ├── elements.tsx          # My Elements
│   │   └── me/
│   │       ├── index.tsx         # Profile & Settings
│   │       ├── plans.tsx         # Pricing
│   │       └── telegram.tsx      # Telegram connect
│   ├── recipe/
│   │   ├── import.tsx            # Import modal
│   │   ├── create.tsx            # New recipe
│   │   ├── [id]/
│   │   │   ├── index.tsx         # Detail (scrapbook view default)
│   │   │   ├── clean.tsx         # Clean view
│   │   │   └── edit.tsx          # Edit recipe
│   ├── editor/
│   │   ├── [recipeId]/
│   │   │   ├── index.tsx         # Canvas editor
│   │   │   └── templates.tsx     # Template picker
│   ├── book/
│   │   ├── [cookbookId]/
│   │   │   ├── index.tsx         # Book Builder
│   │   │   ├── cover.tsx         # Cover editor
│   │   │   ├── dedication.tsx    # Dedication editor
│   │   │   ├── about.tsx
│   │   │   └── chapter.tsx
│   ├── cook/
│   │   └── [recipeId].tsx        # Cook Mode
│   ├── print/
│   │   └── [cookbookId].tsx      # Print Order
│   ├── export.tsx                # PDF Export
│   └── _layout.tsx               # Root layout (fonts, theme, providers)
│
├── src/
│   ├── api/                      # All server communication
│   │   ├── client.ts             # Supabase client singleton
│   │   ├── recipes.ts            # Recipe CRUD
│   │   ├── cookbooks.ts
│   │   ├── canvases.ts
│   │   ├── books.ts
│   │   ├── print.ts
│   │   ├── ai.ts                 # AI job triggers — extractRecipeFromImages, extractRecipeFromDocument, importRecipesFromJson
│   │   ├── auth.ts               # signIn/signUp + signInWithApple + deleteAccount + exportUserData
│   │   ├── consent.ts            # fetchConsents, setConsent, CURRENT_PP_VERSION  (added 2026-04-25)
│   │   └── storage.ts            # uploadRecipeScreenshot, uploadPdfForExtraction (CSAM-gated)
│   │
│   ├── hooks/                    # React hooks (data + behaviour)
│   │   ├── queries/              # TanStack Query hooks
│   │   │   ├── useRecipes.ts
│   │   │   ├── useRecipesRealtime.ts   # Supabase Realtime subscription on recipes
│   │   │   ├── useCookbook.ts
│   │   │   ├── useCanvas.ts
│   │   │   └── usePrintOrder.ts
│   │   ├── mutations/
│   │   │   ├── useCreateRecipe.ts
│   │   │   ├── useSaveCanvas.ts
│   │   │   └── usePlaceOrder.ts
│   │   ├── useAuth.ts
│   │   ├── useConsents.ts              # consent toggle mutation (added 2026-04-25)
│   │   ├── useExtractFromImages.ts     # multi-image AI extraction (added 2026-04-25)
│   │   ├── useImportRecipesJson.ts     # bulk JSON import (added 2026-04-25)
│   │   ├── useTheme.ts
│   │   ├── useUndo.ts
│   │   └── useAnalytics.ts
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── canvasStore.ts        # Element positions, selection, undo stack
│   │   ├── drawingStore.ts       # Active tool, stroke settings, layers
│   │   ├── themeStore.ts         # Active palette, paper texture intensity
│   │   └── onboardingStore.ts    # Intent, palette choice (pre-auth)
│   │
│   ├── components/
│   │   ├── ui/                   # Primitives — no business logic
│   │   │   ├── ClayButton.tsx
│   │   │   ├── PaperCard.tsx
│   │   │   ├── WashiTape.tsx
│   │   │   ├── StickerView.tsx
│   │   │   ├── TagPill.tsx
│   │   │   └── FoodImagePlaceholder.tsx
│   │   ├── canvas/               # Editor components
│   │   │   ├── CanvasRenderer.tsx
│   │   │   ├── ElementTransformer.tsx
│   │   │   ├── DrawingLayer.tsx
│   │   │   ├── ContextToolbar.tsx
│   │   │   ├── HelpSheet.tsx     # Mode-aware help bottom sheet (added 2026-04-22)
│   │   │   └── BottomToolPanel.tsx
│   │   ├── recipe/
│   │   │   ├── RecipeCard.tsx
│   │   │   ├── IngredientRow.tsx
│   │   │   ├── RecipeFormFields.tsx    # Shared by Type tab + Edit screen (added 2026-04-25)
│   │   │   └── StepRow.tsx
│   │   ├── import/                     # Import-modal tabs (added 2026-04-22 → 04-25)
│   │   │   ├── ImportTabs.tsx          # Tab switcher
│   │   │   ├── PasteLinkTab.tsx
│   │   │   ├── TypeTab.tsx
│   │   │   ├── PhotoTab.tsx            # Multi-image picker
│   │   │   ├── FileTab.tsx             # PDF / .txt picker
│   │   │   └── JsonTab.tsx             # Bulk paste + smart-quote normalization
│   │   ├── TrackingConsentBanner.tsx   # First-launch cookie/tracker banner (added 2026-04-25)
│   │   └── shared/
│   │       ├── LoadingSticker.tsx # Thematic loading state
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── stickers/                 # SVG sticker definitions
│   │   ├── index.ts              # ALL_STICKERS array + STICKER_AI_KEYWORDS map
│   │   ├── Tomato.tsx
│   │   ├── Lemon.tsx
│   │   └── ... (16 total)
│   │
│   ├── theme/
│   │   ├── colors.ts             # All palette variants
│   │   ├── fonts.ts              # Fraunces, Caveat, Nunito
│   │   ├── spacing.ts            # 4-pt grid
│   │   └── shadows.ts            # Clay button + paper card shadows
│   │
│   ├── i18n/
│   │   ├── index.ts              # i18next init
│   │   ├── en.json
│   │   └── uk.json
│   │
│   ├── lib/
│   │   ├── analytics.ts          # PostHog wrapper
│   │   ├── sentry.ts             # Sentry init + helpers
│   │   ├── revenuecat.ts         # RevenueCat init + purchase helpers
│   │   ├── mmkv.ts               # MMKV instance + typed helpers; also `canvasStorage` Zustand persist wrapper
│   │   ├── pdf.ts                # PDF export trigger (calls Edge Function)
│   │   ├── canvasStore.ts        # Zustand canvas store (persist via MMKV, keyed by recipeId)
│   │   ├── drawingStore.ts       # Zustand drawing store (persist via MMKV, keyed by recipeId)
│   │   ├── recipeForm.ts         # valuesToRecipeInput, recipeToFormValues helpers (added 2026-04-25)
│   │   ├── jsonImportPrompt.ts   # JSON_IMPORT_PROMPT — the prompt user copies into ChatGPT/Claude (added 2026-04-25)
│   │   ├── trackingConsent.ts    # Zustand+MMKV state for cookie banner (added 2026-04-25)
│   │   └── deeplink.ts           # Universal link parsing
│   │
│   └── types/
│       ├── database.ts           # Generated from Supabase CLI (supabase gen types)
│       ├── canvas.ts             # CanvasElement, DrawingStroke, Layer types
│       └── navigation.ts         # Typed route params
│
├── supabase/
│   ├── functions/                # Edge Functions (Deno)
│   │   ├── _shared/              # Shared helpers
│   │   │   ├── ai.ts             # Anthropic client + logAiJob
│   │   │   ├── auth.ts           # requireUser
│   │   │   ├── consent.ts        # requireAiConsent + CURRENT_PP_VERSION (added 2026-04-25)
│   │   │   ├── cors.ts
│   │   │   ├── errors.ts
│   │   │   ├── recipeSanitize.ts # HTML strip + length caps + URL whitelist (added 2026-04-25)
│   │   │   └── tier.ts           # Quota + rate-limit helpers
│   │   ├── extract-recipe/       # URL / image_urls[] / pdf_url / text_content → Haiku
│   │   ├── auto-sticker/         # Recipe → sticker placement
│   │   ├── import-recipes-json/  # Bulk JSON ingest, no Haiku call (added 2026-04-25)
│   │   ├── moderate-image/       # CSAM gate via Haiku vision (added 2026-04-25)
│   │   ├── delete-account/       # Storage cleanup + auth.admin.deleteUser (added 2026-04-25)
│   │   ├── export-user-data/     # GDPR Art. 20 portability JSON (added 2026-04-25)
│   │   ├── telegram-auth/        # Issues short-lived bot tokens
│   │   ├── generate-pdf/         # Canvas snapshots → PDF (planned)
│   │   └── lulu-webhook/         # Lulu print order status updates (planned)
│   └── migrations/               # SQL migration files (latest batch dated 2026-04-25)
│
├── telegram-bot/                 # Separate Node.js service (Railway)
│   ├── src/
│   │   ├── bot.ts                # Telegraf — /start auth, URL, photo (single + media_group), CSAM gate
│   │   ├── queue.ts              # BullMQ + Upstash OR in-process fallback
│   │   ├── worker.ts             # Job processor — calls extract-recipe
│   │   ├── extract.ts            # Edge Function client; image_urls[] payload
│   │   └── config.ts             # `import 'dotenv/config'` (tsx watch doesn't auto-load)
│   └── package.json
│
├── .env.local                    # Never committed
├── .env.example                  # Committed — shows all required vars
├── app.config.ts                 # Expo config (reads env vars)
└── tsconfig.json                 # strict: true
```

**Why this structure:**
- `app/` is routing only — screens are thin shells that import from `src/`
- `src/api/` is pure functions, no React — trivially testable
- `src/hooks/queries/` and `src/hooks/mutations/` separate read from write — easier to reason about
- `src/components/ui/` has zero business logic — safe to replace or redesign without side effects
- `supabase/` lives in the same repo — migrations are versioned alongside the code that uses them

---

## 2. State Management

Two stores, two responsibilities. Never mix them.

### TanStack Query — server state

```typescript
// src/hooks/queries/useRecipes.ts
export function useRecipes(cookbookId: string) {
  return useQuery({
    queryKey: ['recipes', cookbookId],
    queryFn: () => api.recipes.list(cookbookId),
    staleTime: 1000 * 60 * 2,   // 2 min — recipes don't change that fast
  })
}

// src/hooks/mutations/useCreateRecipe.ts
export function useCreateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.recipes.create,
    onSuccess: (recipe) => {
      // Optimistic: add to cache immediately, no refetch needed
      queryClient.setQueryData(
        ['recipes', recipe.cookbook_id],
        (old: Recipe[]) => [...(old ?? []), recipe]
      )
      analytics.track('recipe_created', { source: recipe.source_type })
    },
  })
}
```

**Rule:** If it lives in Supabase, TanStack Query owns it. No `useState` for server data.

### Persisted Zustand stores via MMKV `canvasStorage` wrapper

Three stores persist to device storage so user edits survive app restart and screen switch:

- **`canvasStore`** — per-recipe canvas elements, selection, template key, font preset, block overrides, step/ingredient text overrides, undo history (≤50). Keyed map by `recipeId`.
- **`drawingStore`** — per-recipe drawing layers (≤5), active layer, tool, stroke settings, undo history. Keyed map by `recipeId` (BUG-014 fix: previously a single global state, lost when switching recipes).
- **`trackingConsent`** — cookie-banner state (one-time accept/reject record).

All three use a thin `canvasStorage` wrapper around `react-native-mmkv` to satisfy Zustand's `persist` API. SecureStore is reserved for the auth session token only.

The wrapper's TS contract is `getItem` / `setItem` / `removeItem` returning `Promise<string | null>`; we hand-roll JSON encoding because MMKV is sync but Zustand's `persist` wants async.

### Zustand — client state

```typescript
// src/stores/canvasStore.ts
interface CanvasState {
  elements: CanvasElement[]
  selectedId: string | null
  undoStack: CanvasElement[][]    // depth 50
  redoStack: CanvasElement[][]

  select: (id: string | null) => void
  addElement: (el: CanvasElement) => void
  updateElement: (id: string, patch: Partial<CanvasElement>) => void
  removeElement: (id: string) => void
  undo: () => void
  redo: () => void
  reset: (elements: CanvasElement[]) => void
}

export const useCanvasStore = create<CanvasState>()(
  immer((set) => ({
    elements: [],
    selectedId: null,
    undoStack: [],
    redoStack: [],

    addElement: (el) => set((state) => {
      state.undoStack.push([...state.elements])
      if (state.undoStack.length > 50) state.undoStack.shift()
      state.redoStack = []
      state.elements.push(el)
    }),

    undo: () => set((state) => {
      if (!state.undoStack.length) return
      state.redoStack.push([...state.elements])
      state.elements = state.undoStack.pop()!
    }),
    // ... rest of actions
  }))
)
```

```typescript
// src/stores/themeStore.ts — persisted to MMKV
interface ThemeState {
  palette: 'terracotta' | 'sage' | 'blush' | 'cobalt'
  paperTexture: 'low' | 'medium' | 'high'
  setPalette: (p: ThemeState['palette']) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      palette: 'terracotta',
      paperTexture: 'medium',
      setPalette: (palette) => set({ palette }),
    }),
    { name: 'theme', storage: createMMKVStorage() }
  )
)
```

**Rule:** If it doesn't belong to Supabase (UI state, tool settings, undo history), Zustand owns it.

---

## 3. Navigation Setup

Expo Router uses the filesystem. No manual route config. Typed params via `expo-router`.

```typescript
// app/_layout.tsx — root layout
export default function RootLayout() {
  const { session, loading } = useAuth()
  const onboardingDone = mmkv.getBoolean('onboarding_complete')

  if (loading) return <SplashScreen />

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {!onboardingDone && <Stack.Screen name="(auth)/onboarding" />}
            {!session ? (
              <Stack.Screen name="(auth)/login" />
            ) : (
              <Stack.Screen name="(tabs)" />
            )}
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}
```

```typescript
// Typed navigation — no string guessing
import { router } from 'expo-router'

// Navigate with type safety
router.push('/recipe/create')
router.push({ pathname: '/editor/[recipeId]', params: { recipeId: id } })
router.replace('/(tabs)')   // replace stack (after login)
```

**Deep link config in app.config.ts:**
```typescript
// app.config.ts
export default {
  scheme: 'spoonsketch',          // spoonsketch://... for Telegram deep links
  web: { bundler: 'metro' },
  ios: {
    associatedDomains: ['applinks:spoonsketch.app'],  // Universal Links
  },
}
```

**Auth guard pattern — one place, not per-screen:**
```typescript
// src/hooks/useAuthGuard.ts
export function useAuthGuard() {
  const { session } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) router.replace('/(auth)/login')
    if (session && inAuthGroup) router.replace('/(tabs)')
  }, [session, segments])
}
// Called once in _layout.tsx — never again
```

---

## 4. API Layer

All Supabase calls live in `src/api/`. Pure functions, no React, no hooks.

```typescript
// src/api/client.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getSessionToken } from '@/lib/mmkv'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,   // tokens in keychain
      autoRefreshToken: true,
      persistSession: true,
    },
  }
)
```

```typescript
// src/api/recipes.ts
export const recipesApi = {
  list: async (cookbookId: string) => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('cookbook_id', cookbookId)
      .order('position')
    if (error) throw new ApiError(error.message, error.code)
    return data
  },

  create: async (input: RecipeInsert) => {
    const { data, error } = await supabase
      .from('recipes')
      .insert(input)
      .select()
      .single()
    if (error) throw new ApiError(error.message, error.code)
    return data
  },

  importFromUrl: async (url: string) => {
    const { data, error } = await supabase.functions.invoke('extract-recipe', {
      body: { url },
    })
    if (error) throw new ApiError(error.message)
    return data as RecipeExtraction
  },
}
```

```typescript
// src/lib/apiError.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Usage in TanStack Query — errors bubble up automatically
// Handle in component with isError + error.message
```

**Rule:** `src/api/` functions throw `ApiError`. TanStack Query catches them. Components read `isError` + `error`. No try/catch in components.

---

## 5. Auth Handling

```typescript
// src/hooks/useAuth.ts
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Listen for changes (magic link callback, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)

        if (event === 'SIGNED_IN') {
          analytics.identify(session!.user.id, {
            email: session!.user.email,
            created_at: session!.user.created_at,
          })
          analytics.track('login_completed', { method: 'magic_link' })
        }

        if (event === 'SIGNED_OUT') {
          queryClient.clear()       // Wipe all cached data
          useCanvasStore.getState().reset([])
          mmkv.clearAll()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return { session, loading, signOut, user: session?.user ?? null }
}
```

**Token storage:**
```typescript
// src/lib/secureStore.ts
// Supabase Auth needs an AsyncStorage-compatible adapter
import * as SecureStore from 'expo-secure-store'

export const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}
// Pass to supabase createClient options.auth.storage
```

---

## 6. Local Storage Strategy

Three tiers. Use the right one for the right data.

| Data | Storage | Why |
|---|---|---|
| Auth session tokens | `expo-secure-store` | OS keychain. Encrypted. Required for tokens. |
| Palette preference, onboarding flag, last screen | MMKV | Synchronous reads — no async needed for UI-critical data |
| Server data (recipes, canvases) | TanStack Query in-memory cache | Backed by Supabase. Refetches on stale. No manual persistence. |
| Canvas undo/redo stack | Zustand in-memory | Session-only. Not worth persisting. |

```typescript
// src/lib/mmkv.ts
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV({ id: 'spoonsketch' })

// Typed helpers — never use raw string keys outside this file
export const mmkv = {
  // Onboarding
  isOnboardingComplete: () => storage.getBoolean('onboarding_complete') ?? false,
  setOnboardingComplete: () => storage.set('onboarding_complete', true),
  getOnboardingIntent: () => storage.getString('onboarding_intent') as 'gift' | 'personal' | undefined,
  setOnboardingIntent: (v: 'gift' | 'personal') => storage.set('onboarding_intent', v),

  // Theme (backup — Zustand persist is primary)
  getPalette: () => storage.getString('palette') ?? 'terracotta',
  setPalette: (p: string) => storage.set('palette', p),

  // Navigation
  getLastScreen: () => storage.getString('last_screen'),
  setLastScreen: (path: string) => storage.set('last_screen', path),

  clearAll: () => storage.clearAll(),
}
```

---

## 7. Environment Config

```bash
# .env.example — commit this
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_WEB_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_APP_ENV=development   # development | staging | production

# Server-side only (Edge Functions / Telegram bot) — NEVER in client bundle
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LULU_API_KEY=
TELEGRAM_BOT_TOKEN=
REDIS_URL=
```

```typescript
// app.config.ts — typed env access
import 'dotenv/config'

export default ({ config }) => ({
  ...config,
  name: process.env.EXPO_PUBLIC_APP_ENV === 'production'
    ? 'Spoon & Sketch'
    : `Spoon & Sketch (${process.env.EXPO_PUBLIC_APP_ENV})`,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  },
})
```

```typescript
// src/lib/env.ts — single source of truth, validates at startup
function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const env = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  posthogKey: requireEnv('EXPO_PUBLIC_POSTHOG_KEY'),
  revenuecatIosKey: requireEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY'),
  sentryDsn: requireEnv('EXPO_PUBLIC_SENTRY_DSN'),
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'staging' | 'production',
  isDev: process.env.EXPO_PUBLIC_APP_ENV !== 'production',
}
```

**Why:** Missing env vars crash at startup with a clear message, not mysteriously at runtime.

---

## 8. Error Handling

Three layers. Each handles a different class of error.

### Layer 1 — API errors (TanStack Query)
```typescript
// Errors in queries surface as isError + error in components
function RecipeList({ cookbookId }: { cookbookId: string }) {
  const { data, isLoading, isError, error } = useRecipes(cookbookId)

  if (isError) return (
    <EmptyState
      icon="alert"
      title="Couldn't load recipes"
      body={env.isDev ? error.message : "Pull to refresh and try again."}
      action={{ label: 'Try again', onPress: refetch }}
    />
  )
  // ...
}
```

### Layer 2 — React error boundaries (unexpected crashes)
```typescript
// src/components/shared/ErrorBoundary.tsx
// Wrap every tab root and the editor — those are the complex areas
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    Sentry.captureException(error)
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            {env.isDev ? this.state.error?.message : 'We've been notified and are looking into it.'}
          </Text>
          <ClayButton onPress={() => this.setState({ hasError: false })}>
            Try again
          </ClayButton>
        </SafeAreaView>
      )
    }
    return this.props.children
  }
}

// Usage in app/(tabs)/_layout.tsx
<ErrorBoundary><Tabs /></ErrorBoundary>
```

### Layer 3 — Global unhandled promise rejections
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react-native'

export function initSentry() {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.appEnv,
    enabled: !env.isDev,
    tracesSampleRate: 0.2,   // 20% of sessions — enough for performance data
    beforeSend(event) {
      // Strip PII before sending
      if (event.user) delete event.user.email
      return event
    },
  })
}

// Wrap the root component
export const SentryNavigationIntegration = Sentry.wrap
// In app/_layout.tsx: export default Sentry.wrap(RootLayout)
```

---

## 9. Analytics Hooks

PostHog — open source, self-hostable, has mobile SDKs.

```typescript
// src/lib/analytics.ts
import PostHog from 'posthog-react-native'

const client = new PostHog(env.posthogKey, {
  host: 'https://eu.posthog.com',   // GDPR: EU region
  disabled: env.isDev,              // Don't pollute dev data
  captureMode: 'form',              // Batch events, less battery drain
})

export const analytics = {
  identify: (userId: string, traits: Record<string, unknown>) => {
    client.identify(userId, traits)
  },

  track: (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
    client.capture(event, properties)
  },

  screen: (name: string) => {
    client.screen(name)
  },

  reset: () => {
    client.reset()   // Call on sign out
  },
}

// Typed events — no string typos
export type AnalyticsEvent =
  | 'onboarding_started'
  | 'onboarding_intent_selected'
  | 'signup_completed'
  | 'recipe_created'
  | 'activation_complete'
  | 'canvas_saved'
  | 'make_me_sketch_used'
  | 'book_built'
  | 'pdf_exported'
  | 'print_order_placed'
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'subscription_started'
  | 'cook_mode_started'
  | 'telegram_connected'
  // ... full list in USER_FLOW.md
```

```typescript
// src/hooks/useAnalytics.ts — auto screen tracking
export function useAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    analytics.screen(pathname)
  }, [pathname])

  return analytics
}
// Called once in app/_layout.tsx
```

---

## 10. Testing Structure

Three levels. Each tests what it's good at.

```
tests/
├── unit/                         # Pure logic — no React, no network
│   ├── api/
│   │   └── recipes.test.ts       # API functions with mocked Supabase
│   ├── stores/
│   │   ├── canvasStore.test.ts   # Undo/redo, element transforms
│   │   └── themeStore.test.ts
│   └── lib/
│       └── mmkv.test.ts
│
├── integration/                  # Hook + component tests with React Testing Library
│   ├── useCreateRecipe.test.tsx  # Mutation + cache update
│   ├── useAuth.test.tsx          # Auth state transitions
│   └── ImportRecipe.test.tsx     # Full import flow (mock API, real component)
│
└── e2e/                          # Maestro — real device flows
    ├── onboarding.yaml           # Full onboarding → sign up
    ├── import-recipe.yaml        # Paste URL → review → save
    ├── make-me-sketch.yaml       # Canvas editor → auto-decorate → save
    └── cook-mode.yaml            # Open recipe → cook mode → finish
```

```typescript
// tests/unit/stores/canvasStore.test.ts
describe('canvasStore', () => {
  it('undo restores previous elements', () => {
    const store = useCanvasStore.getState()
    store.reset([])

    const el = { id: '1', element_type: 'sticker', sticker_key: 'tomato', ... }
    store.addElement(el)
    expect(store.elements).toHaveLength(1)

    store.undo()
    expect(store.elements).toHaveLength(0)
  })

  it('undo stack is capped at 50', () => {
    const store = useCanvasStore.getState()
    store.reset([])
    for (let i = 0; i < 55; i++) store.addElement(makeElement(i))
    expect(store.undoStack.length).toBeLessThanOrEqual(50)
  })
})
```

```yaml
# tests/e2e/make-me-sketch.yaml
appId: com.spoonsketch.app
---
- launchApp
- tapOn: "Add a recipe"
- tapOn: "Paste a link"
- inputText:
    id: url-input
    text: "https://www.bbcgoodfood.com/recipes/tomato-soup"
- tapOn: "Import"
- waitForAnimationToEnd
- tapOn: "Save"
- tapOn: "Make it a scrapbook page"
- tapOn: "Make me Sketch"
- waitForAnimationToEnd
- assertVisible: "Done! Move anything you like."
- tapOn: "Save page"
- assertVisible: "Tomato Soup"   # Back on detail screen
```

**Why Maestro for E2E:** YAML syntax, runs on real device or simulator, integrates with CI, and doesn't require Detox native setup. For a canvas app where the critical flows are gesture-heavy, device E2E beats unit tests for confidence.

**CI pipeline (GitHub Actions):**
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsc --noEmit        # Type check
      - run: npm test                # Unit + integration
      - run: npx expo export --platform web  # Web build check
```

---

## Architecture rules for the whole team

1. **Screens are thin.** A screen file imports hooks, renders components, handles navigation. No business logic in screen files.
2. **`src/api/` is pure.** No React imports. All functions are `async` and throw `ApiError`. Easy to test in isolation.
3. **Never put server data in Zustand.** Server data belongs to TanStack Query. Zustand is for UI state only.
4. **All Anthropic API calls go through Edge Functions.** Never call the Anthropic API from the client. The API key must never be in the app bundle.
5. **TypeScript strict mode, always.** `supabase gen types` keeps DB types in sync. No `any`.
6. **One analytics call per meaningful user action.** See `AnalyticsEvent` union type — adding an event requires updating the type first.
7. **Error boundaries wrap every tab and the editor.** A crash in the canvas must not crash the whole app.
8. **Living docs stay current in the same commit as the code.** See `CLAUDE.md` rule #8 for the full enforcement clause and the canonical doc list (PLAN, FEATURES, BACKEND, ARCHITECTURE, SCREENS, USER_FLOW, BUGS, MANUAL_TESTS, plus the active plan file). When you add a hook / api file / component / Edge Function / migration, the matching section here gets updated in the SAME commit.
