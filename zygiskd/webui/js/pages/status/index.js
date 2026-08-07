/* Status page */
import { fetchState, fmtVer, parseMonitor } from "../../data.js";
import { detectBridge } from "../../bridge.js";

let ctx;
let timer = null;

export function render(c) {
  ctx = c;
  load();
  clearInterval(timer);
  timer = setInterval(load, 6000);
}

export function hide() { clearInterval(timer); }

function valClass(v) {
  if (/not injected|stopped|exited|crashed|invalid/i.test(v)) return "err";
  if (/tracing|injected|running/i.test(v)) return "ok";
  if (/unknown/i.test(v)) return "warn";
  return "";
}

/* Monitor rows: label/value pairs with the value colored by state; detail
 * lines (daemon info, module list) render dimmed without a label. */
function renderMonitor(mon, text) {
  const rows = parseMonitor(text);
  ctx.clear(mon);
  if (!rows.length) {
    mon.append(ctx.el("div", "monitor-empty", ctx.t("status.noStatus")));
    return;
  }
  for (const r of rows) {
    if (r.label) {
      const row = ctx.el("div", "monitor-row");
      row.append(
        ctx.el("div", "m-label", r.label),
        ctx.el("div", "m-val " + valClass(r.value), r.value)
      );
      mon.append(row);
    } else {
      mon.append(ctx.el("div", "monitor-detail", r.value));
    }
  }
}

async function load() {
  if (!ctx) return;
  const grid = ctx.qs("[data-role=grid]");
  const mon = ctx.qs("[data-role=monitor]");
  try {
    const d = await fetchState();
    const k = d.keys;

    // header globals
    document.getElementById("header-sub").textContent = fmtVer(k.version) + " · " + (k.root || "unknown");
    const badge = document.getElementById("host-badge");
    const host = detectBridge();
    badge.textContent = host === "ksu" ? "KSU" : host === "mmrl" ? "MMRL" : "DEV";
    badge.className = "header-badge" + (host ? " ok" : "");

    const up = k.daemon === "1";
    const zy = [k.z64 === "1" ? "64-bit" : null, k.z32 === "1" ? "32-bit" : null].filter(Boolean);
    const items = [
      [ctx.t("status.version"), fmtVer(k.version), ""],
      [ctx.t("status.root"), k.root || "?", ""],
      [ctx.t("status.daemon"), up ? ctx.t("status.running") : ctx.t("status.stopped"), up ? "ok" : "err"],
      [ctx.t("status.zygote"), zy.length ? zy.join(" · ") : ctx.t("status.none"), zy.length ? "ok" : "warn"],
    ];
    ctx.clear(grid);
    items.forEach(([label, value, cls]) => {
      const it = ctx.el("div", "status-item");
      it.append(ctx.el("div", "label", label), ctx.el("div", "val" + (cls ? " " + cls : ""), value));
      grid.append(it);
    });
    renderMonitor(mon, d.monitor);
  } catch (e) {
    ctx.clear(mon);
    mon.append(ctx.el("div", "monitor-empty", "Error: " + e.message));
  }
}
