<script setup lang="ts">
import FnSection from "./components/FnSection.vue";
import LogsSection from "./components/LogsSection.vue";
import ModulesSection from "./components/ModulesSection.vue";
import SettingsSection from "./components/SettingsSection.vue";
import StatusSection from "./components/StatusSection.vue";
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="header-icon"><img src="/tux.png" alt="Tux" width="26" height="26" /></div>
      <div class="header-titles">
        <h1 class="header-title">OnyxZygisk</h1>
        <span class="header-sub">Zygisk via ptrace</span>
      </div>
    </div>
  </header>

  <div id="page_content">
    <StatusSection />
    <ModulesSection />
    <FnSection />
    <LogsSection />
    <SettingsSection />
  </div>
</template>
