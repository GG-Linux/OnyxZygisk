/* OnyxZygisk — shared, module-scoped app state.
 *
 * A reactive singleton: the header (App.vue) reads `version`/`root` from here,
 * and the status section refreshes them on every poll. This mirrors the old
 * behaviour where the status page directly poked the `#header-sub` DOM node.
 */
import { reactive } from "vue";

interface SystemState {
  version: string;
  root: string;
}

const state = reactive<SystemState>({
  version: "",
  root: "",
});

export function useSystemState() {
  return { state };
}
