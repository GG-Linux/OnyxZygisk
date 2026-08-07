/* OnyxZygisk — i18n. Strings live in src/locales/*.json and are statically
 * imported (bundled), so there is no runtime fetch. The active locale is a
 * reactive ref: swapping it re-renders every component that calls `t()`.
 */
import { computed, ref } from "vue";
import en from "../locales/en_US.json";
import zh from "../locales/zh_CN.json";

const KEY = "/OnyxZygisk/language";

export const LOCALES = [
  ["en_US", "English"],
  ["zh_CN", "简体中文"],
] as const;

export type LocaleCode = (typeof LOCALES)[number][0];

type Messages = typeof en;

const messages: Record<LocaleCode, Messages> = { en_US: en, zh_CN: zh };

const locale = ref<LocaleCode>((localStorage.getItem(KEY) as LocaleCode) || "en_US");

function lookup(dict: Messages, key: string): string | undefined {
  return key.split(".").reduce<unknown>((o, k) => {
    if (o == null) return undefined;
    return (o as Record<string, unknown>)[k];
  }, dict) as string | undefined;
}

export function useLocale() {
  const t = (key: string): string => lookup(messages[locale.value], key) ?? key;

  function setLocale(l: LocaleCode): void {
    locale.value = l;
    localStorage.setItem(KEY, l);
  }

  return {
    locale: computed(() => locale.value),
    t,
    setLocale,
    availableLocales: LOCALES,
  };
}
