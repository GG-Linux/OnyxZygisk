/* Modules page */
import { fetchState, fmtVer } from "../../data.js";

let ctx;

export function render(c) {
  ctx = c;
  const btn = ctx.qs("[data-role=refresh]");
  if (btn) btn.addEventListener("click", load);
  load();
}

async function load() {
  const list = ctx.qs("[data-role=list]");
  ctx.clear(list);
  list.append(ctx.el("div", "empty", ctx.t("common.loading")));
  try {
    const d = await fetchState();
    ctx.clear(list);
    if (!d.modules.length) {
      list.append(ctx.el("div", "empty", ctx.t("modules.empty")));
      return;
    }
    d.modules.forEach((m) => {
      const card = ctx.el("div", "mod-card");
            const body = ctx.el("div", "mod-body");
      body.append(
        ctx.el("div", "mod-name", m.name || m.id),
        ctx.el("div", "mod-meta", `${fmtVer(m.version)} · ${m.author || ctx.t("modules.unknownAuthor")}`)
      );
      if (m.desc) body.append(ctx.el("div", "mod-desc", m.desc));
      const tags = ctx.el("div", "mod-tags");
      if (m.zygisk) tags.append(ctx.el("span", "pill pill-primary", "Zygisk"));
      tags.append(ctx.el("span", "pill " + (m.disabled ? "pill-gray" : "pill-green"),
        m.disabled ? ctx.t("common.disabled") : ctx.t("common.enabled")));
      body.append(tags);
      card.append(body);
      list.append(card);
    });
  } catch (e) {
    ctx.clear(list);
    list.append(ctx.el("div", "empty", "Error: " + e.message));
  }
}
