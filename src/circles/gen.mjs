import { PALETTE, INK } from '../common/palette.mjs'
import { esc, escBr, iconInner } from '../common/text.mjs'
import { renderTrimmed } from '../common/render.mjs'

// circles: 圓形放射圖(中心圓 + n 外圓), 環形均布以三角函數計算絕對定位, 不需網路
//   視覺: 中心深色大圓 + 外圓色環白圓(圖示+標籤) + 外圓間虛線環 + 外圓外側要點
//   inp: { center: { title }, items: [{ label, icon, cls, notes }] }
//     title 與 label 支援 \n 換行; icon: '<svg' raw SVG 或 'mdi:名稱'(可省略); cls: 色票鍵或 #rrggbb(未給依序循環取色)
//     notes: 外圓外側要點(字串陣列, 可省略; 依外圓於畫布左/右半自動置於外側)
//   opt: { startAngle: 首個外圓之角度(度, 預設 -90 為正上方, 順時針遞增) }

const R_CENTER = 150 // 中心圓半徑
const R_ITEM = 100 // 外圓半徑
const GAP = 26 // 中心圓緣至外圓緣之距離
const PAD = 40 // 畫布外留白
const NOTE_W = 400 // 要點預留寬(實際邊界由裁切階段以行寬量測, 此值須 >= 最長行)
const CENTER_TEXT = '#ffffff'
const RING = '#9aa7b0'
const SELECTOR = '.center, .item, .notes .nt, .ring circle' // 量 .nt 行寬(nowrap 實際寬)而非 .notes 容器, 邊界方為真值

// colorOf: cls 為 #rrggbb 時直接使用, 色票鍵查色票(僅色票自有鍵, 不取原型鏈成員如 constructor), 其餘依序循環取色
function colorOf(cls, i) {
    if (typeof cls === 'string' && /^#[0-9a-fA-F]{6}$/.test(cls)) {
        return cls
    }
    let keys = Object.keys(PALETTE)
    return Object.prototype.hasOwnProperty.call(PALETTE, cls) ? PALETTE[cls] : PALETTE[keys[i % keys.length]]
}

function buildHtml(inp, startAngle) {
    let items = inp.items
    let n = items.length
    let R = R_CENTER + GAP + R_ITEM // 佈局半徑(中心到外圓心)
    let bNotes = items.some((it) => it.notes && it.notes.length > 0)
    let padX = PAD + (bNotes ? NOTE_W : 0) // 有要點時左右加寬(左右對稱, 版面置中不偏)
    let W = 2 * (R + R_ITEM) + 2 * padX
    let H = 2 * (R + R_ITEM) + 2 * PAD
    let cx = W / 2
    let cy = H / 2

    let itemsHtml = items.map((it, i) => {
        let deg = startAngle + (360 / n) * i
        let rad = deg * Math.PI / 180
        let x = cx + R * Math.cos(rad)
        let y = cy + R * Math.sin(rad)
        let c = colorOf(it.cls, i)
        let icon = it.icon ? `<div class="cico">${iconInner(it.icon)}</div>` : ''
        let notes = ''
        if (it.notes && it.notes.length > 0) {
            let bRight = Math.cos(rad) >= 0 // 圓於畫布右半 → 要點置右外側, 反之置左
            let side = bRight ? `left: ${R_ITEM * 2 + 18}px; text-align: left;` : `right: ${R_ITEM * 2 + 18}px; text-align: left;`
            notes = `<div class="notes" style="${side}">${it.notes.map((t) => `<div class="nt">${esc(t)}</div>`).join('')}</div>`
        }
        return `<div class="item" style="left: ${(x - R_ITEM).toFixed(1)}px; top: ${(y - R_ITEM).toFixed(1)}px; --c: ${c};">
      <div class="inner">${icon}<div class="clab">${escBr(it.label)}</div></div>${notes}
    </div>`
    }).join('\n')

    // 虛線環置底層, 半徑為佈局半徑, 外圓與中心圓覆蓋後僅餘相鄰外圓間之弧段
    let ringHtml = `<svg class="ring" width="${W}" height="${H}"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${RING}" stroke-width="3" stroke-dasharray="14 12"/></svg>`

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "微軟正黑體", "Microsoft JhengHei", sans-serif; background: #ffffff; }
  .wrap { position: relative; width: ${W}px; height: ${H}px; background: #ffffff; overflow: hidden; }
  .ring { position: absolute; left: 0; top: 0; }
  .center { position: absolute; left: ${cx - R_CENTER}px; top: ${cy - R_CENTER}px; width: ${R_CENTER * 2}px; height: ${R_CENTER * 2}px;
    border-radius: 50%; background: radial-gradient(circle at 42% 32%, #31475a 0%, #243845 70%); /*左上受光之浮凸*/
    box-shadow: 0 18px 34px rgba(28,43,54,.32); /*落地陰影*/
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ctit { color: ${CENTER_TEXT}; font-size: 32px; font-weight: 700; letter-spacing: 3px; line-height: 1.55; text-shadow: 0 2px 5px rgba(0,0,0,.4); }
  /*外圓三層: 色環(上亮下深漸層+落地陰影) → 內圓(同心置中, radial 漸層浮凸) → 內圓下緣投影於色環*/
  .item { position: absolute; width: ${R_ITEM * 2}px; height: ${R_ITEM * 2}px; border-radius: 50%;
    background: linear-gradient(168deg, color-mix(in srgb, var(--c) 74%, white) 4%, var(--c) 58%);
    box-shadow: 0 14px 26px rgba(28,43,54,.28); /*落地陰影*/
    display: flex; align-items: center; justify-content: center; }
  .inner { width: ${R_ITEM * 2 - 26}px; height: ${R_ITEM * 2 - 26}px; border-radius: 50%; /*同心置中, 色環均勻寬 13px*/
    background: radial-gradient(circle at 50% 30%, #ffffff 0%, #f3f4f6 52%, #e2e6ea 100%); /*中央亮邊緣灰之浮凸*/
    box-shadow: 0 8px 14px rgba(28,43,54,.32); /*內圓浮於色環之上*/
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; }
  .cico { color: #2c3e6b; }
  .cico svg { width: 78px; height: 78px; display: block; }
  .clab { color: ${INK.title}; font-size: 23px; font-weight: 700; letter-spacing: 1px; line-height: 1.4; }
  .notes { position: absolute; top: 50%; transform: translateY(-50%); width: max-content; max-width: ${NOTE_W}px; }
  .nt { position: relative; color: ${INK.desc}; font-size: 21px; line-height: 1.9; padding-left: 21px; white-space: nowrap; }
  .nt::before { content: ''; position: absolute; left: 0; top: 0.85em; width: 8px; height: 8px; border-radius: 50%; background: ${INK.desc}; }
</style>
</head>
<body>
  <div class="wrap">
    ${ringHtml}
${itemsHtml}
    <div class="center"><div class="ctit">${escBr(inp.center.title)}</div></div>
  </div>
</body>
</html>`
}

async function gen(inp, opt) {
    return await renderTrimmed(buildHtml(inp, opt.startAngle), SELECTOR)
}

export { gen, buildHtml, SELECTOR }
