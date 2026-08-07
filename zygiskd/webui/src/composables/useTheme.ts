/* OnyxZygisk — theme. light / dark / amoled / system, persisted in localStorage. */

const KEY = "/OnyxZygisk/theme";

export const THEMES = ["light", "dark", "amoled", "system"] as const;

export type ThemePref = (typeof THEMES)[number];

/** A value that can go into the `data-theme` attribute. */
export type ResolvedTheme = "light" | "dark" | "amoled";

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return (THEMES as readonly string[]).includes(v ?? "") ? (v as ThemePref) : "system";
}

export function setThemePref(t: ThemePref): void {
  localStorage.setItem(KEY, t);
}

function resolve(pref: ThemePref): ResolvedTheme {
  if (pref === "system") {
    const dark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return dark ? "dark" : "light";
  }
  return pref as ResolvedTheme;
}

export function applyTheme(pref: ThemePref): void {
  document.documentElement.setAttribute("data-theme", resolve(pref));
}

/** Keep "system" theme reactive to OS changes. */
export function watchSystem(): void {
  if (!window.matchMedia) return;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
  });
}
