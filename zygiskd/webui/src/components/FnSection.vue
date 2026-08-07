<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchState, fmtVer, setFnEnabled } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Card from "./atoms/Card.vue";
import Switch from "./atoms/Switch.vue";
import type { FnNodeInfo } from "../types";

const { t } = useLocale();

const nodes = ref<FnNodeInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const msg = ref("");

async function load() {
  loading.value = true;
  try {
    const d = await fetchState();
    nodes.value = d.fns;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function toggle(n: FnNodeInfo, enabled: boolean) {
  msg.value = "";
  try {
    await setFnEnabled(n.id, enabled);
    msg.value = t(enabled ? "fn.enabledMsg" : "fn.disabledMsg").replace("%s", n.id);
    await load();
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);
</script>

<template>
  <section class="section">
    <div class="section-head">
      <h2 class="section-title">{{ t("navbar.fn") }}</h2>
      <span class="hint">{{ t("fn.hint") }}</span>
    </div>

    <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
    <div v-else-if="error" class="empty">Error: {{ error }}</div>
    <div v-else-if="!nodes.length" class="empty">{{ t("fn.empty") }}</div>
    <Card v-else>
      <div v-for="(n, i) in nodes" :key="n.id" class="fn-row" :class="{ 'fn-row--border': i > 0 }">
        <div class="fn-row__left">
          <div class="fn-row__main">
            <span class="fn-row__name">{{ n.name || n.id }}</span>
            <span class="fn-row__ver">{{ fmtVer(n.version) }}</span>
          </div>
          <div class="fn-row__meta">{{ n.trigger || "app" }} / {{ n.scope || "all" }}</div>
        </div>
        <Switch :checked="n.status === 'enabled'" @update:checked="toggle(n, $event)" />
      </div>
      <div class="refresh-link" @click="load">{{ t("common.refresh") }}</div>
    </Card>

    <div class="msg">{{ msg }}</div>
  </section>
</template>

<style scoped>
.section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 2px 10px;
}
.section-head .section-title {
  margin: 0;
}
.fn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  gap: 12px;
}
.fn-row--border {
  border-top: 1px solid var(--border);
}
.fn-row__left {
  flex: 1;
  min-width: 0;
}
.fn-row__main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.fn-row__name {
  font-size: 14px;
  font-weight: 600;
}
.fn-row__ver {
  font-size: 12px;
  color: var(--text3);
}
.fn-row__meta {
  font-size: 11px;
  color: var(--text3);
  margin-top: 2px;
}
.refresh-link {
  padding-top: 4px;
  font-size: 10px;
  color: var(--text3);
  cursor: pointer;
  text-align: left;
  opacity: 0.4;
}
.refresh-link:hover {
  color: var(--primary);
  opacity: 0.8;
}
</style>
