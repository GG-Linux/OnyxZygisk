<script setup lang="ts">
/* App — the page header is the live status hero: it sticks to the top while
 * scrolling and collapses into a compact bar (small icon, chips hidden).
 * System state is shared with StatusSection via MONITOR_STATE_KEY.
 */
import { computed, onMounted, onUnmounted, provide, ref } from "vue";
import { fmtVer } from "./api/system";
import { MONITOR_STATE_KEY, useMonitorState } from "./composables/useMonitorState";
import { useLocale } from "./composables/useLocale";
import FnSection from "./components/FnSection.vue";
import LogsSection from "./components/LogsSection.vue";
import ModulesSection from "./components/ModulesSection.vue";
import SettingsSection from "./components/SettingsSection.vue";
import StatusSection from "./components/StatusSection.vue";

const { t } = useLocale();

const state = useMonitorState();
provide(MONITOR_STATE_KEY, state);
const { loading, error, monitor, rootImpl, version } = state;

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

const compact = ref(false);
function onScroll(): void {
  compact.value = window.scrollY > 16;
}
onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <header class="hero" :class="{ 'hero--compact': compact }">
    <div class="hero__icon"><img src="/tux.png" alt="Tux" /></div>
    <div class="hero__body">
      <div class="hero__title">OnyxZygisk</div>
      <div v-if="!compact" class="hero__sub">{{ t("header.subtitle") }}</div>
      <div v-if="!compact" class="hero__chips">
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
  </header>

  <div id="page_content">
    <StatusSection />
    <ModulesSection />
    <FnSection />
    <LogsSection />
    <SettingsSection />
  </div>
</template>

<style scoped>
/* ── status hero: page header, sticks to the top, collapses on scroll ── */
.hero {
  position: sticky;
  top: 0;
  z-index: 50;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-hero);
  padding: 18px 20px;
  transition:
    padding 0.25s ease,
    border-radius 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}
.hero--compact {
  padding: calc(10px + env(safe-area-inset-top, 0px)) 20px 10px;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  background: var(--header-bg);
  -webkit-backdrop-filter: blur(18px) saturate(1.6);
  backdrop-filter: blur(18px) saturate(1.6);
  box-shadow: none;
}
.hero__icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: var(--primary-bg);
  transition:
    width 0.25s ease,
    height 0.25s ease,
    border-radius 0.25s ease;
}
.hero__icon img {
  width: 34px;
  height: 34px;
  object-fit: contain;
  transition:
    width 0.25s ease,
    height 0.25s ease;
}
.hero--compact .hero__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}
.hero--compact .hero__icon img {
  width: 24px;
  height: 24px;
}
.hero__body {
  flex: 1;
  min-width: 0;
}
.hero__title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
  line-height: 1.3;
}
.hero__sub {
  font-size: 12px;
  color: var(--text3);
  margin-top: 2px;
}
.hero__chips {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}
</style>
