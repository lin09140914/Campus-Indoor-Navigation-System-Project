# 3D 組 V0.1 開發進度表

## 1. 建議開發進度

| 截止日期（2026 年） | 交付項目 | 最低完成要求 |
| --- | --- | --- |
| 11/29 | 單樓層 3D 地圖 | 使用地圖組 SVG 完成 `renderMap()` 初版，能在 Android WebView 顯示單層地圖並旋轉視角。 |
| 12/04 | 路線顯示與多樓層支援 | 完成 `renderRoute()`，讓路線疊加地圖，並支援 UI 指定樓層顯示對應地圖與路徑。 |
| 12/11 | V0.1 最終成果 | 完成 UI 整合、渲染異常處理及地圖／路線正確性測試。 |

## 2. 各階段驗收標準

| 階段 | 驗收標準 |
| --- | --- |
| 11/29 | 單層地圖的空間結構與原始 SVG 一致；可 360 度旋轉，且 `renderMap()` 結果可由 UI 顯示。 |
| 12/04 | 多樓層資料可依樓層切換；同層與跨層 Route 在正確樓層、座標位置呈現；更新路線不破壞既有地圖。 |
| 12/11 | 以實際 SVG、Graph 與 Route 測試渲染結果，記錄預期與實際畫面、偏移及異常；無效或版本不符的資料能回報錯誤。 |

## 3. 需要實作的功能

- 使用 Three.js 實作 `renderMap()`，依統一 SVG 與樓層資料建立可旋轉的單層／多層場景。
- 實作 `renderRoute()`，將 Route 正確疊加在場景中，並清除舊路線。
- 支援由 UI 指定顯示樓層，保持地圖、路徑與共通座標一致。
- 提供 Android WebView 可使用的渲染介面與錯誤狀態。

## 4. 11/29 單樓層驗收紀錄

2026/11/26 於 Android 17（API 37）模擬器通過驗收。測試使用本工作區建置的 debug APK、Android System WebView 145.0.7632.218 與工程五館一樓 SVG 草稿。

| 驗收項目 | 實測結果 |
| --- | --- |
| Android UI 顯示模型 | 原生 Activity 在本機頁面就緒後呼叫 `renderMap()`，WebView 成功繪出 1F。重複呼叫後仍只有一個模型畫布。 |
| 360° 水平旋轉 | 透過 Android 觸控輸入連續單指滑動，從畫面座標軸累計方位角。兩次分別量得 364.16° 和 388.48°。 |
| 俯視圖與 SVG 一致 | 204 段牆、59 個空間、8 個走廊區塊、4 個樓梯區及 2 個電梯區的平面邊界通過比對。84 組門的構件均有對應，門扇端點誤差均在 0.1 SVG 單位以內。 |
| 錯誤回報 | 不相符的樓層資料回傳 `MAP_MISMATCH`，再載入正確資料後成功顯示。 |

[立體畫面](android/acceptance/android-3d.png) · [俯視畫面](android/acceptance/android-top.png) · [原始圖面](android/acceptance/android-svg.png) · [可重跑的裝置驗收](android/verify-webview.mjs)

### 11/27 UI 組 WebView 精簡模式與 SVG 路徑切換

Android 17（API 37）模擬器以同一份 `viewer.html` 讀取工程五館 1F 與 A118 一樓教室範例。WebView 只顯示模型與座標軸。往返切圖沿用原畫布，連續選圖以最後一次為準。讀取不存在的 SVG 會回報 `SVG_LOAD_FAILED`，之後可正常載回 1F。

1F 以 11 次單指滑動累計旋轉 393.96°。204 段牆、59 個空間、8 個走廊區塊、84 組門、4 個樓梯區及 2 個電梯區的俯視比對通過。本次樓層驗收範圍為 1F。 [精簡模式立體畫面](android/acceptance/minimal-3d.png) · [精簡模式俯視畫面](android/acceptance/minimal-top.png)
