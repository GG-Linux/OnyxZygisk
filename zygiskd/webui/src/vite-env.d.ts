/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<object, object, any>;
  export default component;
}

/** KernelSU / APatch bridge: exec + callback name, invoked as window[name](errno, stdout, stderr). */
interface KsuBridge {
  exec(cmd: string, optionsJson: string, callbackName: string): void;
  toast(msg: string): void;
}

/** MMRL bridge: promise- or callback-style exec. */
interface MmrlExecResult {
  code?: number;
  stdout?: string;
  stderr?: string;
}

interface MmrlBridge {
  exec(cmd: string, callback?: (r: MmrlExecResult) => void): Promise<MmrlExecResult> | unknown;
  toast?(msg: string): void;
}

interface Window {
  ksu?: KsuBridge;
  mmrl?: MmrlBridge;
  /** KernelSU exec callbacks are registered under generated names and invoked by the host. */
  [key: string]: unknown;
}
