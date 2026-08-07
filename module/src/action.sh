#!/system/bin/sh
# OnyxZygisk module action: print a clean, human-readable status.
# The ptrace monitor appends its live status to module.prop with every line
# tab-prefixed, so a plain `cat` would dump a wall of mangled text. Instead we
# split it into module metadata ("key=value") and the monitor status rows.

printf "Status of OnyxZygisk\n\n"

PROP=@WORK_DIRECTORY@/module.prop

if [ ! -f "$PROP" ]; then
  echo "  (module.prop not found)"
else
  echo "Module:"
  grep -E '^[[:blank:]]*[a-zA-Z][a-zA-Z0-9_]*=' "$PROP" | sed -E 's/^[[:blank:]]+//'
  echo
  echo "Monitor:"
  grep -Ev '^[[:blank:]]*[a-zA-Z][a-zA-Z0-9_]*=' "$PROP" | grep -v '^[[:blank:]]*$' | sed -E 's/^[[:blank:]]+//; s/:[[:blank:]]+/: /'
fi

echo
echo "WebUI (webroot): /data/adb/modules/onyxzygisk/webroot/"
echo "  在 KernelSU / APatch Manager 或 MMRL 的模块页中打开 WebUI"
echo "  （页面由 Manager 的 WebView 直接读取，无需网络/端口）"

if [ -z "$MMRL" ] && { [ -n "$KSU" ] || [ -n "$APATCH" ]; }; then
	# Avoid instant exit on KernelSU or APatch
	sleep 5
fi
