import { PALETTE, INK } from '../common/palette.mjs'
import { esc, iconInner } from '../common/text.mjs'

// nodeBox: 層級樹之節點盒 HTML 與 CSS, 各產線共用
//   色帶版式(band): title、icon(色帶左側圓章)、items(條列子項, 先於 desc)、desc、cls
//   卡片版式(card): title、icon(右上圓章)、desc、cls, 左上編號依兄弟序自動產生

const ROOT = { bg: '#2f4858', text: '#ffffff', subtext: '#c7d3db' }
const LINE = '#9aa7b0'

// clsOf: 色票鍵, 未給或查無視為 gray
const clsOf = (cls) => (Object.prototype.hasOwnProperty.call(PALETTE, cls) ? cls : 'gray')

// iconHtml: 圖示圓章(色帶版式與根節點用)
function iconHtml(v) {
    if (!v) {
        return ''
    }
    return `<span class="gicon">${iconInner(v)}</span>`
}

// gboxHtml: 子節點盒(色帶[圖示+]標題 + [條列子項] + [說明])
function gboxHtml(n) {
    let icon = iconHtml(n.icon)
    let gis = (n.items && n.items.length > 0) ? `<ul class="gitems">${n.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''
    let gd = n.desc ? `<div class="gd">${esc(n.desc)}</div>` : ''
    return `<div class="gbox g-${clsOf(n.cls)}"><div class="gt">${icon}<span class="gtt">${esc(n.title)}</span></div>${gis}${gd}</div>`
}

// leadHtml: 根節點盒(深色強調, [圖示+]標題 + [副標])
function leadHtml(t) {
    let icon = iconHtml(t.icon)
    let ls = t.subtitle ? `<div class="ls">${esc(t.subtitle)}</div>` : ''
    return `<div class="node lead"><div class="lt">${icon}<span>${esc(t.title)}</span></div>${ls}</div>`
}

// nodeBoxCss: 色帶版式 CSS
function nodeBoxCss(nodeWidth) {
    let clsCss = Object.entries(PALETTE).map(([k, c]) => `
  .g-${k} { border-color: ${c}; }
  .g-${k} .gt { background: ${c}; }
  .g-${k} .gicon { color: ${c}; }
  .g-${k} .gitems li::before { background: ${c}; }`).join('')

    return `
  .node { border: 1.5px solid ${ROOT.bg}; border-radius: 9px; padding: 12px 28px; color: ${INK.title}; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.10); }
  .lead { background: ${ROOT.bg}; border-color: ${ROOT.bg}; padding: 13px 34px; }
  .lead .lt { font-size: 21px; color: ${ROOT.text}; letter-spacing: 1px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 9px; }
  .lead .gicon { width: 30px; height: 30px; background: rgba(255,255,255,0.16); color: ${ROOT.text}; }
  .lead .ls { font-size: 13.5px; color: ${ROOT.subtext}; margin-top: 3px; text-align: center; }
  .gbox { display: block; width: ${nodeWidth}px; border: 1.5px solid ${PALETTE.gray}; border-radius: 9px; padding: 0 0 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.10); overflow: hidden; background: #ffffff; color: ${INK.title}; }
  .gbox:not(:has(.gitems)):not(:has(.gd)) { padding-bottom: 0; } /*僅標題之節點不留底部白條, 色帶即整盒*/
  .gt { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 18px; color: #ffffff; padding: 8px 10px; letter-spacing: 1px; }
  .gtt { min-width: 0; }
  .gicon { flex: none; width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.92); display: inline-flex; align-items: center; justify-content: center; color: ${INK.desc}; }
  .gicon svg { width: 15px; height: 15px; display: block; }
  .gitems { padding: 10px 14px 0; text-align: left; }
  .gitems li { list-style: none; position: relative; padding-left: 13px; font-size: 13.5px; color: ${INK.desc}; line-height: 1.6; }
  .gitems li::before { content: ''; position: absolute; left: 0; top: 8.5px; width: 5px; height: 5px; border-radius: 50%; background: ${PALETTE.gray}; }
  .gd { font-size: 13.5px; color: ${INK.desc}; line-height: 1.6; text-align: left; padding: 10px 14px 0; }
${clsCss}`
}

// gboxCardHtml: 卡片版式節點盒(頂部色條 + 編號/圖示圓章列 + 置左標題 + 說明); 主體白底, 色僅出現於頂條、編號與圓章
function gboxCardHtml(n, i) {
    let num = String(i + 1).padStart(2, '0')
    let icon = n.icon ? `<span class="cicon">${iconInner(n.icon)}</span>` : ''
    let gd = n.desc ? `<div class="cd">${esc(n.desc)}</div>` : ''
    return `<div class="gcard gc-${clsOf(n.cls)}"><div class="cbar"></div><div class="chead"><span class="cnum">${num}</span>${icon}</div><div class="ct">${esc(n.title)}</div>${gd}</div>`
}

// cardBoxCss: 卡片版式 CSS; 兄弟 li 由 flex 等高, .gcard flex:1 撐滿 li 剩餘高度
function cardBoxCss(nodeWidth) {
    let clsCss = Object.entries(PALETTE).map(([k, c]) => `
  .gc-${k} { --c: ${c}; }`).join('')

    return `
  .lead { background: ${ROOT.bg}; border-radius: 12px; padding: 14px 40px 15px; box-shadow: 0 2px 6px rgba(28,43,54,.18); }
  .lead .lt { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 21px; font-weight: 700; color: ${ROOT.text}; letter-spacing: 2px; white-space: nowrap; }
  .lead .gicon { flex: none; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.14); display: inline-flex; align-items: center; justify-content: center; color: #ffffff; }
  .lead .gicon svg { width: 18px; height: 18px; display: block; }
  .lead .ls { margin-top: 4px; text-align: center; font-size: 13px; color: ${ROOT.subtext}; letter-spacing: 1px; }
  .gcard { width: ${nodeWidth}px; flex: 1; background: #ffffff; border: 1px solid #e3e8ec; border-radius: 10px; box-shadow: 0 1px 3px rgba(28,43,54,.08); overflow: hidden; text-align: left; }
  .gcard .cbar { height: 4px; background: var(--c); }
  .gcard .chead { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 0; }
  .gcard .cnum { font-size: 26px; font-weight: 700; line-height: 1; color: color-mix(in srgb, var(--c) 38%, white); letter-spacing: 1px; }
  .gcard .cicon { width: 32px; height: 32px; border-radius: 50%; background: color-mix(in srgb, var(--c) 10%, white); display: inline-flex; align-items: center; justify-content: center; color: var(--c); }
  .gcard .cicon svg { width: 18px; height: 18px; display: block; }
  .gcard .ct { padding: 8px 16px 0; font-size: 16.5px; font-weight: 700; color: ${INK.title}; letter-spacing: 1px; }
  .gcard .cd { padding: 7px 16px 15px; font-size: 13px; color: ${INK.desc}; line-height: 1.65; }
${clsCss}`
}

export { gboxHtml, gboxCardHtml, leadHtml, nodeBoxCss, cardBoxCss, LINE }
