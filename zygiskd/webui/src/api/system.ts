/* OnyxZygisk — data layer. One shell round-trip fetches full system state. */
import { exec } from "../bridge";
import type { FnNodeInfo, ModuleInfo, MonitorRow, StateData } from "../types";

const WORKDIR = "/data/adb/onyxzygisk";
const MODDIR = "/data/adb/modules/onyxzygisk";

const STATUS_SCRIPT = [
  'MOD="' + MODDIR + '"; W="' + WORKDIR + '"',
  'v=$(sed -n "s/^version=//p" "$MOD/module.prop" 2>/dev/null | head -n1)',
  "r=none",
  // Root provider detection: only a RUNNING daemon counts. Stale files from a
  // previous setup (leftover `apd` on a KernelSU device) or a magisk-compatible
  // binary in PATH on APatch/KernelSU devices must not win, so there are no
  // file/PATH fallbacks. FolkPatch keeps APatch's `apd` next to its own `fpd`,
  // so fpd wins when both daemons run.
  "pidof apd >/dev/null 2>&1 && r=APatch",
  "pidof fpd >/dev/null 2>&1 && r=FolkPatch",
  "[ -d /data/adb/ksu ] && r=KernelSU",
  "pidof magiskd >/dev/null 2>&1 && r=Magisk",
  // Print an empty label instead of "none" when nothing was detected.
  '[ "$r" = none ] && r=',
  'echo "version=$v"; echo "root=$r"',
  'pidof zygote64 >/dev/null 2>&1 && echo "z64=1" || echo "z64=0"',
  '(pidof zygote >/dev/null 2>&1 || pidof zygote_secondary >/dev/null 2>&1) && echo "z32=1" || echo "z32=0"',
  // The daemon is exec'd as `zygiskd64`/`zygiskd32` (ABI suffix), so a plain
  // `pidof zygiskd` never matches and the dashboard would always show it as
  // stopped. Match all three names.
  'echo "daemon=$(pidof zygiskd zygiskd64 zygiskd32 >/dev/null 2>&1 && echo 1 || echo 0)"',
  'echo "workdir=$W"',
  'echo "@@monitor"',
  'cat "$W/module.prop" 2>/dev/null | head -c 600; echo',
  'echo "@@modules"',
  "for d in /data/adb/modules/*/; do",
  '  [ -d "$d" ] || continue; p="$d/module.prop"; [ -f "$p" ] || continue',
  '  id=$(sed -n "s/^id=//p" "$p" | head -n1)',
  '  nm=$(sed -n "s/^name=//p" "$p" | head -n1)',
  '  ver=$(sed -n "s/^version=//p" "$p" | head -n1)',
  '  au=$(sed -n "s/^author=//p" "$p" | head -n1)',
  '  ds=$(sed -n "s/^description=//p" "$p" | head -n1)',
  '  zy=0; [ -f "$d/zygisk/arm64-v8a.so" ] || [ -f "$d/zygisk/armeabi-v7a.so" ] && zy=1',
  '  dis=0; [ -f "$d/disable" ] && dis=1',
  // Only Zygisk-capable modules are shown in the WebUI.
  '  [ "$zy" = 0 ] && continue',
  '  echo "M|$id|$nm|$ver|$au|$zy|$dis|$ds"',
  "done",
  'echo "@@fn"',
  'for d in "$W"/fn/*/; do',
  '  [ -d "$d" ] || continue; p="$d/fn.prop"; [ -f "$p" ] || continue',
  '  id=$(sed -n "s/^id=//p" "$p" | head -n1)',
  '  nm=$(sed -n "s/^name=//p" "$p" | head -n1)',
  '  ver=$(sed -n "s/^version=//p" "$p" | head -n1)',
  '  tr=$(sed -n "s/^trigger=//p" "$p" | head -n1)',
  '  sc=$(sed -n "s/^scope=//p" "$p" | head -n1)',
  '  st=enabled; [ -f "$d/disable" ] && st=disabled; [ -f "$d/remove" ] && st=pending_remove',
  '  echo "F|$id|$nm|$ver|$tr|$sc|$st"',
  "done",
  // Lines are joined with newlines, NOT "; ": a `; ` separator turns the
  // multi-line `for ...; do` loops into `do;` which is a shell syntax error.
].join("\n");

export function parseStatus(out: string): StateData {
  const data: StateData = { keys: {}, monitor: "", modules: [], fns: [] };
  let section: "keys" | "monitor" | "modules" | "fn" = "keys";
  for (const line of out.split("\n")) {
    if (line === "@@monitor") {
      section = "monitor";
      continue;
    }
    if (line === "@@modules") {
      section = "modules";
      continue;
    }
    if (line === "@@fn") {
      section = "fn";
      continue;
    }
    if (section === "keys") {
      const i = line.indexOf("=");
      if (i > 0) data.keys[line.slice(0, i)] = line.slice(i + 1);
    } else if (section === "monitor") {
      data.monitor += line + "\n";
    } else if (section === "modules" && line.startsWith("M|")) {
      const p = line.split("|");
      data.modules.push({
        id: p[1],
        name: p[2],
        version: p[3],
        author: p[4],
        zygisk: p[5] === "1",
        disabled: p[6] === "1",
        desc: p[7],
      } as ModuleInfo);
    } else if (section === "fn" && line.startsWith("F|")) {
      const p = line.split("|");
      data.fns.push({
        id: p[1],
        name: p[2],
        version: p[3],
        trigger: p[4],
        scope: p[5],
        status: p[6],
      } as FnNodeInfo);
    }
  }
  return data;
}

export async function fetchState(): Promise<StateData> {
  const r = await exec(STATUS_SCRIPT);
  return parseStatus(r.stdout);
}

/** Parse the monitor status section of the workdir module.prop.
 * The ptrace monitor writes this file tab-prefixed: module metadata lines
 * ("key=value"), then live rows ("monitor: tracing", "zygote64: injected",
 * "daemon64: running"), then daemon detail lines indented deeper
 * ("Root: APatch", "Modules (2):", module names). Only the live rows and
 * detail lines are returned; metadata is skipped.
 */
export function parseMonitor(text: string): MonitorRow[] {
  const rows: MonitorRow[] = []; // label is null for plain detail lines
  for (const raw of String(text || "").split("\n")) {
    const s = raw.replace(/^\t+/, "").trim();
    if (!s) continue;
    if (/^[a-zA-Z][a-zA-Z0-9_]*=/.test(s)) continue; // module metadata
    const m = /^([a-z][a-z0-9]*):\s*(.+)$/.exec(s);
    rows.push(m ? { label: m[1], value: m[2] } : { label: null, value: s });
  }
  return rows;
}

export async function fetchLogs(lines: number | string): Promise<string> {
  const n = parseInt(String(lines), 10) || 200;
  const r = await exec(
    `logcat -d -v brief -t ${n} -s zygiskd:* zygisk-core64:* zygisk-core32:* zygisk-sh:* 2>/dev/null`,
  );
  return r.stdout.trim();
}

export async function setFnEnabled(id: string, enabled: boolean): Promise<void> {
  const flag = `${WORKDIR}/fn/${id}/disable`;
  await exec(enabled ? `rm -f '${flag}'` : `touch '${flag}'`);
}

/** Normalize version display: strip a leading v/V then add one. */
export function fmtVer(v: string | undefined): string {
  const s = String(v || "?")
    .trim()
    .replace(/^[vV]/, "");
  return "v" + (s || "?");
}
