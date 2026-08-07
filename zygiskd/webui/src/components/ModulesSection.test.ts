import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModulesSection from "./ModulesSection.vue";
import type { StateData } from "../types";

vi.mock("../api/system", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/system")>();
  return { ...actual, fetchState: vi.fn() };
});

import { fetchState } from "../api/system";

const state = (over: Partial<StateData> = {}): StateData => ({
  keys: {},
  monitor: "",
  modules: [
    {
      id: "playintegrityfix",
      name: "Play Integrity Fix",
      version: "v18.8",
      author: "chiteroman",
      zygisk: true,
      disabled: false,
      desc: "修复认证",
    },
    {
      id: "tricky_store",
      name: "Tricky Store",
      version: "v1.2.1",
      author: "5ec1cff",
      zygisk: true,
      disabled: true,
      desc: "",
    },
  ],
  fns: [],
  ...over,
});

beforeEach(() => {
  vi.mocked(fetchState).mockResolvedValue(state());
});

describe("ModulesSection", () => {
  it("renders the module list with meta and description", async () => {
    const wrapper = mount(ModulesSection);
    await flushPromises();
    expect(wrapper.findAll(".mod-row")).toHaveLength(2);
    expect(wrapper.find(".mod-row__name").text()).toBe("Play Integrity Fix");
    expect(wrapper.find(".mod-row__ver").text()).toBe("v18.8");
    expect(wrapper.find(".mod-row__author").text()).toBe("chiteroman");
    expect(wrapper.find(".mod-row__desc").text()).toBe("修复认证");
    wrapper.unmount();
  });

  it("shows enabled/disabled status per module", async () => {
    const wrapper = mount(ModulesSection);
    await flushPromises();
    const statuses = wrapper.findAll(".mod-row__status");
    expect(statuses[0].text()).toBe("Enabled");
    expect(statuses[0].classes()).toContain("on");
    expect(statuses[1].text()).toBe("Disabled");
    expect(statuses[1].classes()).toContain("off");
    wrapper.unmount();
  });

  it("falls back to the module id when the name is missing", async () => {
    vi.mocked(fetchState).mockResolvedValue(
      state({
        modules: [
          {
            id: "bare",
            name: "",
            version: "1.0",
            author: "",
            zygisk: false,
            disabled: false,
            desc: "",
          },
        ],
      }),
    );
    const wrapper = mount(ModulesSection);
    await flushPromises();
    expect(wrapper.find(".mod-row__name").text()).toBe("bare");
    wrapper.unmount();
  });

  it("shows the empty state", async () => {
    vi.mocked(fetchState).mockResolvedValue(state({ modules: [] }));
    const wrapper = mount(ModulesSection);
    await flushPromises();
    expect(wrapper.text()).toContain("No Zygisk modules installed");
    wrapper.unmount();
  });
});
