<div align="center">

<img src="assets/tux.png" alt="OnyxZygisk" width="96">

# OnyxZygisk

面向 **APatch** 与 **KernelSU** 的**基于 ptrace 的 Zygisk 实现** —— 内置 **WebUI** 与 **FN(Functional Node)模块**。

[English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md)

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

</div>

---

## 亮点

- **内置 WebUI** —— 基于 **Vue 3 + Vite + TypeScript** 的控制面板，以静态文件随 `webroot/` 提供，可在 KernelSU / APatch Manager / MMRL 中直接打开。包含仪表盘、模块列表、FN 管理、logcat 查看器。支持浅色 / 深色 / 纯黑主题与多语言。详见 [docs/WEBUI.md](docs/WEBUI.md)。
- **FN(Functional Node)模块** —— 位于 Zygisk 核心之上的声明式、按作用域、可热插拔的扩展单元:脚本节点与原生节点,无需重启即可启用/禁用。详见 [docs/FN.md](docs/FN.md)。
- **APatch 优先适配** —— `apd` 检测、真实 CSV 的 `package_config` 解析与原子写入、覆盖已知 root overlay 来源的干净命名空间卸载。详见 [docs/APATCH.md](docs/APATCH.md)。
- **进阶隐藏** —— 精细的 DenyList,对进行 root 检测的应用隐藏 root 与模块痕迹。

## DenyList 说明

现代 systemless root 通过叠加 overlay [挂载](https://man7.org/linux/man-pages/man8/mount.8.html)工作,而非直接改动系统分区。DenyList 通过控制每个应用的[挂载命名空间](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)来隐藏这些改动:

| 应用状态 | 挂载命名空间 | 适用场景 |
| :--- | :--- | :--- |
| **已授予 Root** | Root + 模块挂载 | 需要完整 root 的可信应用(如高级文件管理器)。 |
| **在 DenyList** | 干净、未修改 | 为进行 root 检测的应用提供纯净环境。 |

产生干净命名空间的两种策略:

1. **直接从 zygote 卸载(主策略)** —— 在应用被 specialize *之前*,直接从 zygote 卸载 root 痕迹。若某模块提供关键系统资源(如 `/product` 的 overlay),安全检查会中止此操作以免 zygote 崩溃。
2. **命名空间切换(回退策略)** —— fork 之后,用 `setns` 将应用切换进一个缓存好的、完全干净的挂载命名空间。

## 配置

- **APatch / KernelSU:** 为目标应用启用 **`卸载模块 / Umount modules`**。
- **Magisk:** 使用 **`配置 DenyList`**。请**关闭** Magisk 自带的 **`强制 DenyList`** —— 它可能与 OnyxZygisk 的隐藏机制冲突。

## 从源码构建

```sh
git clone https://github.com/GG-Linux/OnyxZygisk.git
cd OnyxZygisk
./gradlew :module:zipRelease
```

可刷入的 zip 输出到 `module/build/outputs/module/`。

## 致谢

OnyxZygisk 站在它所构建于、所受启发的项目的肩膀上:

- **Zygisk API** —— [topjohnwu](https://github.com/topjohnwu) / [Magisk](https://github.com/topjohnwu/Magisk)
- **Zygisk Next**(独立 ptrace 实现)—— [Dr-TSNG](https://github.com/Dr-TSNG/ZygiskNext)
- **NeoZygisk**(OnyxZygisk 基于此)—— [JingMatrix](https://github.com/JingMatrix/NeoZygisk)
- **OnyxZygisk** —— Sai, Matsuzaka Yuki 与[贡献者们](https://github.com/GG-Linux/OnyxZygisk/graphs/contributors)

## 许可证

[GPL-3.0](LICENSE)。OnyxZygisk 是 NeoZygisk 的下游,沿用相同的许可证与声明。
