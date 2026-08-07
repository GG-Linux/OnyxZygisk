<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { fetchState, fmtVer, parseMonitor } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Card from "../components/atoms/Card.vue";
import type { MonitorRow } from "../types";

const { t } = useLocale();

const loading = ref(true);
const error = ref<string | null>(null);
const monitor = ref<MonitorRow[]>([]);
const rootImpl = ref("");
const version = ref("");

let timer: number | undefined;

function valClass(v: string): string {
  if (/not injected|stopped|exited|crashed|invalid/i.test(v)) return "err";
  if (/tracing|injected|running/i.test(v)) return "ok";
  if (/unknown/i.test(v)) return "warn";
  return "";
}

/** Overall hero badge derived from the live monitor rows. */
const overall = computed(() => {
  if (loading.value) return { key: "common.loading", cls: "badge--idle", spin: true };
  if (error.value) return { key: "status.error", cls: "badge--err", spin: false };
  const vals = monitor.value.filter((r) => r.label).map((r) => r.value);
  if (!vals.length) return { key: "status.unknown", cls: "badge--idle", spin: false };
  if (vals.some((v) => valClass(v) === "err"))
    return { key: "status.stopped", cls: "badge--err", spin: false };
  if (vals.some((v) => valClass(v) === "ok"))
    return { key: "status.working", cls: "badge--ok", spin: false };
  return { key: "status.unknown", cls: "badge--warn", spin: false };
});

async function load() {
  try {
    const d = await fetchState();
    rootImpl.value = d.keys.root || "";
    version.value = d.keys.version || "";
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

    <div class="hero">
      <div class="hero__icon"><img src="/tux.png" alt="Tux" /></div>
      <div class="hero__body">
        <div class="hero__title">OnyxZygisk</div>
        <div class="hero__chips">
          <span v-if="rootImpl" class="chip chip--accent root-label">
            <span class="root-label__text">{{ rootImpl }}</span>
          </span>
          <span v-if="version" class="chip">{{ fmtVer(version) }}</span>
        </div>
      </div>
      <span class="badge" :class="overall.cls">
        <span v-if="overall.spin" class="spinner"></span>
        <span v-else class="dot"></span>
        {{ t(overall.key) }}
      </span>
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
.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-hero);
  padding: 18px;
  margin-bottom: 14px;
}
.hero__icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: var(--primary-bg);
}
.hero__icon img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}
.hero__body {
  flex: 1;
  min-width: 0;
}
.hero__title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.hero__chips {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

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
