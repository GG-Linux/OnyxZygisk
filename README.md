<div align="center">

<img src="assets/tux.png" alt="OnyxZygisk" width="96">

# OnyxZygisk

A **ptrace-based Zygisk implementation** for **APatch** & **KernelSU** — with a built-in **WebUI** and **FN (Functional Node)** modules.

**English** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md)

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

</div>

---

## Highlights

- **Built-in WebUI** — a control panel built with **Vue 3 + Vite + TypeScript**, shipped as static files in `webroot/` and opened directly by KernelSU / APatch Manager / MMRL. Dashboard, module list, FN management, and a logcat viewer. Light / dark / AMOLED themes and multi-language. See [docs/WEBUI.md](docs/WEBUI.md).
- **FN (Functional Node) modules** — declarative, scoped, hot-swappable extension units on top of the Zygisk core: script nodes and native nodes, enabled/disabled without a reboot. See [docs/FN.md](docs/FN.md).
- **APatch-first** — `apd` detection, real-CSV `package_config` parsing and atomic writes, clean-namespace unmounting across known root overlay sources. See [docs/APATCH.md](docs/APATCH.md).
- **Advanced stealth** — a sophisticated DenyList that hides root and module traces from apps that look for them.

## The DenyList

Modern systemless root works by stacking overlay [mounts](https://man7.org/linux/man-pages/man8/mount.8.html) rather than touching system partitions. The DenyList hides those modifications by controlling each app's [mount namespace](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html):

| Application state | Mount namespace | Use case |
| :--- | :--- | :--- |
| **Root granted** | Root + module mounts | Trusted apps that need full root (e.g. advanced file managers). |
| **On DenyList** | Clean, unmodified | A pristine environment for apps that perform root detection. |

Two strategies produce the clean namespace:

1. **Direct zygote unmounting (primary)** — unmount root traces directly from the zygote *before* an app is specialized. Aborted by a safety check if a module provides critical system resources (e.g. an overlay in `/product`), to avoid crashing zygote.
2. **Namespace switching (fallback)** — after fork, `setns` moves the app into a cached, completely clean mount namespace.

## Configuration

- **APatch / KernelSU:** enable **`Umount modules`** for the target app.
- **Magisk:** use **`Configure DenyList`**. Leave Magisk's own **`Enforce DenyList`** *off* — it can conflict with OnyxZygisk's hiding.

## Building from source

```sh
git clone https://github.com/GG-Linux/OnyxZygisk.git
cd OnyxZygisk
./gradlew :module:zipRelease
```

The flashable zip is written to `module/build/outputs/module/`.

## Credits

OnyxZygisk stands on the shoulders of the projects it is built from and inspired by:

- **Zygisk API** — [topjohnwu](https://github.com/topjohnwu) / [Magisk](https://github.com/topjohnwu/Magisk)
- **Zygisk Next** (standalone ptrace implementation) — [Dr-TSNG](https://github.com/Dr-TSNG/ZygiskNext)
- **NeoZygisk** (OnyxZygisk is based on this) — [JingMatrix](https://github.com/JingMatrix/NeoZygisk)
- **OnyxZygisk** — Sai, and [contributors](https://github.com/GG-Linux/OnyxZygisk/graphs/contributors)

## License

[GPL-3.0](LICENSE). OnyxZygisk is a downstream of NeoZygisk and keeps the same license and notices.
