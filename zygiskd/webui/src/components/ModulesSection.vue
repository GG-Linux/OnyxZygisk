<script setup lang="ts">
import { computed, inject } from "vue";
import { fmtVer } from "../api/system";
import { useLocale } from "../composables/useLocale";
import { MONITOR_STATE_KEY, useMonitorState } from "../composables/useMonitorState";
import type { MonitorState } from "../composables/useMonitorState";
import Card from "./atoms/Card.vue";

const { t } = useLocale();
// Shared 6s-polled state (provided by App.vue); local fallback for standalone mounts.
const state = inject<MonitorState | null>(MONITOR_STATE_KEY, null) ?? useMonitorState();
const { loading, error, modules } = state;

// Only Zygisk-capable modules are shown (the shell also filters them).
const zygiskModules = computed(() => modules.value.filter((m) => m.zygisk));
</script>

<template>
  <section class="section">
    <Card :title="t('navbar.modules')">
      <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
      <div v-else-if="error" class="empty">{{ t("common.error") }}: {{ error }}</div>
      <div v-else-if="!zygiskModules.length" class="empty">{{ t("modules.empty") }}</div>
      <div v-else>
        <div v-for="m in zygiskModules" :key="m.id" class="mod-row list-row">
          <div class="mod-row__main">
            <span class="mod-row__name">{{ m.name || m.id }}</span>
            <span class="mod-row__ver">{{ fmtVer(m.version) }}</span>
          </div>
          <div v-if="m.desc" class="mod-row__desc">{{ m.desc }}</div>
          <div class="mod-row__foot">
            <span class="mod-row__author">{{ m.author || t("modules.unknownAuthor") }}</span>
            <span class="mod-row__status" :class="m.disabled ? 'off' : 'on'">
              {{ m.disabled ? t("common.disabled") : t("common.enabled") }}
            </span>
          </div>
        </div>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.mod-row__main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.mod-row__name {
  font-size: 14px;
  font-weight: 600;
}
.mod-row__ver {
  font-size: 12px;
  color: var(--text3);
}
.mod-row__desc {
  font-size: 12px;
  color: var(--text2);
  margin-top: 2px;
}
.mod-row__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.mod-row__author {
  font-size: 11px;
  color: var(--text3);
}
.mod-row__status {
  font-size: 11px;
  font-weight: 500;
}
.mod-row__status.on {
  color: var(--green);
}
.mod-row__status.off {
  color: var(--text3);
}
</style>
