# 開工包（Kickoff Kit）v0.2

校園室內導航系統（先做工程五館 Engineering Building #5）的開工包。**裡面的資料全是樣板（假的）**，目的是讓每個組在拿到真實資料之前就能開工，真資料到了直接取代，程式不用改。樣板房號（`M101`…）只是示範，不代表工程五館的實際編碼。

> 規格全文：[docs/spec.md](docs/spec.md)。有疑問或要改規格，找整合者。

## 先決條件

- 安裝 Node.js 18 以上（最新版也可以）。測試版本：Node 22。
- 不需要 `npm install`，這個包沒有任何外部套件。

## 一分鐘上手

```bash
npm run validate     # 驗證 data/ 底下的資料（V1–V10）
npm test             # 跑圖論組的測試
npm run gen-sample   # 重新產生樣板資料（會覆蓋 data/）
npm run serve        # 啟動本機伺服器（127.0.0.1:8080），看 3D 示範頁面
```

看 3D 示範：執行 `npm run serve`，瀏覽器開 <http://127.0.0.1:8080/examples/viewer3d-demo.html>。
**不能直接雙擊 html 檔**，因為頁面要用 `fetch` 讀資料、載入 ES module。3D 的 Three.js 從網路載入，需要連網。

沒有 npm 的話，直接用 `node tools/validate-data.js data`、`node --test`、`node tools/serve.js . 8080`。

## 資料夾

| 路徑 | 內容 | 誰用 |
|---|---|---|
| `data/svg/floor-1..3.svg` | 樣板平面圖（3 層，格式照 spec 4.1） | 地圖、UI、3D |
| `data/graph.json` | 樣板圖（88 個節點、89 條邊，格式照 spec 4.2） | 圖論、UI |
| `data/rooms.csv` | 房間資料表（spec 4.3） | UI |
| `data/building.json` | 樓層與樓高（spec 4.4） | 全部 |
| `src/route/findRoute.js` | **圖論組已有的雛形**：A* 已實作並通過 12 組手算測試 | 圖論、UI |
| `src/route/findRoute.test.js` | 測試（手算期望值） | 圖論 |
| `src/route/findRoute.stub.js` | 假函式（UI 組先用） | UI |
| `src/viewer3d/createViewer3D.js` | **3D 組已有的雛形**：讀標準 SVG，實作 spec 4.6 全部函式 | 3D、UI |
| `src/viewer3d/viewer3d.stub.js` | 3D 假元件（UI 組先用） | UI |
| `src/position/position.stub.js` | 定位假模組（UI、3D 組先用） | UI、3D |
| `tools/validate-data.js` | 資料驗證腳本 V1–V10 | 地圖組交件前必跑、整合組 |
| `tools/gen-sample-data.js` | 樣板資料產生器 | 整合組 |
| `tools/serve.js` | 本機靜態伺服器（只綁 127.0.0.1） | 3D、UI |
| `sensor-data/runs.csv`、`marks.csv` | 感測器數據的空模板（spec 4.8） | 感測器組 |
| `docs/spec.md` | 完整規格 | 全部 |
| `docs/decisions.md` | 決策紀錄（只有整合者改） | 全部 |
| `docs/templates/` | 手機清單、現場測量表、週報模板 | 各組 |
| `examples/viewer3d-demo.html` | 3D 元件示範頁面（用真的 `findRoute`，可切 2D／3D，可測 `dispose`） | 3D、UI |
| `examples/legacy-demo-simple-svg.html` | 最早的原型，用簡化版 SVG 格式，**只供參考，請勿使用** | — |

## 各組怎麼開工

**地圖資料組**
1. 讀 spec 第 3、4 章與 5.2。
2. 看 `data/svg/floor-1.svg`、`data/graph.json`、`data/rooms.csv` 的寫法。
3. 用 `docs/templates/measurement-sheet.md` 去現場量。
4. 做完把檔案放進 `data/`，跑 `npm run validate`，**全部通過才開 PR**。

**圖論路徑組**
1. 讀 spec 4.2、4.5 與 5.3。
2. `src/route/findRoute.js` 已經是可用的 A*。你的工作是：換成真資料後重新手算測試期望值、補更多測試、檢查效能、處理邊界情況。
3. 注意：`findRoute.test.js` 的期望值是用**樣板資料**手算的，真資料到了要重算，不能直接沿用。

**UI 組**
1. 讀 spec 4.4–4.7 與 5.4。
2. 先用 `findRoute.stub.js`、`viewer3d.stub.js`、`position.stub.js`，介面和真的一樣。
3. 資料只從 `data/` 讀（SVG、`rooms.csv`、`graph.json`），不要把房號寫死在程式裡。

**3D 組**
1. 讀 spec 4.1、4.6 與 5.5。
2. `src/viewer3d/createViewer3D.js` 已經能讀標準 SVG 並實作 4.6 的全部函式；用 `npm run serve` 開示範頁面看效果。
3. 你的工作是：換成真實 SVG 後檢查外觀、處理不規則形狀和樓梯方向、在真實 iPhone 上測效能、補 `src/viewer3d/README.md`。
4. 示範頁面上的「重建 10 次」按鈕可以檢查 `dispose()` 有沒有漏資源（canvas 數量應維持 1）。

**感測器與定位組**
1. 讀 spec 4.7、4.8 與 5.6。
2. 用 `docs/templates/phone-inventory.md` 開始 E1。
3. 數據檔放 `sensor-data/raw/`（自己建立），並登記 `runs.csv`、`marks.csv`。
4. 定位模組用 `src/position/position.stub.js` 的介面當起點。

## 已知限制（請先看過）

- `data/` 底下全是**假資料**，`building.json` 標有 `"sample": true`，驗證時會顯示警告。換成真資料時要把這個欄位移除。
- 驗證腳本的 SVG 解析是簡單的文字解析：只認 `<polygon>` 和 `<line>`，不支援 `transform`、`<path>`、`<rect>`。從 Inkscape 匯出時，請把形狀轉成 polygon 並套用 transform。
- `viewer3d.stub.js` 和 `createViewer3D.js` 需要瀏覽器環境；其他檔案都是純 Node 可跑。
- **`createViewer3D.js` 只在桌面瀏覽器（內建瀏覽器）測過**：載入、樓層切換、爆炸圖、路徑、使用者位置、點房間、2D／3D 切換、`dispose` 重建 10 次、錯誤碼。**iPhone Safari 還沒有實測**，效能和手勢要在真機上確認。
- 3D 檢視假設房間是走廊兩側的簡單形狀；樓梯階梯固定沿 x 方向；電梯與樓梯的外觀只是示意。
- `docs/spec.md` 是文件快照。規格若有更新，整合者要同步這份。
- 樓梯與電梯的跨層邊長度（樓梯 8、電梯 5）是預設值，不是實測。
- 感測器數據的記錄、分析腳本、定位演算法**還沒有**，這份開工包只提供格式和模板。

## 還沒做的（整合者待辦）

- 建 GitHub 倉庫、邀請成員、開通訊群組
- 向系辦提出平面圖申請
- 撰寫 12/18 成果發表的展示腳本
- 在自己的 iPhone 上開 3D 示範頁面，確認能不能順暢旋轉（需要手機和電腦在同一個網路，或部署到有 HTTPS 的地方）
- SVG 轉節點草稿的小工具（目前沒有，走廊節點要人工列）
