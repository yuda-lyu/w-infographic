# 回饋

本檔記載任務中發現之自有套件、全域技能、全域設定之調整與抽提提案,一條一列;只增不改,處置結果(已通報、已修、不採納)另記一列並寫明承接哪一列.回饋是紀錄與提案,實際修改仍走通報管道(自有套件:issue 通報;全域技能與設定:AI 設定庫之 issue).過長時依 skill[role-writer-sgud] §3 抽出舊列.

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-13 | 全域技能 | update-pks(及各「改依賴」類派工提示詞) | 以 `npm i`、`npm uninstall` 改依賴後,`package.json` 會被補檔尾換行、`package-lock.json` 頂層 `version` 兩處會被同步為 `package.json` 之版號;屬非必要改動,易隨依賴升降混入提交.建議該類技能與派工提示詞統一加一步:改依賴後以 `git diff` 檢視並還原這兩類改動,只留該依賴之行.本套件同一現象於 2026-11-09 與 2026-11-13 兩度出現 | `sgud/exp/experience.md`〈渲染與測試〉最末第二條與〈改經 w-playwright 啟動〉第三條;`git diff package.json package-lock.json`(還原前) |
