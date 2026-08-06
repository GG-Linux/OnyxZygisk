# OnyxZygisk

OnyxZygisk is a Zygote injection module, implemented via [`ptrace`](https://man7.org/linux/man-pages/man2/ptrace.2.html), that provides Zygisk API support for APatch and KernelSU.
It also functions as a powerful replacement for Magisk's built-in Zygisk.

## Fork of NeoZygisk

OnyxZygisk is a fork of [NeoZygisk](https://github.com/JingMatrix/NeoZygisk) by [JingMatrix](https://github.com/JingMatrix). Huge thanks to JingMatrix for creating and maintaining the upstream project — the ptrace-based injection design and DenyList implementation described below are entirely its work.

OnyxZygisk (by **Sai**, fork of NeoZygisk by JingMatrix) builds on that foundation with two headline additions: [FN (Functional Node) modules](#fn-functional-node-modules) and a built-in [WebUI](#webui) management interface.

## Core Principles

OnyxZygisk is engineered with four key objectives:

1.  **API Compatibility:** Maintains full API compatibility with [Magisk's built-in Zygisk](https://github.com/topjohnwu/Magisk/tree/master/native/src/core/zygisk). The relevant API designs are mirrored in the source folder [injector](https://github.com/JingMatrix/NeoZygisk/tree/master/loader/src/injector) for reference.
2.  **Minimalist Design:** Focuses on a lean and efficient implementation of the Zygisk API, avoiding feature bloat to ensure stability and performance.
3.  **Trace Cleaning:** Guarantees the complete removal of its injection traces from application processes once all Zygisk modules are unloaded.
4.  **Advanced Stealth:** Employs a sophisticated DenyList to provide granular control over root and module visibility, effectively hiding the traces of your root solution.

## The DenyList Explained

Modern systemless root solutions operate by creating overlay filesystems using [`mount`](https://man7.org/linux/man-pages/man8/mount.8.html) rather than directly modifying system partitions. The DenyList is a core feature designed to hide these modifications by precisely controlling the [mount namespaces](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html) for each application process.

Here is how OnyxZygisk manages visibility for different application states:

| Application State | Mount Namespace Visibility | Description & Use Case |
| :--- | :--- | :--- |
| **Granted Root Privileges** | Root Solution Mounts + Module Mounts | For trusted applications that require full root access to function correctly (e.g., advanced file managers). |
| **On DenyList** | Clean, Unmodified Mount Namespace | Provides a pristine environment for applications that perform root detection. The app's root privileges might be revoked, and all traces of root and module mounts are hidden. |

To achieve a clean mount namespace for applications on the DenyList, OnyxZygisk employs two distinct strategies: a primary, aggressive approach and a reliable fallback.

1.  **Direct Zygote Unmounting (Primary Strategy)**
    As an experimental feature for bypassing advanced detection, OnyxZygisk attempts to unmount all root-related traces directly from the zygote process itself. This cleans the environment *before* an application process is fully specialized, offering a potentially more robust hiding mechanism. To ensure system stability, this operation is only performed after a strict safety check. If a module is providing critical system resources (e.g., an overlay in `/product`), this direct unmount is aborted to prevent a zygote crash.

2.  **Namespace Switching (Fallback Strategy)**
    If the direct unmount strategy is aborted for safety, or if any traces failed to unmount, OnyxZygisk reverts to its standard, reliable method. After an app process forks, the `setns` syscall is used to switch it into a cached, completely clean mount namespace, effectively isolating it from all system modifications.

## Configuration

To configure the DenyList for a specific application, use the appropriate setting within your root management app:

*   **For APatch/KernelSU:** Enable the **`Umount modules`** option for your target application.
*   **For Magisk:** Use the **`Configure DenyList`** menu.

> **Important Note for Magisk Users**
>
> The **`Enforce DenyList`** option in Magisk enables Magisk's *own* DenyList implementation. This is separate from OnyxZygisk's functionality, is not guaranteed to hide all mount-related traces, and may conflict with OnyxZygisk's hiding mechanisms. It is strongly recommended to leave this option disabled and rely solely on OnyxZygisk's configuration.

## FN (Functional Node) modules

OnyxZygisk introduces **FN (Functional Node) modules**: declarative, scoped, hot-swappable extension units that run on top of the Zygisk core. FN modules let you describe what to inject and where — without shipping custom native code — and can be enabled, disabled, or reconfigured without rebooting.

FN nodes are fully implemented end to end:

* **Script nodes** — `post-fs-data.sh` / `service.sh` run at the matching boot stages (`post_fs_data` / `boot` triggers), with output fed into the daemon log.
* **Native nodes** — entry libraries are injected into app processes / system_server by the loader (phase 2), scope- and trigger-filtered, using the same Zygisk API v4 companion protocol as classic modules.
* **Hot management** — enable/disable nodes from the WebUI; zip installs are applied by the daemon (or by dropping files into `fn/<id>/`); changes take effect on the next fork, no reboot required.

See the full specification in [docs/FN.md](docs/FN.md) and a ready-to-install example in [docs/examples](docs/examples/).

## WebUI

OnyxZygisk follows the **KernelSU module WebUI convention**: static pages live in the module's `webroot/` directory (`/data/adb/modules/onyxzygisk/webroot/`) and are loaded directly by the root manager apps — no network, no ports, no daemon involvement in page delivery.

* Open it from **KernelSU Manager / APatch Manager / MMRL**: module list → OnyxZygisk → WebUI.
* The pages talk to the system through the host-injected JS bridge (`window.ksu` / `window.mmrl`), which runs shell commands as root.
* Editing the `webroot/` files customizes the UI without rebuilding the module.

The WebUI covers the dashboard (module/daemon status, root solution, zygote injection), the installed Zygisk module list, FN node management (list / toggle), and a logcat viewer. See [docs/WEBUI.md](docs/WEBUI.md) for details.

## APatch

OnyxZygisk is adapted to APatch (KernelPatch) first and foremost: `apd` detection, real-CSV `package_config` parsing with `to_uid` uid-range support, atomic config writes, the kernel supercall interface (see above), and clean-namespace unmounting covering all known root overlay sources. See [docs/APATCH.md](docs/APATCH.md).

## Upstream

OnyxZygisk is a fork of [NeoZygisk](https://github.com/JingMatrix/NeoZygisk) by [JingMatrix](https://github.com/JingMatrix).
