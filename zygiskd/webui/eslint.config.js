// OnyxZygisk WebUI — ESLint 9+ flat config (create-vue style).
import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/node_modules/**", "public/**"],
  },
  ...pluginVue.configs["flat/essential"],
  ...vueTsEslintConfig(),
  {
    name: "app/rules",
    files: ["**/*.{ts,vue}"],
    rules: {
      // Atoms are single-word by design (Btn, Card, Switch, Pill, Toolbar).
      "vue/multi-word-component-names": "off",
    },
  },
  skipFormatting,
];
