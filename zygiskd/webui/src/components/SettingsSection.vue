<script setup lang="ts">
/* Settings section — theme + language. */
import { ref } from "vue";
import { useLocale } from "../composables/useLocale";
import type { LocaleCode } from "../composables/useLocale";
import { THEMES, applyTheme, getThemePref, setThemePref } from "../composables/useTheme";
import type { ThemePref } from "../composables/useTheme";
import Card from "./atoms/Card.vue";

const { t, locale, setLocale, availableLocales } = useLocale();

const theme = ref<ThemePref>(getThemePref());

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function onTheme(e: Event): void {
  const v = (e.target as HTMLSelectElement).value as ThemePref;
  theme.value = v;
  setThemePref(v);
  applyTheme(v);
}

function onLang(e: Event): void {
  setLocale((e.target as HTMLSelectElement).value as LocaleCode);
}
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.settings") }}</h2>

    <Card :title="t('settings.appearance')">
      <div class="setting-row">
        <span class="s-label">{{ t("settings.theme") }}</span>
        <select :value="theme" @change="onTheme">
          <option v-for="th in THEMES" :key="th" :value="th">
            {{ t(`settings.theme${cap(th)}`) }}
          </option>
        </select>
      </div>
      <div class="setting-row">
        <span class="s-label">{{ t("settings.language") }}</span>
        <select :value="locale" @change="onLang">
          <option v-for="[code, name] in availableLocales" :key="code" :value="code">
            {{ name }}
          </option>
        </select>
      </div>
    </Card>

    <!-- <Card :title="t('settings.about')">
      <p class="hint">{{ t("settings.aboutText") }}</p>
    </Card> -->
  </section>
</template>

<style scoped>
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; }
.setting-row + .setting-row { border-top: 1px solid var(--border); }
.setting-row .s-label { font-size: 14px; }
</style>
