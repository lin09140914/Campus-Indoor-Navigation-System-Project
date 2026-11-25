# 路徑組 V0.1 — 11/25 測試紀錄

- 日期：2026-11-25（UTC+8）
- [測試版本：初版 commit a8548ff](https://github.com/lin09140914/Campus-Indoor-Navigation-System-Project/commit/a8548ff0204063f4c3959ea1d018ef53202f6801)
- 地圖：`2026-11-24-floor1-structured-draft2`，`eng5_LOCAL_PENDING`（SVG 單位）。
- ChatGPT 協助設計、實作、測試工具及文件；初期核心測試由 AI 環境執行，後續 Windows 測試由本人執行。

## 1. 測試結果

| 測試 | 執行者 | 結果／證據 |
| --- | --- | --- |
| 自建含環圖（7×7×3）A* 與 Dijkstra | AI | 147/147 PASS |
| 地圖組 1F（141×48×3）A* 與 Dijkstra | AI | 20,304/20,304 PASS |
| 正常與錯誤判定（18:36） | 本人 | [15/15 PASS](route-validation/2026-11-25/fault-check-20261125-183627.json) |
| JSON 端到端（22:03） | 本人 | [PASS，1m 23s](route-validation/2026-11-25/json-check-20261125-220350.txt) |
| Android APK 編譯（22:24） | 本人 | [PASS，2m 20s，36 項工作](route-validation/2026-11-25/android-build-20261125-222401.txt) |

初期核心測試另檢查非法資料、版本、模式、同點及不可達情況，並確認 Route 欄位及正式模式拒絕 SVG 草稿。本人使用 JDK 21.0.10、Gradle 9.5.0、專案 Kotlin 2.4.21 與 JSON 1.13.0；[環境紀錄](route-validation/2026-11-25/environment-20261125-183407.json)是安裝 SDK 前的快照（PATH 預設 Java 25，JAVA_HOME 指向 21）。

## 2. 代表性案例

下表前六組為自建圖，最後一組為地圖組 1F 原始 JSON。預期值依既有測試圖與獨立比對結果；前六組紀錄保存檢查結果而非完整 Route JSON，因此不另填造實際路徑。

| 案例 | Graph | 輸入（起點、目的地、mode） | 預期結果 | 實際結果／判定 |
| --- | --- | --- | --- | --- |
| N01 | 自建圖 | S, L_G, any | S→B→A→G；4 | 路徑及成本檢查一致，PASS |
| N02 | 自建圖 | S, L_U, any | S→B→A→V→U；6 | 一致，PASS |
| N03 | 自建圖 | S, L_U, stair | S→B→A→G→U；7 | 一致，PASS |
| N04 | 自建圖 | S, L_U, elev | S→B→A→V→U；6 | 一致，PASS |
| N05 | 自建圖 | S, L_S, any | S；0 | 一致，PASS |
| N06 | 自建圖 | S, L_X, any | null（不可達） | 一致，PASS |
| J01 | 地圖組 1F 草稿 | ENTRANCE-A-W 的模擬定位，L_A118, any | 12 節點、成本約 299.2666337835625、樓層 [1]、transitions 空 | 實際 12 節點、299.2666337835625、[1]、[]，PASS |

J01 實際輸出路徑：`ENTRANCE-A-W → F1-C-051 → F1-C-001 → F1-C-027 → F1-C-028 → F1-C-029 → F1-C-011 → F1-C-012 → F1-C-013 → F1-C-030 → A118#door → A118`。預期成本與初版獨立 Dijkstra 比對的樣例一致；JSON smoke test 本身主要檢查資料解析、輸出欄位、節點及 Route 一致性，不是另一輪全組合最短路徑測試。

另有本人在本地測試平台手動查詢 B102→A118（elev，1188.1596 SVG 單位、28 節點）與 S→U（any，6）兩例，畫面顯示 PASS；未附原始匯出檔，僅列為操作觀察，不與上述自動測試重複計數。

## 3. 測試工具能否發現錯誤？

使用 v0.2 平台的 `server.verify`，將正常 Route 的副本故意修改；並未更改正式 Kotlin 原始碼或地圖。預期拒絕項目均被發現；部分案例同時觸發其他檢查。PASS 指驗證器成功辨識錯誤，而不是錯誤路線有效。

| 故意錯誤 | 預期被拒絕的檢查 | 實際被拒絕的檢查 | 測試 |
| --- | --- | --- | --- |
| 成本寫錯 6→8 | 邊權重總和、Dijkstra 最短成本 | 邊權重總和、Dijkstra 最短成本 | PASS |
| 跳過 A：B→V 無連接邊 | 連續合法邊 | 連續合法邊、移動模式、邊權重總和、樓層及 transitions | PASS |
| 樓梯模式違規使用電梯 | 移動模式 | 移動模式、Dijkstra 最短成本 | PASS |
| 合法但非最短的樓梯路線 | Dijkstra 最短成本 | Dijkstra 最短成本 | PASS |
| 地圖版本錯誤 | 節點資料與版本 | 節點資料與版本 | PASS |
| 錯誤樓層清單 | 樓層及 transitions | 樓層及 transitions | PASS |
| 遺失跨樓層紀錄 | 樓層及 transitions | 樓層及 transitions | PASS |
| 錯誤回傳無路徑 | 可達性一致 | 可達性一致 | PASS |
| 錯誤終點 | 起點與目的地 | 起點與目的地、邊權重總和 | PASS |

AI 環境先前執行的 15 組案例與本人紀錄逐項一致；兩份 manifest 相同。這是同一組測試的重跑，不計成 30 個不同案例。平台不是正式 Android UI，未驗證瀏覽器繪圖、完整 Android 串接或 Kotlin 突變測試。

## 4. 結論與限制

- 兩次 Gradle 測試的六份輸入檔案雜湊一致，且與 GitHub 對應檔案核對相符（見附錄）。
- Android 編譯及 APK 打包成功，退出碼 0；`libandroidx.graphics.path.so` 無法 strip 的警告未阻止建置。未安裝 APK 或測試實機。
- 1F 尚未校正公尺比例，無真實樓梯及電梯邊；模擬跨層不等於實地驗收。任意定位匹配及穿牆檢查待完成。
- 尚未同步 PR #15 的座標規格，需同步後重跑必要測試。跨組呼叫、共同型別、例外格式及非作者審查待確認，不宣稱已正式驗收。

## 附錄：初期核心測試與版本核對

初期 AI 環境：JDK 21.0.12.1、kotlinc-jvm 1.9.0、Python 3。因無法直接 clone，以 GitHub 讀取資料轉成測試欄位投影（原數值、FNV-1a 2320671490），不是直接測完整 JSON。1F 草稿 Git blob：Graph `1e1c826674cd3f26de9719ef1541457834e7748a`、Destination `18c9b334402e672f2fea0e6649a4f7445a0bd898`。

兩次 Windows Gradle 紀錄中的六份輸入 SHA-256 相同。整理時另外核對 GitHub 分支：三份 Kotlin 檔案經第一輪原始交付 ZIP 的 SHA-256 及 Git blob SHA-1 與遠端比對；其餘三份直接對遠端內容計算 SHA-256，六份皆一致。這不是完整 repository 每個檔案的雜湊驗證。

| 相對路徑 | SHA-256 |
| --- | --- |
| `app/src/main/java/com/example/campusindoornavigation/routing/RoutePlanner.kt` | `27eabce8423d661aab26fc2a63ab89f33d52c03146282a3dadbcb5e8b6a0db11` |
| `app/src/main/java/com/example/campusindoornavigation/routing/RouteJson.kt` | `81e4a6caaef90f2a9f37441106a514784bbfed80a468448c98343da6dda34377` |
| `tools/routing/RouteJsonCheck.kt` | `332fca94b8a43429a9cede80b9b2b99220de5c55cf9a2363a0116889085de993` |
| `data/drafts/floor-1/graph.json` | `c947125992c29c163e60eb0ba3fa2506c34bfbbf39ea70354ca968a1e11ca8bd` |
| `data/drafts/floor-1/destinations.json` | `404512d84f2f2109657840c7a47f5272dd9047fc976fcc394f4a2d0dbf1c669b` |
| `gradle/libs.versions.toml` | `9047be8432ba5b96ebb706c4566c0ac4e01305285f1ae7422dce0f5c69b3a1f7` |

平台紀錄的核心 Git blob：`11ad2bf89c59f59ac92c633d48fa15f42dd6bde4`；JAR SHA-256：`75b74f16b80df956af6e0ec1f8885bc2c49a88f5c26a45f3459d53c1db53f8c3`。此為平台 manifest 紀錄，不代表對 Android APK 進行完整二進位比對。

原始本機路徑已從公開版環境及命令紀錄移除；保留相對檔名、輸入雜湊、實際輸出與退出碼。原始檔由本人留存。AI 的故障注入重跑紀錄不重複附檔。

## 附錄：JSON 測試重現方式

核心測試及 Android 建置指令見[開發說明](Route_Milestone1_Implementation.md#6-如何重跑)。本次 JSON 測試以暫時 JVM 專案執行。建立空白暫時資料夾，將 `RoutePlanner.kt`、`RouteJson.kt`、`RouteJsonCheck.kt` 複製至其 `src/main/kotlin/`，並新增以下兩個設定檔（不修改正式 Android 專案）。

`settings.gradle`：

```groovy
pluginManagement { repositories { gradlePluginPortal(); mavenCentral(); google() } }
rootProject.name = 'routing-json-check'
```

`build.gradle`：

```groovy
plugins {
    id 'org.jetbrains.kotlin.jvm' version '2.4.21'
    id 'application'
}
repositories { mavenCentral(); google() }
dependencies { implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.13.0' }
application { mainClass = 'RouteJsonCheckKt' }
tasks.named('run') { args System.getenv('ROUTE_TEST_DATA') }
```

在正式專案根目錄，令 `$tempProject` 指向上述暫時專案的絕對路徑，執行：

```powershell
$env:ROUTE_TEST_DATA = (Resolve-Path data/drafts/floor-1).Path
.\gradlew.bat -p $tempProject --no-daemon --console=plain run
```

成功條件：`JSON smoke test PASS:`、`BUILD SUCCESSFUL` 且退出碼 0。
