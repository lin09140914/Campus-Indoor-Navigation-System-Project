# 校園室內導航系統 — 團隊協作規範（CONTRIBUTING）

- **專案名稱：** Campus Indoor Navigation System
- **文件版本：** V0.1（團隊協作規範草案；已確認核心合併規則）
- **適用對象：** 所有專案開發成員
- **適用組別：** 地圖組、定位組、路徑組、3D 組、UI 組

> 本文件規範專案協作與合併流程。各組可自行設計內部演算法與輔助函式，但須符合已確認的共用資料規格、跨組函式介面與技術棧。尚未建立的 CI、詳細測試案例及 QA 標準，將在後續階段制定。

---

## 1. 文件撰寫與維護（Documentation）

### 1.1 基本原則

1. 正式開發文件統一使用 Markdown（`.md`）。
2. 文件應清楚描述功能、輸入、輸出、依賴與交付要求。
3. 跨組合作以正式共用規格為準，不得自行修改其他組別的正式開發需求或跨組契約。
4. 程式碼異動導致文件內容不再正確時，須同步更新相關文件。
5. 尚未定案的內容應標示「待確認」，不得直接視為正式規格。

### 1.2 文件位置

| 文件 | 位置 |
| --- | --- |
| 系統架構 | `docs/architecture/System_Architecture.md` |
| 技術棧 | `docs/architecture/Technology_Stack.md` |
| 五組開發規格 | `docs/development/` |
| 八項統一資料規格 | `docs/interfaces/schemas/Data_Specification.md` |
| 跨組 Function | `docs/interfaces/functions/function.md` |
| 決策紀錄 | `docs/decisions.md` |
| 各組週報 | `docs/weekly-reports/` |

### 1.3 週報規則

各組須於**每週三晚上前更新週報**，供週四會報使用，內容至少包括：

- 本週完成事項與目前進度。
- 遇到的問題或阻礙。
- 需要其他組別協助的事項。
- 下週預計工作。

尚未完成或尚未驗證的功能，不得標示為已完成。

---

## 2. Git Branch 管理與合併限制（Branch Management）

### 2.1 分支用途

| 分支 | 用途 | 正常合併方向 |
| --- | --- | --- |
| `main` | 經整合測試與 QA 通過的穩定版本 | `master` → PR → `main` |
| `master` | 各組開發成果的整合分支 | 功能／修正／文件分支 → PR → `master` |
| `feature/*` | 新功能開發 | PR → `master` |
| `fix/*` | 錯誤修正 | PR → `master` |
| `docs/*` | 文件修改 | PR → `master` |

### 2.2 分支命名

建議遵循：

```text
feature/<team>/<feature-name>
fix/<team>/<issue-name>
docs/<document-name>
```

範例：

```text
feature/map/svg-parser
feature/localization/position-estimation
feature/route/astar-search
feature/3d/render-map
feature/ui/destination-selector
fix/route/invalid-node
docs/update-data-specification
```

### 2.3 分支保護規則（已確認）

1. **禁止直接 Push 到 `main` 和 `master`。**
2. **任何合併至 `main` 或 `master` 的變更，都必須透過 Pull Request。**
3. **每個 PR 至少要有一位非作者 Reviewer 批准。**
4. 禁止對 `main` 或 `master` 執行 Force Push，且不得擅自刪除這兩個分支。
5. 不得繞過必要審查及合併限制。
6. 一般開發成果先進入 `master`；`main` 只接收已完成必要整合測試及 QA 的版本。

須在 GitHub Repository 中使用 Rulesets 或 Branch Protection 實際套用保護條件；本文件本身不會自動限制 Push 權限。

### 2.4 合併流程

```text
Feature / Fix / Docs Branch
            |
            v
       Pull Request
            |
            v
Code Review + 必要基本檢查
            |
            v
          master
            |
            v
   Integration Test + QA
            |
            v
     master → main PR
            |
            v
           main
```

`master` 是開發整合分支，不代表已完成完整系統 QA。

---

## 3. Pull Request 與 Code Review

### 3.1 PR 提交要求

每個 PR 應說明：

1. 修改目的及主要內容。
2. 涉及的檔案、模組或組別。
3. 新增、移除或變更的依賴。
4. 是否影響共用資料格式或跨組 Function。
5. 已執行的測試項目與結果。
6. 已知限制、未解決問題，以及需要協助的事項。
7. 如程式碼涉及規格調整，應說明相關文件是否同步更新。

### 3.2 Code Review 規則（已確認）

1. **每個 PR 至少需要一位非作者 Reviewer 批准。**
2. 作者不得自行批准自己的 PR。
3. Reviewer 必須檢查實際修改內容，而非僅按下 Approve。
4. 涉及跨組介面時，應邀請受影響組別參與審查。
5. 若 Reviewer 提出必須修正的問題，作者須修正並重新完成必要審查。
6. 未完成必要審查或檢查，不得合併。

### 3.3 審查重點

- 是否符合該組開發規格及共用資料契約。
- 跨組 Function 的呼叫方式與輸入輸出是否正確。
- 是否引入不相容依賴。
- 是否存在明顯邏輯錯誤、不可維護的設計或敏感資訊。
- 測試紀錄是否足以支持此次修改。

Reviewer 不應在缺乏規格或品質理由時，強制其他組別更換內部演算法與實作方式。

---

## 4. Merge Conflict 處理

### 4.1 基本規則

1. 由發生衝突的開發分支負責人處理 Merge Conflict。
2. 解決前須理解衝突雙方的修改目的，不得直接刪除不理解的他人程式碼。
3. 涉及其他組別的程式碼時，應先與該組協調。
4. 解決後重新編譯並檢查受影響功能，再更新 PR。
5. 不得強制覆蓋 `main` 或 `master` 的提交歷史。
6. 若需重寫個人分支歷史，先確認該分支是否由多人共同使用。

### 4.2 建議處理流程

```text
發現衝突 → 確認修改內容 → 跨組協調（必要時）
        → 解決衝突 → 重新檢查功能 → 更新 PR
```

---

## 5. 程式碼風格與品質（Coding Standards）

### 5.1 基本原則

1. 程式碼應具有可讀性與可維護性，名稱應清楚描述用途。
2. 避免不必要的重複程式碼與過度龐大的單一函式。
3. 不得保留無用途的除錯程式碼。
4. 不得將密碼、Token、私鑰等機密資料提交至 Repository。
5. 不得擅自修改已確認的共通資料格式及跨組介面。

### 5.2 語言風格

| 技術 | 規範 |
| --- | --- |
| Kotlin | 依 Kotlin 官方程式碼風格 |
| JavaScript | 使用一致的命名、格式與 ES Modules |
| JSON | 遵守統一資料契約及 `snake_case` 欄位命名 |
| SVG | 遵守目前已確認的 SVG 資料規格 |
| Python（離線工具） | 建議依 PEP 8 |

具體格式化器、Linter 與檢查設定，依後續專案建置配置決定。

### 5.3 各組實作自主

各組可自行設計內部 Function、演算法、資料結構、類別及輔助工具；前提是不破壞正式的共用技術棧、資料契約、跨組 Function 以及上述品質規範。

---

## 6. 測試與合併前基本要求

### 6.1 開發者責任

提交 PR 前，應確認：

1. 沒有已知的基本語法錯誤。
2. 可在所屬開發環境正常建置或執行。
3. 修改功能已完成可執行的基本測試。
4. 沒有破壞已知正常運作的功能。
5. 涉及跨組資料時，輸入與輸出符合統一規格。

若測試無法執行，應於 PR 中說明原因，不得宣稱已通過。

### 6.2 CI 尚未建立時（已確認）

1. **PR 作者須人工執行可用的基本測試，並在 PR 中回報測試項目及結果。**
2. Reviewer 應查核測試紀錄是否合理。
3. 尚未執行的測試必須清楚標示。
4. 即使沒有 CI，仍須至少一位非作者 Reviewer 批准，才能合併。

### 6.3 CI 啟用後（已確認）

1. 由專案統一指定必要的 CI Status Checks。
2. **所有必要 CI Checks 都通過後，PR 才能合併。**
3. CI 失敗時須修正並重新執行檢查，不得直接跳過。
4. CI 不取代人工 Code Review。
5. 若 CI 基礎設施異常，須由整合負責人確認處置方式，不得由個別成員自行繞過規範。

### 6.4 測試分工

| 測試 | 負責對象 |
| --- | --- |
| 基本功能、Unit Testing | 各組 |
| Function Contract Testing | Function 提供組與使用組 |
| Integration Testing | 相關組別與整合負責人 |
| QA | QA／整合負責人 |

`master` → `main` 的合併須先完成必要整合測試與 QA。測試案例、門檻、CI 與 QA 工作流程後續另行制定。

---

## 7. 技術棧、資料格式與 Function 變更管理

### 7.1 技術棧變更

共同使用的技術與依賴版本以 `docs/architecture/Technology_Stack.md` 為準。

會影響共用環境或其他組別的 Kotlin、Android SDK、Gradle / AGP、Compose、Three.js、AndroidX WebKit 等版本變更，必須先說明原因與相容性影響，再與相關組別協調。各組可自行管理不影響共用環境的內部工具。

### 7.2 統一資料格式變更

共用資料格式以 `docs/interfaces/schemas/Data_Specification.md` 為準。

修改必要欄位、型別、ID、樓層、座標系統、Graph、Route、定位結果及影響相容性的 SVG 格式前，必須與受影響組別協調。不得自行發布與正式資料契約不相容的格式。

### 7.3 跨組 Function 變更

跨組 Function 以 `docs/interfaces/functions/function.md` 為準。

修改 Function 名稱、Input / Output、回傳型別、呼叫前提或影響其他組別的行為時，必須先協調。各組內部 Function 可以自行調整，但不得因此破壞跨組契約。

### 7.4 共同變更流程

```text
提出變更 → 說明原因與影響範圍 → 跨組協調
        → 確認方案 → 同步更新規格與程式碼
        → Pull Request → Code Review／必要檢查 → 合併
```

重大架構及跨組規格決策應記錄於 `docs/decisions.md`。

---

## 8. 組別協作與交接（Team Collaboration）

### 8.1 基本原則

1. 每組應清楚掌握自己的開發範圍與交付項目。
2. 所有跨組資料必須遵守共用規格。
3. 跨組 Function 應提供必要的呼叫方式與使用說明。
4. 發現影響其他組別的問題，應主動通知相關組別。
5. 不得未經協調擅自修改跨組介面。

### 8.2 交接項目

| 提供組別 | 接收組別 | 主要交付內容 |
| --- | --- | --- |
| 地圖組 | 路徑、3D、UI、定位 | SVG、Graph、Node Mapping、Floor、Destination 等資料 |
| 定位組 | UI、路徑、3D | 定位 Function 與統一定位結果 |
| 路徑組 | UI、3D | `findRoute()` 與 Route |
| 3D 組 | UI | `renderMap()`、`renderRoute()` 與渲染介面 |
| UI 組 | 其他相關組別 | 整合需求、功能呼叫及問題回報 |

### 8.3 功能交付要求

跨組交付至少應說明：功能名稱與用途、依據的資料／Function 規格、呼叫或讀取方法、必要 Input / Output、已完成測試、已知限制及未完成事項。

若文件未涵蓋實際遇到的問題，由相關組別先討論，必要時交由整合負責人協調；如需變更正式共通規格，依第 7 章辦理。

---

## 9. 規範適用與執行

1. 本文件適用於所有專案開發成員。
2. 各組保有內部實作自主權，但須遵守正式共用契約。
3. 所有合併至 `main`、`master` 的修改均須經 Pull Request。
4. 每個 PR 至少需要一位非作者 Reviewer 批准。
5. CI 啟用前，須人工提供測試紀錄；CI 啟用後，須通過指定的必要檢查。
6. 正式穩定版本須完成必要的整合測試與 QA。
7. 具體自動化測試、CI 配置及 QA 驗收標準將於後續階段制定。

> **實施提醒：** 本文件是流程規範，不會自動啟用 GitHub 權限限制。請另於 Repository Settings 設定 `main`、`master` 的 Rulesets / Branch Protection，包括要求 PR、至少一位非作者批准、阻止 Force Push，以及 CI 啟用後的必要 Status Checks。
