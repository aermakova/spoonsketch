// i18next bootstrap. Imported once from app/_layout.tsx to register resources
// and pick a starting language based on the device locale.
//
// Today: EN is the source-of-truth; UK is a skeleton awaiting translation
// (only tabs + common are filled in). Strings missing from UK fall back to EN
// automatically (i18next default behavior). Once the app is shipping we'll
// add a "language" key on `users` and let the user override via Settings.
//
// Adding a new translated string: drop it in en.json with a flat dotted path
// (e.g. "stash.title"), then call `t('stash.title')` from any component via
// `import { useTranslation } from 'react-i18next'; const { t } = useTranslation();`.

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import uk from './uk.json';

const SUPPORTED = ['en', 'uk'] as const;
type SupportedLng = (typeof SUPPORTED)[number];

function pickInitialLng(): SupportedLng {
  // expo-localization on SDK 54 returns an array of preferred locales.
  const locales = Localization.getLocales?.() ?? [];
  const codes = locales
    .map((l) => l.languageCode)
    .filter((c): c is string => !!c);
  for (const code of codes) {
    if ((SUPPORTED as readonly string[]).includes(code)) {
      return code as SupportedLng;
    }
  }
  return 'en';
}

let initialised = false;

export function ensureI18n(): void {
  if (initialised) return;
  initialised = true;
  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
    },
    lng: pickInitialLng(),
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });
}

export default i18next;
