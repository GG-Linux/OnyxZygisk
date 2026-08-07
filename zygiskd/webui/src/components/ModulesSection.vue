<script setup lang="ts">
/* Modules section — the Zygisk module list from /data/adb/modules. */
import { onMounted, ref } from "vue";
import { fetchState, fmtVer } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Btn from "./atoms/Btn.vue";
import ModuleCard from "./molecules/ModuleCard.vue";
import Pill from "./atoms/Pill.vue";
import Toolbar from "./atoms/Toolbar.vue";
import type { ModuleInfo } from "../types";

const { t } = useLocale();

const modules = ref<ModuleInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  try {
    const d = await fetchState();
    modules.value = d.modules;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.modules") }}</h2>

    <Toolbar>
      <Btn @click="load">{{ t("common.refresh") }}</Btn>
      <span class="hint">{{ t("modules.hint") }}</span>
    </Toolbar>

    <div v-if="loading" class="empty">{{ t("common.loading") }}</div>
    <div v-else-if="error" class="empty">Error: {{ error }}</div>
    <div v-else-if="!modules.length" class="empty">{{ t("modules.empty") }}</div>
    <template v-else>
      <ModuleCard
        v-for="m in modules"
        :key="m.id"
        :name="m.name || m.id"
        :meta="`${fmtVer(m.version)} · ${m.author || t('modules.unknownAuthor')}`"
        :desc="m.desc"
      >
        <template #tags>
          <Pill v-if="m.zygisk" variant="primary">Zygisk</Pill>
          <Pill :variant="m.disabled ? 'gray' : 'green'">
            {{ m.disabled ? t("common.disabled") : t("common.enabled") }}
          </Pill>
        </template>
      </ModuleCard>
    </template>
  </section>
</template>
