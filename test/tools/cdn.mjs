import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import wpw from 'w-playwright'
import createCdnLocal from 'w-package-tools-e2e/src/createCdnLocal.mjs'

// 測試端之 CDN 本地副本(w-package-tools-e2e 之 createCdnLocal): 測試開啟之頁面不連 CDN
//   清單 test/tools/cdn.manifest.json(3 個釘版繪圖庫之網址、sha256、大小; 由 w-package-tools-e2e 之 tools/genCdnManifest.mjs 依產品之 CDN 網址產生, 入版控; 指令見 sgud/rule/rulebook.md R14)
//   快取 test/_cache/cdn(內容定址; 已列 .gitignore): 首次執行須能連 CDN 下載並校驗, 之後離線可跑(環境變數 W_CDN_OFFLINE=1 強制離線)
//   單一啟動出口: 本檔載入時以 wpw.onBrowserCreated(w-playwright 1.0.6 起之啟動後鉤子)掛一個鉤子 routeCreated, 對 wpw.launchChromium() 最終回傳之瀏覽器掛 cdn.routeBrowser;
//     不論啟動來自 src(renderTrimmed、p2 gen)、測試共用層(withPage、requestsOf)或測試自設之啟動替身(setBrowserTypeForTest 內直接呼叫 next()), 皆已掛路由(鉤子與替身正交, 不必在替身內自行包路由)
//     鉤子之註冊集中於本檔一處; 測試檔不各自註冊(unit-cdnLocal 之獨立實例案除外, 須於該案內還原); 要暫時移除出口之鉤子者用 withoutHook(fn)
//     測試共用層(withPage、requestsOf)以 cdn.isRouted 斷言啟動之瀏覽器已掛路由, 漏接即拋「漏接」
//   清單以外之外部請求一律中止並記錄, 以 useCdnGuard 之 afterEach 使測試失敗; 本庫之測試與產品皆無 Node 端對外 fetch, 故不呼叫 cdn.patchFetch()

const __dir = path.dirname(fileURLToPath(import.meta.url))
const FP_MANIFEST = path.resolve(__dir, 'cdn.manifest.json')
const DIR_CACHE = path.resolve(__dir, '../_cache/cdn') // 以檔案位置定位(不隨工作目錄), 各 mocha worker 共用同一個快取與鎖

// makeCdn: 建立一個實例(測試之主實例 cdn 與負向對照用之獨立實例共用同一份清單與快取)
function makeCdn(opt = {}) {
    return createCdnLocal({ manifest: FP_MANIFEST, cacheDir: DIR_CACHE, ...opt })
}

// 主實例之 served 事件(供應本地副本之網址; 同一網址可被瀏覽器請求多次, 此處逐次記錄)
let servedLog = []
const cdn = makeCdn({
    onTrace: (e) => {
        if (e.type === 'served') {
            servedLog.push(e.url)
        }
    },
})

// servedUrls: 自載入起由本地副本供應之網址(依序, 含重複)
const servedUrls = () => servedLog.slice()

let nLaunch = 0

// routeCreated: 啟動後鉤子; 對最終回傳給呼叫端之瀏覽器掛路由並斷言已掛, 成功才計數
//   鉤子拋錯時 w-playwright 先關閉該瀏覽器再以固定訊息之 E_LAUNCH_HOOK reject(原因不外露), 故掛路由失敗時先把原因印到 stderr
async function routeCreated(target) {
    try {
        await cdn.routeBrowser(target)
        assert.ok(cdn.isRouted(target), '啟動後鉤子須已掛 CDN 本地副本路由')
    }
    catch (err) {
        console.error('[cdn.mjs] 啟動後鉤子掛 CDN 本地副本路由失敗:', err && err.message)
        throw err
    }
    nLaunch++
}

// launchCount: 經單一啟動出口(啟動後鉤子)掛上路由之瀏覽器數(供測試斷言每個啟動點皆經過出口)
const launchCount = () => nLaunch

// 出口鉤子(行程內持續有效; 註冊只在 installHook 一處)
let restoreHook = null
function installHook() {
    if (restoreHook === null) {
        restoreHook = wpw.onBrowserCreated(routeCreated)
    }
}
installHook()

// hookInstalled: 出口鉤子是否掛著(本檔自己維護之狀態; 鉤子實際生效與否另以啟動後之 cdn.isRouted 驗)
const hookInstalled = () => restoreHook !== null

// withoutHook: 於 fn 執行期間暫時還原(移除)出口鉤子, fn 結束(含拋錯)後復掛(排在鉤子清單最後; 現只有此一個出口鉤子, 無順序影響); 供負向對照與獨立實例案使用
//   不可巢狀、不可並行(內層於動狀態前即拋斷言); mocha 同檔內序列執行, 不會發生
async function withoutHook(fn) {
    assert.ok(restoreHook !== null, '出口鉤子須已掛才能暫時移除')
    restoreHook()
    restoreHook = null
    try {
        return await fn()
    }
    finally {
        installHook()
    }
}

// useCdnGuard: 於 describe 內呼叫一次; 每案前取違規標記、案後斷言自標記起無清單外之外部請求, 並斷言出口鉤子仍掛著(案內暫時移除者須復掛)
function useCdnGuard() {
    let mark = null
    beforeEach(function() {
        mark = cdn.violationMark()
    })
    afterEach(function() {
        cdn.assertNoViolation(mark)
        assert.ok(hookInstalled(), '出口鉤子於案後須仍掛著(案內暫時移除者須復掛)')
    })
}

// useCdnEnsure: 於需要 CDN 本地副本之 describe 內呼叫一次; before 取得(缺什麼取什麼, 已備妥者只校驗), 首次下載之時限依 cdn.hookTimeoutMs, 不沿用 mocha 全域之 180 秒
function useCdnEnsure() {
    before(async function() {
        this.timeout(cdn.hookTimeoutMs)
        await cdn.ensure()
    })
}

export { cdn, makeCdn, launchCount, hookInstalled, withoutHook, servedUrls, useCdnGuard, useCdnEnsure, FP_MANIFEST, DIR_CACHE }
