<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { fetchState, parseMonitor } from "../api/system";
import { useLocale } from "../composables/useLocale";
import { useRoot } from "../composables/useRoot";
import Card from "../components/atoms/Card.vue";
import type { MonitorRow } from "../types";

const { t } = useLocale();
const { setRoot } = useRoot();

const loading = ref(true);
const error = ref<string | null>(null);
const monitor = ref<MonitorRow[]>([]);

let timer: number | undefined;

function valClass(v: string): string {
  if (/not injected|stopped|exited|crashed|invalid/i.test(v)) return "err";
  if (/tracing|injected|running/i.test(v)) return "ok";
  if (/unknown/i.test(v)) return "warn";
  return "";
}

async function load() {
  try {
    const d = await fetchState();
    setRoot(d.keys.root || "");
    monitor.value = parseMonitor(d.monitor);
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  timer = window.setInterval(load, 6000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.status") }}</h2>
    <Card :title="t('status.monitor')">
      <div v-if="loading" class="monitor-empty">{{ t("common.loading") }}</div>
      <div v-else-if="error" class="monitor-empty">Error: {{ error }}</div>
      <div v-else-if="monitor.length" class="monitor-list">
        <div v-for="(r, i) in monitor" :key="i">
          <div v-if="r.label" class="monitor-row">
            <div class="m-label">{{ r.label }}</div>
            <div class="m-val" :class="valClass(r.value)">{{ r.value }}</div>
          </div>
          <div v-else class="monitor-detail">{{ r.value }}</div>
        </div>
      </div>
      <div v-else class="monitor-empty">{{ t("status.noStatus") }}</div>
    </Card>
  </section>
</template>

<style scoped>
.monitor-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.monitor-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 3px 0;
}
.monitor-row .m-label {
  flex: 0 0 96px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.monitor-row .m-val {
  font-size: 13px;
  font-weight: 600;
  word-break: break-all;
}
.monitor-row .m-val.ok {
  color: var(--green);
}
.monitor-row .m-val.err {
  color: var(--red);
}
.monitor-row .m-val.warn {
  color: var(--orange);
}
.monitor-detail {
  padding: 1px 0 1px 106px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text2);
  word-break: break-all;
}
.monitor-empty {
  color: var(--text3);
  font-size: 13px;
  padding: 4px 0;
}
</style>
