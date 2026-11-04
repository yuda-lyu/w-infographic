import assert from 'assert'
import WInfographic from '../src/WInfographic.mjs'
import { buildHtml as buildP1, SELECTOR } from '../src/hierarchy/p1/gen.mjs'
import { buildHtml as buildP2, gen as genP2, waitReady } from '../src/hierarchy/p2/gen.mjs'
import { isPng, assertBaseline, assertTrimmed, withPage, rectsOf, inkMargins } from './tools/lib.mjs'
import { treeBandInp, treeCardInp, treeP2Inp } from './tools/data.mjs'

const P2_OPT = { nodeWidth: 226, width: 680, height: 880, compact: true }

// p2 之頁面就緒: CDN 載畢且引擎繪製完成
const p2Page = { waitUntil: 'networkidle', ready: async (page) => await page.waitForFunction('window.__done === true', null, { timeout: 15000 }) }

// overlaps: 兩矩形有面積重疊
const overlaps = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5

// 規格來源: src/hierarchy/nodeBox.mjs、p1/gen.mjs、p2/gen.mjs 檔頭
describe('hierarchy 層級樹', function() {

    // 規格: children 遞迴巢狀; 子節點依序由左至右, 位於父節點下方
    it('p1 節點結構與上下左右關係', async function() {
        await withPage(buildP1(treeBandInp, 'band'), async (page) => {
            let [lead] = await rectsOf(page, '.lead')
            let boxes = await rectsOf(page, '.gbox')
            assert.ok(lead.text.includes('總經理') && lead.text.includes('營運總部'))
            let kp = {}
            boxes.forEach((b) => {
                kp[b.text.slice(0, 3)] = b
            })
            assert.strictEqual(boxes.length, 5)
            assert.ok(kp['研發部'].top > lead.bottom, '第二層應於根節點下方')
            assert.ok(kp['前端組'].top > kp['研發部'].bottom, '第三層應於父節點下方')
            assert.ok(kp['研發部'].cx < kp['業務部'].cx && kp['業務部'].cx < kp['行政部'].cx, '兄弟應依序由左至右')
            assert.ok(kp['前端組'].cx < kp['研發部'].cx && kp['後端組'].cx > kp['研發部'].cx, '子節點應置中於父節點下')
        })
    })

    // 規格: 色帶版式 items(條列子項, 先於 desc)、desc、cls; 僅標題之節點不留底部白條; cls 未給或查無(含物件原型成員名如 toString)視為 gray
    it('p1 色帶版式之欄位', async function() {
        let inp = { tree: { title: 'r', children: [{ title: 'A', items: ['i1', 'i2'], desc: 'd', cls: 'blue' }, { title: 'B' }, { title: 'C', cls: 'x" onclick="y' }, { title: 'D', cls: 'toString' }] } }
        await withPage(buildP1(inp, 'band'), async (page) => {
            let r = await page.evaluate(() => {
                let bs = [...document.querySelectorAll('.gbox')]
                return {
                    cls: bs.map((b) => b.className),
                    order: [...bs[0].children].map((c) => c.className),
                    li: [...bs[0].querySelectorAll('.gitems li')].map((v) => v.textContent),
                    pad: bs.map((b) => getComputedStyle(b).paddingBottom),
                    onclick: bs[2].getAttribute('onclick'),
                }
            })
            assert.deepStrictEqual(r.cls, ['gbox g-blue', 'gbox g-gray', 'gbox g-gray', 'gbox g-gray'])
            assert.deepStrictEqual(r.order, ['gt', 'gitems', 'gd'])
            assert.deepStrictEqual(r.li, ['i1', 'i2'])
            assert.deepStrictEqual(r.pad, ['12px', '0px', '0px', '0px'])
            assert.strictEqual(r.onclick, null)
        })
    })

    // 規格: items 為條列子項, 每項前置色點, 逐行呈現; 連接線只屬於樹之骨架, 不得出現於節點盒內
    it('p1 條列子項逐行呈現, 盒內無連接線', async function() {
        let inp = { tree: { title: 'r', children: [{ title: 'A', items: ['i1', 'i2', 'i3'], cls: 'blue' }] } }
        await withPage(buildP1(inp, 'band'), async (page) => {
            let lis = await rectsOf(page, '.gitems li')
            let r = await page.evaluate(() => {
                let ul = document.querySelector('.gitems')
                let li = ul.querySelector('li')
                let cs = getComputedStyle(li, '::after')
                let cb = getComputedStyle(li, '::before')
                return { display: getComputedStyle(ul).display, afterContent: cs.content, beforeBorder: cb.borderTopWidth, beforeW: cb.width, liPadTop: getComputedStyle(li).paddingTop }
            })
            assert.strictEqual(lis.length, 3)
            assert.ok(lis[0].bottom <= lis[1].top + 0.5 && lis[1].bottom <= lis[2].top + 0.5, '子項應由上而下逐行')
            assert.ok(Math.abs(lis[0].left - lis[1].left) < 0.5, '子項應靠同一左緣')
            assert.notStrictEqual(r.display, 'flex', '條列不得套用樹骨架之 flex')
            assert.strictEqual(r.afterContent, 'none', '子項不得有連接線偽元素')
            assert.strictEqual(r.beforeBorder, '0px', '色點不得帶連接線之框線')
            assert.strictEqual(r.beforeW, '5px', '色點應為 5px')
            assert.strictEqual(r.liPadTop, '0px', '子項不得套用樹節點之上內距')
        })
    })

    // 規格: 卡片版式左上編號依兄弟序自動產生; 兄弟等高; icon 為右上圓章
    it('p1 卡片版式', async function() {
        await withPage(buildP1(treeCardInp, 'card'), async (page) => {
            let cards = await rectsOf(page, '.gcard')
            let nums = await page.evaluate(() => [...document.querySelectorAll('.cnum')].map((v) => v.textContent))
            let icons = await page.evaluate(() => document.querySelectorAll('.cicon svg').length)
            assert.deepStrictEqual(nums, ['01', '02', '03', '04'])
            assert.strictEqual(icons, 4)
            assert.ok(new Set(cards.map((c) => Math.round(c.height))).size === 1, '兄弟卡片應等高')
        })
    })

    // 規格: 文字逃逸不成為 HTML(不產生標籤、不解碼字元參照), 顯示之文字與輸入逐字相同
    it('文字逃逸', async function() {
        let inp = { tree: { title: '<i>r</i>', subtitle: '<u>s</u>', children: [{ title: '<b>A</b>', desc: '<b>d</b>&lt;', items: ['<b>i</b>'] }] } }
        await withPage(buildP1(inp, 'band'), async (page) => {
            let r = await page.evaluate(() => ({
                tags: document.querySelectorAll('.wrap b, .wrap i, .wrap u').length,
                texts: ['.lead .lt', '.lead .ls', '.gtt', '.gd', '.gitems li'].map((s) => document.querySelector(s).textContent),
            }))
            assert.strictEqual(r.tags, 0)
            assert.deepStrictEqual(r.texts, ['<i>r</i>', '<u>s</u>', '<b>A</b>', '<b>d</b>&lt;', '<b>i</b>'])
        })
    })

    // 規格: p2 自動 fit 進固定畫布; 節點不重疊; 估算之節點高足以容納內容(不遭裁切); compact 收摺省寬
    it('p2 節點不重疊、內容不遭裁切、compact 較窄', async function() {
        let measure = async (opt) => await withPage(buildP2(treeP2Inp, opt), async (page) => {
            let boxes = await rectsOf(page, '.gbox')
            let clipped = await page.evaluate(() => [...document.querySelectorAll('.gbox')].filter((b) => {
                let fo = b.closest('foreignObject')
                return b.scrollHeight > Number(fo.getAttribute('height'))
            }).length)
            return { boxes, clipped }
        }, p2Page)
        let compact = await measure(P2_OPT)
        let wide = await measure({ nodeWidth: 196, width: 1300, height: 640, compact: false })
        for (let r of [compact, wide]) {
            assert.strictEqual(r.boxes.length, 7)
            assert.strictEqual(r.clipped, 0, '節點內容遭裁切')
            for (let i = 0; i < r.boxes.length; i++) {
                for (let j = i + 1; j < r.boxes.length; j++) {
                    assert.ok(!overlaps(r.boxes[i], r.boxes[j]), `節點 ${i}、${j} 重疊`)
                }
            }
        }
        let cols = (r) => new Set(r.boxes.map((b) => Math.round(b.cx / 5))).size
        assert.ok(cols(compact) < cols(wide), `compact 欄數 ${cols(compact)} 應少於一般 ${cols(wide)}`)
    })

    // 規格: p2 成品裁去畫布留白後四邊補回等寬白邊(24 像素)
    it('p2 成品四邊留白一致', async function() {
        let buf = await WInfographic(treeP2Inp, { type: 'hierarchy', mode: 'p2', ...P2_OPT })
        let m = inkMargins(buf)
        for (let k of ['left', 'right', 'top', 'bottom']) {
            assert.ok(m[k] >= 24 && m[k] <= 32, `${k} 留白 ${m[k]}`)
        }
        // 預期畫面: 深色根節點「門市營運」, 七個子節點收摺為兩欄, 各節點含圖示、標題與條列(或說明)
        assertBaseline(buf, 'hierarchy-p2-compact')
    })

    // 預期畫面: 根節點「總經理/營運總部」, 第二層三盒(研發、業務、行政), 研發部下有前端、後端兩盒; 灰色連接線相連; 行政部僅色帶
    it('p1 色帶版式之成品與標準圖', async function() {
        let buf = await WInfographic(treeBandInp, { type: 'hierarchy' })
        await assertTrimmed(buf, buildP1(treeBandInp, 'band'), SELECTOR)
        assertBaseline(buf, 'hierarchy-p1-band')
    })

    // 預期畫面: 根節點橫幅含圖示「品質構面/四項」, 四張等高白卡, 頂部色條、左上編號 01～04、右上圓章
    it('p1 卡片版式之成品與標準圖', async function() {
        let buf = await WInfographic(treeCardInp, { type: 'hierarchy', boxStyle: 'card' })
        assertBaseline(buf, 'hierarchy-p1-card')
    })

    // 規格: p2 由 jsDelivr 載入繪圖庫; 無法載入時拋明確錯誤(指出缺哪個庫與來源), 不得無聲產出空白圖, 失敗後瀏覽器已關閉
    it('p2 無法載入繪圖庫時拋明確錯誤並關閉瀏覽器', async function() {
        let defOpt = { nodeWidth: 196, width: 1300, height: 640, compact: false }
        let run = async (handler) => {
            let browser
            let err = await genP2(treeP2Inp, defOpt, {
                onPage: async (page) => {
                    browser = page.context().browser()
                    await page.route(/cdn\.jsdelivr\.net/, handler)
                },
            }).then(() => null, (e) => e)
            assert.ok(err instanceof Error, '應拋錯而非產出圖')
            assert.strictEqual(browser.isConnected(), false, '失敗後應關閉瀏覽器')
            return err.message
        }
        // 全部無法連線(離線、DNS 失敗、被阻擋)
        let all = await run((r) => r.abort())
        assert.ok(all.includes('無法載入繪圖庫 d3、d3-flextree、d3-org-chart') && all.includes('jsDelivr'), all)
        // 單一繪圖庫失敗(CDN 回應錯誤或被阻擋): 只指出缺者
        let org = await run((r) => (r.request().url().includes('d3-org-chart') ? r.abort() : r.continue()))
        assert.ok(org.includes('無法載入繪圖庫 d3-org-chart(') && !org.includes('d3-flextree'), org)
        let flex = await run((r) => (r.request().url().includes('d3-flextree') ? r.fulfill({ status: 404, body: 'not found' }) : r.continue()))
        assert.ok(flex.includes('d3-flextree') && !flex.includes('d3、'), flex)
    })

    // 規格: p2 引擎未於限時內完成繪製即拋錯; 逾時值須實際套用於等待(page.waitForFunction 之逾時為第三參數, 置於第二參數不生效而用預設 30 秒)
    it('p2 等待繪製完成之逾時值生效', async function() {
        // 繪圖庫已載入但引擎未完成繪製(window.__done 不為 true)之頁面
        await withPage('<!doctype html><html><body></body></html>', async (page) => {
            await page.evaluate(() => {
                window.d3 = { flextree: () => 0, OrgChart: () => 0 }
            })
            await assert.rejects(() => waitReady(page, 1200), /Timeout 1200ms/)
        })
    })

    // 規格: 層級樹資料以 JSON 嵌入頁面腳本; 圖示之 raw SVG 內含 </script> 時不得提早結束腳本而使頁面失效
    it('p2 圖示內含 </script> 不破壞頁面', async function() {
        let icon = '<svg viewBox="0 0 24 24"><title>a</script><b>x</b></title><rect width="24" height="24"/></svg>'
        let inp = { tree: { title: 'r', children: [{ title: 'A', icon }] } }
        await withPage(buildP2(inp, { nodeWidth: 196, width: 1300, height: 640, compact: false }), async (page) => {
            let boxes = await rectsOf(page, '.gbox')
            assert.strictEqual(boxes.length, 1)
        }, p2Page)
    })

    // 規格: 層級樹僅根節點(無 children)亦可出圖, p2 成品四邊留白一致
    it('p2 僅根節點可出圖', async function() {
        let buf = await WInfographic({ tree: { title: '單一節點' } }, { type: 'hierarchy', mode: 'p2' })
        assert.ok(isPng(buf))
        let m = inkMargins(buf)
        for (let k of ['left', 'right', 'top', 'bottom']) {
            assert.ok(m[k] >= 24 && m[k] <= 32, `${k} 留白 ${m[k]}`)
        }
    })

})
