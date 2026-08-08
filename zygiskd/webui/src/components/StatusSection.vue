<script setup lang="ts">
/* Status section — the live monitor card. System state (including the hero
 * in App.vue) comes from the shared MONITOR_STATE_KEY instance; when mounted
 * standalone (unit tests) a local instance is created instead.
 */
import { computed, inject } from "vue";
import { useLocale } from "../composables/useLocale";
import { MONITOR_STATE_KEY, useMonitorState } from "../composables/useMonitorState";
import type { MonitorState } from "../composables/useMonitorState";
import type { MonitorRow } from "../types";
import Card from "./atoms/Card.vue";

const { t } = useLocale();
// `null` default silences the injection warning when mounted standalone.
const state = inject<MonitorState | null>(MONITOR_STATE_KEY, null) ?? useMonitorState();
const { loading, error, monitor } = state;

function valClass(v: string): string {
  if (/not injected|stopped|exited|crashed|invalid/i.test(v)) return "err";
  if (/tracing|injected|running/i.test(v)) return "ok";
  if (/unknown/i.test(v)) return "warn";
  return "";
}

/** Display length of a row ("label: value" for labeled rows). */
function rowLen(r: MonitorRow): number {
  return r.label ? r.label.length + 2 + r.value.length : r.value.length;
}

/** Monitor rows render from the shortest line to the longest. */
const sortedMonitor = computed(() =>
  [...monitor.value].sort((a, b) => rowLen(a) - rowLen(b)),
);
</script>

<template>
  <section class="section">
    <Card :title="t('navbar.status')">
      <div v-if="loading" class="monitor-empty">{{ t("common.loading") }}</div>
      <div v-else-if="error" class="monitor-empty">{{ t("common.error") }}: {{ error }}</div>
      <div v-else-if="monitor.length" class="monitor-list">
        <div v-for="(r, i) in sortedMonitor" :key="i">
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
  padding: 4px 0;
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
  color: var(--text3);
  word-break: break-all;
}
.monitor-empty {
  color: var(--text3);
  font-size: 13px;
  padding: 4px 0;
}
</style>
