# 1F SVG 物件與圖層

`floor-1.svg` 依 [V1.1 統一資料規格](https://github.com/lin09140914/Campus-Indoor-Navigation-System-Project/blob/master/docs/interfaces/schemas/Data_Specification.md)
與 PR #13 的補充要求整理。2F／3F 仍是舊版開工包樣板。

此 SVG 的座標沿用原始 `viewBox="0 0 1122.6667 793.62665"`，未實測、未縮放成公尺。
Building ID 暫用使用者指定的 `eng5`，待整合組定案。
依使用者安排，實際尺寸量測延後；本輪先檢查分層幾何與導航資料對應。
比例、原點、旋轉及樓層高度必須來自日後完成的 `floors.json`，不可從頁面寬高推算公尺。

## 圖層堆疊順序

| 圖層 ID | 內容與處理方式 |
|---|---|
| `corridors` | 獨立走廊／大廳地板，沒有牆體語意 |
| `rooms` | `room-<ID>` 群組及其地板；`space-*` 是待命名的隔間或設施空間 |
| `walls` | 204 個有面積的封閉牆輪廓，以 A / AB-link / B 子群組整理；門口有真正缺口 |
| `stairs` | 四個圖面樓梯區，樓板、踏步線及側線保留子物件；連接井 ID 暫定 |
| `elevators` | 兩個圖面電梯區，櫃體／門框線與地板保留子物件；井 ID 暫定 |
| `doors` | 按開口群組整理門扇 `data-role="leaf"` 與開門方向 `data-role="swing"` |
| `fixtures` | 參考設備／符號，`data-role="reference-only"`，不作為牆體拉高 |
| `nav-anchors` | 唯一有用途的隱藏層，141 個草稿節點的位置 |
| `labels` | 房號、用途及設施標示，保留可編輯的 `<text>` / `<tspan>` |

六個標準圖層維持固定 ID 與意義；其餘為輔助分類。
`walls` 只包含封閉牆體；3D 組不應把 `doors`、`labels`、`fixtures` 或樓梯踏步全部當成牆壁。
牆體以填色封閉輪廓表達面積，`stroke="none"`，不依賴 stroke-width 作為厚度。
目前寬度 0.5 SVG 單位僅由原始可見線寬展開，**不是實測牆厚**；`data-width-status` 明確保留此待確認狀態。
`data-source-centerline` 是展開來源的追溯資料，不是隱藏的牆幾何，3D 應讀取真正閉合的 `d`。

## A118 實際圖稿的例子

- 房間：`room-A118` → `room-A118-floor`。
- 北側主門：`door-A118-main`，門扇與開門弧線是獨立子物件。
- 標示：`label-A118`，用途維持原圖的「鍍金室」。
- 房內與門口錨點：`anchor-A118`、`anchor-A118-door`。
- `data-room-id` 保存房號；`data-node-id` 保存 Graph Node ID，不靠解析物件 ID 取得座標。

門口資訊另以 `data-opening-axis/fixed/min/max` 保存原圖上的缺口線段。
這是編圖與驗證輔助資料，不取代標準 Node Mapping；多門房間可能有其他未作導航的門。
牆體是真的切斷，不以白色方塊或 mask 遮住連續牆面。

## 整理與驗證

使用兩格縮排、區塊註解及唯一 ID；原始隱藏圖、匯入 clipPath、描邊文字與編輯殘留已清除。
幾何座標已套用 transform，仍保留獨立圖形，沒有整張合併成單一路徑或圖片。
在 Inkscape 中，每個標準群組也標成可見的獨立圖層；需要檢視錨點時再開啟 `nav-anchors`。

在根目錄執行 `python tools/validate-floor1-svg.py`，檢查封閉非零面積、輪廓自交、門口、錨點與路網穿牆。
使用 `--strict` 驗證正式交付條件；目前會因世界座標、量測及整合資料尚未完成而失敗。
不要用舊版 `tools/validate-data.js` 的 polygon / class / metre 前提驗收這份新版分層 SVG。
舊版 `createViewer3D.js` 也尚未適配新版分層契約；這次交付的是分層圖稿，不包含 3D 元件改版。

導航、量測待辦及重建方式見 [`../drafts/floor-1/README.md`](../drafts/floor-1/README.md)。
