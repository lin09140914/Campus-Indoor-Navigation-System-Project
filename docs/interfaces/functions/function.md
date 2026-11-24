# 跨組 Function 介面規格 — V0.1

本文件只列出由其他組別呼叫的跨組介面。資料型別以 `docs/interfaces/schemas/Data_Specification.md` 為準：Graph 欄位為 `building_id`、`map_version`、`coordinate_system_id`、`nodes`、`edges`；樓層使用 Integer `floor`；Route 的移動模式為 `any | stair | elev`。本文件不規定各組內部函式。`evaluateMapError()` 是地圖組離線內部測試函式，規格放在 `Map_Team_Development.md`。

## `getCurrentPosition`

### 名稱
`getCurrentPosition`（定位組提供）。

### 功能
取得目前裝置位置估計，回傳統一 Localization Result。

### Input
- `options`：可選 `{building_id?: string, map_version?: string, coordinate_system_id?: string}`。均省略時使用目前選定建築、地圖及座標系統。V1 為單棟建築，通常全部省略；欄位保留供未來多建築擴充，UI 不提供建築選擇。

### Output
- 成功時回傳規格第 6 節的 Localization Result：`building_id`、`map_version`、`coordinate_system_id`、`position: {x, z, floor}`、`confidence`、`timestamp`。
- 失敗不得捏造座標或 confidence；具體錯誤回報方式依全專案例外處理規範制定。

### 執行條件
裝置定位功能可呼叫，必要權限已授予，選定的建築與地圖資料可用。呼叫端須能處理非同步完成。

### 特殊情況
權限拒絕、感測器不可用或圖資無法使用時回報失敗，不以虛構座標表示成功。V1 僅要求原地自動定位，不要求持續追蹤。

## `findRoute`

### 名稱
`findRoute`（路徑組提供）。

### 功能
依 Graph、目前定位及目的地計算符合移動方式限制的路線。

### Input
- `graph`：符合統一規格的 Graph。
- `start`：成功的 Localization Result。
- `destination_id: string`：Location 的 `id`。
- `mode: "any" | "stair" | "elev"`：移動方式。

### Output
- 成功時回傳符合 Route 資料規格的物件：`building_id`、`map_version`、`coordinate_system_id`、`mode`、`path`、`length`、`floors`、`transitions`。
- 無可達路徑時回傳 `null`。輸入無效或執行失敗依全專案例外處理規範處理。

### 執行條件
Graph、定位、目的地資料的建築、地圖版本及座標系統相容；目的地 ID 可解析到有效 Location 與 Graph Node；起點可映射到 Graph。

### 特殊情況
無效 ID、版本/座標系統不符、無可達路徑或指定模式無法通行時不得產生猜測路線。起點等於終點時允許單一節點、`length` 為 0、`transitions` 為空。

## `renderMap`

### 名稱
`renderMap`（3D 組提供）。

### 功能
載入並呈現指定樓層 SVG，建立可供疊加定位和路線的場景。

### Input
- `svg`：符合 SVG 規格的樓層檔案/內容。
- `floor`：`floors.json` 中與 SVG 相符的樓層物件。
- `options`：可選 `{view_mode?: "2d" | "3d", fit_to_view?: boolean}`；容器由實作框架指定。

### Output
- `RenderResult`：`{status: "success" | "error", building_id: string, map_version: string, floor: number, scene?: unknown, error?: {code: string, message: string}}`。`scene` 為本地渲染控制物件，不作跨組序列化。

### 執行條件
SVG 與 Floor 的 `data-building-id`、`data-floor`、`data-map-version` 一致；Floor 的 SVG 路徑存在，轉換參數有效，SVG 安全可解析且渲染容器可用。

### 特殊情況
資料不符、SVG 無效、容器無效或 3D 能力不可用時回傳 error；可支援時降級 2D，並標明實際模式。重新載入需釋放舊場景資源。

## `renderRoute`

### 名稱
`renderRoute`（3D 組提供）。

### 功能
將 Route 的 `path` 節點及 `transitions` 呈現在已載入的地圖場景。

### Input
- `route`：成功的 Route。
- `graph`：產生該 Route 的 Graph。
- `scene`：`renderMap()` 成功回傳且仍有效的場景。
- `options`：可選 `{active_floor?: number}`。

### Output
- `RenderResult` 或 overlay 控制物件，含成功/錯誤狀態；內部渲染物件不作共用資料契約。

### 執行條件
Route、Graph、scene 的 `building_id`、`map_version`、`coordinate_system_id` 相容；Route 節點/邊皆可在 Graph 驗證；所需樓層已載入。

### 特殊情況
無可達路線（`null`）不繪製路線。缺少節點、資料版本不符或場景失效時回報錯誤。跨樓層連接須以樓層轉換方式呈現，不可將不同樓層的 XZ 點誤畫成直接水平通道；重繪時清除舊 overlay。
