/* FN Nodes page */
import { fetchState, setFnEnabled, fmtVer } from "../../data.js";

let ctx;

export function render(c) {
  ctx = c;
  const btn = ctx.qs("[data-role=refresh]");
  if (btn) btn.addEventListener("click", load);
  load();
}

function statusPill(status) {
  return status === "enabled" ? "pill-green" : status === "disabled" ? "pill-gray" : "pill-orange";
}

async function load() {
  const list = ctx.qs("[data-role=list]");
  ctx.clear(list);
  list.append(ctx.el("div", "empty", ctx.t("common.loading")));
  try {
    const d = await fetchState();
    ctx.clear(list);
    if (!d.fns.length) {
      list.append(ctx.el("div", "empty", ctx.t("fn.empty")));
      return;
    }
    d.fns.forEach((n) => {
      const card = ctx.el("div", "mod-card");
            const body = ctx.el("div", "mod-body");
      body.append(
        ctx.el("div", "mod-name", n.name || n.id),
        ctx.el("div", "mod-meta", `${fmtVer(n.version)} · ${ctx.t("fn.trigger")}: ${n.trigger || "app"} · ${ctx.t("fn.scope")}: ${n.scope || "all"}`)
      );
      const tags = ctx.el("div", "mod-tags");
      tags.append(ctx.el("span", "pill " + statusPill(n.status), n.status));
      body.append(tags);
      card.append(body);

      const enabled = n.status === "enabled";
      const sw = ctx.el("label", "switch");
      const cb = ctx.el("input");
      cb.type = "checkbox";
      cb.checked = enabled;
      cb.addEventListener("change", () => toggle(n.id, cb.checked));
      sw.append(cb, ctx.el("span", "slider"));
      card.append(sw);

      list.append(card);
    });
  } catch (e) {
    ctx.clear(list);
    list.append(ctx.el("div", "empty", "Error: " + e.message));
  }
}

async function toggle(id, enabled) {
  const msg = ctx.qs("[data-role=msg]");
  try {
    await setFnEnabled(id, enabled);
    msg.textContent = ctx.t(enabled ? "fn.enabledMsg" : "fn.disabledMsg").replace("%s", id);
    load();
  } catch (e) {
    msg.textContent = e.message;
  }
}
