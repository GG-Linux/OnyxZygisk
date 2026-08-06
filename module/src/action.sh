printf "Status of OnyxZygisk\n\n"

cat @WORK_DIRECTORY@/module.prop

echo
echo "WebUI (webroot): /data/adb/modules/onyxzygisk/webroot/"
echo "  在 KernelSU / APatch Manager 或 MMRL 的模块页中打开 WebUI"
echo "  （页面由 Manager 的 WebView 直接读取，无需网络/端口）"

if [[ -z "$MMRL" ]] && ([[ -n "$KSU" ]] || [[ -n "$APATCH" ]]); then
	# Avoid instant exit on KernelSU or APatch
	sleep 5
fi
