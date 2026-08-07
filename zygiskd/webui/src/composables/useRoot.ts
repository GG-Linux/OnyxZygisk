/* OnyxZygisk — shared root-implementation label.
 * A tiny reactive singleton: the status section sets `root` on every poll,
 * and the header (App.vue) renders it in the top-right corner. */
import { reactive } from "vue";

const state = reactive<{ root: string }>({ root: "" });

export function useRoot() {
  function setRoot(v: string): void {
    state.root = v;
  }
  return { root: state, setRoot };
}
