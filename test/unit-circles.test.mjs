import assert from 'assert'
import WInfographic from '../src/WInfographic.mjs'
import { buildHtml, SELECTOR } from '../src/circles/gen.mjs'
import { PALETTE } from '../src/common/palette.mjs'
import { assertBaseline, assertTrimmed, withPage, rectsOf } from './tools/lib.mjs'
import { rawIcon, circlesInp } from './tools/data.mjs'

const R = 276 // 佈局半徑 = 中心圓半徑 150 + 間距 26 + 外圓半徑 100

// 規格來源: src/circles/gen.mjs 檔頭
describe('circles 圓形放射圖', function() {

    // 規格: 環形均布; startAngle 為首個外圓之角度, 順時針遞增
    it('外圓依 startAngle 起順時針均布於環上', async function() {
        await withPage(buildHtml(circlesInp, -45), async (page) => {
            let [center] = await rectsOf(page, '.center')
            let items = await rectsOf(page, '.item')
            assert.strictEqual(items.length, 4)
            items.forEach((it, i) => {
                let dx = it.cx - center.cx
                let dy = it.cy - center.cy
                assert.ok(Math.abs(Math.hypot(dx, dy) - R) < 0.5, `第 ${i} 項距中心 ${Math.hypot(dx, dy)}`)
                let deg = Math.atan2(dy, dx) * 180 / Math.PI
                let expected = -45 + 90 * i
                let delta = ((deg - expected) % 360 + 540) % 360 - 180
                assert.ok(Math.abs(delta) < 0.5, `第 ${i} 項角度 ${deg}, 應為 ${expected}`)
            })
        })
    })

    // 規格: 外圓間虛線環
    it('虛線環以佈局半徑繪於底層', async function() {
        await withPage(buildHtml(circlesInp, -90), async (page) => {
            let ring = await page.evaluate(() => {
                let c = document.querySelector('.ring circle')
                return { r: c.getAttribute('r'), dash: c.getAttribute('stroke-dasharray') }
            })
            assert.strictEqual(ring.r, String(R))
            assert.ok(ring.dash, '應為虛線')
        })
    })

    // 規格: notes 依外圓於畫布左/右半自動置於外側
    it('要點置於外圓之外側', async function() {
        await withPage(buildHtml(circlesInp, -45), async (page) => {
            let [center] = await rectsOf(page, '.center')
            let items = await rectsOf(page, '.item')
            let notes = await rectsOf(page, '.notes')
            assert.strictEqual(notes.length, 4)
            notes.forEach((nt, i) => {
                if (items[i].cx >= center.cx) {
                    assert.ok(nt.left >= items[i].right, `第 ${i} 項應於右外側`)
                }
                else {
                    assert.ok(nt.right <= items[i].left, `第 ${i} 項應於左外側`)
                }
            })
            assert.ok(notes[0].text.includes('訪談與分析'))
        })
    })

    // 規格: title 與 label 支援 \n 換行; 文字逃逸不成為 HTML
    it('換行與文字逃逸', async function() {
        let inp = { center: { title: '甲\n乙' }, items: [{ label: '丙<b>丁</b>\n戊' }, { label: '&己' }] }
        await withPage(buildHtml(inp, -90), async (page) => {
            let r = await page.evaluate(() => ({
                ctitBr: document.querySelectorAll('.ctit br').length,
                labBr: document.querySelectorAll('.clab br').length,
                b: document.querySelectorAll('.clab b').length,
                lab0: document.querySelectorAll('.clab')[0].textContent,
                lab1: document.querySelectorAll('.clab')[1].textContent,
            }))
            assert.strictEqual(r.ctitBr, 1)
            assert.strictEqual(r.labBr, 1)
            assert.strictEqual(r.b, 0)
            assert.strictEqual(r.lab0, '丙<b>丁</b>戊')
            assert.strictEqual(r.lab1, '&己')
        })
    })

    // 規格: icon 為 '<svg' raw SVG 或 'mdi:名稱', 其餘與查無名稱者顯示 ? 不靜默
    it('圖示之各種給法', async function() {
        let inp = { center: { title: 'a' }, items: [{ label: '1', icon: rawIcon('#123456') }, { label: '2', icon: 'mdi:wrench' }, { label: '3', icon: 'mdi:no-such-icon' }, { label: '4', icon: '🧪' }, { label: '5' }] }
        await withPage(buildHtml(inp, -90), async (page) => {
            let r = await page.evaluate(() => [...document.querySelectorAll('.inner')].map((el) => {
                let ico = el.querySelector('.cico')
                return ico ? { html: ico.innerHTML, txt: ico.textContent } : null
            }))
            assert.ok(r[0].html.includes('#123456'))
            assert.ok(r[1].html.includes('<path'))
            assert.strictEqual(r[2].txt, '?')
            assert.strictEqual(r[3].txt, '?')
            assert.strictEqual(r[4], null)
        })
    })

    // 規格: cls 為色票鍵或 #rrggbb, 未給依序循環取色; 查無之 cls(含物件原型成員名如 constructor)視同未給, 不得取得非色票之值
    it('外圓配色', async function() {
        let keys = Object.keys(PALETTE)
        let inp = {
            center: { title: 'a' },
            items: [
                { label: '1', cls: '#123456' }, { label: '2', cls: 'red' }, { label: '3' }, { label: '4', cls: 'red;}body{display:none' },
                { label: '5', cls: 'constructor' }, { label: '6', cls: '__proto__' }, { label: '7', cls: 'toString' },
            ],
        }
        await withPage(buildHtml(inp, -90), async (page) => {
            let cs = await page.evaluate(() => [...document.querySelectorAll('.item')].map((el) => el.style.getPropertyValue('--c')))
            assert.deepStrictEqual(cs, ['#123456', PALETTE.red, PALETTE[keys[2]], PALETTE[keys[3]], PALETTE[keys[4]], PALETTE[keys[5]], PALETTE[keys[6]]])
        })
    })

    // 規格: 成品依內容視覺邊界裁切, 四邊留白寬度一致
    // 預期畫面: 中心深色圓「產品開發」, 四外圓分列斜角, 色環依 cls, 外側各有要點, 外圓間有虛線弧段
    it('產出成品與標準圖', async function() {
        let buf = await WInfographic(circlesInp, { type: 'circles', startAngle: -45 })
        await assertTrimmed(buf, buildHtml(circlesInp, -45), SELECTOR)
        assertBaseline(buf, 'circles')
    })

})
