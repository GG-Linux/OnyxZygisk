/* OnyxZygisk — PC development fallback data.
 *
 * Only used when no bridge is present (plain browser / `npm run dev` / preview):
 * the UI renders with canned data so it can be developed without a rooted device.
 */
export function devResponse(cmd: string): string {
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
      "version=1.0",
      "root=KernelSU",
      "z64=1",
      "z32=1",
      "daemon=1",
      "workdir=/data/adb/onyxzygisk",
      "@@monitor",
      "\tOnyxZygisk\tv1.0",
      "\tmonitor: \t tracing",
      "",
      "\tzygote64:\t injected",
      "\tdaemon64:\t running",
      "",
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
