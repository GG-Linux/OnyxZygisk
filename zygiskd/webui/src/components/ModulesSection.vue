<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { fetchState, fmtVer } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Card from "./atoms/Card.vue";
import type { ModuleInfo } from "../types";

const { t, locale } = useLocale();

const modules = ref<ModuleInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  try {
    const d = await fetchState();
    modules.value = d.modules;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
// Reload on language switch (dev mock data follows the locale).
watch(locale, () => load());
</script>

<template>
  <section class="section">
    <div class="section-head">
      <h2 class="section-title">{{ t("navbar.modules") }}</h2>
      <span class="hint">{{ t("modules.hint") }}</span>
    </div>

    <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
    <div v-else-if="error" class="empty">{{ t("common.error") }}: {{ error }}</div>
    <div v-else-if="!modules.length" class="empty">{{ t("modules.empty") }}</div>
    <Card v-else>
      <div v-for="m in modules" :key="m.id" class="mod-row list-row">
        <div class="mod-row__main">
          <span class="mod-row__name">{{ m.name || m.id }}</span>
          <span class="mod-row__ver">{{ fmtVer(m.version) }}</span>
        </div>
        <div v-if="m.desc" class="mod-row__desc">{{ m.desc }}</div>
        <div class="mod-row__foot">
          <span class="mod-row__author">{{ m.author || t("modules.unknownAuthor") }}</span>
          <span class="mod-row__status" :class="m.disabled ? 'off' : 'on'">
            {{ m.disabled ? t("common.disabled") : t("common.enabled") }}
          </span>
        </div>
      </div>
      <button type="button" class="link-btn" @click="load">{{ t("common.refresh") }}</button>
    </Card>
  </section>
</template>

<style scoped>
.mod-row__main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.mod-row__name {
  font-size: 14px;
  font-weight: 600;
}
.mod-row__ver {
  font-size: 12px;
  color: var(--text3);
}
.mod-row__desc {
  font-size: 12px;
  color: var(--text2);
  margin-top: 2px;
}
.mod-row__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.mod-row__author {
  font-size: 11px;
  color: var(--text3);
}
.mod-row__status {
  font-size: 11px;
  font-weight: 500;
}
.mod-row__status.on {
  color: var(--green);
}
.mod-row__status.off {
  color: var(--text3);
}
</style>
