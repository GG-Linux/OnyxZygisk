/* OnyxZygisk — router. Convention-based pages: js/pages/<id>/{index.html,index.css,index.js}.
 * Strategy: preload every page once (HTML + CSS + JS module), then switch by visibility.
 * Per-page CSS is toggled via <style media>. i18n {{}} placeholders solved on load and
 * re-solved on language change. Each page module may export: render(ctx), hide().
 * Page DOM is scoped under its own root element; page code queries within ctx.root, so
 * there are no cross-page id collisions.
 */
"use strict";

import { solveStrings, t } from "./i18n.js";
import { exec } from "./bridge.js";
import { el, clear } from "./dom.js";

export const PAGES = ["status", "modules", "fn", "logs", "apatch", "settings"];

const roots = {};        // id -> container element
const mods = {};         // id -> page module
const originalHTML = {}; // id -> raw (unsolved) html
let current = null;

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
  for (const id of PAGES) {
    const html = await fetchText(`js/pages/${id}/index.html`);
    const css = await fetchText(`js/pages/${id}/index.css`);

    const root = el("div", "page");
    root.id = `page-${id}`;
    root.style.display = "none";
    originalHTML[id] = html;
    root.innerHTML = solveStrings(html);
    container.appendChild(root);
    roots[id] = root;

    if (css) {
      const style = document.createElement("style");
      style.dataset.page = id;
      style.media = "not all";
      style.textContent = css;
      document.head.appendChild(style);
    }

    try { mods[id] = await import(`./pages/${id}/index.js`); }
    catch (e) { console.error(`page ${id} failed to load`, e); mods[id] = {}; }
  }
}

export async function navigate(id) {
  if (!PAGES.includes(id) || current === id) return;

  if (current) {
    if (mods[current] && mods[current].hide) { try { mods[current].hide(); } catch (e) {} }
    roots[current].style.display = "none";
    const oldStyle = document.querySelector(`style[data-page="${current}"]`);
    if (oldStyle) oldStyle.media = "not all";
  }

  const style = document.querySelector(`style[data-page="${id}"]`);
  if (style) style.media = "all";
  roots[id].style.display = "block";

  document.querySelectorAll("#navbar .nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === id)
  );

  current = id;
  const mod = mods[id];
  if (mod && mod.render) { try { await mod.render(makeCtx(id)); } catch (e) { console.error(e); } }
}

/** Re-apply translations to every page after a language change. */
export function retranslateAll() {
  updateNavbarLabels();
  for (const id of PAGES) {
    roots[id].innerHTML = solveStrings(originalHTML[id]);
  }
  if (current && mods[current] && mods[current].render) {
    try { mods[current].render(makeCtx(current)); } catch (e) { console.error(e); }
  }
}

export function updateNavbarLabels() {
  document.querySelectorAll("#navbar .nav-item .nav-label").forEach((span) => {
    const key = span.dataset.nav;
    if (key) span.textContent = t("navbar." + key);
  });
}

export function currentPage() { return current; }
