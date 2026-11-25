import assert from 'assert'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { spawn } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import wpw from 'w-playwright'
import WInfographic from '../src/WInfographic.mjs'
import { buildHtml as buildP2 } from '../src/hierarchy/p2/gen.mjs'
import { withPage, requestsOf } from './tools/lib.mjs'
import { circlesInp, treeP2Inp } from './tools/data.mjs'
import { cdn, makeCdn, launchCount, servedUrls, useCdnGuard, useCdnEnsure, FP_MANIFEST } from './tools/cdn.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const DIR_SRC = path.resolve(__dir, '../src')
const P2_DEF = { nodeWidth: 196, width: 1300, height: 640, compact: false }
const BLANK = '<!doctype html><html><body>ok</body></html>'

// 載入 p2 繪圖庫但其啟動替身於啟動時即拋錯(不載入繪圖庫)之測試檔, 不要求 useCdnEnsure()
const P2_NO_LIBS = ['unit-wpwWiring.test.mjs']

// 規格來源: 規則帳本 R14(測試不連 CDN)與 R9(p2 由 jsDelivr 載入三個精確釘版之繪圖庫); 取得、校驗、路由、違規之行為由 w-package-tools-e2e 之 createCdnLocal 負責(其庫內測試涵蓋), 本檔只驗本庫之接線
describe('測試不連 CDN(createCdnLocal 之接線)', function() {

    useCdnGuard()

    let manifest = JSON.parse(fs.readFileSync(FP_MANIFEST, 'utf8'))
    let keys = Object.keys(manifest.files).sort()
    let readTests = () => fs.readdirSync(__dir).filter((n) => /\.test\.mjs$/.test(n)).map((n) => [n, fs.readFileSync(path.join(__dir, n), 'utf8')])

    // 規格(R9、R14): 產品載入之 CDN 網址(精確釘版)＝ 清單之網址; 產品改版而清單未更新時此案轉紅(須重新產生清單)
    it('清單之網址與產品原始碼、p2 頁面載入之 CDN 網址一致且精確釘版', function() {
        let walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
            let fp = path.join(dir, ent.name)
            return ent.isDirectory() ? walk(fp) : [fp]
        })
        let files = walk(DIR_SRC).filter((fp) => /\.mjs$/.test(fp))
        assert.ok(files.length >= 10, `掃描檔數過少(${files.length}), 範圍可能壞了`)
        let inSrc = [...new Set(files.flatMap((fp) => fs.readFileSync(fp, 'utf8').match(/https?:\/\/[^\s"'`)<>]+/g) || []))].sort()
        assert.deepStrictEqual(inSrc, keys, 'src 內之 http(s) 網址須全部在清單內, 且清單不得有 src 未用者')
        let html = buildP2(treeP2Inp, P2_DEF)
        let inPage = [...new Set([...html.matchAll(/\b(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))].sort()
        assert.deepStrictEqual(inPage, keys, 'p2 頁面載入之外部網址須等於清單')
        assert.deepStrictEqual(Object.keys(manifest.roots).sort(), keys, '清單之根網址須等於其檔案網址(3 個庫皆為獨立 UMD, 無相對匯入)')
        for (let u of keys) {
            assert.ok(/\/[^/@]+@\d+\.\d+\.\d+\//.test(u), `須精確釘版: ${u}`)
            assert.ok(/^[0-9a-f]{64}$/.test(manifest.files[u].sha256), `須有 sha256: ${u}`)
        }
    })

    // 規格(R14): 會啟動瀏覽器之測試檔皆於行首呼叫 useCdnGuard(), 載入 p2 繪圖庫者另於行首呼叫 useCdnEnsure(); 測試檔自行設啟動替身者須用 launchRouted(next);
    //   站點全集自檔案系統掃(非手列), 新增測試檔漏接線即轉紅; 只認行首之呼叫(註解內之字樣不算), 以 file 為單位(同檔多個 describe 只呼叫一次者不在掃描範圍)
    it('會啟動瀏覽器之測試檔皆接線 useCdnGuard、p2 者接線 useCdnEnsure、自設啟動替身者用 launchRouted', function() {
        let files = readTests()
        let reLaunch = /\b(WInfographic|withPage|requestsOf|launchChromium)\(/
        let reP2 = /\b(buildP2|genP2)\b|mode:\s*'p2'/
        let reStub = /\bsetBrowserTypeForTest\(/
        let nLaunch = 0
        let nP2 = 0
        let nStub = 0
        for (let [n, s] of files) {
            if (reLaunch.test(s)) {
                nLaunch++
                assert.ok(/^\s*useCdnGuard\(\)/m.test(s), `${n} 會啟動瀏覽器, 須呼叫 useCdnGuard()`)
                if (reP2.test(s) && !P2_NO_LIBS.includes(n)) { // 純函式檔(如 unit-opt 之 mode: 'p2' 輸入值)不啟動瀏覽器, 不在此列
                    nP2++
                    assert.ok(/^\s*useCdnEnsure\(\)/m.test(s), `${n} 載入 p2 繪圖庫, 須呼叫 useCdnEnsure()`)
                }
            }
            if (reStub.test(s) && n !== 'unit-cdnLocal.test.mjs') { // 本檔之替身為刻意繞過出口或獨立實例之對照案
                nStub++
                assert.ok(/\blaunchRouted\(next/.test(s), `${n} 自設啟動替身, 須以 launchRouted(next) 啟動`)
                assert.ok(!/\bnext\(/.test(s), `${n} 自設啟動替身不得直接呼叫 next(...)(會繞過單一啟動出口), 須以 launchRouted(next) 啟動`)
            }
        }
        assert.ok(files.length >= 7 && nLaunch >= 6 && nP2 >= 2 && nStub >= 1, `掃描範圍可能壞了(測試檔 ${files.length}、啟動瀏覽器者 ${nLaunch}、p2 者 ${nP2}、自設替身者 ${nStub})`)
    })

    // 規格(R14 之 e): 測試自設之 route 對不處理之請求用 fallback(), 不得以 continue() 放行(頁面層之 route 先於 context 層之 CDN 路由執行, continue() 繞過 CDN 本地副本而直連真網;
    //   線上時共用函式之觀察者只記清單外之網址, 清單內之網址被放走不算違規, 回歸只有斷網才現形, 故以掃描補上線上之防線); 亦不得以 route 之 fetch 或 APIRequestContext 直連(同樣繞過本地副本)
    //   站點自檔案系統掃
    it('測試自設之 route 不以 continue() 放行、不直連', function() {
        let files = [__dir, path.join(__dir, 'tools')].flatMap((d) => fs.readdirSync(d).filter((n) => /\.mjs$/.test(n)).map((n) => path.join(d, n)))
        let re = new RegExp('\\.(?:contin' + 'ue|fe' + 'tch)\\(|\\.request\\.(?:get|post|put|patch|delete|head|fe' + 'tch)\\(|request\\.newCon' + 'text\\(')
        let hits = files.filter((fp) => re.test(fs.readFileSync(fp, 'utf8'))).map((fp) => path.relative(__dir, fp))
        assert.ok(files.length >= 10, `掃描檔數過少(${files.length}), 範圍可能壞了`)
        assert.deepStrictEqual(hits, [], '測試自設之 route 須以 fallback() 放行, 不得直連')
        // 對照(防空集合): 正則抓得到各違規寫法, 抓不到合規寫法
        for (let bad of ['await route.contin' + 'ue()', 'route.fe' + 'tch()', 'page.request.ge' + 't(u)', 'request.newCon' + 'text()']) {
            assert.ok(re.test(bad), bad)
        }
        for (let good of ['await route.fallback()', 'r.request().url()', 'await fetch' + '(u)']) {
            assert.ok(!re.test(good), good)
        }
    })

    // 鑑別力(對照): 測試自設之啟動替身若以 next() 繞過出口, 其瀏覽器不掛路由, 測試共用層之 isRouted 斷言須判為漏接(而非靜默放行)
    it('繞過啟動出口之啟動被判為漏接', async function() {
        let restore = wpw.setBrowserTypeForTest({ launch: async (o, next) => await next() })
        try {
            await assert.rejects(() => withPage(BLANK, async () => {}), /withPage 啟動之瀏覽器未掛 CDN 本地副本路由\(漏接\)/)
            await assert.rejects(() => requestsOf(BLANK), /requestsOf 啟動之瀏覽器未掛 CDN 本地副本路由\(漏接\)/)
        }
        finally {
            restore()
        }
    })

    // 規格(R14): useCdnGuard 之案後斷言為第二道防線——close() 之錯誤被吞掉時, 違規仍使該案失敗(只有它抓得到); 以子 mocha 行程跑夾具, 對照組(無違規)須通過
    it('useCdnGuard 使吞掉 close() 錯誤之違規仍令該案失敗', async function() {
        this.timeout(180000)
        let dir = path.join(__dir, '_tmp', `cdnLocal-${process.pid}`)
        fs.mkdirSync(dir, { recursive: true })
        let mochaBin = path.join(path.dirname(createRequire(import.meta.url).resolve('mocha/package.json')), 'bin', 'mocha.js')
        let run = (fp) => new Promise((resolve, reject) => {
            let out = ''
            let child = spawn(process.execPath, [mochaBin, fp, '--no-parallel', '--timeout', '120000'], { cwd: path.resolve(__dir, '..'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 150000 })
            child.stdout.setEncoding('utf8')
            child.stderr.setEncoding('utf8')
            child.stdout.on('data', (d) => {
                out += d
            })
            child.stderr.on('data', (d) => {
                out += d
            })
            child.on('error', reject)
            child.on('close', (code) => resolve({ code, out }))
        })
        let mk = (name, page) => {
            let fp = path.join(dir, name)
            let head = `import wpw from 'w-playwright'\nimport { useCdnGuard } from ${JSON.stringify(pathToFileURL(path.join(__dir, 'tools', 'cdn.mjs')).href)}\n`
            fs.writeFileSync(fp, head + `describe('fx', function() {\n    useCdnGuard()\n    it('case', async function() {\n        let b = await wpw.launchChromium()\n        let p = await b.newPage()\n        await p.setContent(${JSON.stringify(page)}, { waitUntil: 'load' })\n        await b.close().catch(() => {})\n    })\n})\n`)
            return fp
        }
        try {
            let bad = await run(mk('fx-bad.test.mjs', '<script src="https://cdn.fixture.invalid/x.js"></script>'))
            assert.strictEqual(bad.code, 1, `有清單外之外部請求應失敗: ${bad.out.slice(-600)}`)
            assert.ok(/"after each" hook/.test(bad.out) && /自標記起有 1 筆未列入 CDN 本地對照表之外部請求: browser https:\/\/cdn\.fixture\.invalid\/x\.js/.test(bad.out), `應為 afterEach 斷言之違規訊息: ${bad.out.slice(-600)}`)
            let ok = await run(mk('fx-ok.test.mjs', '<p>ok</p>'))
            assert.strictEqual(ok.code, 0, `對照組應通過: ${ok.out.slice(-600)}`)
            assert.ok(/1 passing/.test(ok.out))
        }
        finally {
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    // 鑑別力(對照): 清單外之外部請求被中止並記錄, 瀏覽器關閉時拋 E_CDN_EXTERNAL(使測試失敗); 以獨立實例承接, 不污染本檔之違規標記
    //   外部網址用 .invalid(不可解析, 路由於解析前攔截)
    it('清單外之外部請求被中止並使測試失敗', async function() {
        let iso = makeCdn()
        let restore = wpw.setBrowserTypeForTest({ launch: async (o, next) => await iso.routeBrowser(await next()) })
        let browser
        try {
            browser = await wpw.launchChromium()
            assert.ok(iso.isRouted(browser) && !cdn.isRouted(browser), '此瀏覽器只由獨立實例路由')
            let page = await browser.newPage()
            await page.setContent('<!doctype html><html><body><script src="https://cdn.fixture.invalid/x.js"></script>ok</body></html>', { waitUntil: 'load' })
        }
        finally {
            restore()
        }
        let err = await browser.close().then(() => null, (e) => e)
        assert.ok(err && err.code === 'E_CDN_EXTERNAL', '關閉時應拋 E_CDN_EXTERNAL')
        assert.ok(iso.getViolations().length >= 1, '違規應被記錄')
        assert.ok(iso.getViolations().every((v) => /fixture\.invalid/.test(v.url)), '違規之網址應為該外部網址')
        assert.strictEqual(iso.stats().served.browser, 0, '清單外之請求不得被供應')
    })

    // 以下三案需要本地副本(快取已備妥): 取得放在本 describe 之 before, 離線且快取為空時只有這三案不執行(其餘靜態與對照案不受影響)
    describe('需本地副本者', function() {

        useCdnEnsure()

        // 規格(R14): 快取內之檔與清單之 sha256、大小相符(取得時已校驗; 此案自磁碟重算, 為共用函式校驗之獨立核對)
        it('快取已備妥且內容與清單之 sha256、大小相符', function() {
            let st = cdn.stats()
            assert.strictEqual(st.ready, true)
            assert.strictEqual(st.files, keys.length)
            for (let u of keys) {
                let buf = fs.readFileSync(cdn.fileOf(u))
                assert.strictEqual(buf.length, manifest.files[u].size, `大小: ${u}`)
                assert.strictEqual(crypto.createHash('sha256').update(buf).digest('hex'), manifest.files[u].sha256, `sha256: ${u}`)
            }
        })

        // 規格(R14): p2 頁面載入之三個繪圖庫由本地副本供應(供應之網址恰為清單之三個網址; 瀏覽器對同一庫可請求多次, 故比對網址集合而非次數), 且頁面內三個庫皆已就緒; 自標記起無清單外之外部請求(useCdnGuard)
        it('p2 頁面之三個繪圖庫由本地副本供應', async function() {
            let n0 = servedUrls().length
            let r = await withPage(buildP2(treeP2Inp, P2_DEF), async (page) => await page.evaluate(() => {
                let g = window.d3
                return { d3: typeof g, flextree: typeof (g && g.flextree), orgChart: typeof (g && g.OrgChart), done: window.__done }
            }), { waitUntil: 'networkidle', ready: async (page) => await page.waitForFunction('window.__done === true', null, { timeout: 15000 }) })
            assert.deepStrictEqual(r, { d3: 'object', flextree: 'function', orgChart: 'function', done: true })
            assert.deepStrictEqual([...new Set(servedUrls().slice(n0))].sort(), keys, '三個庫皆由本地副本供應, 且只供應清單內之網址')
        })

        // 規格(R14): 單一啟動出口涵蓋全部啟動點(src 之 renderTrimmed、p2 gen, 測試共用層之 withPage、requestsOf 各經出口恰 1 次, 啟動之瀏覽器已掛路由)
        it('每個啟動點皆經單一啟動出口', async function() {
            let n = launchCount()
            await WInfographic(circlesInp, { type: 'circles' }) // src/common/render.mjs 之 renderTrimmed
            assert.strictEqual(launchCount() - n, 1, 'renderTrimmed')
            await WInfographic({ tree: { title: '單一節點' } }, { type: 'hierarchy', mode: 'p2' }) // src/hierarchy/p2/gen.mjs 之 gen(載入三個繪圖庫)
            assert.strictEqual(launchCount() - n, 2, 'p2 gen')
            await withPage(BLANK, async () => {}) // test/tools/lib.mjs 之 withPage(內含 isRouted 斷言)
            assert.strictEqual(launchCount() - n, 3, 'withPage')
            assert.deepStrictEqual(await requestsOf(BLANK), []) // 同上之 requestsOf
            assert.strictEqual(launchCount() - n, 4, 'requestsOf')
        })

    })

})
