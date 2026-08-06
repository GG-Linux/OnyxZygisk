# OnyxZygisk WebUI

OnyxZygisk 的 WebUI 遵循 **KernelSU 模块 WebUI 规范**：静态页面放在模块的
`webroot/` 目录，由根管理应用（KernelSU Manager / APatch Manager / MMRL）的
WebView 直接读取——**不监听任何网络端口，不依赖 TCP**，守护进程完全不参与
页面传输。

## 页面文件

```
/data/adb/modules/onyxzygisk/webroot/
├── index.html    # 入口（规范要求必须存在）
├── app.js        # 页面逻辑（bridge 驱动）
└── style.css
```

直接编辑这些文件即可自定义界面，**无需重新编译模块**；更新模块时会被 zip
中的版本覆盖。

## 打开方式

| 宿主 | 入口 |
|---|---|
| KernelSU Manager | 模块列表 → OnyxZygisk → WebUI |
| APatch Manager | 模块列表 → OnyxZygisk → WebUI |
| MMRL | 模块列表 → WebUI |

页面在普通浏览器里打开时会显示引导提示（缺少桥接），功能不可用。

## 工作原理（KernelSU 标准）

1. 静态页面由宿主的 WebView 加载（文件直读，无网络）。
2. 宿主向页面注入 JS bridge：
   - **KernelSU / APatch**：`window.ksu.exec(cmd, optionsJSON, callbackName)`，
     完成后宿主调用 `window[callbackName](errno, stdout, stderr)`；
   - **MMRL**：`window.mmrl.exec(cmd)`（Promise 或回调风格，页面防御性适配）。
3. 页面通过 bridge 执行 shell 读取/管理系统状态——状态与 FN 节点列表来自
   一次脚本调用，FN 启用/禁用通过 `disable` 状态文件切换（下次 fork 生效）。

## 页面功能

| 标签页 | 功能 |
|---|---|
| 状态 | 模块版本、Root 方案、守护进程、zygote ABI、监控器状态文本、FN 统计 |
| Zygisk 模块 | `/data/adb/modules` 下的模块列表（版本/作者/zygisk/禁用状态） |
| FN 模块 | FN 节点列表（trigger/scope/状态），启用/禁用 |
| 日志 | logcat 中 `zygiskd` / `zygisk-core64|32` / `zygisk-sh` 的日志 |

## 与既有实现的关系

早期版本曾由 `zygiskd` 提供 loopback TCP HTTP 服务（端口 47654）作为访问
通道。按 KernelSU 标准，该通道已移除：**静态文件直读 + JS bridge** 是
生态内唯一标准方式，也避免了 SELinux 对 TCP 监听的额外权限需求。
