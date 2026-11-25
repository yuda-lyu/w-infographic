# 回饋

本檔記載任務中發現之自有套件、全域技能、全域設定之調整與抽提提案,一條一列;只增不改,處置結果(已通報、已修、不採納)另記一列並寫明承接哪一列.回饋是紀錄與提案,實際修改仍走通報管道(自有套件:issue 通報;全域技能與設定:AI 設定庫之 issue).過長時依 skill[role-writer-sgud] §3 抽出舊列.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-13 | 全域技能 | update-pks(及各「改依賴」類派工提示詞) | 以 `npm i`、`npm uninstall` 改依賴後,`package.json` 會被補檔尾換行、`package-lock.json` 頂層 `version` 兩處會被同步為 `package.json` 之版號;屬非必要改動,易隨依賴升降混入提交.建議該類技能與派工提示詞統一加一步:改依賴後以 `git diff` 檢視並還原這兩類改動,只留該依賴之行.本套件同一現象於 2026-11-09 與 2026-11-13 兩度出現 | `sgud/exp/experience.md`〈渲染與測試〉最末第二條與〈改經 w-playwright 啟動〉第三條;`git diff package.json package-lock.json`(還原前) |
| 2026-11-25 | 自有套件 | w-package-tools-e2e(`createCdnLocal`) | 觀察者只記清單外之外部請求;清單內之網址被使用端之 route 以 `continue()` 放走(直連真網)時,線上完全不被偵測、只有斷網才現形(README §2.13〈限制〉② 只寫清單外者).建議:以 `requestfinished` 與 `served` 事件配對,清單內網址完成請求而未經本地副本供應即記違規;或於〈限制〉明載「驗收須含斷網情境」.本庫暫以掃描案補(規則帳本 R14) | `node_modules/w-package-tools-e2e/src/createCdnLocal.mjs:630-639`;`unit-hierarchy` 變異「放行改 continue()」:線上 13 passing、斷網 1 failing |
| 2026-11-25 | 自有套件 | w-package-tools-e2e(`createCdnLocal`) | `makeHandler` 內 `await ensure()` 為惰性取得:未於 `before` 呼叫 `ensure()` 之測試檔,首次下載會落在頁面載入中,受單案逾時(mocha 預設 180 秒)限制且無任何警示.建議 README 加一句提醒,或首次惰性取得時發 `onTrace` 事件 | `createCdnLocal.mjs:615-617` |
| 2026-11-25 | 自有套件 | w-playwright(`setBrowserTypeForTest`) | 替身堆疊中頂端替身呼叫 `next()`／`next(o2)` 直達真 BrowserType,不經下層替身;使用端疊放兩層(全域出口與測試自設)時,頂端者之瀏覽器不經下層之處理.建議 README 於該函式明載此語意;並考慮提供可疊放之「browser 建立後之鉤子」,使共用出口免疊放(各使用端之單一啟動出口皆需此鉤子) | `node_modules/w-playwright/src/_launchCore.mjs:299-308`;`unit-cdnLocal`「繞過啟動出口之啟動被判為漏接」 |
| 2026-11-25 | 全域技能 | role-coder-for-test(references/sandbox-run.md) | 沙箱解析守門以 `NODE_OPTIONS=--import` 設於環境時,`quiet-run` 會繼承而被守門擋下(`[sandbox-guard] 解析到沙箱之外: …quiet-run.mjs`);建議補「守門只套在 mocha 子行程(以小啟動器 spawn 並設 `env`),不設在 quiet-run 之環境」,並提醒啟動器取自身目錄用 `fileURLToPath(import.meta.url)`,不用 `new URL(...).pathname`(含中文路徑成百分比編碼而找不到檔) | 本輪沙箱驗收之啟動器首兩次失敗(`./tmp` 之啟動器) |
| 2026-11-25 | 全域技能 | role-coder-for-test | 本機技能無「測試不連外部 CDN」一節(`Grep` 技能資料夾 `CDN` 0 筆);本輪依派工摘要之要點實作並補實測:①測試自設之啟動替身疊於全域出口之上須續掛路由;②線上不偵測清單內網址被 `continue()` 放走,驗收須含斷網情境並以掃描案補;③「偵測有效」之對照組不可用外部網址;④取得之 `before` 放在需 CDN 之巢狀 describe,縮小離線首跑之影響範圍.建議同步後補入 | 規則帳本 R14;`sgud/exp/experience.md`〈測試不連 CDN〉 |
