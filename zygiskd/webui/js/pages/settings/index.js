/* Settings page — theme + language */
import { applyTheme, getThemePref, setThemePref } from "../../theme.js";
import { availableLocales, getLocale, setLocalePref, loadLang } from "../../i18n.js";
import { retranslateAll } from "../../router.js";

let ctx;

export function render(c) {
  ctx = c;

  const themeSel = ctx.qs("[data-role=theme]");
  themeSel.value = getThemePref();
  themeSel.addEventListener("change", () => {
    setThemePref(themeSel.value);
    applyTheme(themeSel.value);
  });

  const langSel = ctx.qs("[data-role=lang]");
  ctx.clear(langSel);
  availableLocales().forEach(([code, name]) => {
    const opt = ctx.el("option", undefined, name);
    opt.value = code;
    langSel.append(opt);
  });
  langSel.value = getLocale();
  langSel.addEventListener("change", async () => {
    setLocalePref(langSel.value);
    await loadLang(langSel.value);
    retranslateAll();
  });
}
