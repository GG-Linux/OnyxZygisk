/* OnyxZygisk — shared types for the bridge, the shell data protocol and the UI. */

/** Result of one bridge exec() call (KernelSU / APatch / MMRL normalized). */
export interface ExecResult {
  errno: number;
  stdout: string;
  stderr: string;
}

/** Which root manager bridge is present in the WebView. */
export type BridgeHost = "ksu" | "mmrl" | null;

/** The `key=value` header block of the status script output. */
export interface StatusKeys {
  version?: string;
  root?: string;
  z64?: string;
  z32?: string;
  daemon?: string;
  workdir?: string;
  [key: string]: string | undefined;
}

/** A Zygisk module row (the `M|id|name|version|author|zygisk|disabled|desc` record). */
export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  zygisk: boolean;
  disabled: boolean;
  desc: string;
}

/** An FN node row (the `F|id|name|version|trigger|scope|status` record). */
export interface FnNodeInfo {
  id: string;
  name: string;
  version: string;
  trigger: string;
  scope: string;
  status: string;
}

/** The full state parsed from one `STATUS_SCRIPT` round trip. */
export interface StateData {
  keys: StatusKeys;
  monitor: string;
  modules: ModuleInfo[];
  fns: FnNodeInfo[];
}

/**
 * One row of the monitor status text. The ptrace monitor writes tab-prefixed
 * lines into the workdir module.prop: module metadata (`key=value`), then live
 * rows (`monitor: tracing`), then deeper detail lines (module list, root info).
 * `label` is null for plain detail lines.
 */
export interface MonitorRow {
  label: string | null;
  value: string;
}
