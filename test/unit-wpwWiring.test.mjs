import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import wpw from 'w-playwright'
import WInfographic from '../src/WInfographic.mjs'
import { isPng } from './tools/lib.mjs'
import { circlesInp, hexagonInp, treeBandInp, treeP2Inp } from './tools/data.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const DIR_ROOT = path.resolve(__dir, '..')
const GUARD = 'AutofillAiWalletPrivatePasses' // w-playwright 一律加入之守門功能(停用後 Chromium 不再於每次啟動呼叫登入驗證)

// 規格來源: 規則帳本 R13(Chromium 系之啟動一律經 w-playwright)與 w-playwright 之 README〈Core〉守門參數
describe('Chromium 啟動經 w-playwright', function() {

    // checkGuard: 合併後之選項須恰有一個 --disable-features, 為 args 最後一個元素, 且含守門功能
    let checkGuard = (o, msg) => {
        let args = o.args
        assert.ok(Array.isArray(args), `${msg}: args 須為陣列`)
        let ds = args.filter((a) => /^--disable-features=/i.test(a))
        assert.strictEqual(ds.length, 1, `${msg}: 命令列須恰有一個 --disable-features`)
        assert.strictEqual(args[args.length - 1], ds[0], `${msg}: --disable-features 須為 args 最後一個元素`)
        assert.ok(ds[0].split('=')[1].split(',').includes(GUARD), `${msg}: 須含守門功能 ${GUARD}`)
    }

    // 對照(防空過): checkGuard 對未含守門、兩串、守門非最後一個元素、無 args 之選項皆須判定不符
    it('checkGuard 對不符之選項判定失敗', function() {
        checkGuard({ args: ['--a', `--disable-features=Translate,${GUARD}`] }, 'ok')
        assert.throws(() => checkGuard({}, 'x'), /args 須為陣列/)
        assert.throws(() => checkGuard({ args: ['--disable-features=Translate'] }, 'x'), /守門功能/)
        assert.throws(() => checkGuard({ args: [`--disable-features=${GUARD}`, '--disable-features=Translate'] }, 'x'), /恰有一個/)
        assert.throws(() => checkGuard({ args: [`--disable-features=${GUARD}`, '--a'] }, 'x'), /最後一個元素/)
    })

    // 規格: 渲染啟動點 renderTrimmed(src/common/render.mjs, circles、hexagon、hierarchy p1 共用)送出之選項含守門; 以 next() 走真路徑(headless shell, 不啟動真 Chrome)
    it('circles、hexagon、hierarchy p1 之啟動送出含守門之選項(替身確被呼叫)', async function() {
        let cases = [
            { name: 'circles', inp: circlesInp, opt: { type: 'circles' } },
            { name: 'hexagon', inp: hexagonInp, opt: { type: 'hexagon' } },
            { name: 'hierarchy p1', inp: treeBandInp, opt: { type: 'hierarchy', mode: 'p1' } },
        ]
        for (let c of cases) {
            let seen = []
            let restore = wpw.setBrowserTypeForTest({
                launch: async (o, next) => {
                    seen.push(o)
                    return await next()
                },
            })
            try {
                let buf = await WInfographic(c.inp, c.opt)
                assert.ok(isPng(buf), `${c.name}: 須產出 PNG`)
            }
            finally {
                restore()
            }
            assert.strictEqual(seen.length, 1, `${c.name}: 須經 w-playwright 啟動恰 1 次`)
            checkGuard(seen[0], c.name)
            assert.notStrictEqual(seen[0].headless, false, `${c.name}: 須維持無頭`)
            assert.strictEqual(seen[0].channel, undefined, `${c.name}: 須維持未給通道(headless shell)`)
        }
    })

    // 規格: p2 啟動點(src/hierarchy/p2/gen.mjs)送出含守門之選項; 替身於啟動時拋錯, 不需網路、不啟動瀏覽器
    it('hierarchy p2 之啟動送出含守門之選項(替身確被呼叫)', async function() {
        let seen = []
        let restore = wpw.setBrowserTypeForTest({
            launch: async (o) => {
                seen.push(o)
                throw new Error('stub launch')
            },
        })
        try {
            await assert.rejects(() => WInfographic(treeP2Inp, { type: 'hierarchy', mode: 'p2' }))
        }
        finally {
            restore()
        }
        assert.strictEqual(seen.length, 1, 'p2: 須經 w-playwright 啟動恰 1 次')
        checkGuard(seen[0], 'p2')
        assert.notStrictEqual(seen[0].headless, false, 'p2: 須維持無頭')
        assert.strictEqual(seen[0].channel, undefined, 'p2: 須維持未給通道(headless shell)')
    })

    // 規格: 測試共用層 test/tools/lib.mjs 之 withPage、requestsOf 亦經 w-playwright(測試不得繞過守門啟動瀏覽器)
    it('測試共用層 withPage、requestsOf 之啟動送出含守門之選項', async function() {
        let { withPage, requestsOf } = await import('./tools/lib.mjs')
        let seen = []
        let restore = wpw.setBrowserTypeForTest({
            launch: async (o, next) => {
                seen.push(o)
                return await next()
            },
        })
        try {
            await withPage('<!doctype html><html><body>ok</body></html>', async () => {})
            assert.deepStrictEqual(await requestsOf('<!doctype html><html><body>ok</body></html>'), [])
        }
        finally {
            restore()
        }
        assert.strictEqual(seen.length, 2, 'withPage、requestsOf 各須經 w-playwright 啟動 1 次')
        seen.forEach((o, i) => checkGuard(o, `lib ${i}`))
    })

    // 規格(R-PW-ONLY): src、test、toolg 不得直接匯入 playwright、playwright-core(靜態、動態、require 皆算); package.json 不得宣告兩者, 須宣告 w-playwright
    it('不直接依賴 playwright、playwright-core', function() {
        // 與 w-playwright 規則帳本 R-PW-ONLY 之盤點正則相同
        let re = /(from\s+|import\(\s*|require\(\s*)['"`]playwright(-core)?['"`/]/
        let walk = (dir) => {
            let r = []
            for (let ent of fs.readdirSync(dir, { withFileTypes: true })) {
                let fp = path.join(dir, ent.name)
                if (ent.isDirectory()) {
                    if (!['node_modules', 'dist', '_tmp', 'pics'].includes(ent.name)) {
                        r.push(...walk(fp))
                    }
                }
                else if (/\.(mjs|js)$/.test(ent.name)) {
                    r.push(fp)
                }
            }
            return r
        }
        let files = ['src', 'test', 'toolg'].flatMap((d) => walk(path.join(DIR_ROOT, d)))
        assert.ok(files.length >= 20, `掃描檔數過少(${files.length}), 範圍可能壞了`)
        let hits = files.filter((fp) => re.test(fs.readFileSync(fp, 'utf8'))).map((fp) => path.relative(DIR_ROOT, fp))
        assert.deepStrictEqual(hits, [], '不得直接匯入 playwright、playwright-core')
        // 對照: 正則能抓到違規寫法(防空集合); 範例字串以拼接組成, 避免本檔自己被上面的盤點命中
        let q = '\''
        assert.ok(re.test(['import { chromium } ', 'from ', q, 'playwright', q].join('')))
        assert.ok(re.test(['await import', '("playwright-core")'].join('')))
        assert.ok(re.test(['require', '(`playwright/lib/x`)'].join('')))
        assert.ok(!re.test(['import wpw ', 'from ', q, 'w-playwright', q].join('')))

        let pkg = JSON.parse(fs.readFileSync(path.join(DIR_ROOT, 'package.json'), 'utf8'))
        for (let k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
            assert.strictEqual(pkg[k] && pkg[k].playwright, undefined, `${k} 不得宣告 playwright`)
            assert.strictEqual(pkg[k] && pkg[k]['playwright-core'], undefined, `${k} 不得宣告 playwright-core`)
        }
        assert.ok(/^\^1\.0\.1$/.test(pkg.dependencies['w-playwright']), 'dependencies 須宣告 w-playwright ^1.0.1')
    })

    // 規格: 建置時 w-playwright 須外部化(不打包進 dist, 否則使用端可解析 playwright-core 之精確釘版被繞開)
    it('toolg/gDistRollup.mjs 之 external、globals 為 w-playwright 而非 playwright', function() {
        let s = fs.readFileSync(path.join(DIR_ROOT, 'toolg', 'gDistRollup.mjs'), 'utf8')
        assert.ok(/'w-playwright': 'w-playwright'/.test(s), 'globals 須含 w-playwright')
        assert.ok(/^\s*'w-playwright',(\s|\/\/|$)/m.test(s), 'external 須含 w-playwright')
        assert.ok(!/'playwright'/.test(s), '不得再列 playwright')
    })

})
