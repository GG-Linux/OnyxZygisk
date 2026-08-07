/* OnyxZygisk — app entry. Single fixed page: set theme + i18n, then load all sections. */
"use strict";

import { applyTheme, getThemePref, watchSystem } from "./theme.js";
import { loadLang, getLocale } from "./i18n.js";
import { boot } from "./router.js";
import { detectBridge } from "./bridge.js";

(async () => {
  applyTheme(getThemePref());
  watchSystem();

  await loadLang(getLocale());

  const badge = document.getElementById("host-badge");
  const host = detectBridge();
  badge.textContent = host === "ksu" ? "KSU" : host === "mmrl" ? "MMRL" : "DEV";
  if (host) badge.classList.add("ok");

  await boot();
})();
