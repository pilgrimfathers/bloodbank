import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { Language } from './define';
import { common, DISTRICTS_ML, MONTHS } from './strings/common';
import { donors } from './strings/donors';
import { main } from './strings/main';
import { profile as profileStrings } from './strings/profile';
import { requests } from './strings/requests';
import { tour } from './strings/tour';

export type { Language } from './define';

// Every strings file is merged here. Keys are namespaced ("home.title"), so
// files never collide.
const STRINGS = {
  en: { ...common.en, ...main.en, ...requests.en, ...donors.en, ...profileStrings.en, ...tour.en },
  ml: { ...common.ml, ...main.ml, ...requests.ml, ...donors.ml, ...profileStrings.ml, ...tour.ml },
};

export type StringKey = keyof typeof STRINGS.en;
type Params = Record<string, string | number>;

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ml', label: 'മലയാളം' },
];

const STORAGE_KEY = 'language';

// The current language, for code outside React (dialogs, push helpers).
let current: Language = 'en';

export function translate(key: StringKey, params?: Params, language: Language = current): string {
  const text: string = STRINGS[language][key] ?? STRINGS.en[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

export function formatDate(date?: Date | null, language: Language = current): string {
  if (!date) return '-';
  return `${date.getDate()} ${MONTHS[language][date.getMonth()]} ${date.getFullYear()}`;
}

// Short relative time for lists: "just now", "3h ago", "2d ago", then a date.
export function timeAgo(date: Date, language: Language = current, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return translate('time.justNow', undefined, language);
  if (minutes < 60) return translate('time.minutesAgo', { count: minutes }, language);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate('time.hoursAgo', { count: hours }, language);
  const days = Math.floor(hours / 24);
  if (days < 7) return translate('time.daysAgo', { count: days }, language);
  return formatDate(date, language);
}

// District names are stored in English; show them in the chosen language.
export function districtName(district?: string | null, language: Language = current): string {
  if (!district) return '';
  return language === 'ml' ? DISTRICTS_ML[district] ?? district : district;
}

type I18nValue = {
  // Null until the person picks a language (first launch).
  language: Language | null;
  loaded: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: StringKey, params?: Params) => string;
  formatDate: (date?: Date | null) => string;
  timeAgo: (date: Date) => string;
  districtName: (district?: string | null) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

// Language lives on the phone (so it can be asked before login) and on the
// profile (so a new phone and future server messages know it too).
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile } = useCurrentUser();
  const [language, setLanguageState] = useState<Language | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => { if (saved === 'en' || saved === 'ml') setLanguageState(saved); })
      .catch(error => console.warn('Could not read language:', error))
      .finally(() => setLoaded(true));
  }, []);

  // A new phone: take the language already saved on the profile.
  useEffect(() => {
    if (loaded && !language && profile?.language) {
      setLanguageState(profile.language);
      AsyncStorage.setItem(STORAGE_KEY, profile.language).catch(() => {});
    }
  }, [loaded, language, profile?.language]);

  // Keep the profile in step with the phone.
  useEffect(() => {
    if (profile && language && profile.language !== language) {
      updateDoc(doc(firestore, 'users', profile.id), { language }).catch(error =>
        console.warn('Could not save language to profile:', error),
      );
    }
  }, [profile?.id, profile?.language, language]);

  const setLanguage = useCallback(async (next: Language) => {
    setLanguageState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next).catch(error => console.warn('Could not save language:', error));
  }, []);

  const active = language ?? 'en';
  current = active;

  const value = useMemo<I18nValue>(() => ({
    language,
    loaded,
    setLanguage,
    t: (key, params) => translate(key, params, active),
    formatDate: date => formatDate(date, active),
    timeAgo: date => timeAgo(date, active),
    districtName: district => districtName(district, active),
  }), [language, loaded, setLanguage, active]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}
