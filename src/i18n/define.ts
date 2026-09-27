export type Language = 'en' | 'ml';

// One strings file per area of the app. Malayalam must cover every English key,
// so a missing translation is a type error rather than a blank label.
export function defineStrings<T extends Record<string, string>>(en: T, ml: { [K in keyof T]: string }) {
  return { en, ml };
}
