// User-facing prompt for the JSON Import tab.
//
// User taps "Copy prompt", pastes this into ChatGPT / Claude.ai / Gemini
// alongside their recipe PDF, copies the AI's JSON response back into
// the JSON tab. We then validate + bulk-insert via the
// `import-recipes-json` Edge Function.
//
// The shape mirrors the server's `SanitizedRecipe` allowlist
// (`supabase/functions/_shared/recipeSanitize.ts`) — anything outside
// gets silently stripped. Forbidden fields are NOT documented here so
// AIs aren't tempted to emit them.

export const JSON_IMPORT_PROMPT = `You are extracting recipes from the document(s) I attach. Output a single JSON array (no prose, no markdown fences, no explanations) of UP TO 20 recipes. Each entry must match this exact shape:

{
  "title": "string — 1-4 words, the dish name (never empty, never 'Untitled')",
  "description": "string or null",
  "servings": number or null,
  "prep_minutes": number or null,
  "cook_minutes": number or null,
  "ingredients": [
    { "name": "string", "amount": "string or null", "unit": "string or null", "group": "string or null" }
  ],
  "instructions": [
    { "step": 1, "text": "string" }
  ],
  "tags": ["lowercase", "tokens", "max", "5"],
  "source_url": "string or null"
}

Rules:
- Output a JSON ARRAY at the top level, even if there is only one recipe.
- Cap at 20 recipes. If the document has more, pick the most prominent or most complete.
- Preserve the original language of each recipe — do not translate.
- Never invent ingredients, steps, or amounts that aren't in the source.
- "title" must be 1-4 words and never empty / "Untitled" / placeholder.
- "tags" max 5 lowercase tokens; never include "recipe" itself.
- "instructions[].step" must be sequential integers starting at 1.
- "source_url" must be a valid https:// URL or null. Only include it if the document explicitly cites a source URL.
- Do NOT include any HTML tags, markdown formatting, or special characters in text fields.
- Do NOT include image URLs, file paths, phone numbers, or external links anywhere except "source_url".
- Output ONLY valid JSON. No prose. No markdown code fences (no \`\`\` ... \`\`\`).`;
