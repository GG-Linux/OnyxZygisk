/* OnyxZygisk — app entry. Wires theme, i18n, router and the bottom navbar. */
"use strict";

import { applyTheme, getThemePref, watchSystem } from "./theme.js";
import { loadLang, getLocale } from "./i18n.js";
import { boot, navigate, updateNavbarLabels } from "./router.js";
import { detectBridge } from "./bridge.js";

(async () => {
  applyTheme(getThemePref());
  watchSystem();

  await loadLang(getLocale());
  await boot();
  updateNavbarLabels();

  // header bridge badge (status page refreshes it later with more detail)
  const badge = document.getElementById("host-badge");
  const host = detectBridge();
  badge.textContent = host === "ksu" ? "KSU" : host === "mmrl" ? "MMRL" : "DEV";
  if (host) badge.classList.add("ok");

  document.getElementById("navbar").addEventListener("click", (e) => {
    const item = e.target.closest(".nav-item");
    if (item) navigate(item.dataset.page);
  });

  navigate("status");
})();
