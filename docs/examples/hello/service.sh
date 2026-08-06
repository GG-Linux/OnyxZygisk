#!/system/bin/sh
# 示例 FN 节点脚本：在 late-start（system_server 启动后）运行。
# MODDIR 指向节点目录（fn/hello/）。
echo "hello from FN node $(date)" > /data/local/tmp/fn-hello.txt
