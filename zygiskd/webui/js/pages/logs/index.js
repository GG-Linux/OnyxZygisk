/* Logs page — auto-refresh keeps the scroll position stable so the view
 * does not "jump" while reading (the pre-fix behaviour reset textContent and
 * snapped the scroll to the top every 8s). */
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
    const prev = out.textContent;
    const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 48;
    const scrollTop = out.scrollTop;

    const text = await fetchLogs(lines);
    const next = text || ctx.t("logs.empty");
    if (next === prev) return; // no change: keep everything as-is

    out.textContent = next;
    // Follow new output when pinned to the bottom, otherwise keep the
    // reader's position so the content does not jump around.
    if (atBottom) {
      out.scrollTop = out.scrollHeight;
    } else {
      out.scrollTop = scrollTop;
    }
  } catch (e) {
    out.textContent = "Error: " + e.message;
  }
}
