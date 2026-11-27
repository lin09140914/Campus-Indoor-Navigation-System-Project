# 工程五館 1F｜Three.js 單樓層地圖 · Engineering Building 5, First-Floor Map

同一份 `viewer.html` 可從路徑載入獨立的 SVG。Android WebView 的精簡模式只顯示模型與座標軸，可用單指旋轉及雙指縮放。桌面版提供圖層、房間定位、俯視與 GLB 匯出。

One shared `viewer.html` loads separate SVG drawings by path. The minimal Android WebView shows the model and orientation axes, with one-finger rotation and two-finger zoom. The desktop viewer includes layers, room lookup, a top-down view, and GLB export.

[WebView 精簡畫面 / Minimal WebView](android/acceptance/minimal-3d.png) · [桌面版預覽 / Desktop preview](floor-1-preview.png)

## 開啟地圖 · Open the Map

- **桌面**：從根目錄執行 `python -m http.server 8000 --bind 127.0.0.1`，開啟 `http://127.0.0.1:8000/viewer.html`。加上 `?display=minimal` 可預覽精簡版。直接從磁碟開啟完整檢視器時，使用「開啟 SVG」選取本機圖面。
- **Desktop** — Run `python -m http.server 8000 --bind 127.0.0.1` in the project root and open `http://127.0.0.1:8000/viewer.html`. Append `?display=minimal` for the minimal view. When opening the full viewer directly from disk, use “開啟 SVG” to select a local drawing.
- **Android**：安裝 `android/app/build/outputs/apk/debug/app-debug.apk`。App 以 WebView 顯示 [工程五館一樓圖面](floor-1.svg)。
- **Android** — Install `android/app/build/outputs/apk/debug/app-debug.apk`. The WebView opens the [first-floor drawing](floor-1.svg).
- **模型檔 / Model file** — [floor-1.glb](floor-1.glb)

## 從原始碼建置 · Build from Source

在專案根目錄執行以下指令。建議使用 Node.js 22 以上版本。

Run the following commands from the project root. Node.js 22 or later is recommended.

```powershell
npm ci
npm run build
```

建置會將 Three.js 和檢視器程式打包成 [viewer.html](viewer.html)。Android 建置將此頁面與 SVG 分開放入 assets。把不同圖面放在 `data/svg/`，或將單一 SVG 放在專案根目錄，由 Gradle 複製到 APK 的 `assets/data/svg/`。同一相對路徑只需提供一份檔案。

The web build bundles Three.js and the viewer into [viewer.html](viewer.html). Android packages the page and drawings as separate assets. Put drawings in `data/svg/` or place individual SVGs in the project root for Gradle to copy to `assets/data/svg/`. Supply each relative asset path only once.

Android 建置使用 Android SDK 37 與 Gradle Wrapper，可使用 Android Studio 內建的 JDK。用 Android Studio 開啟 `android/` 後執行 App，或設定 `JAVA_HOME` 和 `ANDROID_HOME` 後，在 Windows 專案根目錄執行：

The Android build uses Android SDK 37 and the Gradle Wrapper. You can use the JDK bundled with Android Studio. Open `android/` in Android Studio and run the app, or set `JAVA_HOME` and `ANDROID_HOME` and run the following command from the project root on Windows.

```powershell
.\android\gradlew.bat -p android assembleDebug
```

App 的最低版本設定為 Android 8.0（API 26），裝置的 Android System WebView 仍須支援 WebGL 2。實際驗收環境見下方。

The minimum Android version is Android 8.0 (API 26). The device's Android System WebView must support WebGL 2. See the acceptance section below for the tested environment.

## `renderMap()` 整合介面 · Integration API

Android UI 只需載入一次 `https://appassets.androidplatform.net/assets/viewer.html?host=android`。使用 [MapActivity.java](android/app/src/main/java/tw/eng5/floormap/MapActivity.java) 的本機資產處理方式，讓 HTML 與 SVG 同源且可離線讀取。頁面就緒後，對每次切圖傳入新的 SVG 路徑。切換 APK 已包含的圖面只需再次呼叫函式，新增 APK 內的資產則需重新打包 APK。

Load `https://appassets.androidplatform.net/assets/viewer.html?host=android` once. Use the local asset handler in [MapActivity.java](android/app/src/main/java/tw/eng5/floormap/MapActivity.java) to serve HTML and SVG files offline from the same origin. Once the page is ready, call the renderer with the selected path. Switching between packaged drawings uses the same page and APK. Adding a new packaged asset requires rebuilding the APK.

UI 組可將已建好的 `viewer.html` 放在 `app/src/main/assets/`，將 `floor-1.svg` 放在 `app/src/main/assets/data/svg/`。測試版另附 A118 教室範例，路徑為 `data/svg/examples/A118_layered_template.svg`，可用來測試同頁切圖。

In the UI app, place the built `viewer.html` in `app/src/main/assets/` and `floor-1.svg` in `app/src/main/assets/data/svg/`. The debug app also includes the A118 classroom example at `data/svg/examples/A118_layered_template.svg` for testing drawing changes on the same page.

```kotlin
// 在 onPageFinished 或 UI 切圖時呼叫 / Call after page load or when the host selects a drawing.
fun showMap(webView: WebView, svgPath: String) {
    val path = org.json.JSONObject.quote(svgPath)
    webView.evaluateJavascript("void window.renderMap($path)", null)
}

showMap(webView, "data/svg/floor-1.svg")
```

`renderMap(svgPath, floor?, options?)` 回傳 Promise。JavaScript 可用下例取得成功或錯誤狀態。Kotlin 的 `evaluateJavascript` 回呼不會等待 Promise。原生端若需要結果，可在 JavaScript 的 `.then(...)` 中將狀態送回 UI 已有的訊息介面。

`renderMap(svgPath, floor?, options?)` returns a Promise. JavaScript can await the result as shown below. Kotlin's `evaluateJavascript` callback does not await promises. A host that needs the result can forward the status from JavaScript's `.then(...)` through its own message interface.

```js
const result = await window.renderMap('data/svg/floor-1.svg');
if (result.status === 'error') console.warn(result.error.code, result.error.message);
```

| 參數 / Parameter | 說明 / Description |
| --- | --- |
| `svgPath` | 與頁面同源的 SVG 路徑，相對路徑以 HTML 所在位置解析。也接受 SVG 原文。<br>Same-origin SVG path relative to the viewer page, or raw SVG text. |
| `floor` | 省略時讀取 SVG 的 `data-building-id`、`data-floor`、`data-map-version`，使用圖面單位。已校準資料可傳入對應的 `building_id`、`floor`、`map_version`、`svg`、`elevation_m` 與 `svg_transform`。<br>Omit to read the building, floor and version from the SVG and use drawing units. For calibrated data, supply matching identifiers, the SVG path, elevation and floor transform. |
| `options` | `view_mode` 可選 `'3d'` 或 `'2d'`。同圖、同模式時可傳 `fit_to_view: false` 保留視角。<br>Choose 3D or top-down view. Set `fit_to_view: false` to retain the camera when rendering the same drawing in the same mode. |

結果含 `status`、`building_id`、`map_version`、`floor` 與網頁內使用的 `scene`（成功時）。錯誤會提供代碼和訊息，例如 `SVG_LOAD_FAILED`（讀取失敗）、`MAP_MISMATCH`（識別資訊不符）及 `SUPERSEDED`（已被更新的請求取代）。

The result includes status, building ID, map version and floor, plus the local Three.js scene on success. Errors include a code and message. Examples include a failed file request, mismatched identifiers and a request superseded by a newer selection.

## 圖面與座標 · Drawing and Coordinates

目前的 1F 草稿沿用 SVG `viewBox` 的圖面單位。SVG 的水平與垂直方向分別對應 Three.js 的 X 與 Z 軸，Y 軸為高度。圖面尚未實測，牆高、門高與樓梯高度皆為示意。公尺座標需以地圖組提供的樓層轉換資料為準。

The first-floor draft uses the drawing units of the SVG `viewBox`. The SVG's horizontal and vertical axes map to Three.js X and Z, respectively, while Y represents height. Field measurements are pending, so wall, door, and stair heights are illustrative. Use the mapping team's floor transform data for coordinates in metres.

牆體由 `walls` 圖層的封閉輪廓拉高，保留原有門洞。`doors` 提供門扇與開門方向，`rooms` 和 `corridors` 提供地板範圍，`stairs` 和 `elevators` 提供設施位置。`fixtures` 與 `labels` 作為圖面參考，`nav-anchors` 保存導航錨點。

Closed outlines in the `walls` layer are extruded to form walls while preserving existing door openings. The `doors` layer defines door leaves and swing directions. The `rooms` and `corridors` layers define floor areas, and `stairs` and `elevators` locate those features. The `fixtures` and `labels` layers provide drawing references. The `nav-anchors` layer stores navigation anchors.

## 驗收與進度 · Acceptance Testing and Progress

2026 年 11 月 27 日，在 Android 17（API 37）WebView 145 驗證精簡模式。工程五館 1F 與 A118 教室範例在同一個畫布來回切換，連續選圖時顯示最後一次選擇，輸入不存在的路徑後可重新載入 1F。觸控旋轉累計 393.96°，1F 俯視幾何比對通過。 [精簡立體圖](android/acceptance/minimal-3d.png) · [精簡俯視圖](android/acceptance/minimal-top.png)

On November 27, 2026, the minimal viewer passed testing on Android 17 (API 37) with WebView 145. The full first-floor drawing and the A118 classroom example switched on the same canvas. Rapid selections displayed the latest drawing, and the viewer recovered after a missing-file request. Touch input rotated the model through 393.96°, and the first-floor geometry passed its top-down comparison. [Minimal 3D view](android/acceptance/minimal-3d.png) · [Minimal top-down view](android/acceptance/minimal-top.png)

2026 年 11 月 26 日，以 Android 17（API 37）模擬器和 Android System WebView 145.0.7632.218 通過 11/29 單樓層驗收。

The single-floor map passed acceptance testing for the November 29 milestone on November 26, 2026, using an Android 17 (API 37) emulator with Android System WebView 145.0.7632.218.

- 原生 UI 呼叫 `renderMap()` 後成功顯示 1F，重複呼叫後仍只有一個畫布。
- 兩次 Android 單指滑動測試的累計水平旋轉角度為 364.16° 和 388.48°。
- 俯視幾何比對涵蓋 204 段牆、59 個空間、8 個走廊區塊、84 組門、4 個樓梯區和 2 個電梯區，全部通過。

- The native UI displayed the first floor after calling `renderMap()`. Repeated calls still produced a single canvas.
- The two single-finger swipe tests on Android produced cumulative horizontal rotations of 364.16° and 388.48°.
- The top-down geometry check passed for all 204 wall segments, 59 spaces, 8 corridor sections, 84 door groups, 4 stair areas, and 2 elevator areas.

在模擬器或測試裝置開啟 debug App，再從專案根目錄重跑驗收。若 `adb` 已加入 PATH，可省略最後的路徑參數。

Open the debug app on an emulator or test device, then rerun the acceptance checks from the project root. The final argument is optional if `adb` is on PATH. Replace the two placeholders below with the device serial and the ADB executable path.

```powershell
node android/verify-webview.mjs <裝置序號> <adb執行檔路徑>
```

[立體截圖](android/acceptance/android-3d.png) · [俯視截圖](android/acceptance/android-top.png) · [原圖截圖](android/acceptance/android-svg.png) · [完整驗收紀錄](3d-team.md#4-1129-單樓層驗收紀錄)

[3D screenshot](android/acceptance/android-3d.png) · [Top-down screenshot](android/acceptance/android-top.png) · [Source drawing screenshot](android/acceptance/android-svg.png) · [Full acceptance record](3d-team.md#4-1129-單樓層驗收紀錄)

12/04 里程碑規劃交付 `renderRoute()` 路線疊加與多樓層切換。 [3D 組開發進度表](3d-team.md)

The December 4 milestone is scheduled to deliver route overlays through `renderRoute()` and floor switching. [3D team development schedule](3d-team.md)

## 主要檔案 · Key Files

| 路徑 | 用途 |
| --- | --- |
| [src/model.js](src/model.js) | 從 SVG 圖層建立地板、牆體、門扇與設施幾何。 |
| [src/viewer.js](src/viewer.js) | `renderMap()`、視角控制、圖層切換與 GLB 匯出。 |
| [build.mjs](build.mjs) | 建置共用的 HTML 檢視器。 |
| [MapActivity.java](android/app/src/main/java/tw/eng5/floormap/MapActivity.java) | Android 原生入口與 WebView 呼叫。 |
| [android/verify-webview.mjs](android/verify-webview.mjs) | 裝置觸控、圖面比對與截圖驗收。 |

| Path | Purpose |
| --- | --- |
| [src/model.js](src/model.js) | Builds floor, wall, door leaf, and facility geometry from SVG layers. |
| [src/viewer.js](src/viewer.js) | Implements `renderMap()`, camera controls, layer toggles, and GLB export. |
| [build.mjs](build.mjs) | Builds the shared HTML viewer. |
| [MapActivity.java](android/app/src/main/java/tw/eng5/floormap/MapActivity.java) | Provides the native Android entry point and calls the WebView renderer. |
| [android/verify-webview.mjs](android/verify-webview.mjs) | Tests device touch input, compares geometry with the source drawing, and captures acceptance screenshots. |
