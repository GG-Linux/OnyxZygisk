import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTO_LOCALE, useLocale } from "./useLocale";

function setNavigatorLang(lang: string): void {
  Object.defineProperty(navigator, "language", { value: lang, configurable: true });
  window.dispatchEvent(new Event("languagechange"));
}

describe("useLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    setNavigatorLang("en-US");
    const { setLocale } = useLocale();
    setLocale(AUTO_LOCALE);
  });

  afterEach(() => {
    setNavigatorLang("en-US");
  });

  it("returns the key itself when the translation is missing", () => {
    const { t } = useLocale();
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("resolves auto to English on an English device", () => {
    const { t } = useLocale();
    expect(t("navbar.status")).toBe("Status");
    expect(t("common.refresh")).toBe("Refresh");
  });

  it("resolves auto to Chinese on a Chinese device", () => {
    setNavigatorLang("zh-CN");
    const { t } = useLocale();
    expect(t("navbar.status")).toBe("状态");
    expect(t("settings.themeAmoled")).toBe("纯黑");
  });

  it("resolves auto to Japanese on a Japanese device", () => {
    setNavigatorLang("ja-JP");
    const { t } = useLocale();
    expect(t("navbar.status")).toBe("ステータス");
    expect(t("settings.languageAuto")).toBe("自動");
  });

  it("defaults to the auto preference (device language) when nothing is stored", () => {
    expect(AUTO_LOCALE).toBe("auto");
    expect(localStorage.getItem("/OnyxZygisk/language")).toBe("auto");
  });

  it("switches to a fixed locale and persists the choice", () => {
    const { t, setLocale } = useLocale();
    setLocale("zh_CN");
    expect(t("navbar.status")).toBe("状态");
    expect(localStorage.getItem("/OnyxZygisk/language")).toBe("zh_CN");
  });

  it("keeps the auto preference even on a Japanese device after switching", () => {
    setNavigatorLang("ja-JP");
    const { t, setLocale } = useLocale();
    expect(t("navbar.status")).toBe("ステータス");
    setLocale("en_US");
    expect(t("navbar.status")).toBe("Status");
    setLocale(AUTO_LOCALE);
    expect(t("navbar.status")).toBe("ステータス");
  });

  it("re-renders translations after switching back", () => {
    const { t, setLocale } = useLocale();
    setLocale("ja_JP");
    expect(t("navbar.logs")).toBe("ログ");
    setLocale("en_US");
    expect(t("navbar.logs")).toBe("Logs");
  });

  it("exposes the available locales", () => {
    const { availableLocales } = useLocale();
    expect(availableLocales.map(([code]) => code)).toEqual(["en_US", "zh_CN", "ja_JP"]);
  });
});
