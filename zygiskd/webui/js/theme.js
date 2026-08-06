/* OnyxZygisk — theme. light / dark / amoled / system, persisted in localStorage. */
"use strict";

const KEY = "/OnyxZygisk/theme";
export const THEMES = ["light", "dark", "amoled", "system"];

export function getThemePref() { return localStorage.getItem(KEY) || "system"; }
export function setThemePref(t) { localStorage.setItem(KEY, t); }

function resolve(pref) {
  if (pref === "system") {
    const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return dark ? "dark" : "light";
  }
  return pref;
}

export function applyTheme(pref) {
  document.documentElement.setAttribute("data-theme", resolve(pref));
}

/** Keep "system" theme reactive to OS changes. */
export function watchSystem() {
  if (!window.matchMedia) return;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
  });
}
