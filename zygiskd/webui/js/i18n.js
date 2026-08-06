/* OnyxZygisk — i18n. Strings live in lang/<locale>.json (loaded via fetch → correct UTF-8).
 * HTML uses {{a.b}} placeholders; JS uses t('a.b').
 */
"use strict";

const KEY = "/OnyxZygisk/language";
const LOCALES = [["en_US", "English"], ["zh_CN", "简体中文"]];

let strings = {};
let locale = "en_US";

export function availableLocales() { return LOCALES; }
export function getLocale() { return localStorage.getItem(KEY) || "en_US"; }
export function setLocalePref(l) { localStorage.setItem(KEY, l); }
export function currentLocale() { return locale; }

export async function loadLang(l) {
  try {
    strings = await fetch("lang/" + l + ".json").then((r) => r.json());
    locale = l;
  } catch (e) {
    if (l !== "en_US") return loadLang("en_US");
    strings = {};
  }
  return strings;
}

export function t(key) {
  const v = String(key).split(".").reduce((o, k) => (o == null ? undefined : o[k]), strings);
  return v == null ? key : v;
}

export function solveStrings(html) {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    const v = t(k.trim());
    return v == null ? "{{" + k + "}}" : v;
  });
}
