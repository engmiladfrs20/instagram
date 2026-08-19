export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'purple' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';

export interface ThemePreferences {
  mode: ThemeMode;
  accent: AccentColor;
}

const STORAGE_KEY = 'instaflow-appearance';

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'dark',
  accent: 'purple',
};

const isThemeMode = (value: unknown): value is ThemeMode => value === 'dark' || value === 'light';

const isAccentColor = (value: unknown): value is AccentColor =>
  value === 'purple' ||
  value === 'cyan' ||
  value === 'emerald' ||
  value === 'amber' ||
  value === 'rose' ||
  value === 'indigo';

export function readThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ThemePreferences>;
    return {
      mode: isThemeMode(saved.mode) ? saved.mode : DEFAULT_PREFERENCES.mode,
      accent: isAccentColor(saved.accent) ? saved.accent : DEFAULT_PREFERENCES.accent,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function applyThemePreferences(preferences: ThemePreferences): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.theme = preferences.mode;
  root.dataset.bsTheme = preferences.mode;
  root.dataset.accent = preferences.accent;
  root.style.colorScheme = preferences.mode;
}

export function saveThemePreferences(preferences: ThemePreferences): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
