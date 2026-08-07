<script setup lang="ts">
import { inject, ref } from "vue";
import { fmtVer, setFnEnabled } from "../api/system";
import { useLocale } from "../composables/useLocale";
import { MONITOR_STATE_KEY, useMonitorState } from "../composables/useMonitorState";
import type { MonitorState } from "../composables/useMonitorState";
import Card from "./atoms/Card.vue";
import Switch from "./atoms/Switch.vue";
import type { FnNodeInfo } from "../types";

const { t } = useLocale();
// Shared 6s-polled state (provided by App.vue); local fallback for standalone mounts.
const state = inject<MonitorState | null>(MONITOR_STATE_KEY, null) ?? useMonitorState();
const { loading, error, fns, load } = state;

const msg = ref("");

async function toggle(n: FnNodeInfo, enabled: boolean) {
  msg.value = "";
  try {
    await setFnEnabled(n.id, enabled);
    msg.value = t(enabled ? "fn.enabledMsg" : "fn.disabledMsg").replace("%s", n.id);
    await load();
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <section class="section">
    <Card :title="t('navbar.fn')">
      <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
      <div v-else-if="error" class="empty">{{ t("common.error") }}: {{ error }}</div>
      <div v-else-if="!fns.length" class="empty">{{ t("fn.empty") }}</div>
      <template v-else>
        <div v-for="n in fns" :key="n.id" class="fn-row list-row">
          <div class="fn-row__left">
            <div class="fn-row__main">
              <span class="fn-row__name">{{ n.name || n.id }}</span>
              <span class="fn-row__ver">{{ fmtVer(n.version) }}</span>
            </div>
            <div class="fn-row__meta">{{ n.trigger || "app" }} / {{ n.scope || "all" }}</div>
          </div>
          <Switch :checked="n.status === 'enabled'" @update:checked="toggle(n, $event)" />
        </div>
      </template>

      <div class="msg">{{ msg }}</div>
    </Card>
  </section>
</template>

<style scoped>
.fn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.fn-row__left {
  flex: 1;
  min-width: 0;
}
.fn-row__main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.fn-row__name {
  font-size: 14px;
  font-weight: 600;
}
.fn-row__ver {
  font-size: 12px;
  color: var(--text3);
}
.fn-row__meta {
  font-size: 11px;
  color: var(--text3);
  margin-top: 2px;
}
</style>
