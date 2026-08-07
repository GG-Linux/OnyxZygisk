import { beforeEach, describe, expect, it } from "vitest";
import { THEMES, applyTheme, getThemePref, setThemePref } from "./useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to system", () => {
    expect(getThemePref()).toBe("system");
  });

  it("persists the preference", () => {
    setThemePref("amoled");
    expect(getThemePref()).toBe("amoled");
    expect(localStorage.getItem("/OnyxZygisk/theme")).toBe("amoled");
  });

  it("applies the data-theme attribute", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyTheme("amoled");
    expect(document.documentElement.getAttribute("data-theme")).toBe("amoled");
  });

  it("resolves system to light when no dark preference (stubbed matchMedia)", () => {
    applyTheme("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("exposes the theme list", () => {
    expect(THEMES).toEqual(["light", "dark", "amoled", "system"]);
  });
});
