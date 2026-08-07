<script setup lang="ts">
/* Status section — the summary grid (version / root / daemon / zygote) plus
 * the ptrace monitor status card. Polls every 6s like the old version, and
 * refreshes the shared header state (version · root, host badge). */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { fetchState, fmtVer, parseMonitor } from "../api/system";
import { useLocale } from "../composables/useLocale";
import { useSystemState } from "../composables/useSystemState";
import Card from "../components/atoms/Card.vue";
import type { MonitorRow } from "../types";

const { t } = useLocale();
const { state, refreshHost } = useSystemState();

const loading = ref(true);
const error = ref<string | null>(null);
const monitor = ref<MonitorRow[]>([]);
const version = ref("");
const root = ref("");
const daemonUp = ref(false);
const zygotes = ref<string[]>([]);

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
    const k = d.keys;
    version.value = k.version ?? "";
    root.value = k.root ?? "";
    daemonUp.value = k.daemon === "1";
    zygotes.value = [
      k.z64 === "1" ? "64-bit" : null,
      k.z32 === "1" ? "32-bit" : null,
    ].filter((v): v is string => v !== null);

    // header globals
    state.version = fmtVer(k.version);
    state.root = k.root || "unknown";
    refreshHost();

    monitor.value = parseMonitor(d.monitor);
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

const items = computed(() => [
  [t("status.version"), fmtVer(version.value), ""],
  [t("status.root"), root.value || "?", ""],
  [
    t("status.daemon"),
    daemonUp.value ? t("status.running") : t("status.stopped"),
    daemonUp.value ? "ok" : "err",
  ],
  [
    t("status.zygote"),
    zygotes.value.length ? zygotes.value.join(" · ") : t("status.none"),
    zygotes.value.length ? "ok" : "warn",
  ],
]);

onMounted(() => {
  load();
  timer = window.setInterval(load, 6000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.status") }}</h2>
    <div class="status-grid">
      <div v-for="[label, value, cls] in items" :key="label" class="status-item">
        <div class="label">{{ label }}</div>
        <div class="val" :class="cls">{{ value }}</div>
      </div>
    </div>

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
/* ── status grid ── */
.status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.status-item {
  background: var(--surface); border: 2px solid var(--border-strong); border-radius: var(--radius);
  padding: 14px 16px; box-shadow: var(--shadow);
}
.status-item .label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: .5px; }
.status-item .val { font-size: 17px; font-weight: 700; margin-top: 3px; }
.status-item .val.ok { color: var(--green); }
.status-item .val.err { color: var(--red); }
.status-item .val.warn { color: var(--orange); }

/* ── monitor rows (structured status text) ── */
.monitor-list { display: flex; flex-direction: column; gap: 2px; }
.monitor-row { display: flex; align-items: baseline; gap: 10px; padding: 3px 0; }
.monitor-row .m-label {
  flex: 0 0 96px; font-family: var(--mono); font-size: 12px;
  color: var(--text3); text-transform: uppercase; letter-spacing: .3px;
}
.monitor-row .m-val { font-size: 13px; font-weight: 600; word-break: break-all; }
.monitor-row .m-val.ok { color: var(--green); }
.monitor-row .m-val.err { color: var(--red); }
.monitor-row .m-val.warn { color: var(--orange); }
.monitor-detail {
  padding: 1px 0 1px 106px; font-family: var(--mono); font-size: 12px;
  color: var(--text2); word-break: break-all;
}
.monitor-empty { color: var(--text3); font-size: 13px; padding: 4px 0; }

@media (max-width: 400px) { .status-grid { grid-template-columns: 1fr; } }
</style>
