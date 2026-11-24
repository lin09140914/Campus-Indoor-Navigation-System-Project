# 1F 分層 SVG 與導航草稿

1F 初版已依 PR #13 補充要求分層，原圖座標與 `viewBox` 保留不變。
包含 A、B 兩區的 41 個房間目的地、7 個圖面出入口、141 個節點與 140 條無向邊。
所有節點可連通；資料仍是待現勘、待校正的草稿。

使用者已確認**實際尺寸暫緩量測**。本輪以 SVG 物件／圖層結構、Graph 連通、版本及錨點對應為檢查範圍；
公尺比例、實際牆厚、樓高及世界座標校正列為後續待辦，不作為本輪草稿整理的前置工作。
距離繼續以 SVG 圖面單位顯示，不用假比例補成公尺；正式資料契約與 `--strict` 的要求維持不變。

依據：[V1.1 統一資料規格](https://github.com/lin09140914/Campus-Indoor-Navigation-System-Project/blob/master/docs/interfaces/schemas/Data_Specification.md)。
本機 `docs/spec.md`、既有 `validate-data.js` 與 3D 示範仍屬較早的開工包介面，不能用來判定新版 SVG 是否合格。

## 檔案與預覽

| 檔案 | 用途 |
|---|---|
| `../../svg/floor-1.svg` | 正式路徑上的分層圖稿；包含本草稿的隱藏導航錨點 |
| `annotations.json` | 內部編圖來源：房間地板範圍、代表點、選定門口、走廊與出入口 |
| `graph.json` | 使用新版共同欄位與 `walk` / `door` 節點型別的路網草稿 |
| `node_map.json` | 141 筆 Graph Node 與 SVG anchor 的一對一對應 |
| `destinations.json` | 41 個房間及 7 個入口的 Location 與 Node 對應 |
| `rooms.csv` | 舊開工包相容用的房間表，由同一份標記產生 |
| `floors.pending.json` | 待量測、待整合確認的 Floor 模板；刻意不命名為正式 `floors.json` |
| `validation-report.json` | 草稿一致性與正式交付狀態分開列出的檢查報告 |
| `../../../examples/floor1-graph-draft.html` | 原圖疊圖與 A* 路線預覽 |

在專案根目錄執行 `node tools/serve.js . 8080`，開啟：

<http://127.0.0.1:8080/examples/floor1-graph-draft.html>

可選起終點、點房間設定終點、顯示圖網與名稱、放大檢查。
預覽比對 SVG SHA256，原圖修改但尚未重核座標時會停止顯示路線。
雜湊以 UTF-8 文字、LF 換行計算，避免 Windows / Git 換行轉換造成誤判。

草稿未取代舊版 `data/graph.json`、`data/rooms.csv`、`data/building.json`。
2F／3F 樣板不能直接與這張圖接成跨樓層路網。

## 分層與本次修正

SVG 根元素包含 `data-building-id="eng5"`、`data-floor="1"`、
`data-map-version="2026-11-24-floor1-structured-draft2"`。
使用者確認 Building ID 尚未定案，暫沿用 `eng5`；跨資料版本相同。

繪製順序為 `corridors`、`rooms`、`walls`、`stairs`、`elevators`、`doors`、
`fixtures`、`nav-anchors`、`labels`。六個標準圖層 ID 與意義保持一致；
`doors` / `labels` 是審查補充分組，`fixtures` 放置不應拉高的參考設備與符號。

- 牆線、門扇與開門方向、房間地板、樓梯、電梯、原生文字有獨立 ID 與物件。
- 25 個連續牆物件依原圖門扇切開，204 個牆物件已展開為有面積、明確 Z 閉合的輪廓。
- 牆寬暫沿用原圖 0.5 SVG 單位可見線寬，非實測牆厚；不是只將 stroke-width 改大。
- 有 82 個已判讀開口，包含未納入導航的小隔間門；不是 82 個導航目的地。
- 原始隱藏圖、舊描邊文字及匯入殘留已移除，幾何 transform 已套用到座標。
- 原圖中 A118 的用途維持「鍍金室」，沒有照抄審查範例的教室尺寸或內容。

更完整的物件使用方式見 [`data/svg/README.md`](../../svg/README.md)。

## 座標、世界轉換與草稿限制

上版 graph 曾誤扣瀏覽器頁面邊界，造成 x / z 各少 8 個 SVG 單位。
本版已校正，41 個房間門口並依原始門扇定位到真正的開口中央；這不是移動 SVG 原點。

- **目前 `unit: "svg-unit"`，不是公尺**。未校正時，Graph x / z 暫存 SVG u / v。
- `status: "draft"` 與 `coordinate_system_id: "eng5_LOCAL_PENDING"` 表明尚未具備正式世界座標。
- `type` 使用新版 `walk` / `door`；額外 `role` 僅供草稿工具區分房間、走廊與入口。
- `w` 是兩端座標的直線距離；不能將目前路線長度當成實際行走公尺數。
- SVG 錨點、Node Mapping 及草稿座標逐一對應，原圖上的全部路網線段不穿牆。

`annotations.json` 的 `svgTransform` 四項欄位目前全部為 `null`：
`origin_x_m`、`origin_z_m`、`scale_m_per_svg_unit`、`rotation_deg`。
`floors.pending.json` 的 `elevation_m` 也尚未填寫；此模板**不通過正式 Floor 規格驗收**。
不要用 0 或假比例補齊成看似正式的資料。

取得實測長度後，以「實際公尺數 ÷ SVG 兩點距離」算比例，並由整合組確認原點、旋轉、
樓層高度與座標系統 ID。確認四項轉換後再填入 `svgTransform`，記錄量測端點及實測值，
產生器會依統一公式同時換算節點及邊長。預覽用反向轉換疊回原圖。
仍須量不同方向的距離，以排除原圖非等比例縮放。

## 待確認事項

- 兩個 **A119**：暫用 `TEMP-A119-N`、`TEMP-A119-S`。
- 兩個 **A114**：暫用 `TEMP-A114-W`、`TEMP-A114-E`。
- **B103 經 B105**、**南側 A119 經 A120** 的內門是否可供通行。
- **A124 / A124-1** 在未清楚分隔的同一區域；先納入 A124 北門。
- 多門房間暫選一扇門，入口開放情況與室內障礙物尚未現勘。
- 樓梯、電梯及廁所在 SVG 中已分層，但尚未納入 Graph；井 ID 只是圖面暫名。
- 未命名小隔間、室外捷徑、無障礙條件與門禁時段尚未建立導航關係。

## 修改與驗證

```sh
node tools/build-floor1-graph.js
node tools/build-floor1-graph.js --check
python tools/validate-floor1-svg.py
python -m unittest discover -s tools -p "test_floor1*.py"
node --test
```

SVG 驗證工具只使用 Python 3 標準函式庫；檢查 XML、唯一 ID、圖層順序、安全引用、
封閉牆體的非零面積及自交、空間與設施範圍、門口真實缺口、房間代表點、
全部錨點 / Mapping，以及 Graph 線段是否進入牆體或跨越牆體邊界。
契約檢查另驗證欄位／型別、snake_case、版本、Node／Edge／Mapping／Location 引用及權重規則。
Node 測試另檢查內門連通、A/B 通道、房號暫名、版本、目的地與完整座標轉換。
這些是圖面與資料一致性檢查，不證明現場可通行，也不取代實際尺寸與門口的人工核對。

產生本次檢查報告：

```sh
python tools/validate-floor1-svg.py --report data/drafts/floor-1/validation-report.json
```

正式驗收模式：`python tools/validate-floor1-svg.py --strict`。
**目前此模式必須失敗**：Graph 尚非公尺，Floor 的比例／原點／旋轉／樓高、實際牆厚、正式 ID 與重複房號仍待確認。
不要將一般草稿模式的退出碼 0 或功能測試通過，解讀為已滿足所有正式交付規範。

若 SVG 或人工標記更新，必須重新對照受影響物件與全部錨點，再更新 `source.sha256`、
重建草稿及執行上述檢查。新節點要同步加入 SVG 的 `nav-anchors`。
Graph / Room 與正式 `floors.json` 完成後，仍需按新版契約完成跨資料驗收；本版尚未申請重新審查。
