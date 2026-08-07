/* OnyxZygisk — shared, module-scoped app state.
 *
 * A reactive singleton: the header (App.vue) reads `host`/`version`/`root`
 * from here, and the status section refreshes them on every poll. This mirrors
 * the old behaviour where the status page directly poked `#header-sub` and
 * `#header-badge` DOM nodes.
 */
import { reactive } from "vue";
import { detectBridge } from "../bridge";
import type { BridgeHost } from "../types";

interface SystemState {
  host: BridgeHost;
  version: string;
  root: string;
}

const state = reactive<SystemState>({
  host: detectBridge(),
  version: "",
  root: "",
});

export function useSystemState() {
  /** Re-detect the host bridge (the status section does this on every poll). */
  function refreshHost(): void {
    state.host = detectBridge();
  }
  return { state, refreshHost };
}
