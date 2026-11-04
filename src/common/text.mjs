import * as MDI from '@mdi/js'

// esc: HTML 逃逸
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// escBr: 逃逸並將 \n 轉 <br>
const escBr = (s) => esc(s).replace(/\n/g, '<br>')

// iconInner: 圖示內容; '<svg' 開頭視為呼叫端自組之 raw SVG 原樣內嵌, 'mdi:名稱' 解析為 @mdi/js 之 SVG path, 其餘與查無名稱者顯示 ? 不靜默
function iconInner(v) {
    let s = String(v)
    if (s.startsWith('<svg')) {
        return s
    }
    if (s.startsWith('mdi:')) {
        let key = 'mdi' + s.slice(4).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
        let p = MDI[key]
        if (p) {
            return `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${p}"/></svg>`
        }
    }
    return '?'
}

export { esc, escBr, iconInner }
