# 累積經驗

本檔為執行工作時特有之累積經驗,留給後續之嘗試、執行與判斷,由agent自行編列、擴充與維護.過長時抽出舊者為`experience_<年月日>.md`,並於本檔註明何時抽出.

## 輸入檢核與數字種類

- wsemi `isnum`、`ispint` 收 `Infinity` 與 `'0x10'`、`'0b11'`(`cdbl('0x10')` 為 16、`cdbl(Infinity)` 為 1.797e308),不宜用於 opt 之數字檢測;改用 `isenum`(有效數字)與 `iseint`(安全整數),轉換仍用 `cdbl`/`cint`.
- `iseint` 之 opt 只認 `use`、`min`、`max`,傳 `{ gt: 0 }` 不報錯但無作用(`iseint(0, { gt: 0 })` 為 true、`iseint(-5, { gt: 0 })` 為 true);正整數寫 `{ min: 1 }`.`isenum` 才有 `gt`/`lt`.
- 角度類數值須設上限:`startAngle` 為 `1e308` 時 `deg * Math.PI / 180` 溢位為 Infinity,`Math.cos(Infinity)` 為 NaN,座標變成 `NaNpx`,頁面照樣渲染而無錯誤,得到缺外圓之壞圖,是靜默失敗.
- 以使用者給的字串當物件鍵查表時,真值判斷(`PALETTE[cls] || 預設`)會取到 `Object.prototype` 成員(`constructor`、`toString`、`__proto__`),須用 `Object.prototype.hasOwnProperty.call`.

## 渲染與測試

- 瀏覽器內之失敗(缺函式庫、腳本例外)不會使 Playwright 的 `setContent` 拋錯,頁面端之 `window.__done` 永不為 true,呼叫端只會在逾時後收到與網路無關之 `page.waitForFunction: Timeout 30000ms exceeded`(變異實測).須在頁面載入後主動檢查全域物件(`d3`、`d3.flextree`、`d3.OrgChart`)並拋明確錯誤.
- `page.waitForFunction(pageFunction, arg, options)` 之逾時在第三參數:原型寫成 `waitForFunction('window.__done === true', { timeout: 15000 })`,物件落在第二參數(`arg`,字串函式不使用),逾時不生效而用預設 30 秒(變異實測訊息為 `Timeout 30000ms`).寫 Playwright 呼叫時逐個核對參數位置,並以訊息中之逾時值斷言.
- 測試網路失敗不必真的斷網:以 `page.route(/cdn\.jsdelivr\.net/, handler)` 於頁面建立後、載入前注入(`abort()` 模擬離線、`fulfill({ status: 404 })` 模擬 CDN 錯誤),故 p2 之 `gen` 留 `hooks.onPage(page)` 接縫;瀏覽器是否已關閉以 `page.context().browser().isConnected()` 斷言.
- 本套件之測試於真瀏覽器渲染,單檔約數十秒至數分鐘;跑測試須經測試鎖,本機常有他套件之 e2e 獨佔,排鎖可能數小時,宜先備齊證據驅動腳本於一次持鎖期間跑完(基準、修前紅、現行比對、變異、打包獨立安裝).
- 現行來源與套件之輸出比對:兩者皆用 Playwright 之 Chromium、同一份資料,可直接以位元組相等加 pixelmatch(`includeAA:false`、`threshold:0.1`)判定;p2 之現行輸出未裁切,比對時須另行以 sharp `trim()` 加四邊補白套用同一裁切.
- pixelmatch 7→8:色差度量由 YIQ 改為 OKLab HyAB,無選項可還原;選項維持 `threshold: 0.1`、`includeAA: false`,另明寫 `checkerboard: true`(8 之預設,半透明像素以棋盤格底色混合後比較).8 比 7 敏感之處是近黑區之明度差與飽和色之色偏(16～31 級),每通道 ≤ 12 級之雜訊兩版皆為 0.本套件 6 張標準圖與當次輸出位元組相同,升版不受影響;量法:於 `./tmp/` 以腳本渲染 6 圖,對標準圖算 8 之差異計數、RGBA 差異像素數與最大通道差,全為 0.
- `npm install <套件>@<版> --save-dev` 會順帶把 `package-lock.json` 頂層(`version` 兩處)同步為 `package.json` 之版號,並於 `package.json` 檔尾補換行;升依賴時只應動該依賴之行,事後以 `git diff` 檢視並還原這些非必要改動.
- 變異測試以副本執行(複製 `src` 與 `test` 至 `tmp/` 下,植入單一文字替換,只跑對應之測試檔與 `--grep`),植入點須先驗證存在且唯一,否則「抓到」可能是植入未生效.

## 改經 w-playwright 啟動(2026-11-13)

- 接線測試之作法:`wpw.setBrowserTypeForTest({ launch: async (o, next) => { seen.push(o); return await next() } })` 取得合併後之選項並以 `next()` 走真路徑(headless shell,不啟動真 Chrome);不需網路、不啟動瀏覽器之啟動點(p2,產圖須連 jsDelivr)則讓替身拋錯,斷言產圖 reject 且 `seen.length === 1`.替身只作用於同一份 w-playwright;測試必須斷言替身確被呼叫,否則啟動點仍用舊寫法時測試照樣綠(修前紅:3 個接線案皆 `0 !== 1`).
- 「不直接匯入 playwright」之靜態測試會命中自己:測試檔內若含 `from 'playwright'` 之範例字串,掃描 `test/` 時自己先被命中;範例以拼接組成(`['await import', '("playwright-core")'].join('')`),並以正例/反例各一確認正則抓得到、不誤抓 `w-playwright`.
- `npm uninstall playwright` 與 `npm i w-playwright` 會再度把 `package-lock.json` 頂層 `version` 兩處同步為 `package.json` 之版號,並在 `package.json` 檔尾補換行;事後以 `git diff` 還原這些非必要改動(與前述 `npm install --save-dev` 同現象).
- dist 之驗證:不在原地建置(`dist` 為入版控之發布產物);複製 `src`、`toolg`、`babel.config.js`、`package.json` 至 `./tmp/<夾>/distcopy/`,以 `quiet-run --cwd` 指向副本執行 `node toolg/gDistRollup.mjs`;副本位於 repo 內 `tmp` 下,Node 向上找到 repo 之 `node_modules`,不需目錄連結.dist 中 `require("w-playwright")`、`require("sharp")`、`require("@mdi/js")` 三個外部依賴,無 `playwright`;以 `createRequire` 載入 UMD、`w-playwright` 之預設匯出(物件)經 rollup 互通後可直接 `wpw.launchChromium()`.

## 測試不連 CDN(2026-11-25,規則帳本 R14)

- (歷史,2026-11-26 已由啟動後鉤子取代,見〈出口改用啟動後鉤子〉)`wpw.setBrowserTypeForTest` 之替身堆疊:頂端替身呼叫 `next()` 直達真 BrowserType,**不經堆疊中下一層**.故曾以載入時設之全域替身為出口時,其上再疊之測試自設替身以 `next()` 啟動之瀏覽器不會被掛路由,須經自寫之 `launchRouted(next)`;該函數與全域替身已刪.測試共用層以 `cdn.isRouted(browser)` 斷言,漏接即拋「漏接」(仍有效).
- 服務端回應不帶快取標頭時,Chromium 對 `d3-flextree`、`d3-org-chart` 各請求 2 次(`d3` 1 次),一次 p2 頁面載入 `served` 計 5 而非 3;斷言以「供應之網址集合 ＝ 清單」為準,不斷言次數.
- Playwright 之 route 順序:頁面層(`page.route`)先於 context 層(CDN 本地副本之路由掛在 context),同層後註冊者先執行.測試自設之 route 對不處理之請求用 `fallback()` 交給 CDN 本地副本之路由;`continue()` 直連真網.線上時觀察者只記清單外之請求,清單內之網址被 `continue()` 放走**不被記為違規**,故此類回歸只有斷網情境才現形(驗收須含斷網:預載使 Chromium 以 `--host-resolver-rules=MAP * ~NOTFOUND` 對所有主機名稱無法解析,修前紅/修後綠皆以此為準),線上另以 `unit-cdnLocal` 之掃描案把關(`continue`、`fetch`、`APIRequestContext` 之直連).
- 斷網預載以 `NODE_OPTIONS=--import=<file URL>` 套在 mocha 行程;`quiet-run` 會繼承該變數(沙箱解析守門曾把 `quiet-run.mjs` 自己擋下),故預載或守門只套在 mocha 子行程,以小啟動器(spawn mocha 並設 `env`)包起來,`quiet-run` 之指令為 `node <啟動器> <沙箱根> <mocha 參數>`.啟動器內取自身目錄用 `fileURLToPath(import.meta.url)`,不用 `new URL(...).pathname`(含中文之路徑會成百分比編碼而找不到檔).
- 對照組不可用外部網址(會被中止並使測試失敗):`unit-entry` 之「偵測有效」對照改用本機伺服器(`listen(0, '127.0.0.1')`,回送位址放行),結束時 `closeAllConnections()` 再 `close()`.
- mocha 之 `afterEach` 失敗會中止同一 suite 之後續案,違規時只看到第一案失敗;訊息為 `createCdnLocal: 自標記起有 N 筆未列入 CDN 本地對照表之外部請求: <網址>`(不含錯誤碼字串,以訊息比對).
- 快取缺且離線時之影響範圍:取得放在需要 p2 繪圖庫之巢狀 describe 之 `before`(`unit-hierarchy` 之 p2、`unit-cdnLocal` 之〈需本地副本者〉),失敗只波及這兩處(共 9 案不執行),其餘案不受影響(2026-11-25 為 49 案;2026-11-26 全套 61 案,發布包沙箱、斷網預載、快取為空時實測 52 passing、2 failing〔兩個 `before` 之失敗,其下 9 案不執行〕;靜態之掃描與對照案不放在其下;曾把 `useCdnEnsure()` 放在 `unit-cdnLocal` 之最外層,離線且快取為空時連靜態案都不跑,經獨立複審指出後改);不把 `ensure()` 放在每個 describe,否則缺快取之離線首跑會使不需 CDN 之 circles、hexagon 等整批失敗.
- 測試內以子 mocha 行程驗 `useCdnGuard`(夾具寫於 `test/_tmp/cdnLocal-<pid>/`,測完刪;子行程加 `timeout`、`setEncoding('utf8')`):定位 mocha 以 `createRequire(import.meta.url).resolve('mocha/package.json')`,在鏡像(變異用複本)與發布包沙箱皆可;寫死 `../node_modules/mocha` 於鏡像會失敗(曾使變異結果多一個與變異無關之失敗).
- 變異驗證測試端接線:鏡像根(`./tmp/<案名>/mut/w`,複本不建連結)植入單點、只跑相關檔;2026-11-25 之 19 個單點缺陷全數轉紅(清單見規則帳本 R14;出口接線改為鉤子後,與出口有關者已由 2026-11-26 之重驗取代,見下節);變異之錨點須恰出現 1 次(0 或多次即報錯,不靜默略過),改測試檔後錨點常失效(曾因對照組改寫而報錯),須同步更新.掃描型測試(以檔案文字比對)要防自己被命中:正則以拼接字串組成,註解內不寫會被命中之字樣(如 `next(`、`.continue(`),另對掃描範圍設下限並附正反對照以防空集合.
- `w-package-tools-e2e` 依賴 `wsemi ^1.9.75`,本套件 `npm i -D` 後 `package-lock.json` 之 `wsemi` 由 1.9.74 連帶升至 1.9.75(`package.json` 之範圍 `^1.9.74` 不變);同樣會把 lock 頂層 `version` 同步為 `package.json` 之版號並於 `package.json` 檔尾補換行,事後須還原(同前文).

## 出口改用啟動後鉤子(2026-11-26,規則帳本 R14 之 c)

- `wpw.onBrowserCreated(hook)`(w-playwright 1.0.6)套在 `launchChromium` **最終回傳給呼叫端**之瀏覽器上,與 `setBrowserTypeForTest`(替換,只有堆疊頂之替身被呼叫)正交:測試自設替身內直接 `next()`／`next(o)` 之結果亦套一次、內層 `next(o)` 不重複套.故出口免疊放,`launchRouted` 與載入時之全域替身皆刪;`test/tools/cdn.mjs` 之 `routeCreated` 為唯一鉤子,`launchCount` 於鉤子內成功掛上路由後累計.
- 鉤子失敗(`routeBrowser` 拋錯)時 w-playwright 先關閉該瀏覽器、後續鉤子不執行,再以固定詞彙之 `E_LAUNCH_HOOK` reject(原因不外露),故 `routeCreated` 先把原因印到 stderr 再拋.替身若回傳非 Playwright 物件(假瀏覽器),`routeBrowser` 拋 `E_CDN_ARG`、啟動 reject `E_LAUNCH_HOOK`;本庫之替身皆回真瀏覽器或啟動即拋錯(不產生瀏覽器、不觸發鉤子,如 p2 之接線案),故不需還原鉤子.
- 需要「沒有出口鉤子」之情境(負向對照、獨立實例)一律用 `cdn.mjs` 之 `withoutHook(fn)`:移除鉤子、跑 `fn`、finally 復掛;`useCdnGuard` 之 `afterEach` 以 `hookInstalled()` 兜底(案內忘了復掛即該案失敗,不留給下一案).獨立實例案在 `withoutHook` 內自註冊 `iso.routeBrowser` 之鉤子,啟動後即還原;不移除出口鉤子則同一瀏覽器亦由主實例路由,違規會記入主實例之標記而使 `useCdnGuard` 失敗.
- 「鉤子已掛」之靜態守門以檔案掃描(`unit-cdnLocal`):`tools/cdn.mjs` 恰 1 處註冊、`test/tools` 各檔不設啟動替身、除 `cdn.mjs` 外不註冊、測試檔除 `unit-cdnLocal`(獨立實例案 1 處)外不註冊;不限接收者名稱(別名亦抓),整行註解不算,正則以拼接組成避免本檔自己被命中,另附正反對照防空集合.行為面之守門為「自設替身直接 `next()`／`next(o)` 之瀏覽器 `cdn.isRouted` 為真」與「鉤子還原後啟動者為假且不計數、案內復掛」.
- 變異驗證(鏡像根須含 `toolg/`,否則 `unit-wpwWiring` 之靜態案因讀不到 `toolg` 而於每個變異多 2 個與變異無關之失敗;先跑「無變異」基準確認全綠再判讀):載入時另設全域替身(舊式疊放)這一變異,行為面全綠(鉤子仍在,路由為冪等),只有靜態掃描案抓得到;舊式出口(以全域替身取代鉤子)則由「自設替身直接 `next()`」案單獨抓到.「鉤子不 `await` `routeBrowser`」於補「鉤子失敗」案之前存活(成功路徑上,瀏覽器目標之包裝於首個 `await` 前已同步完成,無差別),先被誤記為等價;獨立複審指出失敗路徑無測試,補「出口鉤子失敗時啟動 reject `E_LAUNCH_HOOK`…」案(替身回假物件、攔截 `console.error`)後,該變異與「失敗者亦計數」「吞錯不重拋」「不印原因」皆由它擊殺——互為備援之等價判斷須各補只有它抓得到之案(skill[role-coder-for-test] §10).
- 斷網情境之預載:`w-playwright` 之預設匯出為可改寫之普通物件,預載模組包裝 `wpw.launchChromium` 為附加 `--host-resolver-rules=MAP * ~NOTFOUND` 後再呼叫原函數,即使自設替身疊在上面亦全數生效(以 `setBrowserTypeForTest` 之全域替身實作預載則會被測試自設之替身繞過);於發布包沙箱使用時,預載檔須複製進沙箱根,使其解析到沙箱內之 `w-playwright`(放在沙箱外會被解析守門擋下,且為另一份實例).

## 環境

- Git Bash 之 `tar -xzf C:/路徑` 會把 `C:` 當遠端主機而失敗;改用 `/c/路徑`.
- `quiet-run` 以 cmd 執行指令,`./node_modules/.bin/xxx` 之寫法不成立,改 `node node_modules/<套件>/<入口>.js`.
- 打包解開夾放在他專案之 `./tmp` 下時,Node 之模組解析會向上層找 `node_modules`,可能掩蓋未宣告之依賴;須以解開夾內之腳本以 `import.meta.resolve` 確認每個非相對匯入皆落在解開夾自身之 `node_modules`.
