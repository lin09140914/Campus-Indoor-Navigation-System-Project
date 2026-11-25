# 路徑組 V0.1 — 單樓層路徑規劃

- 日期：2026-11-25
- 開發分支：`feature/route/astar-search`
- [初版 Commit](https://github.com/lin09140914/Campus-Indoor-Navigation-System-Project/commit/a8548ff0204063f4c3959ea1d018ef53202f6801)；尚未送 PR。
- 基準 master：`af69eaad6b319d7f0614317246884ee325a5cb96`。PR #15 已更新座標原點規格，開發分支尚待同步。

## 1. 目前功能

依照[路徑組進度表](../planning/v0.1/milestones/route-team.md)、[跨組函式規格](../interfaces/functions/function.md)及[統一資料規格](../interfaces/schemas/Data_Specification.md)，實作 A*、目的地查找、基本資料檢查及 Route 輸出。

| 資料 | 用途 |
| --- | --- |
| Graph | 地圖組提供的導航節點及邊 |
| Destination | 將目的地 ID 對應至 Graph 節點 |
| Localization Result | 定位組提供的座標及樓層 |
| Route | 回傳路徑、總權重、樓層及跨樓層資訊 |

目前僅接受精確落在同樓層唯一既有節點的起點，尚未實作任意座標的匹配及穿牆檢查。

## 2. 程式檔案

| 檔案 | 用途 |
| --- | --- |
| `RoutePlanner.kt` | 資料模型、資料檢查、A*、Route 輸出 |
| `RouteJson.kt` | JSON 讀取與輸出 |
| `RouteCoreCheck.kt` | A* 與 Dijkstra 比對測試 |
| `run_core_checks.py` | 編譯及執行核心測試 |
| `RouteJsonCheck.kt` | JSON 端到端測試 |

前兩份位於 `app/src/main/java/com/example/campusindoornavigation/routing/`，其餘位於 `tools/routing/`。未修改其他組程式、地圖、Gradle、CI 或共同規格，也未新增第三方依賴。

## 3. 呼叫方式

保留四參數介面 `findRoute(graph, start, destination_id, mode)`，Kotlin 中使用 `destinationId` 命名。目的地資料在建立 `RoutePlanner` 時傳入。

```kotlin
val graph = RouteJson.decodeGraph(graphJson)
val destinations = RouteJson.decodeDestinations(destinationsJson)
val start = RouteJson.decodeStart(localizationJson)
val planner = RoutePlanner(destinations, allowDraftSvgUnits = true)
val route = planner.findRoute(graph, start, "L_A118", "any")
val routeJson = RouteJson.encodeRoute(route)
```

上例使用 `data/drafts/floor-1/` 的地圖草稿，並以既有節點座標模擬定位。`allowDraftSvgUnits = true` 僅供此草稿測試；正式資料應使用預設值 `false`。

回傳的 Route 包含 `building_id`、`map_version`、`coordinate_system_id`、`mode`、`path`（完整節點）、`length`（邊權重總和）、`floors`（首次經過順序、去重）、`transitions`（跨樓層紀錄）。找不到安全起點或可達路線時回傳 `null`；非法輸入暫用 `IllegalArgumentException`，JSON 格式錯誤亦可能拋出例外。共同資料模型及錯誤格式待整合組確認。

## 4. A* 如何運作

1. 建立鄰接串列，記錄每個節點的可通行鄰居（無向加權圖）。
2. 用優先佇列選擇 `f = g + h` 最小的節點。`g` 是目前找到的起點到該點成本，`h` 是到終點的 XZ 平面直線距離估計。
3. 若找到更低成本，就更新 `best`（成本）與 `parent`（前驅），重新加入佇列；出隊時略過舊紀錄。
4. 終點出隊後，沿 `parent` 回溯並反轉，取得完整路線。

| mode | 允許的邊 |
| --- | --- |
| `any` | 一般通道、樓梯、電梯 |
| `stair` | 一般通道、樓梯 |
| `elev` | 一般通道、電梯 |

模式限制套用於所有邊。合法邊權重不小於兩端 XZ 直線距離，因此啟發式不高估成本（浮點誤差容許 8 ULP，並相應縮小估計值）。採二元堆與鄰接串列，在一致啟發式及一般數值條件下，搜尋通常為 `O((V+E) log(V+E))`，空間 `O(V+E)`；允許重新入列。每次查詢重建圖索引。

## 5. 測試結果

| 測試 | 結果 |
| --- | --- |
| 自建圖與 Dijkstra 比對（AI） | 147/147 |
| 地圖組 1F 草稿與 Dijkstra 比對（AI） | 20,304/20,304 |
| 正常與錯誤判定測試（本人） | 15/15 |
| Kotlin JSON 端到端測試（本人） | 通過 |
| Android Debug APK 編譯（本人） | 通過 |

1F 草稿為連通樹，全部 140 條邊皆為 `walk`，因此另外以含環及跨樓層自建圖測試多路徑與模式限制。初期核心測試透過地圖欄位投影執行；本人的 JSON 測試則直接讀取原始 JSON。詳細案例、輸出與版本核對見[測試紀錄](Route_Milestone1_Validation_2026-11-25.md)。

## 6. 如何重跑

在專案根目錄執行（核心測試需要 Python、JDK、`kotlinc`）：

```powershell
python tools/routing/run_core_checks.py
.\gradlew.bat :app:assembleDebug
```

核心測試可加 `--synthetic-only` 僅測自建圖，且不經 `RouteJson`。Android 建置環境依[團隊指南](../Environment_Setup.md)設定。

JSON 測試使用 `RouteJsonCheck.kt`；本次以獨立 Gradle JVM 暫時專案執行，未改動正式 Android 設定。重現方式見[測試紀錄附錄](Route_Milestone1_Validation_2026-11-25.md#附錄json-測試重現方式)。

## 7. 尚未完成

- 11/29：同步 master、確認跨組呼叫方式、重跑必要測試並提交 PR。
- 12/04：同樓層可通行節點匹配、接入線穿牆檢查、真實跨樓層資料測試。
- 12/11：跨組整合、異常處理與最終測試。

目前 1F 座標系統為 `eng5_LOCAL_PENDING`，距離仍是 SVG 單位，不是實際公尺。PR #15 已定案 1F SVG 左上角為原點、X 向右、Z 向下、Y 向上，比例及其他樓層對齊仍待確認。本版依地圖組提供的可通行邊搜尋，未獨立重驗牆壁幾何、現場通行或手機定位。Android 編譯通過不代表 UI／3D／定位實機串接已完成。
