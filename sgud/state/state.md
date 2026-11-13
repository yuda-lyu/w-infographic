# 套件現況

本檔記載當前已開發功能之最新狀態:各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本.規則帳本(`sgud/rule/rulebook.md`)為藍圖、本檔為現況,兩者比對即知尚未做到者.只記現況,過程寫入 `sgud/exp/experience.md`.

## 版本與驗證

- `package.json` 版本 1.0.0,尚未發布(發布流程自行遞增).
- 最近一次驗證(2026-11-04):`npm test`(mocha `--no-parallel`,經測試鎖)43 passing、0 failing(`unit-circles` 7、`unit-entry` 9、`unit-hexagon` 8、`unit-hierarchy` 13、`unit-opt` 6),6 張標準圖逐一比對通過、`testPending` 無新增;`npm pack` 解開後獨立安裝(只用宣告之依賴)同為 43 passing;以 `dist` 載入之 UMD 出圖,6 張標準圖資料之輸出與標準圖位元組相同;植入 23 種單一錯誤之變異,測試皆抓到.eslint 0 error.
- 標準圖比對度量(2026-11-09 起):pixelmatch 升至 8.0.0(`package.json` devDependencies `^8.0.0`,lock 釘 8.0.0),`test/tools/lib.mjs` 之 `pixelDiff` 選項為 `{ threshold: 0.1, includeAA: false, checkerboard: true }`,容差 `MAX_DIFF` 100 不變(規則帳本 R12).升版後 `npm test`(mocha `--no-parallel`,經測試鎖)43 passing、0 failing(`unit-circles` 7、`unit-entry` 9、`unit-hexagon` 8、`unit-hierarchy` 13、`unit-opt` 6),`testPending` 未產生;6 張標準圖之當次輸出與標準圖位元組相同(8 之差異計數皆 0、RGBA 差異像素皆 0),0 張重產.
- 改經 w-playwright 啟動 Chromium 後(2026-11-13,規則帳本 R13):`npm test`(mocha `--no-parallel`,經測試鎖)49 passing、0 failing、0 pending(既有 43 + `unit-wpwWiring` 6);6 張標準圖 0 張改變、`testPending` 未產生、`git diff --stat -- test/pics` 無輸出;`node_modules/w-playwright` 為 1.0.1、`playwright-core` 為 1.64.1(精確,由 w-playwright 持有),`node_modules/playwright` 已不存在.以副本(`./tmp` 下,cwd 指向副本)建置之 dist 載入(`require`,`w-playwright` 外部化),5 張不連網之標準圖資料輸出與標準圖位元組相同(p2 另依測試之 pixelmatch 比對通過).錯誤密碼次數於測試前後皆 0(本套件只啟動 headless shell,不啟動真 Chrome、Edge、完整 Chromium).
- p2 之測試需連 jsDelivr;其餘不需網路.

## 功能現況

| 功能 | 狀態 | 規則帳本 | 測試檔 |
|---|---|---|---|
| 入口 `WInfographic(inp, opt)` 依 `opt.type` 分派 | 完成 | R1、R4、R5 | `unit-entry`、`unit-opt` |
| circles 圓形放射圖(`startAngle`、`#rrggbb`/色票鍵/循環取色、圖示、外側要點) | 完成 | R2、R6、R7 | `unit-circles` |
| hexagon 六邊形資訊圖(欄位分派、10 槽位、每側至多 5 項、兩主色系) | 完成 | R2、R7 | `unit-hexagon` |
| hierarchy p1 層級樹(色帶、卡片、巢狀、條列) | 完成 | R2、R6、R7 | `unit-hierarchy` |
| hierarchy p2(d3-org-chart,需連 jsDelivr;`nodeWidth`、`width`、`height`、`compact`) | 完成 | R2、R9 | `unit-hierarchy` |
| 視覺邊界裁切(四邊留白一致) | 完成 | R8 | `assertTrimmed`、`inkMargins` |
| 建置與發布(`script.txt`、`toolg/`、JSDoc、dist) | 完成,依 dspec A 型標準寫法;`w-playwright` 為 external | R11 | 實跑 `jsdoc`、`gDistRollup`、`genDocsDist`;`unit-wpwWiring`(external 靜態斷言) |
| Chromium 啟動經 w-playwright(2 處 src 啟動點、測試共用層 2 處;不直接依賴 playwright) | 完成;只用 headless shell | R13 | `unit-wpwWiring` |

## 已知缺口與待辦

- `opt.debug` 未實作(dspec〈輸入參數之檢測機制〉為草案,規劃由共用函數統一實作;屆時改 `src/common/normOpt.mjs` 單一處).
- 渲染方式維持經 w-playwright 啟動後直接以 Playwright 之 page API 渲染,是否改接 w-html2png 待主控裁定(規則帳本 R10).
- 測試每次 `withPage`、`requestsOf` 皆啟動一次 headless shell(共約 30 次);headless shell 不觸發登入驗證,共用瀏覽器屬效能而非守門之需要,暫不改(w-playwright 設計 §5.2:headless shell 之共用為選做).- 圖內字型固定微軟正黑體,非 Windows 且未安裝該字型之環境會落到 sans-serif,可能缺字;未偵測字型是否存在.
- p2 於連線被黑洞(封包丟棄)時為 Playwright 之 30 秒逾時原文訊息(規則帳本 R9 已知限制).
- circles 之 `cls` 只收 `#rrggbb`(6 位十六進位);`#abc`、`#rrggbbaa` 等寫法視同未給,依序循環取色.

## 與標準圖

- `test/pics` 6 張標準圖與提出方原型位元組相同;pixelmatch 升 8 後仍為 0 張失敗、0 張重產(`git diff --stat -- test/pics` 無輸出).
