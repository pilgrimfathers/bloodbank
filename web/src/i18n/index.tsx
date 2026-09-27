"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { common, DISTRICTS_ML, MONTHS } from "@shared/i18n/common";
import type { Language } from "@shared/i18n/define";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { console as consoleStrings } from "./console";
import { donors } from "./donors";
import { site } from "./site";

export type { Language } from "@shared/i18n/define";

// Mirrors src/i18n in the mobile app. Shared words come from shared/i18n;
// web-only text lives in the files next to this one, namespaced by key.
const STRINGS = {
  en: { ...common.en, ...consoleStrings.en, ...donors.en, ...site.en },
  ml: { ...common.ml, ...consoleStrings.ml, ...donors.ml, ...site.ml },
};

export type StringKey = keyof typeof STRINGS.en;
type Params = Record<string, string | number>;

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ml", label: "മലയാളം" },
];

const STORAGE_KEY = "language";

export function translate(key: StringKey, params: Params | undefined, language: Language): string {
  const text: string = STRINGS[language][key] ?? STRINGS.en[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

export function formatDate(date: Date | null | undefined, language: Language): string {
  if (!date) return "-";
  return `${date.getDate()} ${MONTHS[language][date.getMonth()]} ${date.getFullYear()}`;
}

export function timeAgo(date: Date, language: Language, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return translate("time.justNow", undefined, language);
  if (minutes < 60) return translate("time.minutesAgo", { count: minutes }, language);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate("time.hoursAgo", { count: hours }, language);
  const days = Math.floor(hours / 24);
  if (days < 7) return translate("time.daysAgo", { count: days }, language);
  return formatDate(date, language);
}

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: StringKey, params?: Params) => string;
  formatDate: (date?: Date | null) => string;
  timeAgo: (date: Date) => string;
  // District names are stored in English; this shows them in the chosen language.
  districtName: (district?: string | null) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readStored(): Language | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "ml" ? saved : null;
  } catch {
    return null;
  }
}

// The browser remembers the choice; the signed-in profile (shared with the
// app) wins on a new browser, and is kept in step when it changes here.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [chosen, setChosen] = useState<Language | null>(null);

  useEffect(() => {
    // Read after mount so the server render and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChosen(readStored());
  }, []);

  const language: Language = chosen ?? profile?.language ?? "en";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (profile && chosen && profile.language !== chosen) {
      updateDoc(doc(firestore, "users", profile.id), { language: chosen }).catch(error =>
        console.warn("Could not save language to profile:", error),
      );
    }
  }, [profile, chosen]);

  const setLanguage = useCallback((next: Language) => {
    setChosen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this visit.
    }
  }, []);

  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage,
    t: (key, params) => translate(key, params, language),
    formatDate: date => formatDate(date, language),
    timeAgo: date => timeAgo(date, language),
    districtName: district => (!district ? "" : language === "ml" ? DISTRICTS_ML[district] ?? district : district),
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside LanguageProvider");
  return value;
}

// Compact English / മലയാളം toggle for page headers and sidebars.
export function LanguageSwitch({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("language.setting")} className={`inline-flex gap-1 text-sm ${className ?? ""}`}>
      {LANGUAGES.map(option => {
        const selected = option.value === language;
        const colors = tone === "dark"
          ? selected ? "bg-white text-blood-dark" : "text-white/80 hover:bg-white/10 hover:text-white"
          : selected ? "bg-blood text-white" : "text-ink-muted hover:bg-blood-tint hover:text-blood";
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={option.value}
            onClick={() => setLanguage(option.value)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${colors}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
