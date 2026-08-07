<script setup lang="ts">
/* Logs section — the zygiskd / zygisk-core / zygisk-sh logcat view.
 *
 * Auto-refresh keeps the scroll position stable so the view does not "jump"
 * while reading. The log content is written imperatively into the <pre> (like
 * the old version) on purpose: going through Vue's renderer would reset the
 * scroll position on every update.
 */
import { onMounted, onUnmounted, ref } from "vue";
import { fetchLogs } from "../api/system";
import { useLocale } from "../composables/useLocale";
import Btn from "./atoms/Btn.vue";
import Toolbar from "./atoms/Toolbar.vue";

const { t } = useLocale();

const out = ref<HTMLPreElement | null>(null);
const lines = ref(200);
const auto = ref(true);

let timer: number | undefined;

async function load() {
  const el = out.value;
  if (!el) return;
  const prev = el.textContent;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  const scrollTop = el.scrollTop;

  try {
    const text = await fetchLogs(lines.value);
    const next = text || t("logs.empty");
    if (next === prev) return; // no change: keep everything as-is

    el.textContent = next;
    // Follow new output when pinned to the bottom, otherwise keep the
    // reader's position so the content does not jump around.
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = scrollTop;
    }
  } catch (e) {
    el.textContent = "Error: " + (e instanceof Error ? e.message : String(e));
  }
}

onMounted(() => {
  load();
  timer = window.setInterval(() => {
    if (auto.value) load();
  }, 8000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ t("navbar.logs") }}</h2>

    <Toolbar>
      <label>{{ t("logs.lines") }}
        <input type="number" v-model.number="lines" min="50" max="2000">
      </label>
      <Btn @click="load">{{ t("common.refresh") }}</Btn>
      <label><input type="checkbox" v-model="auto"> {{ t("logs.auto") }}</label>
    </Toolbar>

    <pre ref="out" class="log-box"></pre>
  </section>
</template>
