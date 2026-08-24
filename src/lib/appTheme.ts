// Simple app-wide theme mode helper (light / dark).
// The actual theme application lives in App.tsx which listens for the
// `themechange-custom` window event and the `theme` localStorage key.

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event("themechange-custom"));
}

export function toggleThemeMode(): ThemeMode {
  const next: ThemeMode = getThemeMode() === "light" ? "dark" : "light";
  setThemeMode(next);
  return next;
}

// Appearance preference: "system" | "light" | "dark".
export type Appearance = "system" | ThemeMode;

const APPEARANCE_KEY = "appearance";

export function getAppearance(): Appearance {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(APPEARANCE_KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function setAppearance(mode: Appearance) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPEARANCE_KEY, mode);
  const resolved: ThemeMode =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  setThemeMode(resolved);
}
