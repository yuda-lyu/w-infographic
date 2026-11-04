import assert from 'assert'
import normOpt, { MAX_ANGLE } from '../src/common/normOpt.mjs'

const DEF = { type: 'circles', startAngle: -90, mode: 'p1', boxStyle: 'band', nodeWidth: 196, width: 1300, height: 640, compact: false }

// 規格來源: src/WInfographic.mjs 之 JSDoc 與 src/common/normOpt.mjs 檔頭; 非預期之 opt 值視為未給、改用預設(dspec 輸入參數之檢測機制 K3)
describe('normOpt 入口參數正規化', function() {

    // 規格: opt.type 必給, 可選 circles、hexagon、hierarchy, 不合即拋錯
    it('type 必給且限三值', function() {
        for (let type of ['circles', 'hexagon', 'hierarchy']) {
            assert.strictEqual(normOpt({ type }).type, type)
        }
        for (let o of [undefined, null, {}, { type: 'pie' }, { type: 'Circles' }, { type: 1 }, { type: null }, 'circles', ['circles'], 5]) {
            assert.throws(() => normOpt(o), /invalid opt\.type/)
        }
    })

    // 規格: 其餘鍵未給取預設(startAngle -90, mode p1, boxStyle band, nodeWidth 196, width 1300, height 640, compact false)
    it('其餘鍵未給取預設', function() {
        assert.deepStrictEqual(normOpt({ type: 'circles' }), DEF)
        assert.deepStrictEqual(normOpt({ type: 'circles', startAngle: undefined, mode: null, nodeWidth: undefined }), DEF)
    })

    // 規格: startAngle 為有效數字或數字字串(度, 轉換後使用); 非有效數字(含 Infinity、NaN、非十進位寫法)或絕對值超過 360000 視為未給
    it('startAngle 之有效值與非預期值', function() {
        let a = (v) => normOpt({ type: 'circles', startAngle: v }).startAngle
        assert.strictEqual(a(-45), -45)
        assert.strictEqual(a('-45'), -45)
        assert.strictEqual(a(' 30 '), 30)
        assert.strictEqual(a('1e2'), 100)
        assert.strictEqual(a(0), 0) // 0 為有效角度, 非未給
        assert.strictEqual(a(1.5), 1.5)
        assert.strictEqual(a(MAX_ANGLE), MAX_ANGLE)
        assert.strictEqual(a(-MAX_ANGLE), -MAX_ANGLE)
        for (let v of [MAX_ANGLE + 1, -MAX_ANGLE - 1, 1e308, Infinity, -Infinity, NaN, '0x10', '0b11', 'Infinity', 'abc', '12abc', '', ' ', true, false, null, undefined, [], {}, [30]]) {
            assert.strictEqual(a(v), -90, `${String(v)} 應視為未給`)
        }
    })

    // 規格: nodeWidth、width、height 為正整數或其字串(轉換後使用, 於安全整數範圍內); 其餘視為未給
    it('nodeWidth、width、height 之有效值與非預期值', function() {
        for (let [k, def] of [['nodeWidth', 196], ['width', 1300], ['height', 640]]) {
            let a = (v) => normOpt({ type: 'hierarchy', [k]: v })[k]
            assert.strictEqual(a(226), 226)
            assert.strictEqual(a('226'), 226)
            assert.strictEqual(a(' 226 '), 226)
            assert.strictEqual(a('1e3'), 1000)
            assert.strictEqual(a(1), 1)
            for (let v of [0, -5, 1.5, '1.5', Infinity, 1e21, '1e21', '0x10', 'abc', '', true, null, undefined, [], {}, [226]]) {
                assert.strictEqual(a(v), def, `${k}=${String(v)} 應視為未給`)
            }
        }
    })

    // 規格: mode 僅 'p2' 為 p2, 其餘(含已不提供之 p3、p4)視為 p1; boxStyle 僅 'card' 為 card, 其餘視為 band; compact 僅 true 為 true
    it('mode、boxStyle、compact 之非預期值', function() {
        let n = (o) => normOpt({ type: 'hierarchy', ...o })
        assert.strictEqual(n({ mode: 'p2' }).mode, 'p2')
        for (let v of ['p1', 'p3', 'p4', 'P2', 2, true, {}]) {
            assert.strictEqual(n({ mode: v }).mode, 'p1')
        }
        assert.strictEqual(n({ boxStyle: 'card' }).boxStyle, 'card')
        for (let v of ['band', 'Card', 'x', 1, true, {}]) {
            assert.strictEqual(n({ boxStyle: v }).boxStyle, 'band')
        }
        assert.strictEqual(n({ compact: true }).compact, true)
        for (let v of ['true', 1, 'y', 'false', false, null, undefined, {}]) {
            assert.strictEqual(n({ compact: v }).compact, false)
        }
    })

    // 規格: 不改動呼叫端之 opt, 未宣告之鍵忽略, 各鍵只讀取一次(檢測之值即使用之值, dspec K4)
    it('不改動 opt、忽略未宣告之鍵、各鍵只讀一次', function() {
        let frozen = Object.freeze({ type: 'circles', startAngle: '-45', unknown: 1 })
        let r = normOpt(frozen)
        assert.strictEqual(r.startAngle, -45)
        assert.strictEqual(Object.prototype.hasOwnProperty.call(r, 'unknown'), false)
        let reads = {}
        let o = {}
        let getter = (k, v) => () => {
            reads[k] = (reads[k] || 0) + 1
            return v
        }
        for (let [k, v] of [['type', 'hierarchy'], ['startAngle', 5], ['mode', 'p2'], ['boxStyle', 'card'], ['nodeWidth', 200], ['width', 300], ['height', 400], ['compact', true]]) {
            Object.defineProperty(o, k, { enumerable: true, get: getter(k, v) })
        }
        assert.deepStrictEqual(normOpt(o), { type: 'hierarchy', startAngle: 5, mode: 'p2', boxStyle: 'card', nodeWidth: 200, width: 300, height: 400, compact: true })
        assert.deepStrictEqual(reads, { type: 1, startAngle: 1, mode: 1, boxStyle: 1, nodeWidth: 1, width: 1, height: 1, compact: 1 })
    })

})
