/* OnyxZygisk — shared system-state loader (status hero + monitor card).
 *
 * App.vue provides a single instance under MONITOR_STATE_KEY so the sticky
 * hero and the StatusSection monitor card render the same data. Sections
 * fall back to a local instance when mounted standalone (e.g. unit tests).
 */
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { fetchState, parseMonitor } from "../api/system";
import { useLocale } from "./useLocale";
import type { MonitorRow } from "../types";

export const MONITOR_STATE_KEY = Symbol("monitorState");

export interface MonitorState {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  monitor: Ref<MonitorRow[]>;
  rootImpl: Ref<string>;
  version: Ref<string>;
  load: () => Promise<void>;
}

export function useMonitorState(): MonitorState {
  const loading = ref(true);
  const error = ref<string | null>(null);
  const monitor = ref<MonitorRow[]>([]);
  const rootImpl = ref("");
  const version = ref("");
  const { locale } = useLocale();

  let timer: number | undefined;

  async function load(): Promise<void> {
    try {
      const d = await fetchState();
      rootImpl.value = d.keys.root || "";
      version.value = d.keys.version || "";
      monitor.value = parseMonitor(d.monitor);
      error.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    load();
    timer = window.setInterval(load, 6000);
  });
  onUnmounted(() => window.clearInterval(timer));
  // Reload on language switch (dev mock data follows the locale).
  watch(locale, () => load());

  return { loading, error, monitor, rootImpl, version, load };
}
