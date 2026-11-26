# 規則帳本

本檔為套件設計與開發階段之規則帳本(藍圖),為要求程式碼須長成什麼樣,或由規格產出之測試(項目/說明/流程)有哪些,包含軸、單一擁有者、已知限制、破壞性變更紀錄,以及對應是哪些測試檔案或指令等,由agent自行編列、擴充與維護.當前已做到哪些記於`sgud/state/state.md`.過長時依類型拆為`rulebook_<類型>.md`,本檔只留索引.

套件定位:由正規化數據產製資訊圖 PNG(Node 端,經 w-playwright 啟動之 Chromium 渲染,2 倍解析度,圖內不畫圖名).圖種:`circles`(圓形放射圖)、`hexagon`(六邊形資訊圖)、`hierarchy`(層級樹,`p1` 純 HTML/CSS、`p2` d3-org-chart).流程圖屬 w-flowchart,甘特圖屬 w-ganttchart,不在本套件.

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

- 現況判斷(待主控裁定):經 w-playwright 啟動 Chromium(R13)後直接以 Playwright 之 page API 渲染,不經 w-html2png.理由:本套件須於頁面內量測視覺邊界後,以小數座標 `clip` 截圖;w-html2png 之介面為 `(width, height, scale, html, opt)` 之固定尺寸截圖,無 clip 與頁面內量測結果回傳,須先量測再以固定尺寸重繪、事後裁切,小數座標之 clip 截圖無法重現(推論,未實測改接).另 w-html2png 預設使用自帶之 Windows 專用 chrome.其 `opt.timeout`、`opt.onTrace`、retry 為本套件所無,屬可改善而非阻礙.

## R11 建置、發布與 npm 範圍

- 規則:`script.txt`、`toolg/` 依 dspec〈自有套件之發布與建置腳本〉A 型標準寫法,不自創;`script.txt` 由使用者維護,agent 不改.`toolg/gDistRollup.mjs` 之 `fns: 'WInfographic.mjs'`、`nameDistType: 'kebabCase'`、external(與 globals 同列)為 `@mdi/js`、`sharp`、`w-playwright`(Node 端執行期依賴,不打包;`w-playwright` 以其 main 外部化,不內嵌其 src,使 `playwright-core` 之精確版本由 w-playwright 持有).`.gitignore` 保留 `CLAUDE*.md`、不排除 `sgud`;不提供 `.npmignore`(`test/` 約 3.6MB,未達 dspec〈自有套件之npm發布範圍〉第 2 條之 10MB).`package.json` 之 scripts 只有 `test`、`deploy`.
- 盤點:`ls toolg`(應為 addVersion、cleanFolder、gDistRollup、genDocsDist、modifyReadme 5 支);`git grep -n "external" -A5 -- toolg/gDistRollup.mjs`.
- 判準:已套.

## R12 測試

- 檔名前綴:一律 `unit-`(`test/*.test.mjs`).本套件無 HTTP/RPC 介面與使用者互動畫面,故無 `api-`、`e2e-`;測試於瀏覽器(headless shell,經 w-playwright 啟動;不啟動真 Chrome、Edge、完整 Chromium)載入各圖種產生之 HTML 做語意斷言(幾何、配色、逃逸),並以標準圖做補強.
- 標準圖比對:pixelmatch 8(devDependencies `^8.0.0`,色差度量為 OKLab HyAB;7 為 YIQ,無選項可還原 7 之判定),選項 `{ threshold: 0.1, includeAA: false, checkerboard: true }`(單一擁有者 `test/tools/lib.mjs` 之 `pixelDiff`,`assertBaseline` 與 `unit-entry` 之「鑑別力」斷言共用),容差 `MAX_DIFF` 100 像素;不符時三聯組證據落 `./testPending/`(gitignore,不自動刪);臨時檔落 `test/_tmp/<案名>/`(目前只有 `unit-cdnLocal` 之子 mocha 夾具 `test/_tmp/cdnLocal-<pid>/`,測完即刪).
- 比對度量改變之處置(7→8 於 2026-11-09 套用,6 張標準圖之當次輸出與標準圖位元組相同,0 張失敗、0 張重產):8 比 7 敏感之處為近黑區 16～31 級明度差、飽和色 16～31 級色偏,透明背景下半透明內容之真實改變 8 抓得到而 7 抓不到;每通道 ≤ 12 級之雜訊兩版皆計 0.日後升 pixelmatch 大版或改選項後若有標準圖失敗:暫裝舊版對照(`npm i --no-save pixelmatch7@npm:pixelmatch@7.2.0`,不寫入 `package.json`),兩版以同一組選項各算計數;舊版計數 ≤ 容差 < 新版計數者為「只因度量而失敗」之候選,須逐張目視確認畫面內容未改變,才可 `UPDATE_BASELINE=1` 搭配 `--grep <案名>` 定點重產該張;兩版皆超容差者非度量所致,依一般流程查因,不得以重產處理;不放寬容差或 threshold、不整批重產(R2).
- 每條斷言上方註明對應之規格句(各圖種模組檔頭、`WInfographic.mjs` JSDoc、本帳本).
- p2 之測試不連 jsDelivr:三個繪圖庫由本地副本供應(R14);首次執行須能連 jsDelivr 下載並校驗,之後可離線.
- 「不需網路」之規格以 `requestsOf`(`test/tools/lib.mjs`)斷言:circles、hexagon、p1 色帶與卡片之頁面載入後不得有任何非 `data:`/`about:`/`blob:` 之請求(`unit-entry`),並以兩個對照確認偵測有效:本機伺服器(回送位址,`listen(0)`)供應之圖片(請求成功)、已關閉之回送位址埠(請求發出而連線被拒、無回應)皆須偵測到 1 個請求;測試端不連外部網址(R14),故對照組不用外部網址.
- 標準圖比對失敗時,`./testPending/` 落 `capture` 與 `baseline`;兩圖尺寸相同才另有 `diff`.
- 改動範圍 → 測試檔:`src/circles/**` → `unit-circles`;`src/hexagon/**` → `unit-hexagon`;`src/hierarchy/**` → `unit-hierarchy`;`src/common/normOpt.mjs`、`src/WInfographic.mjs` → `unit-opt`、`unit-entry`;`src/common/render.mjs`、`text.mjs`、`palette.mjs`、`test/tools/lib.mjs`、`test/tools/cdn.mjs` → 全部;`src/hierarchy/p2/gen.mjs` → `unit-hierarchy`、`unit-wpwWiring`、`unit-cdnLocal`(其 CDN 網址須與清單一致,R14);`test/tools/cdn.manifest.json` → `unit-cdnLocal`、`unit-hierarchy`;`package.json`、`toolg/gDistRollup.mjs` → `unit-wpwWiring`.
- 盤點:`git grep -c -E "^\s+it\(" -- test` 各檔案例數見 state(目前 circles 7、entry 9、hexagon 8、hierarchy 13、opt 6、wpwWiring 6、cdnLocal 12,共 61).
- 變異驗證:改動 `src` 後以副本植入單一文字替換、只跑對應之測試檔,測試須有失敗;植入點須先確認存在且唯一.已驗之植入類別:幾何(startAngle 套用、槽位順序、每側上限)、配色(`colorOf`、`clsOf` 取原型鏈成員)、裁切(`TRIM_PAD`、clip 左緣、p2 補白)、逃逸(`<`、`&`)、分派(mode 對調)、預設值與非預期值(`normOpt` 各鍵)、圖示後備、輸入檢核(notes、items)、p2 載入檢查、逾時參數位置、JSON 嵌入之 `<` 轉義.

## R13 Chromium 啟動一律經 w-playwright

- 規則(對應 w-playwright 規則帳本之 R-PW-ONLY、R-PW-WIRING,由主控統一盤點):(a)`src`、`test`、`toolg` 之 `.mjs`/`.js` 不得以靜態匯入、動態 `import()`、`require` 引用 `playwright`、`playwright-core`;啟動一律 `wpw.launchChromium()`(`import wpw from 'w-playwright'`,不深層匯入其 `src`);(b)`package.json` 不宣告 `playwright`、`playwright-core`,`dependencies` 宣告 `w-playwright`(測試斷言下限 `^1.0.1` 以上;現為 `^1.0.6`,測試端出口鉤子需 1.0.6 以上,見 R14 之 c);(c)`toolg/gDistRollup.mjs` 之 globals、external 列 `w-playwright`、不列 `playwright`;(d)本套件只用無頭之 headless shell(`wpw.launchChromium()` 不給 `channel`、`headless`),不啟動真 Chrome、Edge、完整 Chromium——需要時另議並依 w-playwright 之驗證狀態與登入守門辦理;(e)測試以 `wpw.setBrowserTypeForTest` 斷言每個啟動點送出之選項含守門(恰一個 `--disable-features`、為 `args` 最後一個元素、含 `AutofillAiWalletPrivatePasses`),並斷言替身確被呼叫.
- 站點全集(啟動點):`src/common/render.mjs` 之 `renderTrimmed`(circles、hexagon、hierarchy p1 共用)、`src/hierarchy/p2/gen.mjs` 之 `gen`,共 2 處(`git grep -n "wpw\.launchChromium" -- src`);測試共用層 `test/tools/lib.mjs` 之 `withPage`、`requestsOf`,共 2 處.
- 盤點(命中須為 0,於套件根執行;防空集合:同指令對 w-playwright 之 `src/_pw.mjs` 須有命中):`rg -n --glob '*.{mjs,js}' --glob '!**/node_modules/**' --glob '!**/dist/**' "(from\s+|import\(\s*|require\(\s*)['\"\`]playwright(-core)?['\"\`/]" .`;`git grep -n -E "playwright" -- package.json` 應只剩 `w-playwright` 一行.
- 判準:已套(2 處 src 啟動點、2 處測試共用層啟動點,逐點接線案齊全;修前紅:未改前 3 個接線案皆因替身 0 次呼叫而失敗,2 個靜態案因仍匯入 `playwright` 而失敗).
- 行為變更(README 已載):受管瀏覽器未安裝時 reject 帶 `code`(`E_BROWSER_MISSING`),不再是 Playwright 原文;啟動失敗之錯誤為固定詞彙(不含命令列);`PWDEBUG` 為 inspector 模式之值或 `SELENIUM_REMOTE_URL` 有值時拒絕(`E_ENV`).命令列多一個合併之 `--disable-features`(Playwright 預設清單加 `AutofillAiWalletPrivatePasses`),渲染結果不變(6 張標準圖 0 張改變).
- 測試:`test/unit-wpwWiring.test.mjs`.
- 與 R14 之關係:`test/tools/cdn.mjs` 以 w-playwright 之啟動後鉤子 `wpw.onBrowserCreated`(1.0.6 起)對最終回傳給呼叫端之瀏覽器掛 CDN 本地副本路由,與 `setBrowserTypeForTest`(替換、非疊放)正交——本檔之啟動替身直接呼叫 `next()` 走真路徑即可,其瀏覽器仍已掛路由,不必自行包路由;`withPage`、`requestsOf` 以 `cdn.isRouted` 斷言沒有漏接.替身若回傳非 Playwright 物件(假瀏覽器),鉤子之 `routeBrowser` 拋 `E_CDN_ARG`、啟動 reject `E_LAUNCH_HOOK`;本庫之替身皆回真瀏覽器,或於啟動時即拋錯(不產生瀏覽器、不觸發鉤子,如 p2 案).

## R14 測試不連 CDN

- 規則:(a)測試開啟之頁面不連 CDN:p2 載入之 3 個釘版 UMD(`d3@7.9.0`、`d3-flextree@2.1.2`、`d3-org-chart@3.1.1`)改由本地副本供應,經 devDependency `w-package-tools-e2e`(2026-11-25 導入時 `^1.0.51`,現為 `^1.0.55`)之 `createCdnLocal`(清單＋sha256 與大小校驗＋內容定址快取＋跨行程只下載一次＋頁面路由導向本地副本;清單以外之外部 http(s)、ws(s) 一律中止並記錄,以 `useCdnGuard` 使該案失敗);(b)只改測試端:`src/` 內之 CDN 網址、產品行為與輸出不變;(c)單一啟動出口:`test/tools/cdn.mjs` 載入時以 `wpw.onBrowserCreated`(w-playwright 1.0.6 起之啟動後鉤子,`package.json` dependencies `^1.0.6`)掛一個鉤子 `routeCreated`——對最終回傳給呼叫端之瀏覽器掛 `cdn.routeBrowser` 並以 `cdn.isRouted` 斷言,成功才計入 `launchCount`——全部 `wpw.launchChromium()`(src 之 `renderTrimmed`、p2 `gen`;測試共用層 `withPage`、`requestsOf`;測試自設之啟動替身內 `next()`／`next(o)` 之結果)皆經它;鉤子之註冊集中於該檔一處(`installHook`),測試檔不各自註冊(`unit-cdnLocal` 之獨立實例案除外,於該案內還原),載入時不設全域啟動替身;要暫時移除出口鉤子者(負向對照、獨立實例)用 `withoutHook(fn)`(結束含拋錯皆復掛),`useCdnGuard` 之 `afterEach` 斷言 `hookInstalled()`;(d)會啟動瀏覽器之 describe 呼叫 `useCdnGuard()`(每案前後 `violationMark`、`assertNoViolation`),載入 p2 繪圖庫之 describe 另呼叫 `useCdnEnsure()`(`before` 取得,時限 `cdn.hookTimeoutMs`,不沿用 mocha 全域之 180 秒);(e)測試自設之 `page.route` 對不處理之請求須 `route.fallback()`,不得 `continue()`(頁面層之 `page.route` 先於 context 層之 CDN 路由執行,`continue()` 繞過本地副本直連真網;共用函式之觀察者只記清單外之網址,清單內者被放走線上不算違規,僅斷網才現形,故另以 `unit-cdnLocal` 之掃描案於線上把關);(f)測試內不得以外部網址作對照(會被中止並使測試失敗):需要「發出請求」之對照改用本機伺服器(`listen(0)`,回送位址放行);(g)本庫之測試與產品無 Node 端對外 `fetch`,故不呼叫 `cdn.patchFetch()`,日後新增 Node 端外部 `fetch` 時須補;(h)`.gitignore` 列 `test/_cache`(本庫無 `.npmignore`,npm 依 `.gitignore`,發布包不含快取).
- 清單:`test/tools/cdn.manifest.json`(3 檔、398,895 位元組,入版控);快取 `test/_cache/cdn`(以 `test/tools/cdn.mjs` 之檔案位置定位,不隨工作目錄).重新產生:`node node_modules/w-package-tools-e2e/tools/genCdnManifest.mjs --url <網址> --url <網址> --url <網址> --out test/tools/cdn.manifest.json`;核對線上內容未變:同指令改加 `--check`(重新下載比對,不寫檔,需連網).產品改版 CDN 網址後須重新產生清單並審視差異(`unit-cdnLocal` 第 1 案轉紅提示).
- 站點全集:啟動點 4 處(src 2、測試共用層 2)皆經出口(`unit-cdnLocal`「每個啟動點皆經單一啟動出口」);會啟動瀏覽器之測試檔 6 個皆於行首呼叫 `useCdnGuard()`,載入 p2 繪圖庫者(`unit-hierarchy` 之 p2 describe、`unit-cdnLocal` 之〈需本地副本者〉)皆於行首呼叫 `useCdnEnsure()`(`unit-wpwWiring` 之 p2 案啟動即拋錯、不載入繪圖庫,列豁免),自設啟動替身者(`unit-wpwWiring`)直接呼叫 `next()` 即可(其瀏覽器已掛路由,由 `unit-cdnLocal`「自設啟動替身內直接呼叫 next()、next(o) 啟動之瀏覽器仍已掛路由」案斷言);出口鉤子「已掛」且註冊集中:`unit-cdnLocal`「出口鉤子已掛且註冊集中於 test/tools/cdn.mjs 一處、載入時不設全域啟動替身」——`tools/cdn.mjs` 恰 1 處註冊且含 `cdn.routeBrowser(`,`test/tools` 各檔不設啟動替身、除 `cdn.mjs` 外不註冊,測試檔除 `unit-cdnLocal`(獨立實例案 1 處)外 0 處註冊;皆自檔案系統掃(非手列),註解行不算,不限接收者名稱,新增測試檔漏接或另行註冊即轉紅.useCdnGuard／useCdnEnsure 之掃描以檔案為單位,只認行首之呼叫(註解不算),同檔多個 describe 只接一次者不在掃描範圍.
- 盤點:`git grep -n -E "\.(continue|fetch)\(" -- test` 應無輸出(`unit-cdnLocal` 以拼接字串避免自己被命中);`git grep -n --untracked "launchChromium" -- test` 之實際啟動點只應在 `lib.mjs`(2 處)與 `unit-cdnLocal`(夾具與對照案之直接啟動),其餘為說明或掃描正則;外部網址只應在清單與 `unit-cdnLocal`(`.invalid` 之對照).
- 盤點(出口鉤子,命中處須逐一對上):`git grep -n -E "\bonBrowserCreated\b|\bsetBrowserTypeForTest\b" -- test`——程式碼行(排除整行註解)之 `onBrowserCreated` 只應在 `test/tools/cdn.mjs`(`installHook` 1 處)與 `unit-cdnLocal`(獨立實例案 1 處,於 `withoutHook` 內註冊、啟動後即還原);`setBrowserTypeForTest` 只應在 `unit-wpwWiring`(替身直接 `next()` 或啟動即拋錯)與 `unit-cdnLocal`(自設替身案、鉤子失敗案),`test/tools` 內須為 0;`git grep -n launchRouted -- test` 須無輸出.以上由 `unit-cdnLocal`「出口鉤子已掛且註冊集中…」案自檔案系統掃,盤點指令為其人工核對版.
- 驗證:全套(斷網情境:`W_CDN_OFFLINE=1`,快取已備妥,預載使 Chromium 對所有主機名稱無法解析)全綠;同情境修前紅(p2 之 5 案);離線且快取為空時,只有兩個需本地副本之 describe(`unit-cdnLocal` 之〈需本地副本者〉3 案、`unit-hierarchy` 之 p2 6 案)之 `before` 失敗(訊息列缺檔名)而其 9 案不執行,其餘案通過(2026-11-25 為 49 案;2026-11-26 全套 61 案,發布包沙箱實測 52 passing、2 failing〔兩個 `before`〕).
- 已知限制(共用函式之限制,見 w-package-tools-e2e README §2.13〈限制〉):SharedWorker 與 Worker 內 WebSocket 之請求攔不到;route 之後註冊之 `continue()` 只能記錄、來不及中止;本庫之測試皆不用.另:清單內之網址被 route 以 `continue()` 放走(直連真網)者,共用函式之觀察者不視為違規(只記清單外者),線上不被偵測、僅斷網才現形,故本庫以 (e) 之掃描案於線上把關(亦掃 `fetch`、APIRequestContext 之直連);清單之 sha256 與線上現行內容是否相同無自動測試,升版或發布前以 `--check` 手動核對.
- 測試:`test/unit-cdnLocal.test.mjs`(12 案;不需快取之 9 案:清單與產品一致且釘版、`useCdnGuard`／`useCdnEnsure` 接線掃描、出口鉤子已掛且註冊集中之掃描、route 不以 `continue()`／`fetch` 直連之掃描、自設啟動替身內直接 `next()`／`next(o)` 之瀏覽器仍已掛路由、出口鉤子失敗時啟動 reject `E_LAUNCH_HOOK`〔瀏覽器先關閉、不計數、原因印 stderr〕、出口鉤子還原後啟動者未掛路由並被判為漏接(案內復掛)、`useCdnGuard` 為第二道防線〔子 mocha 行程〕、清單外請求中止並使測試失敗〔獨立實例以自己之鉤子〕;〈需本地副本者〉3 案:快取校驗、p2 由本地副本供應、每個啟動點經出口)、`unit-hierarchy`(p2 巢狀 describe,其 `r.fallback()`)、`unit-entry`(對照組改本機伺服器與已關閉之回送位址埠)、`unit-wpwWiring`(替身直接 `next()` 走真路徑,瀏覽器仍由出口鉤子掛路由).
- 變異驗證(測試端接線,鏡像根植入單點,只跑相關檔;鏡像根須含 `src/`、`test/`、`toolg/`、`package.json`,並先跑「無變異」基準須全綠):
  - 2026-11-25 之 19 個變異中,與出口接線無關者本輪未動、未重跑:`continue()` 放行(斷網情境 2 處、線上由掃描案抓)、`fetch()` 直連、產品改版而清單未更新、清單 sha256 錯、清單網址錯、`useCdnGuard` 漏接 2 處、`useCdnEnsure` 漏接 2 處、對照組改回外部網址、`requestsOf` 改記完成之請求;設計上之存活:線上之 `unit-hierarchy` 單檔對 `continue()` 不紅(由 `unit-cdnLocal` 之掃描案補).與舊出口(全域替身與 `launchRouted`)有關之變異(出口不掛路由、只計數不掛路由、啟動替身改回 `next()`)隨該設計刪除.
  - 2026-11-26 出口改鉤子後之重驗(基準全綠;26 個變異全數轉紅,0 存活):載入時不掛鉤子、註冊空鉤子(全檔、只跑自設替身案各 1)、`withoutHook` 不還原／只改狀態不還原／不復掛、鉤子改掛他實例、鉤子不計數／重複計數／失敗者亦計數、失敗時吞錯不重拋／不印原因／不 `await` `routeBrowser`、舊式出口(以全域替身取代鉤子;全檔、只跑自設替身案各 1)、載入時另設全域替身(只有掃描案抓得到)、`tools/lib.mjs` 另註冊、測試檔以別名／解構別名／括號索引另註冊(3)、`tools/cdn.mjs` 註冊兩個、`withPage`／`requestsOf` 不斷言 `isRouted`(2)、`afterEach` 不斷言違規、`afterEach` 不斷言鉤子仍掛並搭配不復掛(只剩案內斷言)、獨立實例案不暫時移除出口鉤子.
