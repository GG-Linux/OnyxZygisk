<script setup lang="ts">
import { useRoot } from "./composables/useRoot";
import FnSection from "./components/FnSection.vue";
import LogsSection from "./components/LogsSection.vue";
import ModulesSection from "./components/ModulesSection.vue";
import SettingsSection from "./components/SettingsSection.vue";
import StatusSection from "./components/StatusSection.vue";

const { root } = useRoot();
</script>

<template>
  <header class="app-header">
    <div class="header-icon"><img src="/tux.png" alt="Tux" width="36" height="36"></div>
    <h1 class="header-title">OnyxZygisk</h1>
    <span v-if="root.root" class="root-badge">{{ root.root }}</span>
  </header>

  <div id="page_content">
    <StatusSection />
    <ModulesSection />
    <FnSection />
    <LogsSection />
    <SettingsSection />
  </div>
</template>
