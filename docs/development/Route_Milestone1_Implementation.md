# 路徑組 V0.1 — 11/29 單樓層開發成果（待審查）

- 日期：2026-11-25
- 基準 master：`af69eaad6b319d7f0614317246884ee325a5cb96`（PR #13 已合併）
- 預定分支：`feature/route/astar-search`；建立遠端分支時 GitHub integration 回傳 403，尚未提交或送 PR。
- 依據：`docs/planning/v0.1/milestones/route-team.md`、`docs/interfaces/functions/function.md`、`docs/interfaces/schemas/Data_Specification.md`。
- PR #15（座標原點）在本輪檢查時尚未合併。此實作不假定未確認的公尺比例、樓高或原點轉換。

## 1. 交付範圍

本輪實作 Kotlin A*、目的地 ID 解析、基本資料驗證、標準 Route 模型與 JSON 轉接。僅支援**精確且唯一地落在同樓層既有 Graph Node 上的起點**。不將任意定位點直接接到最近節點，避免產生尚未驗證的穿牆連線。

正式 `findRoute(graph, start, destination_id, mode)` 的四項資料契約保留。Kotlin 參數使用 camelCase；`RoutePlanner` 建構時提供 `RouteDestinations`，使四參數函式能依目的地資料解析 Location ID。資料模型暫置 `routing` 套件，後續共用模型位置由整合組確認。

## 2. 檔案

| 路徑 | 用途 |
| --- | --- |
| `app/src/main/java/com/example/campusindoornavigation/routing/RoutePlanner.kt` | 資料模型、Graph 驗證、精確起點匹配、A*、Route 輸出 |
| `app/src/main/java/com/example/campusindoornavigation/routing/RouteJson.kt` | 共用 JSON snake_case 欄位轉接；沿用已宣告的 kotlinx.serialization.json 依賴 |
| `tools/routing/RouteCoreCheck.kt` | 可獨立執行的 Kotlin 測試，以 Dijkstra 比對 A* |
| `tools/routing/run_core_checks.py` | 從既有 1F JSON 取得契約欄位、編譯並執行核心測試 |
| `tools/routing/RouteJsonCheck.kt` | 待執行的 JSON 端到端 smoke test |

未修改 `MainActivity.kt`、Gradle 設定、CI、其他組程式、地圖資料與共用規格。不新增第三方依賴。

## 3. 呼叫方式（Kotlin）

```kotlin
val graph = RouteJson.decodeGraph(graphJson)
val destinations = RouteJson.decodeDestinations(destinationsJson)
val start = RouteJson.decodeStart(localizationJson)
val planner = RoutePlanner(destinations, allowDraftSvgUnits = true)
val route = planner.findRoute(graph, start, "L_A118", "any")
val routeJson = RouteJson.encodeRoute(route)
```

`graphJson`、`destinationsJson`、`localizationJson` 是上層提供的 JSON 字串。測試目前草稿使用 `data/drafts/floor-1/`；`localizationJson` 需由測試端明確構造為既有節點座標，使用相同建築 ID、版本與座標系統 ID。此非真實定位結果。正式公尺資料應使用預設 `allowDraftSvgUnits = false`，不得開啟草稿模式來接受未校正資料。

`Route` 包含 building_id、map_version、coordinate_system_id、mode、path（完整 Node）、length（邊權重總和）、floors（首次經過順序、去重）、transitions（每次跨層資訊）。`null` 表示找不到安全起點或可達路徑；不合法輸入在核心暫用 `IllegalArgumentException`，後續遵照統一例外規格調整。JSON 解析本身也可能因格式錯誤拋出例外，不應直接顯示成功路線。

## 4. A* 原理

Graph 是無向加權圖，先以鄰接串列保存每一條雙向邊；優先佇列使用 `f = g + h`，其中 g 為起點到當前節點已知最小成本，h 為到終點的 XZ 平面直線距離。每條合法邊的成本不小於其 XZ 直線距離，故啟發式不會高估；僅為處理浮點捨入而容許至多 8 ULP，並相應縮小 h。使用 `best` 保存目前最佳成本、`parent` 保存前驅；更新後重新加入佇列，舊紀錄出隊時略過。找到終點後沿 parent 回溯並反轉，產生 Route。

`stair` 排除 elev 邊，`elev` 排除 stair 邊，`any` 允許全部合法邊。模式套用於所有邊，而不是只在跨層時使用。

以二元堆優先佇列、鄰接串列為基礎；在一致啟發式及一般數值條件下，搜尋通常為 O((V+E) log(V+E))，空間 O(V+E)；本版允許重新入列，不保證每個節點僅出隊一次。每次查詢重建圖索引，V0.1 先重視正確性，不提前快取可變圖資。

## 5. 本輪實測紀錄

執行環境：JDK 21.0.12.1、kotlinc-jvm 1.9.0、Python 3；純 Kotlin JVM 核心編譯成功。專案鎖定 Kotlin 2.4.21，完整 Android 建置仍須另行驗證。

1F 輸入來源（master）：
- `data/drafts/floor-1/graph.json` Git blob `1e1c826674cd3f26de9719ef1541457834e7748a`
- `data/drafts/floor-1/destinations.json` Git blob `18c9b334402e672f2fea0e6649a4f7445a0bd898`

本環境無法直接 clone GitHub；以 GitHub 讀取的資料將路徑所需欄位轉成測試投影（節點座標與邊權重按原數值傳輸，二進位傳輸 FNV-1a 核對值 2320671490）。測試投影不是完整原始 JSON 檔案；未替換正式地圖。提交內容不含該投影，使用者可從原 Repository 直接重跑測試。

| 測試 | 結果 |
| --- | --- |
| 自建含環圖，7 起點 × 7 目的地 × 3 模式，獨立 Dijkstra 比對 | 147/147 PASS |
| 額外指定路徑、模式、同點、斷開、精確匹配、版本及非法資料測試 | PASS |
| 1F 141 起點 × 48 目的地 × 3 模式，獨立 Dijkstra 比對 | 20,304/20,304 PASS（全部可達） |
| Route 節點資料、相鄰邊、模式、長度、樓層、transitions 檢查 | PASS（上述可達案例） |
| 正式模式拒絕 SVG 草稿 | PASS |
| Kotlin JSON adapter 編譯、JSON smoke test | **未執行**（缺專案 JSON runtime 及對應 Kotlin 環境） |
| Android Gradle APK、UI／3D／定位實機串接 | **未執行**（無 Android SDK／完整依賴） |

1F 全部 140 條邊均為 `walk`，所以三種模式結果相同屬正常；實際樓梯與電梯尚未加入 Graph。實體跨樓層驗收仍待資料，不能用自建測試替代。1F 目前為連通樹，因此含環圖測試補足多路徑比較。

樣例：`ENTRANCE-A-W → F1-C-051 → F1-C-001 → F1-C-027 → F1-C-028 → F1-C-029 → F1-C-011 → F1-C-012 → F1-C-013 → F1-C-030 → A118#door → A118`，權重 299.2666337835625 **SVG 圖面單位（不是公尺）**。

## 6. 如何重跑

在專案根目錄，先確認已安裝 Python 3、JDK 與 `kotlinc`，並設定 PATH。Windows PowerShell：

```powershell
python tools/routing/run_core_checks.py
```

僅測自建圖：`python tools/routing/run_core_checks.py --synthetic-only`。本腳本以 Python 讀取 JSON 轉成核心測試輸入，不經 RouteJson，故不能當作 JSON adapter 測試。

在專案指定 Android 環境編譯：

```powershell
.\gradlew.bat :app:assembleDebug
```

進一步 JSON smoke test：使用與專案相容的 Kotlin 編譯器與 Gradle 已取得的 `kotlinx-serialization-json-jvm`、`kotlinx-serialization-core-jvm` jar，將兩個實際 jar 路徑放入 `$cp`（Windows 以分號分隔），例如：

```powershell
$src = 'app/src/main/java/com/example/campusindoornavigation/routing'
$cp = '<json-jvm.jar 的實際路徑>;<core-jvm.jar 的實際路徑>'
kotlinc -cp $cp "$src/RoutePlanner.kt" "$src/RouteJson.kt" tools/routing/RouteJsonCheck.kt -include-runtime -d "$env:TEMP/route-json-check.jar"
java -cp "$env:TEMP/route-json-check.jar;$cp" RouteJsonCheckKt data/drafts/floor-1
```

先核對路徑及 Kotlin 版本；未執行前不可標為 PASS。

## 7. 後續與已知限制

- 11/29：確認 JSON adapter 可在指定 Android 環境編譯、跑 smoke test；與 UI/3D 組確認四參數呼叫、資料模型、草稿圖面單位及資源讀取方式，然後送 PR。
- 12/04：取得正式座標及牆壁幾何，實作最近可通行節點匹配、接入線不穿牆、真實跨樓層整合與測試。
- 12/11：完成正式跨組整合、異常處理、測試紀錄和必要修正。
- 本輪未對 Graph 邊進行獨立牆壁幾何重驗；暫以地圖組草稿檢查的通行邊為前提。精確起點匹配不額外生成接入線，但不能替代現場通行情況與牆壁檢查。
- 1F 座標系統為 `eng5_LOCAL_PENDING`，不得顯示成正式公尺數；待地圖組及整合組確認。
- 共用 Kotlin 型別與例外格式尚待跨組確認，未改變正式 JSON 欄位。
