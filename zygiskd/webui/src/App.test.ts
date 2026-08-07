import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import type { StateData } from "./types";

// Keep the real parseMonitor; only the data-fetching entry point is mocked.
vi.mock("./api/system", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/system")>();
  return { ...actual, fetchState: vi.fn() };
});

import { fetchState } from "./api/system";

const monitorText = ["\tmonitor:\ttracing", "\tzygote64:\tinjected"].join("\n");

const state = (over: Partial<StateData> = {}): StateData => ({
  keys: { root: "APatch", version: "1.0" },
  monitor: monitorText,
  modules: [],
  fns: [],
  ...over,
});

const stubs = {
  StatusSection: true,
  ModulesSection: true,
  FnSection: true,
  LogsSection: true,
  SettingsSection: true,
};

beforeEach(() => {
  vi.mocked(fetchState).mockResolvedValue(state());
});

describe("App hero", () => {
  it("renders the status hero with root label, version and working badge", async () => {
    const wrapper = mount(App, { global: { stubs } });
    await flushPromises();
    const hero = wrapper.find(".hero");
    expect(hero.exists()).toBe(true);
    expect(hero.find(".root-label__text").text()).toBe("APatch");
    expect(hero.text()).toContain("v1.0");
    expect(hero.find(".badge").text()).toContain("Working");
    wrapper.unmount();
  });

  it("collapses to the compact style once scrolled past the threshold", async () => {
    const wrapper = mount(App, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find(".hero--compact").exists()).toBe(false);

    // jsdom does not implement a settable scrollY: stub the getter.
    Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    await Promise.resolve();

    expect(wrapper.find(".hero--compact").exists()).toBe(true);
    expect(wrapper.find(".hero__sub").exists()).toBe(false);
    expect(wrapper.find(".hero__chips").exists()).toBe(false);
    wrapper.unmount();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });
});
