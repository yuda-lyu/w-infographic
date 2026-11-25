import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import wpw from 'w-playwright'
import createCdnLocal from 'w-package-tools-e2e/src/createCdnLocal.mjs'

// 測試端之 CDN 本地副本(w-package-tools-e2e 之 createCdnLocal): 測試開啟之頁面不連 CDN
//   清單 test/tools/cdn.manifest.json(3 個釘版繪圖庫之網址、sha256、大小; 由 w-package-tools-e2e 之 tools/genCdnManifest.mjs 依產品之 CDN 網址產生, 入版控; 指令見 sgud/rule/rulebook.md R14)
//   快取 test/_cache/cdn(內容定址; 已列 .gitignore): 首次執行須能連 CDN 下載並校驗, 之後離線可跑(環境變數 W_CDN_OFFLINE=1 強制離線)
//   單一啟動出口: 本檔載入時以 wpw.setBrowserTypeForTest 設一個替身, 使 src(renderTrimmed、p2 gen)與測試共用層(withPage、requestsOf)之 wpw.launchChromium()
//   一律經 launchRouted(掛 cdn.routeBrowser); 測試自設之啟動替身須以 launchRouted(next) 取代 next(), 否則該啟動不經路由(lib 之 withPage、requestsOf 以 cdn.isRouted 斷言)
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

// launchRouted: 單一啟動出口; next 為 wpw.setBrowserTypeForTest 替身收到之 next(引數原樣傳給 next, 如 next(o2)), 啟動後掛路由, 掛失敗即關閉瀏覽器並拋錯
//   替身內拋出之錯誤會被 w-playwright 轉為固定訊息之 E_LAUNCH(原因不外露), 故掛路由失敗時先把原因印到 stderr
async function launchRouted(next, ...a) {
    let browser = await next(...a)
    try {
        await cdn.routeBrowser(browser)
        assert.ok(cdn.isRouted(browser), '啟動出口須已掛 CDN 本地副本路由')
    }
    catch (err) {
        console.error('[cdn.mjs] 啟動出口掛 CDN 本地副本路由失敗:', err && err.message)
        await browser.close().catch(() => {})
        throw err
    }
    nLaunch++
    return browser
}

// launchCount: 經單一啟動出口啟動之瀏覽器數(供測試斷言每個啟動點皆經過出口)
const launchCount = () => nLaunch

// 全域替身(行程內持續有效; 測試自設之替身疊於其上時以 launchRouted(next) 續掛路由)
wpw.setBrowserTypeForTest({
    launch: async (o, next) => await launchRouted(next),
})

// useCdnGuard: 於 describe 內呼叫一次; 每案前取違規標記、案後斷言自標記起無清單外之外部請求
function useCdnGuard() {
    let mark = null
    beforeEach(function() {
        mark = cdn.violationMark()
    })
    afterEach(function() {
        cdn.assertNoViolation(mark)
    })
}

// useCdnEnsure: 於需要 CDN 本地副本之 describe 內呼叫一次; before 取得(缺什麼取什麼, 已備妥者只校驗), 首次下載之時限依 cdn.hookTimeoutMs, 不沿用 mocha 全域之 180 秒
function useCdnEnsure() {
    before(async function() {
        this.timeout(cdn.hookTimeoutMs)
        await cdn.ensure()
    })
}

export { cdn, makeCdn, launchRouted, launchCount, servedUrls, useCdnGuard, useCdnEnsure, FP_MANIFEST, DIR_CACHE }
