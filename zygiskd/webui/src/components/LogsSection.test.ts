import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LogsSection from "./LogsSection.vue";

vi.mock("../api/system", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/system")>();
  return { ...actual, fetchLogs: vi.fn() };
});

import { fetchLogs } from "../api/system";

beforeEach(() => {
  vi.mocked(fetchLogs).mockResolvedValue("I/zygiskd: hello");
});

describe("LogsSection", () => {
  it("loads and displays the log output", async () => {
    const wrapper = mount(LogsSection);
    await flushPromises();
    expect(fetchLogs).toHaveBeenCalled();
    expect(wrapper.find("pre.log-box").text()).toContain("I/zygiskd: hello");
    wrapper.unmount();
  });

  it("shows the empty placeholder when there is no output", async () => {
    vi.mocked(fetchLogs).mockResolvedValue("");
    const wrapper = mount(LogsSection);
    await flushPromises();
    expect(wrapper.find("pre.log-box").text()).toBe("(no logs)");
    wrapper.unmount();
  });

  it("shows an error message on failure", async () => {
    vi.mocked(fetchLogs).mockRejectedValueOnce(new Error("logcat failed"));
    const wrapper = mount(LogsSection);
    await flushPromises();
    expect(wrapper.find("pre.log-box").text()).toContain("Error: logcat failed");
    wrapper.unmount();
  });
});
