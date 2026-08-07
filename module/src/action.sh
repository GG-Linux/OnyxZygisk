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
echo "  Open the WebUI from the module page in KernelSU / APatch Manager or MMRL"
echo "  (The page is read directly by the Manager's WebView; no network or port is needed)"

if [ -z "$MMRL" ] && { [ -n "$KSU" ] || [ -n "$APATCH" ]; }; then
	# Avoid instant exit on KernelSU or APatch
	sleep 5
fi
