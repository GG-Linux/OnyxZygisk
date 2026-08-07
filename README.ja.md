<div align="center">

<img src="assets/tux.png" alt="OnyxZygisk" width="96">

# OnyxZygisk

**APatch** と **KernelSU** 向けの **ptrace ベースの Zygisk 実装** —— 組み込みの **WebUI** と **FN（Functional Node）モジュール**を備えています。

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **日本語**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

</div>

---

## 特長

- **組み込み WebUI** —— `webroot/` から配信される複数ページの管理パネル。KernelSU / APatch Manager / MMRL から直接開けます。ダッシュボード、モジュール一覧、FN 管理、logcat ビューア、APatch ページを備え、ライト / ダーク / AMOLED テーマと多言語に対応。詳細は [docs/WEBUI.md](docs/WEBUI.md)。
- **FN（Functional Node）モジュール** —— Zygisk コアの上で動く、宣言的・スコープ指定・ホットスワップ可能な拡張ユニット。スクリプトノードとネイティブノードがあり、再起動なしで有効化/無効化できます。詳細は [docs/FN.md](docs/FN.md)。
- **APatch 優先対応** —— `apd` の検出、実 CSV の `package_config` 解析とアトミック書き込み、既知の root オーバーレイ元を網羅したクリーンな名前空間のアンマウント。詳細は [docs/APATCH.md](docs/APATCH.md)。
- **高度なステルス** —— root やモジュールの痕跡を検出しようとするアプリから、それらを隠す高度な DenyList。

## DenyList について

最近の systemless root は、システムパーティションを直接変更せず overlay [マウント](https://man7.org/linux/man-pages/man8/mount.8.html)を重ねて動作します。DenyList は各アプリの[マウント名前空間](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)を制御して、それらの変更を隠します:

| アプリの状態 | マウント名前空間 | 用途 |
| :--- | :--- | :--- |
| **Root 付与** | Root + モジュールのマウント | 完全な root を必要とする信頼済みアプリ(高機能ファイラーなど)。 |
| **DenyList 対象** | クリーン・未変更 | root 検出を行うアプリ向けの、まっさらな環境。 |

クリーンな名前空間を作る 2 つの戦略:

1. **zygote から直接アンマウント(主戦略)** —— アプリが specialize される*前*に、zygote から root の痕跡を直接アンマウントします。あるモジュールが重要なシステムリソース(例: `/product` のオーバーレイ)を提供している場合は、zygote のクラッシュを避けるため安全チェックにより中止されます。
2. **名前空間の切り替え(フォールバック)** —— fork 後に `setns` でアプリをキャッシュ済みの完全にクリーンなマウント名前空間へ移します。

## 設定

- **APatch / KernelSU:** 対象アプリで **`Umount modules`** を有効にします。
- **Magisk:** **`Configure DenyList`** を使用します。Magisk 自身の **`Enforce DenyList`** は *オフ* のままに —— OnyxZygisk の隠蔽と競合することがあります。

## ソースからのビルド

```sh
git clone https://github.com/GG-Linux/OnyxZygisk.git
cd OnyxZygisk
./gradlew :module:zipRelease
```

フラッシュ可能な zip は `module/build/outputs/module/` に出力されます。

## クレジット

OnyxZygisk は、その土台となり着想を与えてくれたプロジェクトの上に成り立っています:

- **Zygisk API** —— [topjohnwu](https://github.com/topjohnwu) / [Magisk](https://github.com/topjohnwu/Magisk)
- **Zygisk Next**(スタンドアロンの ptrace 実装)—— [Dr-TSNG](https://github.com/Dr-TSNG/ZygiskNext)
- **NeoZygisk**(OnyxZygisk はこれをベースにしています)—— [JingMatrix](https://github.com/JingMatrix/NeoZygisk)
- **OnyxZygisk** —— Sai, Matsuzaka Yuki および[コントリビューター](https://github.com/GG-Linux/OnyxZygisk/graphs/contributors)

## ライセンス

[GPL-3.0](LICENSE)。OnyxZygisk は NeoZygisk の派生であり、同じライセンスと表示を維持します。
