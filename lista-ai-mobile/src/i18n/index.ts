import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

i18n.use(initReactI18next).init({
  resources: {
    en:      { translation: en },
    'pt-BR': { translation: ptBR },
    es:      { translation: es },
    fr:      { translation: fr },
    de:      { translation: de },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
