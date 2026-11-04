import assert from 'assert'
import WInfographic from '../src/WInfographic.mjs'
import { buildHtml, SELECTOR } from '../src/hexagon/gen.mjs'
import { assertBaseline, assertTrimmed, withPage, rectsOf } from './tools/lib.mjs'
import { hexagonInp, hexagonRightInp } from './tools/data.mjs'

const ROW_H = 1.5 * 125 * 1.07 // 鏈一列之垂直距

// 規格來源: src/hexagon/gen.mjs 檔頭
describe('hexagon 六邊形資訊圖', function() {

    // 規格: 全未指定 side 時, 前 ceil(n/2) 項為左欄、其餘為右欄, 各欄由上而下
    it('預設左右欄分派與項目順序', async function() {
        let inp = { center: { title: 'a' }, items: [1, 2, 3, 4, 5].map((v) => ({ label: `L${v}` })) }
        await withPage(buildHtml(inp), async (page) => {
            let [center] = await rectsOf(page, '.center')
            let hx = await rectsOf(page, '.hx')
            let sides = await rectsOf(page, '.side')
            assert.strictEqual(hx.length, 5)
            for (let i of [0, 1, 2]) {
                assert.ok(hx[i].cx < center.cx, `第 ${i} 項應於左欄`)
                assert.ok(sides[i].text.includes(`L${i + 1}`))
            }
            for (let i of [3, 4]) {
                assert.ok(hx[i].cx > center.cx, `第 ${i} 項應於右欄`)
            }
            assert.ok(hx[0].cy < hx[1].cy && hx[1].cy < hx[2].cy, '左欄應由上而下')
            assert.ok(hx[3].cy < hx[4].cy, '右欄應由上而下')
        })
    })

    // 規格: 任一項有指定 side 時未標者視為 left
    it('side 指定欄位, 未標者視為 left', async function() {
        let inp = { center: { title: 'a' }, items: [{ label: 'A', side: 'right' }, { label: 'B' }, { label: 'C', side: 'left' }] }
        await withPage(buildHtml(inp), async (page) => {
            let [center] = await rectsOf(page, '.center')
            let hx = await rectsOf(page, '.hx')
            let ttl = await rectsOf(page, '.ttl')
            let kp = {}
            ttl.forEach((t) => {
                kp[t.text] = t
            })
            assert.ok(kp.A.cx > center.cx)
            assert.ok(kp.B.cx < center.cx)
            assert.ok(kp.C.cx < center.cx)
            assert.strictEqual(hx.length, 3)
        })
    })

    // 規格: 槽位幾何恆定, 項數只改變佔用哪些槽; 左欄啟用序 中→中上→中下→頂→底, 右欄 中→中下→中上→底→頂
    it('槽位依啟用順序佔用, 兩側鏡像', async function() {
        let dyOf = async (items) => await withPage(buildHtml({ center: { title: 'a' }, items }), async (page) => {
            let [center] = await rectsOf(page, '.center')
            let hx = await rectsOf(page, '.hx')
            return hx.map((h) => Math.round((h.cy - center.cy) / ROW_H))
        })
        let mk = (n, side) => Array.from({ length: n }, (_, i) => ({ label: `L${i}`, side }))
        assert.deepStrictEqual(await dyOf(mk(1, 'left')), [0])
        assert.deepStrictEqual(await dyOf(mk(2, 'left')), [-1, 0])
        assert.deepStrictEqual(await dyOf(mk(3, 'left')), [-1, 0, 1])
        assert.deepStrictEqual(await dyOf(mk(4, 'left')), [-2, -1, 0, 1])
        assert.deepStrictEqual(await dyOf(mk(5, 'left')), [-2, -1, 0, 1, 2])
        assert.deepStrictEqual(await dyOf(mk(2, 'right')), [0, 1])
        assert.deepStrictEqual(await dyOf(mk(4, 'right')), [-1, 0, 1, 2])
    })

    // 規格: 外側文字置於各形外側; 六邊形與中心圓徽章不重疊; 10 項為上限且可繪
    it('10 項時外側文字與形之相對位置, 形不壓中心圓', async function() {
        let inp = { center: { title: 'a' }, items: Array.from({ length: 10 }, (_, i) => ({ label: `L${i}`, notes: ['要點'] })) }
        await withPage(buildHtml(inp), async (page) => {
            let [center] = await rectsOf(page, '.center')
            let hx = await rectsOf(page, '.hx .hex')
            let sides = await rectsOf(page, '.side')
            assert.strictEqual(hx.length, 10)
            hx.forEach((h, i) => {
                if (i < 5) {
                    assert.ok(sides[i].right <= h.left, `第 ${i} 項文字應於左外側`)
                }
                else {
                    assert.ok(sides[i].left >= h.right, `第 ${i} 項文字應於右外側`)
                }
                let dist = Math.hypot(h.cx - center.cx, h.cy - center.cy)
                assert.ok(dist >= center.width / 2 + 125 * Math.sqrt(3) / 2, `第 ${i} 項壓到中心圓, 距離 ${dist}`)
            })
        })
    })

    // 規格: 配色固定為左右欄兩主色系, 標題取線框漸變之下色, 不看 cls
    it('標題配色依欄位, 不受 cls 影響', async function() {
        let inp = { center: { title: 'a' }, items: [{ label: 'A', cls: '#ff0000' }, { label: 'B', cls: 'red' }] }
        await withPage(buildHtml(inp), async (page) => {
            let colors = await page.evaluate(() => [...document.querySelectorAll('.ttl')].map((el) => getComputedStyle(el).color))
            assert.deepStrictEqual(colors, ['rgb(0, 122, 144)', 'rgb(13, 63, 99)'])
        })
    })

    // 規格: 文字逃逸不成為 HTML; 要點每則冠項目符號
    it('文字逃逸與要點項目符號', async function() {
        let inp = { center: { title: '<i>a</i>' }, items: [{ label: '<b>L</b>', notes: ['<u>n</u>'] }] }
        await withPage(buildHtml(inp), async (page) => {
            let r = await page.evaluate(() => ({
                tags: document.querySelectorAll('.wrap b, .wrap i, .wrap u').length,
                nt: document.querySelector('.nt').textContent,
            }))
            assert.strictEqual(r.tags, 0)
            assert.strictEqual(r.nt, '•<u>n</u>')
        })
    })

    // 預期畫面: 中心圓徽章「客戶服務」; 左 3 右 3 六邊形立體白卡, 內置圖示; 外側為標題與要點; 左欄青系、右欄藍系線框
    it('預設分派之成品與標準圖', async function() {
        let buf = await WInfographic(hexagonInp, { type: 'hexagon' })
        await assertTrimmed(buf, buildHtml(hexagonInp), SELECTOR)
        assertBaseline(buf, 'hexagon-default')
    })

    // 預期畫面: 中心圓徽章居左, 右欄 3 項(中上、中、中下)與外側文字, 左側無項目
    it('單欄之成品與標準圖', async function() {
        let buf = await WInfographic(hexagonRightInp, { type: 'hexagon' })
        assertBaseline(buf, 'hexagon-right')
    })

})
