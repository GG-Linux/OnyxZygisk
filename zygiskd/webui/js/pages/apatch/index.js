/* APatch page — apd status + package_config management (deeper than the
 * official manager: full allow/exclude editing, uid ranges, atomic writes). */
import { fetchApatch, savePackageConfig, pkgToUid } from "../../data.js";
import { exec } from "../../bridge.js";

let ctx;
let rows = [];

export function render(c) {
  ctx = c;
  const addBtn = ctx.qs("[data-role=add]");
  if (addBtn) addBtn.addEventListener("click", addPkg);
  load();
}

async function load() {
  if (!ctx) return;
  const stats = ctx.qs("[data-role=stats]");
  const tbody = ctx.qs("[data-role=rows]");
  const apdOut = ctx.qs("[data-role=apdmodules]");
  try {
    const d = await fetchApatch();
    rows = d.rows;

    ctx.clear(stats);
    const cards = [
      [ctx.t("apatch.apdVersion"), d.apdVer || "-", ""],
      [ctx.t("apatch.apdRunning"), d.apdRun ? ctx.t("status.running") : ctx.t("status.stopped"), d.apdRun ? "ok" : "err"],
      [ctx.t("apatch.configCount"), String(d.cfgCount), ""],
    ];
    cards.forEach(([label, value, cls]) => {
      const it = ctx.el("div", "status-item");
      it.append(ctx.el("div", "label", label), ctx.el("div", "val" + (cls ? " " + cls : ""), value));
      stats.append(it);
    });

    ctx.clear(tbody);
    if (!rows.length) {
      const tr = ctx.el("tr");
      const td = ctx.el("td", "empty", ctx.t("apatch.empty"));
      td.colSpan = 5;
      tr.append(td);
      tbody.append(tr);
    }
    rows.forEach((r, idx) => {
      const tr = ctx.el("tr");
      tr.append(ctx.el("td", "", r.pkg), ctx.el("td", "", String(r.uid)));
      const allowCell = ctx.el("td");
      const allowSw = toggle(r.allow, () => { r.allow = !r.allow; return persist(); });
      allowCell.append(allowSw);
      tr.append(allowCell);
      const exclCell = ctx.el("td");
      const exclSw = toggle(r.exclude, () => { r.exclude = !r.exclude; return persist(); });
      exclCell.append(exclSw);
      tr.append(exclCell);
      const rm = ctx.el("button", "btn btn-sm btn-danger", ctx.t("apatch.remove"));
      rm.addEventListener("click", async () => {
        rows.splice(idx, 1);
        await persist();
      });
      const cell = ctx.el("td");
      cell.append(rm);
      tr.append(cell);
      tbody.append(tr);
    });

    apdOut.textContent = d.apdModules.trim() || ctx.t("apatch.noModules");
  } catch (e) {
    ctx.qs("[data-role=msg]").textContent = e.message;
  }
}

/** 开关组件：切换时执行 onChange 并在失败时回滚。 */
function toggle(initial, onChange) {
  const sw = ctx.el("label", "switch");
  const cb = ctx.el("input");
  cb.type = "checkbox";
  cb.checked = initial;
  cb.addEventListener("change", async () => {
    cb.disabled = true;
    try {
      await onChange();
    } catch (e) {
      cb.checked = !cb.checked; // 回滚
      ctx.qs("[data-role=msg]").textContent = e.message;
    } finally {
      cb.disabled = false;
    }
  });
  sw.append(cb, ctx.el("span", "slider"));
  return sw;
}

async function persist() {
  const msg = ctx.qs("[data-role=msg]");
  try {
    await savePackageConfig(rows);
    msg.textContent = ctx.t("apatch.saved");
    msg.className = "msg ok";
    load();
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "msg err";
    load(); // 重新加载真实状态
    throw e;
  }
}

async function addPkg() {
  const msg = ctx.qs("[data-role=msg]");
  const input = ctx.qs("[data-role=pkg]");
  const pkg = input.value.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9._]*$/.test(pkg)) {
    msg.textContent = ctx.t("apatch.badPkg");
    msg.className = "msg err";
    return;
  }
  if (rows.some((r) => r.pkg === pkg)) {
    msg.textContent = ctx.t("apatch.exists");
    msg.className = "msg err";
    return;
  }
  const uid = await pkgToUid(pkg);
  if (!uid) {
    msg.textContent = ctx.t("apatch.noUid");
    msg.className = "msg err";
    return;
  }
  rows.push({ pkg, exclude: true, allow: true, uid, toUid: uid, sctx: "" });
  input.value = "";
  await persist();
}
