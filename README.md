# 開發者指南（Developer Guide）

**繁體中文** | [English](README.en.md)
所有參與本專案的開發者，在開始實作前，請先閱讀團隊規範、系統架構及所屬組別的開發規格。

## 1. 團隊協作規範

- [CONTRIBUTING.md](./CONTRIBUTING.md) — Git Branch、Pull Request、Code Review、測試及跨組協作規範。

所有開發者都必須遵守此文件。

## 2. 系統架構與技術棧

- [System Architecture](./docs/architecture/System_Architecture.md) — 系統架構、五組模組關係與 Android／Three.js 整合方式。
- [Technology Stack](./docs/architecture/Technology_Stack.md) — 開發語言、框架、依賴套件與版本規範。
- [開發環境安裝與建置指南](./docs/Environment_Setup.md) — Linux、macOS、Windows 的 JDK／Android SDK 安裝與路徑設定，以及 Gradle 建置和依賴更新流程。

請依照統一技術棧進行開發，不得自行變更影響其他組別的共用依賴。

## 3. 各組開發規格

請閱讀所屬組別的開發規格：

| 組別 | 開發規格 | V0.1 進度表 |
|---|---|---|
| 地圖組 | [Map Team](./docs/development/Map_Team_Development.md) | [地圖組進度表](./docs/planning/v0.1/milestones/map-team.md) |
| 定位組 | [Localization Team](./docs/development/Localization_Team_Development.md) | [定位組進度表](./docs/planning/v0.1/milestones/localization-team.md) |
| 路徑組 | [Route Team](./docs/development/Route_Team_Development.md) | [路徑組進度表](./docs/planning/v0.1/milestones/route-team.md) |
| 3D 組 | [3D Team](./docs/development/3D_Team_Development.md) | [3D 組進度表](./docs/planning/v0.1/milestones/3d-team.md) |
| UI 組 | [UI Team](./docs/development/UI_Team_Development.md) | [UI 組進度表](./docs/planning/v0.1/milestones/ui-team.md) |

各組可自行決定內部實作方式，但必須符合所屬開發規格及跨組介面契約。

## 4. 跨組共用規格

涉及其他組別的資料或函式時，必須參考：

- [Data Specification](./docs/interfaces/schemas/Data_Specification.md) — 八項統一資料格式。
- [Function Interface](./docs/interfaces/functions/function.md) — 跨組 Function 的 Input、Output 及使用條件。

跨組介面不得由單一組別擅自修改。

## 5. 開發流程

1. 閱讀本專案的團隊規範及技術棧。
2. 閱讀所屬組別的開發規格。
3. 確認需要使用的跨組資料與 Function。
4. 從開發分支進行實作。
5. 完成功能後執行基本測試。
6. 建立 Pull Request 至 `master`。
7. 通過必要檢查及至少一位非作者 Reviewer 批准後，才能合併。

涉及統一資料規格、跨組 Function 或技術棧的修改，必須先與受影響組別協調。

