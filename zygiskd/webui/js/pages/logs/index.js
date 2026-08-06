/* Logs page */
import { fetchLogs } from "../../data.js";

let ctx;
let timer = null;

export function render(c) {
  ctx = c;
  const btn = ctx.qs("[data-role=refresh]");
  if (btn) btn.addEventListener("click", load);
  load();
  clearInterval(timer);
  timer = setInterval(() => {
    const auto = ctx.qs("[data-role=auto]");
    if (auto && auto.checked) load();
  }, 8000);
}

export function hide() { clearInterval(timer); }

async function load() {
  const out = ctx.qs("[data-role=out]");
  const lines = ctx.qs("[data-role=lines]").value || 200;
  try {
    const text = await fetchLogs(lines);
    out.textContent = text || ctx.t("logs.empty");
  } catch (e) {
    out.textContent = "Error: " + e.message;
  }
}
