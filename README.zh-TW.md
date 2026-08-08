<div align="center">

<img src="assets/tux.png" alt="OnyxZygisk" width="96">

# OnyxZygisk

面向 **APatch** 與 **KernelSU** 的**基於 ptrace 的 Zygisk 實作** —— 內建 **WebUI** 與 **FN(Functional Node)模組**。

[English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [日本語](README.ja.md)

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

</div>

---

## 亮點

- **內建 WebUI** —— 由 `webroot/` 提供的多頁控制面板,可在 KernelSU / APatch Manager / MMRL 中直接開啟。包含儀表板、模組清單、FN 管理、logcat 檢視器,以及 APatch 頁。支援淺色 / 深色 / 純黑主題與多語言。詳見 [docs/WEBUI.md](docs/WEBUI.md)。
- **FN(Functional Node)模組** —— 位於 Zygisk 核心之上的宣告式、依作用域、可熱抽換的擴充單元:指令碼節點與原生節點,無需重新開機即可啟用/停用。詳見 [docs/FN.md](docs/FN.md)。
- **APatch 優先適配** —— `apd` 偵測、真實 CSV 的 `package_config` 解析與原子寫入、涵蓋已知 root overlay 來源的乾淨命名空間卸載。詳見 [docs/APATCH.md](docs/APATCH.md)。
- **進階隱藏** —— 精細的 DenyList,對進行 root 偵測的應用隱藏 root 與模組痕跡。

## DenyList 說明

現代 systemless root 透過堆疊 overlay [掛載](https://man7.org/linux/man-pages/man8/mount.8.html)運作,而非直接改動系統分割區。DenyList 透過控制每個應用的[掛載命名空間](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)來隱藏這些改動:

| 應用狀態 | 掛載命名空間 | 適用情境 |
| :--- | :--- | :--- |
| **已授予 Root** | Root + 模組掛載 | 需要完整 root 的可信應用(如進階檔案管理器)。 |
| **在 DenyList** | 乾淨、未修改 | 為進行 root 偵測的應用提供純淨環境。 |

產生乾淨命名空間的兩種策略:

1. **直接從 zygote 卸載(主策略)** —— 在應用被 specialize *之前*,直接從 zygote 卸載 root 痕跡。若某模組提供關鍵系統資源(如 `/product` 的 overlay),安全檢查會中止此操作以免 zygote 崩潰。
2. **命名空間切換(回退策略)** —— fork 之後,以 `setns` 將應用切換進一個快取好的、完全乾淨的掛載命名空間。

## 設定

- **APatch / KernelSU:** 為目標應用啟用 **`卸載模組 / Umount modules`**。
- **Magisk:** 使用 **`設定 DenyList`**。請**關閉** Magisk 內建的 **`強制 DenyList`** —— 它可能與 OnyxZygisk 的隱藏機制衝突。

## 從原始碼建置

```sh
git clone https://github.com/GG-Linux/OnyxZygisk.git
cd OnyxZygisk
./gradlew :module:zipRelease
```

可刷入的 zip 會輸出到 `module/build/outputs/module/`。

## 致謝

OnyxZygisk 站在它所建置於、所受啟發的專案的肩膀上:

- **Zygisk API** —— [topjohnwu](https://github.com/topjohnwu) / [Magisk](https://github.com/topjohnwu/Magisk)
- **Zygisk Next**(獨立 ptrace 實作)—— [Dr-TSNG](https://github.com/Dr-TSNG/ZygiskNext)
- **NeoZygisk**(OnyxZygisk 基於此)—— [JingMatrix](https://github.com/JingMatrix/NeoZygisk)
- **OnyxZygisk** —— Sai, Matsuzaka Yuki 與[貢獻者們](https://github.com/GG-Linux/OnyxZygisk/graphs/contributors)

## 授權條款

[AGPL-3.0](LICENSE)。OnyxZygisk 是 NeoZygisk 的下游,沿用相同的授權條款與聲明。
