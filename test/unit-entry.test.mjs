import assert from 'assert'
import WInfographic from '../src/WInfographic.mjs'
import { buildHtml as buildCircles } from '../src/circles/gen.mjs'
import { buildHtml as buildHexagon } from '../src/hexagon/gen.mjs'
import { buildHtml as buildP1 } from '../src/hierarchy/p1/gen.mjs'
import { isPng, pixelDiff, requestsOf, MAX_DIFF } from './tools/lib.mjs'
import { circlesInp, hexagonInp, treeBandInp, treeCardInp } from './tools/data.mjs'

// 規格來源: src/WInfographic.mjs 之 JSDoc
describe('WInfographic 入口', function() {

    // 規格: opt.type 必給, 可選 circles、hexagon、hierarchy
    it('opt.type 未給或非可選值時拋錯', async function() {
        await assert.rejects(() => WInfographic(circlesInp), /invalid opt\.type/)
        await assert.rejects(() => WInfographic(circlesInp, { type: 'pie' }), /invalid opt\.type/)
        await assert.rejects(() => WInfographic(circlesInp, null), /invalid opt\.type/)
    })

    // 規格: inp 依 opt.type 為 { center, items } 或 { tree }
    it('inp 不合格式時拋錯', async function() {
        for (let type of ['circles', 'hexagon', 'hierarchy']) {
            await assert.rejects(() => WInfographic(null, { type }), /invalid inp/)
            await assert.rejects(() => WInfographic({}, { type }), /invalid inp/)
        }
        await assert.rejects(() => WInfographic({ center: { title: 'a' }, items: [] }, { type: 'circles' }), /invalid inp\.items/)
        await assert.rejects(() => WInfographic({ center: {}, items: [{ label: 'a' }] }, { type: 'hexagon' }), /invalid inp\.center/)
        await assert.rejects(() => WInfographic({ center: { title: 'a' }, items: [{}] }, { type: 'circles' }), /invalid inp\.items/)
        await assert.rejects(() => WInfographic({ tree: { title: 'a', children: [{}] } }, { type: 'hierarchy' }), /invalid inp\.tree/)
        await assert.rejects(() => WInfographic({ tree: { title: 'a', children: 'x' } }, { type: 'hierarchy' }), /invalid inp\.tree/)
    })

    // 規格: 項目之 notes、節點之 items 為陣列(可省略); 非陣列者拋明確錯誤(非內部 TypeError), 訊息不回顯輸入值(dspec K9); 省略、null、空字串、空陣列皆可
    it('notes、items 非陣列時拋明確錯誤', async function() {
        let notOk = ['abc', 5, { a: 1 }]
        for (let type of ['circles', 'hexagon']) {
            for (let notes of notOk) {
                await assert.rejects(() => WInfographic({ center: { title: 'a' }, items: [{ label: 'x', notes }] }, { type }), /invalid inp\.items, notes 須為陣列/)
            }
        }
        for (let items of notOk) {
            await assert.rejects(() => WInfographic({ tree: { title: 'a', children: [{ title: 'b', items }] } }, { type: 'hierarchy' }), /invalid inp\.tree, items 須為陣列/)
        }
        await assert.rejects(() => WInfographic({ center: { title: 'a' }, items: [{ label: 'x', notes: 'SECRET' }] }, { type: 'circles' }), (e) => !/SECRET/.test(e.message))
        for (let notes of [null, '', []]) {
            assert.ok(isPng(await WInfographic({ center: { title: 'a' }, items: [{ label: 'x', notes }] }, { type: 'circles' })))
        }
    })

    // 規格: 每側至多 5 項, 總計至多 10 項, 超出拋錯
    it('hexagon 單側超過 5 項時拋錯', async function() {
        let items = [1, 2, 3, 4, 5, 6].map((v) => ({ label: `L${v}`, side: 'right' }))
        await assert.rejects(() => WInfographic({ center: { title: 'a' }, items }, { type: 'hexagon' }), /每側至多 5 項/)
    })

    // 規格: resolve 回傳 PNG 圖之 Buffer; 呼叫端之數據不被改動
    it('回傳 PNG Buffer 且不改動 inp', async function() {
        for (let [inp, type] of [[circlesInp, 'circles'], [hexagonInp, 'hexagon'], [treeBandInp, 'hierarchy']]) {
            let snap = JSON.stringify(inp)
            let buf = await WInfographic(inp, { type })
            assert.ok(isPng(buf), `${type} 非 PNG`)
            assert.strictEqual(JSON.stringify(inp), snap, `${type} 改動了 inp`)
        }
    })

    // 規格: opt.startAngle 預設 -90; opt 非預期之輸入視為未給, 改用預設(dspec 輸入參數之檢測機制 K3)
    it('startAngle 預設 -90, 非預期值改用預設, 數字字串可用', async function() {
        let def = await WInfographic(circlesInp, { type: 'circles' })
        let at90 = await WInfographic(circlesInp, { type: 'circles', startAngle: -90 })
        let bad = await WInfographic(circlesInp, { type: 'circles', startAngle: 'abc' })
        let at45 = await WInfographic(circlesInp, { type: 'circles', startAngle: -45 })
        let at45s = await WInfographic(circlesInp, { type: 'circles', startAngle: '-45' })
        let inf = await WInfographic(circlesInp, { type: 'circles', startAngle: Infinity }) // 非有效數字(Infinity)與超出範圍者(1e308)不得使座標運算溢位為 NaN
        let huge = await WInfographic(circlesInp, { type: 'circles', startAngle: 1e308 })
        assert.ok(pixelDiff(def, at90) <= MAX_DIFF, '預設應同 -90')
        assert.ok(pixelDiff(def, bad) <= MAX_DIFF, '非預期值應同預設')
        assert.ok(pixelDiff(def, inf) <= MAX_DIFF, 'Infinity 應同預設')
        assert.ok(pixelDiff(def, huge) <= MAX_DIFF, '超大值應同預設')
        assert.ok(pixelDiff(at45, at45s) <= MAX_DIFF, '數字字串應同數字')
        assert.ok(pixelDiff(def, at45) > MAX_DIFF, '-45 應與 -90 不同, 否則此組比對無鑑別力')
    })

    // 規格: circles、hexagon、hierarchy p1 為純 HTML/CSS, 不需網路(僅 p2 由 CDN 載入繪圖庫); 對照組確認偵測有效
    it('circles、hexagon、p1 之頁面不發出網路請求', async function() {
        let pages = {
            'circles': buildCircles(circlesInp, -90),
            'hexagon': buildHexagon(hexagonInp),
            'p1-band': buildP1(treeBandInp, 'band'),
            'p1-card': buildP1(treeCardInp, 'card'),
        }
        for (let [k, html] of Object.entries(pages)) {
            assert.deepStrictEqual(await requestsOf(html), [], `${k} 不應發出網路請求`)
        }
        assert.strictEqual((await requestsOf('<img src="https://example.invalid/x.png">')).length, 1, '對照組應偵測到 1 個請求')
    })

    // 規格: 項目(節點)數之下限為 1; 單項之 circles、hexagon 與僅根節點之 hierarchy p1 皆可出圖
    it('單項與僅根節點可出圖', async function() {
        let one = { center: { title: 'a' }, items: [{ label: 'x' }] }
        assert.ok(isPng(await WInfographic(one, { type: 'circles' })))
        assert.ok(isPng(await WInfographic(one, { type: 'hexagon' })))
        assert.ok(isPng(await WInfographic({ tree: { title: 'r' } }, { type: 'hierarchy' })))
        assert.ok(isPng(await WInfographic({ tree: { title: 'r', children: [] } }, { type: 'hierarchy', boxStyle: 'card' })))
    })

    // 規格: opt.mode 預設 'p1'; 已不提供之產線視為未給; opt.boxStyle 預設 'band'
    it('mode、boxStyle 非預期值改用預設', async function() {
        let def = await WInfographic(treeBandInp, { type: 'hierarchy' })
        let p1 = await WInfographic(treeBandInp, { type: 'hierarchy', mode: 'p1', boxStyle: 'band' })
        let badMode = await WInfographic(treeBandInp, { type: 'hierarchy', mode: 'p4' })
        let badBox = await WInfographic(treeBandInp, { type: 'hierarchy', boxStyle: 'x' })
        let card = await WInfographic(treeBandInp, { type: 'hierarchy', boxStyle: 'card' })
        assert.ok(pixelDiff(def, p1) <= MAX_DIFF)
        assert.ok(pixelDiff(def, badMode) <= MAX_DIFF)
        assert.ok(pixelDiff(def, badBox) <= MAX_DIFF)
        assert.ok(pixelDiff(def, card) > MAX_DIFF, 'card 應與 band 不同, 否則此組比對無鑑別力')
    })

})
