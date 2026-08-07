/* OnyxZygisk — single-page loader (Zygisk Next style: one fixed, scrollable page).
 * Every section (js/pages/<id>/{index.html,index.css,index.js}) is loaded once and
 * stacked into #page_content. There is no navigation — all sections are always visible.
 * Each page module may export render(ctx). i18n {{}} placeholders are solved on load and
 * re-solved on language change. Page DOM is scoped under its own section body.
 */
"use strict";

import { solveStrings, t } from "./i18n.js";
import { exec } from "./bridge.js";
import { el, clear } from "./dom.js";

/* Order on the single page (Basic status first, settings last). */
export const SECTIONS = ["status", "modules", "fn", "apatch", "logs", "settings"];

const roots = {};        // id -> section body element
const mods = {};         // id -> page module
const originalHTML = {}; // id -> raw (unsolved) fragment html

function makeCtx(id) {
  const root = roots[id];
  return {
    root, t, exec, el, clear,
    qs: (sel) => root.querySelector(sel),
    qsa: (sel) => Array.from(root.querySelectorAll(sel)),
  };
}

async function fetchText(url) {
  try { return await fetch(url).then((r) => (r.ok ? r.text() : "")); }
  catch (e) { return ""; }
}

export async function boot() {
  const container = document.getElementById("page_content");
  for (const id of SECTIONS) {
    const html = await fetchText(`js/pages/${id}/index.html`);
    const css = await fetchText(`js/pages/${id}/index.css`);

    if (css) {
      const style = document.createElement("style");
      style.dataset.page = id;
      style.textContent = css;
      document.head.appendChild(style);
    }

    const section = el("section", "section");
    section.id = `section-${id}`;
    const title = el("h2", "section-title", t("navbar." + id));
    title.dataset.sec = id;
    const body = el("div", "section-body");
    originalHTML[id] = html;
    body.innerHTML = solveStrings(html);
    section.append(title, body);
    container.appendChild(section);
    roots[id] = body;

    try { mods[id] = await import(`./pages/${id}/index.js`); }
    catch (e) { console.error(`section ${id} failed to load`, e); mods[id] = {}; }

    if (mods[id] && mods[id].render) {
      try { await mods[id].render(makeCtx(id)); } catch (e) { console.error(e); }
    }
  }
}

/** Re-apply translations to every section after a language change. */
export function retranslateAll() {
  for (const id of SECTIONS) {
    const titleEl = document.querySelector(`.section-title[data-sec="${id}"]`);
    if (titleEl) titleEl.textContent = t("navbar." + id);
    roots[id].innerHTML = solveStrings(originalHTML[id]);
    if (mods[id] && mods[id].render) {
      try { mods[id].render(makeCtx(id)); } catch (e) { console.error(e); }
    }
  }
}
