# APatch 全面适配

OnyxZygisk 对 [APatch](https://github.com/bmax121/APatch) 做了第一优先级的
适配。APatch 是基于 KernelPatch 的 root 方案：模块挂载（APM）由内核完成，
root 授权是内核 supercall。以下说明 OnyxZygisk 如何与之对齐。

## 已对齐的上游事实（apd / KernelPatch）

| 事实 | 上游出处 | OnyxZygisk 位置 |
|---|---|---|
| apd 二进制位于 `/data/adb/ap/bin/apd`，`apd -V` 输出 `apd <VERSION_CODE>` | `apd/src/defs.rs` | `root_impl/apatch.rs::apd_version` |
| `package_config` 为 CSV，表头 `pkg,exclude,allow,uid,to_uid,sctx` | `apd/src/package.rs` | `root_impl/apatch.rs::parse_package_config` |
| `to_uid` 把授权扩展为 UID 区间（多用户/工作资料） | 同上（`SuProfile`） | `PackageConfig::uid_in_range` |
| 读取配置需要重试（文件为原子替换，可能读到替换间隙） | `read_ap_package_config` 的 5 次重试 | `read_package_config` |
| root 授权本质是内核 supercall：`syscall(45, key, ver_and_cmd(cmd), arg)`，需超级键 | `apd/src/supercall.rs` | `supercall.rs`（逐字节对齐） |
| supercall 命令：`SU_GRANT_UID=0x1100`、`REVOKE=0x1101`、`NUMS=0x1102`、`LIST=0x1103`、`GET_SAFEMODE=0x1112`、kstorage `EXCLUDE_LIST_GROUP=1` | `apd/src/supercall.rs` | `supercall.rs` |
| 版本握手 `ver_and_cmd`：KPatch `0.11.1` + magic `0x1158` | 同上 | `supercall.rs::ver_and_cmd` |
| `SuProfile { uid: i32, to_uid: i32, scontext: [u8; 0x60] }` | 同上 | `supercall.rs::SuProfile` |
| Manager 包名 `me.bmax.apatch`，可安装在任何用户资料 | 官方 Manager | `uid_is_manager` 扫描 `/data/user(_de)/*` |

## 与 APatch 交互的方式

### 1. 只读：package_config 文件（无需超级键）

zygiskd 在 zygote 注入流程中判断 `uid_granted_root` / `uid_should_umount` 时
直接解析 `/data/adb/ap/package_config`（与 apd 同步进内核的数据同源），
支持：

- 真 CSV 解析（引号字段、`""` 转义、坏行跳过、5 次重试）
- **`to_uid` UID 区间匹配**（工作资料等场景，旧实现只做精确匹配）

### 2. 写：package_config 原子改写（无需超级键）

WebUI 拒绝列表页对 APatch 的修改走 `write_package_config`：
tmp 文件 + rename 原子替换，与 apd 的写入方式完全一致，apd 的
`UidListener` 会照常同步到内核。

### 3. 管理：内核 supercall（需要超级键）

WebUI 的 APatch 页接受用户输入的**超级键**（仅保存在守护进程内存中，
见 `docs/WEBUI.md`），通过 `supercall.rs` 直接与内核交互：

- `SU_NUMS` + `SU_LIST`：列出已授权 UID
- `SU_GRANT_UID`：授予 root（可指定 `to_uid` 区间与 scontext）
- `SU_REVOKE_UID`：回收 root
- `SU_GET_SAFEMODE`：查询内核安全模式
- `KSTORAGE_WRITE(EXCLUDE_LIST_GROUP)`：同步内核侧"卸载模块"（exclude）列表

超级键的设计理念是"比 root 权限更高"，官方实现也要求每次启动手动传入，
因此 OnyxZygisk **不会**持久化或自动获取超级键。

## 拒绝列表 / 卸载模块 的语义

| root 方案 | 数据源 | 读取 | 修改 |
|---|---|---|---|
| APatch | `/data/adb/ap/package_config`（`exclude` 列）+ 内核 exclude 组 | WebUI 拒绝列表页 | 原子改写 CSV；`/api/apatch/exclude` 同步内核 |
| KernelSU | `/data/adb/ksu/denylist` | 同上 | 同格式重写 |
| Magisk | `magisk --denylist` | 同上 | `magisk --denylist add/rm`（失败时只读） |

## 干净命名空间（mount.rs）

清洁 mount namespace 的卸载目标集合覆盖全部已知 root overlay 源：
`magisk`、`KSU`、`APatch`、`kpatch`，加上 `/data/adb/modules` 路径与
`/adb/modules` overlay root 匹配，确保无论哪个 root 方案激活都能清干净。
