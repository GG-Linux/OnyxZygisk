<script setup lang="ts">
/* App — the single fixed page: header + all five sections stacked.
 * The header sub-title and host badge are driven by the shared system state
 * that the status section refreshes on every poll. */
import { computed } from "vue";
import { useSystemState } from "./composables/useSystemState";
import FnSection from "./components/FnSection.vue";
import LogsSection from "./components/LogsSection.vue";
import ModulesSection from "./components/ModulesSection.vue";
import SettingsSection from "./components/SettingsSection.vue";
import StatusSection from "./components/StatusSection.vue";

const { state } = useSystemState();

const headerSub = computed(() =>
  state.version && state.root
    ? `${state.version} · ${state.root}`
    : "Zygisk Implementation",
);

const badgeText = computed(() =>
  state.host === "ksu" ? "KSU" : state.host === "mmrl" ? "MMRL" : "DEV",
);
const badgeClass = computed(() =>
  state.host ? "header-badge ok" : "header-badge",
);
</script>

<template>
  <header class="app-header">
    <div class="header-icon"><img src="/tux.png" alt="Tux" width="40" height="40"></div>
    <div class="header-text">
      <h1>OnyxZygisk</h1>
      <div class="sub">{{ headerSub }}</div>
    </div>
    <span :class="badgeClass">{{ badgeText }}</span>
  </header>

  <div id="page_content">
    <StatusSection />
    <ModulesSection />
    <FnSection />
    <LogsSection />
    <SettingsSection />
  </div>
</template>
