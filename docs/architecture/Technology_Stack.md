# 校園室內導航系統 V1 — 技術棧與版本規範

> **檔案：** `docs/architecture/Technology_Stack.md`  
> **文件版本：** V1.0（選定版本基準；尚待首次完整建置與測試裝置驗證）  
> **更新日期：** 2026-11-19  
> **系統架構依據：** `System_Architecture.md`

## 1. 原則與發布目標

- V1 部署形式：**供組員／老師安裝的測試 APK**，不以上架 Google Play 為目標。
- Android 原生開發、Offline-first；核心導航不依賴後端或 CDN。
- UI、定位、路徑以 Kotlin 為主；3D 使用 JavaScript／Three.js。
- 共用依賴必須集中鎖定，不能讓五組各自選擇不同版本。
- 下表版本是**專案目前採用的固定基準**，不是「全部已經在同一專案成功建置」的宣稱；首次整合時必須驗證。
- IDE 自由選擇，但每位開發者須使用相容的 JDK、Android SDK、Gradle Wrapper 和 Node.js。

## 2. Android 建置環境（版本基準）

| 技術 | 固定版本／值 | 用途或限制 |
|---|---|---|
| JDK | **21 LTS** | 統一 Gradle 執行環境；Java／Kotlin bytecode 目標可另訂 |
| Kotlin | **2.4.21** | Android Native 程式 |
| Android Gradle Plugin (AGP) | **9.3.1** | Android 建置 |
| Gradle Wrapper | **9.5.0** | Gradle 版本由 Wrapper 控制 |
| Compose Compiler Gradle Plugin | **2.4.21** | Compose Compiler 與 Kotlin 同步；Plugin 設定須遵循 AGP 9 規則 |
| `compileSdk` | **37** | 編譯 API；應安裝對應 SDK Platform |
| `targetSdk` | **36** | Android 16 行為與權限適配基準 |
| `minSdk` | **29** | 最低 Android 10；須與實際測試手機相容 |

**說明：** `minSdk` 決定最低可安裝系統；`targetSdk` 決定目標行為規範；`compileSdk` 決定可用的編譯 API，三者不可混為一談。AGP 9.3 系列的官方相容性表指定 Gradle 9.5.0；Kotlin 2.4.21 與此組合的設定仍須進行實際 APK 建置驗證。

**重要：** AGP 9 引入內建 Kotlin 支援，不能未經確認就同時套用舊的 `org.jetbrains.kotlin.android` Plugin。Compose Compiler Plugin 的啟用方式也須按選定 AGP／Kotlin 設定，避免重複載入或衝突。

## 3. AndroidX、Compose 與共用 Library

| 依賴 | 固定版本 | 主要使用者／用途 |
|---|---|---|
| Compose BOM | **2026.09.00** | 管理 Compose UI／Material3 相關版本 |
| `androidx.activity:activity-compose` | **1.13.0** | UI 組：Activity + Compose |
| `androidx.lifecycle:lifecycle-runtime-ktx` | **2.11.1** | App／UI：Lifecycle |
| `androidx.lifecycle:lifecycle-viewmodel-compose` | **2.11.1** | App／UI：ViewModel |
| `androidx.navigation:navigation-compose` | **2.10.2** | UI 組：畫面導航（不是 Graph 的 A*） |
| `androidx.webkit:webkit` | **1.18.0** | WebView 橋接／功能相容性 |
| `androidx.core:core-ktx` | **1.19.1** | Android Kotlin 擴充 |
| `org.jetbrains.kotlinx:kotlinx-coroutines-android` | **1.11.0** | 非同步流程／生命週期工作 |
| `org.jetbrains.kotlinx:kotlinx-serialization-json` | **1.13.0** | JSON 資料解析及橋接封包 |

Compose UI 函式庫本身應由 BOM 決定對應版本，**不要另在相同依賴上指定互相矛盾的版本**。`2026.09.00` 在目前選定的 `compileSdk 37`／AGP 9 技術基準下較適合；後續升級 BOM 應先檢查新的 SDK／AGP 要求。

不強制新增第三方 A* 套件；路徑組可以自行實作。地圖組離線處理可用 Python，但不屬於 APK 的執行時依賴。

## 4. Three.js 與 JavaScript 工具鏈

| 技術 | 固定版本／規則 | 用途 |
|---|---|---|
| Node.js | **26.13.1 LTS** | 三維前端開發／建置 |
| npm | 配合該 Node.js 發行版；以 `package-lock.json` 鎖定解析結果 | JS 套件管理 |
| Three.js | **0.187.0（r187）** | 3D 地圖、路線與互動 |
| Vite | **8.3.8** | 打包 Three.js 靜態資源 |
| JavaScript 模組 | ES Modules | `import`／`export` |
| 圖形 API | WebGL 2 優先 | Android WebView 的 WebGL 能力由裝置實際環境決定 |

Three.js 的 `SVGLoader` 與 `ExtrudeGeometry` 須使用和專案 Three.js 一致的套件版本，避免混用範例程式中的舊 API。WebView 系統核心**由裝置的 Android System WebView／瀏覽器提供，無法以 Gradle 固定其實際版本**。

### 4.1 npm 版本鎖定示意

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "three": "0.187.0"
  },
  "devDependencies": {
    "vite": "8.3.8"
  }
}
```

以上為核心依賴示意片段，實際 `package.json` 仍需加入可執行 `scripts`，並以 `npm ci` 驗證 Lockfile 一致性。**不要使用 `^`、`~`、`latest` 作為正式鎖版策略**，也不要讓執行中的 APK 從 CDN 載入 Three.js。

## 5. 原生 Android API 與權限

| API／元件 | 來源 | 用途或限制 |
|---|---|---|
| `SensorManager` | Android Framework | 陀螺儀、加速度計等可用感測器（依定位方法） |
| `WifiManager` | Android Framework | 如採 Wi-Fi RSSI／掃描，取得可用 Wi-Fi 資訊 |
| `WebView` | Android Framework | 顯示 Three.js 頁面 |
| `androidx.webkit` | AndroidX | WebView 相容性輔助、訊息／AssetLoader 等 |

以上 Android Framework API **不另外指定 Maven 套件版本**。Wi-Fi 掃描權限、位置服務狀態、系統節流和不同 Android 版本的限制，須由定位組及整合組依實際演算法核對。`minSdk = 29` 不代表所有測試手機均具備相同感測器或相同 WebGL 能力。

## 6. Android ↔ Three.js 整合依賴

- Compose 與 WebView：透過 Compose `AndroidView` 承載 WebView。
- WebView 載入本地 JS：候選 `WebViewAssetLoader`，避免任意開放 `file://` 存取。
- 原生／JS 訊息：候選 AndroidX WebKit WebMessageListener；統一以 JSON 傳遞標準地圖、Route 與狀態。
- 真正的請求／回覆封包、例外碼與功能介面須跟 `docs/interfaces/functions/function.md` 一致。
- 本地資源隨 APK 打包，V1 核心導航不需網路與後端 API。

## 7. 各組與技術歸屬

| 組別 | 主要技術 | 跨組依賴 |
|---|---|---|
| 地圖 | SVG／JSON；離線處理工具自選 | 交付標準 SVG、Graph、Mapping、Floor、Destination |
| 定位 | Kotlin、SensorManager／WifiManager、Coroutines | 輸出標準 Localization Result |
| 路徑 | Kotlin、A*、資料模型 | 輸入 Graph／Position／Destination／Mode，輸出 Route |
| 3D | JavaScript、Three.js、Vite | 輸入標準 SVG／Floor／Route，經 WebView 顯示 |
| UI | Kotlin、Jetpack Compose、Lifecycle、Navigation | 使用標準資料及 Function，處理畫面與異常 |
| 整合 | Gradle、AndroidX WebKit、JSON Serialization | 資源打包、WebView 橋接、資料流協調 |

## 8. 版本的唯一來源

| 類型 | 建議真實鎖版位置 | 規範文件 |
|---|---|---|
| JDK | 團隊執行環境／Gradle Toolchain 設定（按需） | 本文件 |
| Gradle | `gradle/wrapper/gradle-wrapper.properties` | 本文件 |
| AGP／AndroidX／Kotlin | `gradle/libs.versions.toml` 或等價集中設定 | 本文件 |
| Node.js | `.node-version` | 本文件 |
| Three.js／Vite | `threejs/package.json` + `threejs/package-lock.json` | 本文件 |
| 資料欄位與 schema | `docs/interfaces/schemas/Data_Specification.md` | 資料契約 |
| 跨組函式 | `docs/interfaces/functions/function.md` | Function 契約 |

正式升級共用版本時，須先提出變更與相容性影響、更新鎖版檔，再同步本文件與 `docs/decisions.md`；五組不得各自升級同一套共用依賴。

## 9. 尚待確認／執行時驗證

此節記錄技術棧尚不能視為「已實際測試通過」的事項；此文件**不制定測試流程**。

1. JDK 21 + AGP 9.3.1 + Gradle 9.5.0 + Kotlin 2.4.21 + Compose Compiler Plugin 2.4.21 的實際 Plugin 配置與完整 APK 建置。
2. `compileSdk 37` SDK 安裝、Compose BOM 與各 AndroidX 版本的依賴解析。
3. WebView 在實際手機對本地資源、JavaScript 模組、WebGL 2、SVGLoader 的支援情況。
4. WebView 與 Kotlin 的雙向 JSON 橋接方式、可信來源限制及異常回報。
5. 定位組採用的 Wi-Fi／感測器 API 所需系統權限及可用性。
6. `minSdk 29` 是否涵蓋所有組員與老師要測試的手機。

## 10. 官方參考資料

- Android Gradle Plugin 9.3：<https://developer.android.com/build/releases/agp-9-3-0-release-notes>
- Android Gradle Plugin 與 Gradle 對照：<https://developer.android.com/build/releases/about-agp>
- Kotlin 發布與版本：<https://kotlinlang.org/docs/releases.html>
- Compose Compiler 設定：<https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler>
- Compose BOM：<https://developer.android.com/develop/ui/compose/bom>
- AndroidX WebKit：<https://developer.android.com/jetpack/androidx/releases/webkit>
- Three.js：<https://threejs.org/docs/>
- Three.js npm：<https://www.npmjs.com/package/three>
- Node.js 26.13.1：<https://nodejs.org/en/blog/release/v26.13.1>
- Vite 發布：<https://vite.dev/releases>

## 11. 後續階段提醒

架構與技術棧確認後，再制定八項資料格式驗證、跨組 Function 契約測試、單元測試、整合測試和 QA。測試部署後以 Log、回歸測試與使用回饋進行維護。此階段先不改 GitHub、不建立測試規範。
