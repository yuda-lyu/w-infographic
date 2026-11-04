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
- 變異測試以副本執行(複製 `src` 與 `test` 至 `tmp/` 下,植入單一文字替換,只跑對應之測試檔與 `--grep`),植入點須先驗證存在且唯一,否則「抓到」可能是植入未生效.

## 環境

- Git Bash 之 `tar -xzf C:/路徑` 會把 `C:` 當遠端主機而失敗;改用 `/c/路徑`.
- `quiet-run` 以 cmd 執行指令,`./node_modules/.bin/xxx` 之寫法不成立,改 `node node_modules/<套件>/<入口>.js`.
- 打包解開夾放在他專案之 `./tmp` 下時,Node 之模組解析會向上層找 `node_modules`,可能掩蓋未宣告之依賴;須以解開夾內之腳本以 `import.meta.resolve` 確認每個非相對匯入皆落在解開夾自身之 `node_modules`.
