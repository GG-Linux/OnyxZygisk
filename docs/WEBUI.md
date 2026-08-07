# OnyxZygisk WebUI

OnyxZygisk 的 WebUI 遵循 **KernelSU 模块 WebUI 规范**：静态页面放在模块的
`webroot/` 目录，由根管理应用（KernelSU Manager / APatch Manager / MMRL）的
WebView 直接读取——**不监听任何网络端口，不依赖 TCP**，守护进程完全不参与
页面传输。

WebUI 基于 **Vue 3 + Vite + TypeScript** 构建，源码在仓库的
`zygiskd/webui/`，构建产物由 Gradle 自动放入模块的 `webroot/`。

## 安装后的页面文件

```
/data/adb/modules/onyxzygisk/webroot/
├── index.html     # 入口（规范要求必须存在）
└── assets/        # Vite 构建产物（js/css，路径相对化）
    ├── index-*.js
    └── index-*.css
```

## 打开方式

| 宿主 | 入口 |
|---|---|
| KernelSU Manager | 模块列表 → OnyxZygisk → WebUI |
| APatch Manager | 模块列表 → OnyxZygisk → WebUI |
| MMRL | 模块列表 → WebUI |

页面在普通浏览器里打开时会显示引导提示（缺少桥接，走 mock 数据），功能不可用。

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

## 构建

源码位于 `zygiskd/webui/`，是一个标准的 Vite 工程：

```sh
cd zygiskd/webui
pnpm install          # 首次（Gradle 构建时会自动执行 pnpm install --frozen-lockfile）
pnpm dev              # 开发预览：PC 浏览器 + mock 数据，热更新
pnpm test             # 单元测试（Vitest，jsdom）
pnpm lint             # ESLint 检查（vue + typescript）
pnpm format           # Prettier 格式化
pnpm run build        # 类型检查（vue-tsc）+ 产物到 dist/
```

模块 zip 构建时 Gradle 的 `webuiBuild` 任务会自动执行 `pnpm run build`，
并把 `dist/` 打包进 `webroot/`（依赖 pnpm + Node.js ≥ 18，首次构建自动
`pnpm install --frozen-lockfile`）。

> **注意**：`webroot/` 是构建产物，修改源码后必须重新 `pnpm run build`
> 并重新打包模块才会生效；不要直接编辑安装后的 `webroot/`。

## 与既有实现的关系

早期版本曾由 `zygiskd` 提供 loopback TCP HTTP 服务（端口 47654）作为访问
通道。按 KernelSU 标准，该通道已移除：**静态文件直读 + JS bridge** 是
生态内唯一标准方式，也避免了 SELinux 对 TCP 监听的额外权限需求。

再早的版本是手写 ES modules（无构建步骤），可直接编辑 webroot 生效；改成
Vue 3 + Vite + TypeScript 后，编译产物在代码可维护性和类型安全上更好，
代价是需要构建步骤（见上节）。
