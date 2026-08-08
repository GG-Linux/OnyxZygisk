import { describe, expect, it } from "vitest";
import { fmtVer, parseMonitor, parseStatus } from "./system";

describe("parseStatus", () => {
  const sample = [
    "version=v1.0",
    "root=KernelSU",
    "z64=1",
    "daemon=1",
    "@@monitor",
    "\tOnyxZygisk\tv1.0",
    "\tmonitor:\ttracing",
    "",
    "@@modules",
    "M|playintegrityfix|Play Integrity Fix|v18.8|chiteroman|1|0|修复认证|0|0",
    "M|tricky_store|Tricky Store|v1.2.1|5ec1cff|1|1|在 TEE 上伪造 keybox|0|0",
    "@@fn",
    "F|net_guard|网络守卫|1.0|app|com.bank.*|enabled",
    "F|prop_shield|属性护盾|2.1|system_server|all|disabled",
  ].join("\n");

  it("parses the key=value header block", () => {
    const d = parseStatus(sample);
    expect(d.keys.version).toBe("v1.0");
    expect(d.keys.root).toBe("KernelSU");
    expect(d.keys.z64).toBe("1");
    expect(d.keys.daemon).toBe("1");
  });

  it("captures the raw monitor text", () => {
    const d = parseStatus(sample);
    expect(d.monitor).toContain("monitor:");
    expect(d.monitor).toContain("tracing");
  });

  it("parses module records", () => {
    const d = parseStatus(sample);
    expect(d.modules).toHaveLength(2);
    expect(d.modules[0]).toEqual({
      id: "playintegrityfix",
      name: "Play Integrity Fix",
      version: "v18.8",
      author: "chiteroman",
      zygisk: true,
      disabled: false,
      desc: "修复认证",
      pendingUpdate: false,
      hotplugEnabled: false,
    });
    expect(d.modules[1].disabled).toBe(true);
  });

  it("parses FN node records", () => {
    const d = parseStatus(sample);
    expect(d.fns).toHaveLength(2);
    expect(d.fns[0]).toEqual({
      id: "net_guard",
      name: "网络守卫",
      version: "1.0",
      trigger: "app",
      scope: "com.bank.*",
      status: "enabled",
    });
    expect(d.fns[1].status).toBe("disabled");
  });

  it("handles empty output", () => {
    const d = parseStatus("");
    expect(d.keys).toEqual({});
    expect(d.monitor).toBe("");
    expect(d.modules).toEqual([]);
    expect(d.fns).toEqual([]);
  });
});

describe("parseMonitor", () => {
  it("skips module metadata lines", () => {
    const text = ["\tversion=v1.0", "\tmonitor:\ttracing"].join("\n");
    const rows = parseMonitor(text);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ label: "monitor", value: "tracing" });
  });

  it("splits label rows from plain detail lines", () => {
    const text = [
      "\tzygote64:\tinjected",
      "\tRoot: APatch",
      "\tModules (2):",
      "\t\tplayintegrityfix",
    ].join("\n");
    const rows = parseMonitor(text);
    expect(rows[0]).toEqual({ label: "zygote64", value: "injected" });
    expect(rows[1]).toEqual({ label: null, value: "Root: APatch" });
    expect(rows[2]).toEqual({ label: null, value: "Modules (2):" });
  });

  it("ignores blank lines", () => {
    expect(parseMonitor("\n\n\t\n")).toEqual([]);
  });

  it("handles undefined/empty input", () => {
    expect(parseMonitor("")).toEqual([]);
    expect(parseMonitor(undefined as unknown as string)).toEqual([]);
  });
});

describe("fmtVer", () => {
  it("adds a leading v", () => {
    expect(fmtVer("1.2.3")).toBe("v1.2.3");
  });

  it("normalizes an existing v/V prefix", () => {
    expect(fmtVer("v2.0")).toBe("v2.0");
    expect(fmtVer("V3.1")).toBe("v3.1");
  });

  it("falls back for missing values", () => {
    expect(fmtVer("")).toBe("v?");
    expect(fmtVer(undefined)).toBe("v?");
  });
});
