<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchState, fmtVer } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Btn from "./atoms/Btn.vue";
import Card from "./atoms/Card.vue";
import Toolbar from "./atoms/Toolbar.vue";
import type { ModuleInfo } from "../types";

const { t } = useLocale();

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
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.modules") }}</h2>

    <Toolbar>
      <Btn @click="load">{{ t("common.refresh") }}</Btn>
      <span class="hint">{{ t("modules.hint") }}</span>
    </Toolbar>

    <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
    <div v-else-if="error" class="empty">Error: {{ error }}</div>
    <div v-else-if="!modules.length" class="empty">{{ t("modules.empty") }}</div>
    <Card v-else>
      <div
        v-for="(m, i) in modules"
        :key="m.id"
        class="mod-row"
        :class="{ 'mod-row--border': i > 0 }"
      >
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
    </Card>
  </section>
</template>

<style scoped>
.mod-row { padding: 10px 0; }
.mod-row--border { border-top: 1px solid var(--border); }
.mod-row__main { display: flex; align-items: baseline; gap: 8px; }
.mod-row__name { font-size: 14px; font-weight: 600; }
.mod-row__ver { font-size: 12px; color: var(--text3); }
.mod-row__desc { font-size: 12px; color: var(--text2); margin-top: 2px; }
.mod-row__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.mod-row__author { font-size: 11px; color: var(--text3); }
.mod-row__status { font-size: 11px; font-weight: 500; }
.mod-row__status.on { color: var(--green); }
.mod-row__status.off { color: var(--text3); }
</style>
