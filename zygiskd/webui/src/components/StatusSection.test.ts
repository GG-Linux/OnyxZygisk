import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StatusSection from "./StatusSection.vue";
import type { StateData } from "../types";

// Keep the real parseMonitor; only the data-fetching entry point is mocked.
vi.mock("../api/system", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/system")>();
  return { ...actual, fetchState: vi.fn() };
});

import { fetchState } from "../api/system";

const monitorText = ["\tmonitor:\ttracing", "\tzygote64:\tinjected", "\tRoot: APatch"].join("\n");

const state = (over: Partial<StateData> = {}): StateData => ({
  keys: { root: "APatch" },
  monitor: monitorText,
  modules: [],
  fns: [],
  ...over,
});

beforeEach(() => {
  vi.mocked(fetchState).mockResolvedValue(state());
});

describe("StatusSection", () => {
  it("renders the root label from the fetched state", async () => {
    const wrapper = mount(StatusSection);
    await flushPromises();
    expect(wrapper.find(".root-label__text").text()).toBe("APatch");
    wrapper.unmount();
  });

  it("renders monitor rows with labels and detail lines", async () => {
    const wrapper = mount(StatusSection);
    await flushPromises();
    const rows = wrapper.findAll(".monitor-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].find(".m-label").text()).toBe("monitor");
    expect(rows[0].find(".m-val").text()).toBe("tracing");
    expect(rows[1].find(".m-label").text()).toBe("zygote64");
    expect(wrapper.find(".monitor-detail").text()).toBe("Root: APatch");
    wrapper.unmount();
  });

  it("colors healthy monitor values with the ok class", async () => {
    const wrapper = mount(StatusSection);
    await flushPromises();
    expect(wrapper.find(".monitor-row .m-val").classes()).toContain("ok");
    wrapper.unmount();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.mocked(fetchState).mockRejectedValueOnce(new Error("boom"));
    const wrapper = mount(StatusSection);
    await flushPromises();
    expect(wrapper.text()).toContain("Error: boom");
    wrapper.unmount();
  });

  it("shows the empty state when there is no monitor output", async () => {
    vi.mocked(fetchState).mockResolvedValue(state({ monitor: "" }));
    const wrapper = mount(StatusSection);
    await flushPromises();
    expect(wrapper.find(".monitor-empty").exists()).toBe(true);
    wrapper.unmount();
  });
});
