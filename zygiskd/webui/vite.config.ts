// Vite configuration for the OnyxZygisk WebUI.
//
// The module ships the built `dist/` as the KernelSU `webroot/` directory,
// which root manager apps (KernelSU / APatch / MMRL) load directly from their
// WebView — there is no server and no network. Two settings matter:
//
//  * `base: './'` — all emitted asset/module URLs are relative, so the page
//    works regardless of the path/scheme the host WebView resolves.
//  * `modulePreload: false` — the previous (pre-Vue) version already relied on
//    native ES modules + dynamic `import()` and is proven to work in the host
//    WebViews; disabling Vite's module-preload links keeps the output as close
//    to that proven shape as possible (no extra file:// fetches up front).
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  build: {
    target: "es2020",
    outDir: "dist",
    modulePreload: false,
    assetsInlineLimit: 4096,
  },
});
