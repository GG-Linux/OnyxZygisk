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
// Coalesce scroll events into a single class update per animation frame.
// The toggle itself is cheap; this keeps it from flipping mid-frame while
// the user is scrolling.
let rafId = 0;
function onScroll(): void {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    compact.value = window.scrollY > 16;
  });
}
onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<template>
  <header class="hero" :class="{ 'hero--compact': compact }">
    <div class="hero__icon" aria-hidden="true">
      <span class="hero__glyph"></span>
    </div>
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
  gap: 16px;
  background:
    radial-gradient(130% 200% at 100% -20%, var(--primary-bg), transparent 50%), var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-hero);
  padding: 20px;
  transition:
    padding 0.25s ease,
    border-radius 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}
/* Brand accent line along the bottom edge of the expanded hero. */
.hero::after {
  content: "";
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  opacity: 0.55;
  pointer-events: none;
}
.hero--compact {
  padding: calc(10px + env(safe-area-inset-top, 0px)) 20px 10px;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  background: var(--header-bg);
  box-shadow: none;
  /* No backdrop-filter here: enabling a blur mid-scroll forces the WebView
   * to re-render the blurred region on every animation frame and stutters
   * badly on Android. The header background is opaque enough on its own. */
}
.hero--compact::after {
  display: none;
}
.hero__icon {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background:
    radial-gradient(120% 120% at 80% 20%, var(--primary-bg), transparent 55%),
    linear-gradient(135deg, var(--primary-bg), transparent 65%);
  transition:
    width 0.25s ease,
    height 0.25s ease,
    border-radius 0.25s ease;
}
.hero__glyph {
  display: block;
  width: 40px;
  height: 40px;
  background-color: var(--primary);
  -webkit-mask: url("/icons/syringe.svg") center / contain no-repeat;
  mask: url("/icons/syringe.svg") center / contain no-repeat;
  transition:
    width 0.25s ease,
    height 0.25s ease;
}
.hero--compact .hero__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}
.hero--compact .hero__glyph {
  width: 24px;
  height: 24px;
}
/* Compact bar: regular-size title, no status badge (reads as a toolbar). */
.hero--compact .hero__title {
  font-size: 16px;
  font-weight: 700;
}
.hero--compact .badge {
  display: none;
}
.hero__body {
  flex: 1;
  min-width: 0;
}
.hero__title {
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.3px;
  line-height: 1.25;
}
.hero__sub {
  font-size: 13px;
  color: var(--text2);
  margin-top: 3px;
}
.hero__chips {
  display: flex;
  gap: 6px;
  margin-top: 7px;
  flex-wrap: wrap;
}
/* Slightly stronger badge in the expanded hero (tint border via currentColor). */
.hero .badge {
  font-size: 13px;
  padding: 5px 14px;
  border: 1px solid transparent;
  border-color: color-mix(in srgb, currentColor 28%, transparent);
}
</style>
