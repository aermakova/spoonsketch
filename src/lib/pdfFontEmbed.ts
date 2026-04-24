// PDF font embedding — converts the bundled @expo-google-fonts TTFs into
// base64 `data:` URIs suitable for inlining as @font-face src in the print
// HTML.
//
// Why embed instead of link-tag to fonts.googleapis.com:
// expo-print on iOS opens a sandboxed WKWebView. The CSS `@import` /
// `<link rel="stylesheet">` Google Fonts dance doesn't reliably finish
// before the page renders to PDF — Fraunces in particular falls back to
// system serif (Times) every time, while smaller fonts that happened to
// be cached load on the lucky run. Inlining sidesteps the timing entirely:
// the font bytes are present when the WebView parses the <style>.
//
// Total payload after embedding ~10 fonts: ~1–2 MB HTML. expo-print
// handles this fine; iOS share sheet completes in <5 s.

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Match what's actually used by the renderer + font preset picker:
// - Fraunces 400/700: template titles
// - Nunito 400/500/700: body, pills, step numbers
// - Caveat 400/700: descriptions, section headings
// - Marck Script / Bad Script / Amatic SC: handwritten font preset titles
//
// The `@expo-google-fonts/*` named exports return Metro's numeric asset id
// for the bundled TTF — same value the app uses with Font.loadAsync at boot.
import { Fraunces_400Regular, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { MarckScript_400Regular } from '@expo-google-fonts/marck-script';
import { BadScript_400Regular } from '@expo-google-fonts/bad-script';
import { AmaticSC_400Regular, AmaticSC_700Bold } from '@expo-google-fonts/amatic-sc';

interface FontSpec {
  family: string;
  weight: number;
  source: number; // Metro asset id
}

// Match the exact set bundled at app boot (app/_layout.tsx). Nunito uses 600
// not 500 in this project — keep PDF in sync so the renderer's `font-weight: 600`
// resolves cleanly.
const FONTS: FontSpec[] = [
  { family: 'Fraunces',     weight: 400, source: Fraunces_400Regular as unknown as number },
  { family: 'Fraunces',     weight: 700, source: Fraunces_700Bold as unknown as number },
  { family: 'Nunito',       weight: 400, source: Nunito_400Regular as unknown as number },
  { family: 'Nunito',       weight: 600, source: Nunito_600SemiBold as unknown as number },
  { family: 'Nunito',       weight: 700, source: Nunito_700Bold as unknown as number },
  { family: 'Caveat',       weight: 400, source: Caveat_400Regular as unknown as number },
  { family: 'Caveat',       weight: 700, source: Caveat_700Bold as unknown as number },
  { family: 'Marck Script', weight: 400, source: MarckScript_400Regular as unknown as number },
  { family: 'Bad Script',   weight: 400, source: BadScript_400Regular as unknown as number },
  { family: 'Amatic SC',    weight: 400, source: AmaticSC_400Regular as unknown as number },
  { family: 'Amatic SC',    weight: 700, source: AmaticSC_700Bold as unknown as number },
];

export interface FontFaceEntry {
  family: string;
  weight: number;
  dataUri: string;
}

export type FontDataUriMap = FontFaceEntry[];

let cached: FontDataUriMap | null = null;

// Resolve every embedded font to a base64 data URI. First call is ~200–400 ms
// (asset download + base64 encode); subsequent calls hit the in-memory cache.
export async function resolveFontDataUris(): Promise<FontDataUriMap> {
  if (cached) return cached;
  const entries = await Promise.all(FONTS.map(async (f) => {
    try {
      const asset = Asset.fromModule(f.source);
      if (!asset.localUri) await asset.downloadAsync();
      const localUri = asset.localUri;
      if (!localUri) return null;
      const b64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { family: f.family, weight: f.weight, dataUri: `data:font/ttf;base64,${b64}` } as FontFaceEntry;
    } catch {
      return null;
    }
  }));
  cached = entries.filter((e): e is FontFaceEntry => !!e);
  return cached;
}

// Build the @font-face block for inline injection into the PDF HTML.
export function fontFaceCSS(entries: FontDataUriMap): string {
  return entries
    .map(e =>
      `@font-face { font-family: '${e.family}'; font-weight: ${e.weight}; font-style: normal; src: url(${e.dataUri}) format('truetype'); font-display: block; }`,
    )
    .join('\n');
}
