import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../i18n';

export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'de'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

const LANGUAGE_KEY = 'app_language';

function matchLocale(tag: string): Locale {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(tag)) return tag as Locale;
  const prefix = tag.split('-')[0];
  if (prefix === 'pt') return 'pt-BR';
  const match = SUPPORTED_LOCALES.find((l) => l.startsWith(prefix));
  return match ?? 'en';
}

export interface LanguageSlice {
  language: Locale;
  setLanguage: (lang: Locale) => Promise<void>;
  initLanguage: () => Promise<void>;
}

export function createLanguageSlice(
  set: (partial: Partial<LanguageSlice>) => void,
): LanguageSlice {
  return {
    language: 'en',

    setLanguage: async (lang: Locale) => {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      await i18n.changeLanguage(lang);
      set({ language: lang });
    },

    initLanguage: async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      const deviceTag = Localization.getLocales()[0]?.languageTag ?? 'en';
      const lang = matchLocale(stored ?? deviceTag);
      await i18n.changeLanguage(lang);
      set({ language: lang });
    },
  };
}
