/* OnyxZygisk — i18n. Strings live in src/locales/*.json and are statically
 * imported (bundled), so there is no runtime fetch. The active locale is a
 * reactive ref: swapping it re-renders every component that calls `t()`.
 *
 * The user preference can be "auto": resolve it against the device/browser
 * language (navigator.language) and fall back to English. "auto" is the
 * default so first-run users get the manager's language automatically.
 */
import { computed, ref } from "vue";
import en from "../locales/en_US.json";
import zh from "../locales/zh_CN.json";
import ja from "../locales/ja_JP.json";

const KEY = "/OnyxZygisk/language";

/** "auto" = follow the device language. */
export const AUTO_LOCALE = "auto";

export const LOCALES = [
  ["en_US", "English"],
  ["zh_CN", "简体中文"],
  ["ja_JP", "日本語"],
] as const;

/** A locale code the user can pick in the UI (includes "auto"). */
export type LocalePref = (typeof LOCALES)[number][0] | typeof AUTO_LOCALE;

/** A concrete locale used to look up strings (never "auto"). */
export type LocaleCode = (typeof LOCALES)[number][0];

type Messages = typeof en;

const messages: Record<LocaleCode, Messages> = { en_US: en, zh_CN: zh, ja_JP: ja };

/** Reactive snapshot of the device language; refreshed on `languagechange`. */
const deviceLang = ref(navigator.language || "en");

/** Map navigator.language prefixes onto the bundled locales. */
function detectLocale(): LocaleCode {
  const lang = deviceLang.value.toLowerCase();
  if (lang.startsWith("zh")) return "zh_CN";
  if (lang.startsWith("ja")) return "ja_JP";
  return "en_US";
}

/** User preference: "auto" (device language) or an explicit code. */
const pref = ref<LocalePref>((localStorage.getItem(KEY) as LocalePref) || AUTO_LOCALE);

/** Concrete locale actually in use (resolves "auto"). */
export const currentLocale = computed<LocaleCode>(() =>
  pref.value === AUTO_LOCALE ? detectLocale() : pref.value,
);

// Sync <html lang> once at startup so a11y/browser translation matches the
// restored preference before any setLocale() call.
document.documentElement.lang = currentLocale.value.replace("_", "-");

// Keep the resolved locale and <html lang> correct when the device language
// changes under "auto".
window.addEventListener("languagechange", () => {
  deviceLang.value = navigator.language || "en";
  document.documentElement.lang = currentLocale.value.replace("_", "-");
});

function lookup(dict: Messages, key: string): string | undefined {
  return key.split(".").reduce<unknown>((o, k) => {
    if (o == null) return undefined;
    return (o as Record<string, unknown>)[k];
  }, dict) as string | undefined;
}

export function useLocale() {
  const t = (key: string): string => {
    const text = lookup(messages[currentLocale.value], key);
    if (text == null) {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    return text;
  };

  function setLocale(l: LocalePref): void {
    pref.value = l;
    localStorage.setItem(KEY, l);
    // Keep <html lang> in sync for a11y and browser translation.
    document.documentElement.lang = currentLocale.value.replace("_", "-");
  }

  return {
    locale: computed(() => pref.value),
    t,
    setLocale,
    availableLocales: LOCALES,
  };
}
