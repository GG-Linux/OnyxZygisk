<script setup lang="ts">
/* FN section — the Functional Node list, enabled/disabled via the state flag
 * (takes effect on the next fork, like the old version). */
import { onMounted, ref } from "vue";
import { fetchState, fmtVer, setFnEnabled } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Btn from "./atoms/Btn.vue";
import ModuleCard from "./molecules/ModuleCard.vue";
import Pill from "./atoms/Pill.vue";
import Switch from "./atoms/Switch.vue";
import Toolbar from "./atoms/Toolbar.vue";
import type { FnNodeInfo } from "../types";

const { t } = useLocale();

const nodes = ref<FnNodeInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const msg = ref("");

async function load() {
  loading.value = true;
  try {
    const d = await fetchState();
    nodes.value = d.fns;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

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

function statusVariant(status: string): "green" | "gray" | "orange" {
  return status === "enabled" ? "green" : status === "disabled" ? "gray" : "orange";
}

onMounted(load);
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.fn") }}</h2>

    <Toolbar>
      <Btn @click="load">{{ t("common.refresh") }}</Btn>
      <span class="hint">{{ t("fn.hint") }}</span>
    </Toolbar>

    <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
    <div v-else-if="error" class="empty">Error: {{ error }}</div>
    <div v-else-if="!nodes.length" class="empty">{{ t("fn.empty") }}</div>
    <template v-else>
      <ModuleCard
        v-for="n in nodes"
        :key="n.id"
        :name="n.name || n.id"
        :meta="`${fmtVer(n.version)} · ${t('fn.trigger')}: ${n.trigger || 'app'} · ${t('fn.scope')}: ${n.scope || 'all'}`"
      >
        <template #tags>
          <Pill :variant="statusVariant(n.status)">{{ n.status }}</Pill>
        </template>
        <template #extra>
          <Switch
            :checked="n.status === 'enabled'"
            @update:checked="toggle(n, $event)"
          />
        </template>
      </ModuleCard>
    </template>

    <div class="msg">{{ msg }}</div>
  </section>
</template>
