# 規則帳本

本檔為套件設計與開發階段之規則帳本(藍圖),為要求程式碼須長成什麼樣,或由規格產出之測試(項目/說明/流程)有哪些,包含軸、單一擁有者、已知限制、破壞性變更紀錄,以及對應是哪些測試檔案或指令等,由agent自行編列、擴充與維護.當前已做到哪些記於`sgud/state/state.md`.過長時依類型拆為`rulebook_<類型>.md`,本檔只留索引.

套件定位:由正規化數據產製資訊圖 PNG(Node 端,Playwright 之 Chromium 渲染,2 倍解析度,圖內不畫圖名).圖種:`circles`(圓形放射圖)、`hexagon`(六邊形資訊圖)、`hierarchy`(層級樹,`p1` 純 HTML/CSS、`p2` d3-org-chart).流程圖屬 w-flowchart,甘特圖屬 w-ganttchart,不在本套件.

判準欄:已套/未套/刻意不套.盤點指令於套件根執行(Grep 工具或 `git grep`;檔案尚未提交時 `git grep` 須加 `--untracked`).

## R1 對外介面不變

- 規則:預設匯出 `WInfographic(inp, opt)`,回傳 `Promise<Buffer>`(PNG).`src/WInfographic.mjs` 只可有預設匯出:具名匯出會使 rollup 之 UMD 改為具名輸出,CJS 之 `require()` 取得物件而非函數.輔助函數(`normOpt`、各圖種 `gen`/`buildHtml`)放各自模組,由測試直接匯入.
- 盤點:`git grep -n "^export" -- src/WInfographic.mjs` 應只有 `export default WInfographic`.
- 站點:1 處,已套.
- 測試:`test/unit-entry.test.mjs`;打包後以 `dist` 載入之冒煙見 state.

## R2 版面常數與標準圖不變

- 規則:版面常數與 `test/pics` 之 6 張標準圖由提出方依其報告圖驗證為位元組相同,不得自行調整或重產;須調整者先於該 issue 留言取得同意.標準圖之產製(`UPDATE_BASELINE=1`)只在取得授權後、且只產受影響者.
- 常數全集:circles(`R_CENTER` 150、`R_ITEM` 100、`GAP` 26、`PAD` 40、`NOTE_W` 400);hexagon(`R_HEX` 125、`GAP` 44、`SPREAD` 1.07、`PAD` 40、`NOTE_W` 430、`NOTE_GAP` 40、`FILLORDER_L`/`FILLORDER_R`);`render.mjs` 之 `TRIM_PAD` 24;p2 之 `ROOT_W` 280、`TRIM_PX` 24;p1 節點寬 196(色帶)、212(卡片);`palette.mjs` 色票 7 色.
- 盤點:`git grep -n "^const [A-Z_]* = " -- src`;`git diff --stat -- test/pics` 應無輸出.
- 判準:已套(本輪 0 張改變).

## R3 已刻意清除之功能不得補回

- 規則:下列功能已由提出方依報告實際用量清除,不得補回:hierarchy 之 p3(Treeflex)、p4(OrgChart + jQuery)、節點 `badge`/`sub`/`tags`/`num`、p1 之 `nodeWidth`;circles 之 `center.subtitle`、`rCenter`/`rItem`/`gap`/`ring`;hexagon 之 `center.subtitle`、`wire`、`cls`(原本即不影響畫面)、`rHex`/`rCenter`/`gap`/`wireTheme`/`spread`/`stagger`/`bg`;全部之 emoji 圖示、`trimPad`、對外匯出 `buildHtml`.
- 盤點:`git grep -n -E "badge|\.tags|trimPad|rHex|wireTheme|stagger|opt\.(bg|wire|spread|gap|ring|rCenter|rItem)|treeflex|jquery" -- src`(區分大小寫)應無輸出.
- 判準:已套.
- 註:hexagon 之 `WIRETHEME` 為固定之左右欄兩主色系常數(非 `wireTheme` 選項),保留.各圖種模組內 `export { gen, buildHtml }` 之 `buildHtml` 供測試於真瀏覽器載入頁面做語意斷言,不是對外匯出(套件入口只有預設匯出,見 R1).

## R4 輸入檢核

- 規則:(a)必要輸入(`inp`、`opt.type`、各圖種之必要欄位)不合即拋錯,訊息只帶欄位名與種類,不回顯輸入值;(b)`opt` 其餘鍵為非預期之輸入時視為未給,改用預設;(c)數字類鍵以 wsemi `isenum`(有效數字,含數字字串,不含 Infinity、NaN、十六進位字串)與 `iseint`(安全整數)檢測,轉換後使用,不用 `isnum`/`ispint`(收 Infinity 與 `'0x10'`);(d)不改動呼叫端之 `inp`、`opt`;(e)`opt.debug` 不實作(dspec 草案,規劃由共用函數統一實作).
- 單一擁有者:`opt` 之正規化只在 `src/common/normOpt.mjs`;`inp` 之檢核在 `src/WInfographic.mjs`(`checkCenterItems`、`checkTreeNode`),hexagon 每側至多 5 項在 `src/hexagon/gen.mjs`.
- 站點全集(opt 鍵 8 個):`type`(必給,拋錯)、`startAngle`(`isenum` 且絕對值 ≤ 360000,否則 -90)、`mode`(僅 `'p2'` 為 p2)、`boxStyle`(僅 `'card'` 為 card)、`nodeWidth`/`width`/`height`(`iseint` 且 ≥ 1,否則 196/1300/640)、`compact`(僅 `true` 為 true).
- 已知限制:wsemi `iseint` 只認 `use`、`min`、`max`,傳 `gt` 不報錯但無作用,正整數須用 `{ min: 1 }`.`startAngle` 上限 360000 度是為避免 `deg * Math.PI / 180` 於 1e308 量級溢位為 Infinity、三角函數得 NaN、外圓座標全失而靜默出壞圖.
- 盤點:`git grep -n "get(opt" -- src` 應只在 `normOpt.mjs`;`git grep -n -E "isnum|ispint" -- src` 應無輸出.
- 判準:已套.
- 測試:`test/unit-opt.test.mjs`(opt 全鍵之有效值與非預期值)、`test/unit-entry.test.mjs`(入口拋錯、不改動 inp).

## R5 選填欄位之型別

- 規則:`notes`(circles、hexagon 項目)與 `items`(hierarchy 節點)為陣列;給了而不是陣列(`null`、`''`、`undefined` 視為未給)即拋 `invalid inp.items, notes 須為陣列` / `invalid inp.tree, items 須為陣列`,不得落成內部 `TypeError`.
- 站點全集:`checkCenterItems` 之 notes、`checkTreeNode` 之 items,共 2 處,已套.其餘選填欄位(`desc`、`icon`、`cls`、`subtitle`、`side`)不另檢:`icon` 見 R7、`cls` 見 R6、`side` 非 left/right 視為未標,`desc`/`subtitle` 以字串顯示,刻意不套(提出方未要求).
- 測試:`test/unit-entry.test.mjs`「notes、items 非陣列時拋明確錯誤」.

## R6 文字逃逸與 cls

- 規則:呼叫端文字一律經 `esc`/`escBr`(`src/common/text.mjs`),只置於元素文字節點,不置於屬性;`cls` 不直接拼入 class 或 style:hierarchy 以 `clsOf`(色票自有鍵,否則 gray)、circles 以 `colorOf`(`#rrggbb` 正規式,或色票自有鍵,否則依序循環取色)、hexagon 不看 `cls`.查表一律用自有鍵判斷(`Object.prototype.hasOwnProperty.call`),不可用 `PALETTE[cls]` 之真值判斷,否則 `constructor`、`toString`、`__proto__` 會取得原型鏈成員.
- 站點全集:盤點 `git grep -c -E "esc\(|escBr\(" -- src`(circles 3 行、hexagon 3 行、nodeBox 7 行;`text.mjs` 為定義);`git grep -n "PALETTE\[" -- src` 之每處須為自有鍵判斷之後(目前 1 處:circles `colorOf`).
- 判準:已套(circles `colorOf` 於本輪補自有鍵判斷).
- 測試:各圖種之文字逃逸案例;circles「外圓配色」、hierarchy「p1 色帶版式之欄位」含原型成員名.

## R7 圖示解析

- 規則:`icon` 只有三種結果:`<svg` 開頭之 raw SVG 原樣內嵌(內容由呼叫端負責,刻意不逃逸);`mdi:名稱`(kebab-case,查 `@mdi/js`)解析為 path;其餘與查無名稱者顯示 `?`,不靜默.
- 單一擁有者:`iconInner`(`src/common/text.mjs`);呼叫站點 4 處(`git grep -n "iconInner(" -- src`):circles `.cico`、hexagon `.hico`、nodeBox `iconHtml`、`gboxCardHtml`.
- 判準:已套.測試:circles「圖示之各種給法」.

## R8 視覺邊界裁切

- 規則:circles、hexagon、hierarchy p1 共用 `renderTrimmed`/`measure`(`src/common/render.mjs`):於頁面內量測內容之視覺聯集邊界(含 box-shadow 與 filter 外擴),四邊各加 `TRIM_PAD` 後以小數座標 clip 截圖,成品四邊留白一致.hierarchy p2 另以 sharp `trim()` 後四邊補 `TRIM_PX` 白邊.
- 判準:已套.測試:`assertTrimmed`(`test/tools/lib.mjs`)、p2 之 `inkMargins`、標準圖.

## R9 p2 之 CDN 與錯誤

- 規則:p2 由 jsDelivr 載入 `d3@7.9.0`、`d3-flextree@2.1.2`、`d3-org-chart@3.1.1`(精確鎖定);繪圖庫未載入(離線、DNS 失敗、被阻擋、CDN 回應錯誤)時 `waitReady` 拋 `hierarchy p2 無法載入繪圖庫 <缺者>(由 cdn.jsdelivr.net 載入), 請確認可連線至 jsDelivr`,不等逾時、不產出空白圖,且 `finally` 關閉瀏覽器.
- 等待繪製完成之逾時為 `waitReady(page, timeout = 15000)`;`page.waitForFunction` 之逾時須置於第三參數(`waitForFunction(fn, null, { timeout })`),置於第二參數不生效(用預設 30 秒).盤點:`git grep -n "waitForFunction" -- src test` 每處須為 `(fn, null, { timeout })`.
- 測試接縫:`gen(inp, opt, hooks)` 之 `hooks.onPage(page)` 於載入前呼叫,供測試以 `page.route` 注入網路失敗;一般呼叫不給,不屬對外介面(入口不傳).
- 盤點:`git grep -n "cdn.jsdelivr.net" -- src` 應為 4 行(3 行 script 標籤之版本鎖定,1 行錯誤訊息).
- 已知限制:CDN 連線被黑洞(封包被丟棄而非拒絕)時,先遇 Playwright `setContent` 之 30 秒預設逾時,訊息為 Playwright 原文,非本套件之明確訊息;仍為拋錯,非無聲.
- 測試:`test/unit-hierarchy.test.mjs`「p2 無法載入繪圖庫時拋明確錯誤並關閉瀏覽器」(全斷、單庫被阻擋、單庫回 404)、「p2 等待繪製完成之逾時值生效」、「p2 圖示內含 </script> 不破壞頁面」(JSON 嵌入時 `<` 須轉為 `<`).

## R10 渲染方式

- 現況判斷(待主控裁定):直接呼叫 Playwright,不經 w-html2png.理由:本套件須於頁面內量測視覺邊界後,以小數座標 `clip` 截圖;w-html2png 之介面為 `(width, height, scale, html, opt)` 之固定尺寸截圖,無 clip 與頁面內量測結果回傳,須先量測再以固定尺寸重繪、事後裁切,小數座標之 clip 截圖無法重現(推論,未實測改接).另 w-html2png 預設使用自帶之 Windows 專用 chrome.其 `opt.timeout`、`opt.onTrace`、retry 為本套件所無,屬可改善而非阻礙.

## R11 建置、發布與 npm 範圍

- 規則:`script.txt`、`toolg/` 依 dspec〈自有套件之發布與建置腳本〉A 型標準寫法,不自創;`script.txt` 由使用者維護,agent 不改.`toolg/gDistRollup.mjs` 之 `fns: 'WInfographic.mjs'`、`nameDistType: 'kebabCase'`、external 為 `playwright`、`sharp`、`@mdi/js`(Node 端執行期依賴,不打包).`.gitignore` 保留 `CLAUDE*.md`、不排除 `sgud`;不提供 `.npmignore`(`test/` 約 3.6MB,未達 dspec〈自有套件之npm發布範圍〉第 2 條之 10MB).`package.json` 之 scripts 只有 `test`、`deploy`.
- 盤點:`ls toolg`(應為 addVersion、cleanFolder、gDistRollup、genDocsDist、modifyReadme 5 支);`git grep -n "external" -A5 -- toolg/gDistRollup.mjs`.
- 判準:已套.

## R12 測試

- 檔名前綴:一律 `unit-`(`test/*.test.mjs`).本套件無 HTTP/RPC 介面與使用者互動畫面,故無 `api-`、`e2e-`;測試於真瀏覽器載入各圖種產生之 HTML 做語意斷言(幾何、配色、逃逸),並以標準圖做補強.
- 標準圖比對:pixelmatch `includeAA:false`、`threshold:0.1`、容差 100 像素;不符時三聯組證據落 `./testPending/`(gitignore,不自動刪);臨時檔落 `test/_tmp/<案名>/`(目前無).
- 每條斷言上方註明對應之規格句(各圖種模組檔頭、`WInfographic.mjs` JSDoc、本帳本).
- p2 之測試需連 jsDelivr.
- 「不需網路」之規格以 `requestsOf`(`test/tools/lib.mjs`)斷言:circles、hexagon、p1 色帶與卡片之頁面載入後不得有任何非 `data:`/`about:`/`blob:` 之請求(`unit-entry`),並以含外部圖片之頁面做對照確認偵測有效.
- 標準圖比對失敗時,`./testPending/` 落 `capture` 與 `baseline`;兩圖尺寸相同才另有 `diff`.
- 改動範圍 → 測試檔:`src/circles/**` → `unit-circles`;`src/hexagon/**` → `unit-hexagon`;`src/hierarchy/**` → `unit-hierarchy`;`src/common/normOpt.mjs`、`src/WInfographic.mjs` → `unit-opt`、`unit-entry`;`src/common/render.mjs`、`text.mjs`、`palette.mjs` → 全部.
- 盤點:`git grep -c -E "^\s+it\(" -- test` 各檔案例數見 state(目前 circles 7、entry 9、hexagon 8、hierarchy 13、opt 6,共 43).
- 變異驗證:改動 `src` 後以副本植入單一文字替換、只跑對應之測試檔,測試須有失敗;植入點須先確認存在且唯一.已驗之植入類別:幾何(startAngle 套用、槽位順序、每側上限)、配色(`colorOf`、`clsOf` 取原型鏈成員)、裁切(`TRIM_PAD`、clip 左緣、p2 補白)、逃逸(`<`、`&`)、分派(mode 對調)、預設值與非預期值(`normOpt` 各鍵)、圖示後備、輸入檢核(notes、items)、p2 載入檢查、逾時參數位置、JSON 嵌入之 `<` 轉義.
