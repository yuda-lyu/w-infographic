import get from 'lodash-es/get.js'
import isenum from 'wsemi/src/isenum.mjs'
import iseint from 'wsemi/src/iseint.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import cint from 'wsemi/src/cint.mjs'

const TYPES = ['circles', 'hexagon', 'hierarchy']
const MAX_ANGLE = 360000 // startAngle 絕對值上限(度); 超出時三角函數運算會溢位為 NaN, 使外圓座標全失

// numOrDef: opt 鍵為有效數字(數字或數字字串, 不含 Infinity 與 NaN)且於範圍內時轉換後使用, 否則取預設
const numOrDef = (v, def, lim) => (isenum(v, lim) ? cdbl(v) : def)

// pintOrDef: opt 鍵為正整數(數字或數字字串, 於安全整數範圍內)時轉換後使用, 否則取預設
const pintOrDef = (v, def) => (iseint(v, { min: 1 }) ? cint(v) : def)

// normOpt: 正規化 opt; type 必給, 不合即拋錯; 其餘鍵為非預期之輸入視為未給, 改用預設(dspec 輸入參數之檢測機制 K3); 各鍵只讀取一次, 不改動 opt
function normOpt(opt) {
    let type = get(opt, 'type')
    if (!TYPES.includes(type)) {
        throw new Error('invalid opt.type, 須為 circles, hexagon, hierarchy 之一')
    }
    return {
        type,
        startAngle: numOrDef(get(opt, 'startAngle'), -90, { min: -MAX_ANGLE, max: MAX_ANGLE }),
        mode: get(opt, 'mode') === 'p2' ? 'p2' : 'p1',
        boxStyle: get(opt, 'boxStyle') === 'card' ? 'card' : 'band',
        nodeWidth: pintOrDef(get(opt, 'nodeWidth'), 196),
        width: pintOrDef(get(opt, 'width'), 1300),
        height: pintOrDef(get(opt, 'height'), 640),
        compact: get(opt, 'compact') === true,
    }
}

export default normOpt
export { MAX_ANGLE }
