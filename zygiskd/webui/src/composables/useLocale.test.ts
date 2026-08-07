import { beforeEach, describe, expect, it } from "vitest";
import { useLocale } from "./useLocale";

describe("useLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    const { setLocale } = useLocale();
    setLocale("en_US");
  });

  it("returns the key itself when the translation is missing", () => {
    const { t } = useLocale();
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("looks up nested keys in English by default", () => {
    const { t } = useLocale();
    expect(t("navbar.status")).toBe("Status");
    expect(t("common.refresh")).toBe("Refresh");
  });

  it("switches to Chinese reactively and persists the choice", () => {
    const { t, setLocale } = useLocale();
    setLocale("zh_CN");
    expect(t("navbar.status")).toBe("状态");
    expect(t("settings.themeAmoled")).toBe("纯黑");
    expect(localStorage.getItem("/OnyxZygisk/language")).toBe("zh_CN");
  });

  it("re-renders translations after switching back", () => {
    const { t, setLocale } = useLocale();
    setLocale("zh_CN");
    expect(t("navbar.logs")).toBe("日志");
    setLocale("en_US");
    expect(t("navbar.logs")).toBe("Logs");
  });

  it("exposes the available locales", () => {
    const { availableLocales } = useLocale();
    expect(availableLocales.map(([code]) => code)).toEqual(["en_US", "zh_CN"]);
  });
});
