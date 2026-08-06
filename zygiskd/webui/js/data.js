/* OnyxZygisk — data layer. One shell round-trip fetches full system state. */
"use strict";

import { exec } from "./bridge.js";

const WORKDIR = "/data/adb/onyxzygisk";
const MODDIR = "/data/adb/modules/onyxzygisk";

const STATUS_SCRIPT = [
  'MOD="' + MODDIR + '"; W="' + WORKDIR + '"',
  'v=$(sed -n "s/^version=//p" "$MOD/module.prop" 2>/dev/null | head -n1)',
  'r=none',
  '[ -x /data/adb/ap/bin/apd ] && r=APatch',
  '[ -d /data/adb/ksu ] && r=KernelSU',
  'command -v magisk >/dev/null 2>&1 && r=Magisk',
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
  'for d in /data/adb/modules/*/; do',
  '  [ -d "$d" ] || continue; p="$d/module.prop"; [ -f "$p" ] || continue',
  '  id=$(sed -n "s/^id=//p" "$p" | head -n1)',
  '  nm=$(sed -n "s/^name=//p" "$p" | head -n1)',
  '  ver=$(sed -n "s/^version=//p" "$p" | head -n1)',
  '  au=$(sed -n "s/^author=//p" "$p" | head -n1)',
  '  ds=$(sed -n "s/^description=//p" "$p" | head -n1)',
  '  zy=0; [ -f "$d/zygisk/arm64-v8a.so" ] || [ -f "$d/zygisk/armeabi-v7a.so" ] && zy=1',
  '  dis=0; [ -f "$d/disable" ] && dis=1',
  '  echo "M|$id|$nm|$ver|$au|$zy|$dis|$ds"',
  'done',
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
  'done',
  // Lines are joined with newlines, NOT "; ": a `; ` separator turns the
  // multi-line `for ...; do` loops into `do;` which is a shell syntax error.
].join("\n");

export function parseStatus(out) {
  const data = { keys: {}, monitor: "", modules: [], fns: [] };
  let section = "keys";
  for (const line of out.split("\n")) {
    if (line === "@@monitor") { section = "monitor"; continue; }
    if (line === "@@modules") { section = "modules"; continue; }
    if (line === "@@fn") { section = "fn"; continue; }
    if (section === "keys") {
      const i = line.indexOf("=");
      if (i > 0) data.keys[line.slice(0, i)] = line.slice(i + 1);
    } else if (section === "monitor") {
      data.monitor += line + "\n";
    } else if (section === "modules" && line.startsWith("M|")) {
      const p = line.split("|");
      data.modules.push({ id: p[1], name: p[2], version: p[3], author: p[4], zygisk: p[5] === "1", disabled: p[6] === "1", desc: p[7] });
    } else if (section === "fn" && line.startsWith("F|")) {
      const p = line.split("|");
      data.fns.push({ id: p[1], name: p[2], version: p[3], trigger: p[4], scope: p[5], status: p[6] });
    }
  }
  return data;
}

export async function fetchState() {
  const r = await exec(STATUS_SCRIPT);
  return parseStatus(r.stdout);
}

export async function fetchLogs(lines) {
  const n = parseInt(lines, 10) || 200;
  const r = await exec(`logcat -d -v brief -t ${n} -s zygiskd:* zygisk-core64:* zygisk-core32:* zygisk-sh:* 2>/dev/null`);
  return r.stdout.trim();
}

export async function setFnEnabled(id, enabled) {
  const flag = `${WORKDIR}/fn/${id}/disable`;
  return exec(enabled ? `rm -f '${flag}'` : `touch '${flag}'`);
}

// ---------- APatch (package_config / apd) ----------

const AP_CONFIG = "/data/adb/ap/package_config";
const APD_BIN = "/data/adb/ap/bin/apd";

const APATCH_SCRIPT = [
  `P=${AP_CONFIG}; A=${APD_BIN}`,
  'echo "apd_ver=$([ -x "$A" ] && "$A" -V 2>/dev/null | grep -o "[0-9][0-9]*" | tail -1 || echo "")"',
  'echo "apd_run=$(pidof apd >/dev/null 2>&1 && echo 1 || echo 0)"',
  'echo "cfg_exists=$([ -f "$P" ] && echo 1 || echo 0)"',
  'echo "cfg_count=$([ -f "$P" ] && tail -n +2 "$P" 2>/dev/null | grep -c . || echo 0)"',
  'echo "@@config"',
  'tail -n +2 "$P" 2>/dev/null',
  'echo "@@apdmodules"',
  '"$A" module list 2>/dev/null',
].join("\n");

/** 解析 package_config 的 CSV 行（支持双引号字段）。 */
function parseCsvLine(line) {
  const fields = [];
  let field = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { field += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      fields.push(field); field = "";
    } else field += ch;
  }
  fields.push(field);
  return fields;
}

export function parseApatch(out) {
  const data = { apdVer: "", apdRun: false, cfgExists: false, cfgCount: 0, rows: [], apdModules: "" };
  let section = "keys";
  for (const line of out.split("\n")) {
    if (line === "@@config") { section = "config"; continue; }
    if (line === "@@apdmodules") { section = "apdmodules"; continue; }
    if (section === "keys") {
      const i = line.indexOf("=");
      if (i > 0) {
        const k = line.slice(0, i), v = line.slice(i + 1);
        if (k === "apd_ver") data.apdVer = v;
        else if (k === "apd_run") data.apdRun = v === "1";
        else if (k === "cfg_exists") data.cfgExists = v === "1";
        else if (k === "cfg_count") data.cfgCount = parseInt(v, 10) || 0;
      }
    } else if (section === "config" && line.trim()) {
      const f = parseCsvLine(line);
      if (f.length >= 6) {
        data.rows.push({
          pkg: f[0],
          exclude: f[1] === "1",
          allow: f[2] === "1",
          uid: parseInt(f[3], 10) || 0,
          toUid: parseInt(f[4], 10) || 0,
          sctx: f[5],
        });
      }
    } else if (section === "apdmodules") {
      data.apdModules += line + "\n";
    }
  }
  return data;
}

export async function fetchApatch() {
  const r = await exec(APATCH_SCRIPT);
  return parseApatch(r.stdout);
}

function csvField(s) {
  s = String(s == null ? "" : s);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** 把配置行序列化为 CSV 行。 */
function csvRow(c) {
  return [csvField(c.pkg), c.exclude ? 1 : 0, c.allow ? 1 : 0, c.uid, c.toUid, csvField(c.sctx)].join(",");
}

/** 原子重写 package_config（tmp + mv，与 apd 的写入方式一致）。 */
export async function savePackageConfig(rows) {
  const lines = ["pkg,exclude,allow,uid,to_uid,sctx", ...rows.map(csvRow)];
  const body = lines.join("\n");
  const cmd = [
    `cat > ${AP_CONFIG}.tmp <<'ONYXEOF'`,
    body,
    "ONYXEOF",
    `chmod 644 ${AP_CONFIG}.tmp`,
    `mv ${AP_CONFIG}.tmp ${AP_CONFIG}`,
  ].join("\n");
  const r = await exec(cmd);
  if (r.stderr) throw new Error(r.stderr);
  return r;
}

/** 通过 /data/system/packages.list 查询包名对应的 uid。 */
export async function pkgToUid(pkg) {
  const r = await exec(`grep "^${pkg} " /data/system/packages.list 2>/dev/null | head -1 | awk '{print $2}'`);
  const uid = parseInt(r.stdout.trim(), 10);
  return Number.isInteger(uid) && uid > 0 ? uid : null;
}

/** Normalize version display: strip a leading v/V then add one. */
export function fmtVer(v) {
  v = String(v || "?").trim().replace(/^[vV]/, "");
  return "v" + (v || "?");
}
