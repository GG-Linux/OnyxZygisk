/* OnyxZygisk — root manager bridge.
 * KernelSU / APatch: ksu.exec(cmd, JSON.stringify(opts), cbName) → window[cb](errno, stdout, stderr)
 * MMRL: mmrl.exec(cmd) (promise or callback)
 * On a normal PC browser (no bridge) we return mocked data so the UI can be developed/previewed.
 * All real output is base64-wrapped on the shell side and decoded as UTF-8 here to avoid
 * the WebView bridge mangling Chinese / emoji (mojibake).
 */
"use strict";

export function detectBridge() {
  if (window.ksu && typeof window.ksu.exec === "function") return "ksu";
  if (window.mmrl && typeof window.mmrl.exec === "function") return "mmrl";
  return null;
}

function bridgeRaw(cmd) {
  const host = detectBridge();
  if (host === "ksu") {
    return new Promise((resolve, reject) => {
      const name = "ksu_exec_" + Date.now() + "_" + Math.floor(Math.random() * 1e9);
      window[name] = (errno, stdout, stderr) => {
        delete window[name];
        resolve({ errno: errno || 0, stdout: stdout || "", stderr: stderr || "" });
      };
      try { window.ksu.exec(cmd, "{}", name); }
      catch (e) { delete window[name]; reject(e); }
    });
  }
  if (host === "mmrl") {
    try {
      const p = window.mmrl.exec(cmd);
      if (p && typeof p.then === "function") {
        return p.then((r) => ({ errno: r.code || 0, stdout: r.stdout || "", stderr: r.stderr || "" }));
      }
    } catch (e) { /* fall through to callback style */ }
    return new Promise((resolve) => {
      try {
        window.mmrl.exec(cmd, (r) => resolve({
          errno: r && r.code !== undefined ? r.code : 0,
          stdout: (r && r.stdout) || "", stderr: (r && r.stderr) || "",
        }));
      } catch (e) { resolve({ errno: -1, stdout: "", stderr: String(e) }); }
    });
  }
  return Promise.reject(new Error("no bridge"));
}

/** base64 → UTF-8 (atob gives binary string; TextDecoder makes it real UTF-8). */
function b64ToUtf8(b64) {
  const clean = String(b64).replace(/\s+/g, "");
  if (!clean) return "";
  try {
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch (e) { return String(b64); }
}

/** Execute a shell command; stdout is guaranteed correct UTF-8. */
export async function exec(cmd) {
  if (!detectBridge()) return { errno: 0, stdout: devResponse(cmd), stderr: "" };
  const wrapped = "{ " + cmd + " ; } 2>/dev/null | base64";
  const r = await bridgeRaw(wrapped);
  return { errno: r.errno, stdout: b64ToUtf8(r.stdout), stderr: r.stderr };
}

export function toast(msg) {
  const host = detectBridge();
  try {
    if (host === "ksu") window.ksu.toast(msg);
    else if (host === "mmrl" && window.mmrl.toast) window.mmrl.toast(msg);
    else console.log("[toast]", msg);
  } catch (e) { console.log("[toast]", msg); }
}

/* ── PC development fallback data (only used when no bridge is present) ── */
function devResponse(cmd) {
  if (cmd.indexOf("logcat") !== -1) {
    return [
      "I/zygiskd(1234): 欢迎使用 OnyxZygisk (v1.0) ",
      "I/zygisk-core64(1256): zygisk library injected, version v1.0",
      "I/zygiskd(1234): Daemon listening on cp64.sock",
      "I/zygisk-sh(1201): 手动触发 post-fs-data.sh",
    ].join("\n");
  }
  if (cmd.indexOf("@@fn") !== -1) {
    return [
      "version=1.0", "root=KernelSU", "z64=1", "z32=1", "daemon=1", "workdir=/data/adb/onyxzygisk",
      "@@monitor",
      "\tOnyxZygisk\tv1.0", "\tmonitor: \t tracing", "", "\tzygote64:\t injected", "\tdaemon64:\t running", "",
      "@@modules",
      "M|playintegrityfix|Play Integrity Fix|v18.8|chiteroman|1|0|修复 Play Integrity 认证 ",
      "M|tricky_store|Tricky Store|v1.2.1|5ec1cff|1|0|在 TEE 损坏设备上伪造 keybox",
      "M|lsposed_mod|LSPosed (Mod)|v1.9.2|mywalkb|1|1|A Riru/Zygisk framework",
      "@@fn",
      "F|net_guard|网络守卫|1.0|app|com.bank.*|enabled",
      "F|prop_shield|属性护盾|2.1|system_server|all|disabled",
    ].join("\n");
  }
  return "";
}
