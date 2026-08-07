import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FnSection from "./FnSection.vue";
import type { StateData } from "../types";

vi.mock("../api/system", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/system")>();
  return { ...actual, fetchState: vi.fn(), setFnEnabled: vi.fn() };
});

import { fetchState, setFnEnabled } from "../api/system";

const state = (over: Partial<StateData> = {}): StateData => ({
  keys: {},
  monitor: "",
  modules: [],
  fns: [
    {
      id: "net_guard",
      name: "网络守卫",
      version: "1.0",
      trigger: "app",
      scope: "com.bank.*",
      status: "enabled",
    },
    {
      id: "prop_shield",
      name: "属性护盾",
      version: "2.1",
      trigger: "system_server",
      scope: "all",
      status: "disabled",
    },
  ],
  ...over,
});

beforeEach(() => {
  vi.mocked(fetchState).mockResolvedValue(state());
  vi.mocked(setFnEnabled).mockResolvedValue(undefined);
});

describe("FnSection", () => {
  it("renders the FN node list with name, version and meta", async () => {
    const wrapper = mount(FnSection);
    await flushPromises();
    expect(wrapper.findAll(".fn-row")).toHaveLength(2);
    expect(wrapper.find(".fn-row__name").text()).toBe("网络守卫");
    expect(wrapper.find(".fn-row__ver").text()).toBe("v1.0");
    expect(wrapper.find(".fn-row__meta").text()).toContain("app / com.bank.*");
    wrapper.unmount();
  });

  it("reflects the enabled state in the switch", async () => {
    const wrapper = mount(FnSection);
    await flushPromises();
    const boxes = wrapper.findAll(".fn-row input[type=checkbox]");
    expect(boxes[0].element as HTMLInputElement).toBeTruthy();
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true);
    expect((boxes[1].element as HTMLInputElement).checked).toBe(false);
    wrapper.unmount();
  });

  it("disables a node through the switch and reports the result", async () => {
    const wrapper = mount(FnSection);
    await flushPromises();
    const first = wrapper.find(".fn-row input[type=checkbox]");
    await first.setValue(false);
    await flushPromises();
    expect(setFnEnabled).toHaveBeenCalledWith("net_guard", false);
    expect(wrapper.find(".msg").text()).toContain("net_guard");
    wrapper.unmount();
  });

  it("shows the empty state", async () => {
    vi.mocked(fetchState).mockResolvedValue(state({ fns: [] }));
    const wrapper = mount(FnSection);
    await flushPromises();
    expect(wrapper.text()).toContain("No FN nodes");
    wrapper.unmount();
  });
});
