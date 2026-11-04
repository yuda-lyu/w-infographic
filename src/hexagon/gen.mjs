import { INK } from '../common/palette.mjs'
import { esc, escBr, iconInner } from '../common/text.mjs'
import { renderTrimmed } from '../common/render.mjs'

// hexagon: 六邊形資訊圖(中心圓徽章 + 左右兩欄尖頂六邊形立體卡 + 外側文字), 不需網路
//   輸入與 circles 相同(同一份數據可換圖種繪製; 線框與標題配色固定為左右欄兩主色系, 不看 cls), 另可用 side 指定欄位
//   inp: { center: { title }, items: [{ label, icon, notes, side }] }
//     title 與 label 支援 \n 換行; icon: '<svg' raw SVG 或 'mdi:名稱'(可省略)
//     notes: 外側要點(字串陣列, 可省略)
//     side: 'left'/'right' 指定欄位(可省略; 任一項有指定時未標者視為 left; 全未指定則前 ceil(n/2) 項為左欄、其餘為右欄)
//   每側至多 5 項, 總計至多 10 項, 超出拋錯

const R_HEX = 125 // 六邊形外接圓半徑(尖頂式, 寬=√3r、高=2r)
const R_CENTER = Math.round(1.36 * R_HEX) // 中心圓徽章半徑
const GAP = 44 // 中心圓緣至最近六邊形緣之距離
const SPREAD = 1.07 // 鏈距放大係數, 卡與卡留出間隙不直接相貼
const PAD = 40 // 畫布外留白(成品由裁切階段統一)
const NOTE_W = 430 // 外側文字預留寬(實際邊界由裁切以行寬量測, 此值須 >= 最長行)
const NOTE_GAP = 40 // 六邊形緣至外側文字距離
const BG = '#ffffff'
const WIRETHEME = [['#79bec4', '#007a90'], ['#8aabcd', '#0d3f63']] // 線框兩主色系: 左欄青系、右欄藍系, 各為上淡下濃兩色
const HEX = { rimB: '#96a2ab', faceA: '#f7f7f7', faceB: '#f5f5f5', icon: '#2c3e6b' } // rimB 為側壁深灰(對角漸層終點); face 帶灰近白平塗, 與浮凸亮側有可見交界
const CENTER = { ringA: '#2f8ca0', ringB: '#1d3350', text: '#1c2b36' }
const HALO = '#c2cdd6'
const FILLORDER_L = [2, 1, 3, 0, 4] // 左欄槽位啟用順序: 中 → 中上 → 中下 → 頂 → 底
const FILLORDER_R = [2, 3, 1, 4, 0] // 右欄槽位啟用順序: 中 → 中下 → 中上 → 底 → 頂
const SELECTOR = '.center, .hx .hex, .hsh1, .hsh2, .wires polygon, .side .ttl, .side .nt, .halo circle, .bgtProbe' // .bgtProbe 為底層光暈可見圓之量測代理(滿版 .bgt 不可量)

// hexPoints: 尖頂六邊形頂點座標字串(中心 cx,cy、外接圓半徑 r; 頂點於正上/正下, 左右為垂直邊)
function hexPoints(cx, cy, r) {
    let pts = []
    for (let k = 0; k < 6; k++) {
        let a = (-90 + 60 * k) * Math.PI / 180
        pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
    }
    return pts.join(' ')
}

function buildHtml(inp) {
    let items = inp.items
    let n = items.length

    // 欄位分派: 項目順序為左欄由上而下給完, 再給右欄由上而下; numN 為數據原順序之內部索引(供漸變 id)
    let seq = items.map((it, idx) => ({ it, numN: idx + 1 }))
    let seqL
    let seqR
    if (items.some((it) => it.side === 'left' || it.side === 'right')) {
        seqL = seq.filter((s) => s.it.side !== 'right')
        seqR = seq.filter((s) => s.it.side === 'right')
    }
    else {
        seqL = seq.slice(0, Math.ceil(n / 2))
        seqR = seq.slice(Math.ceil(n / 2))
    }
    let mL = seqL.length
    let mR = seqR.length
    if (mL > 5 || mR > 5) {
        throw new Error(`hexagon 每側至多 5 項(左 ${mL}, 右 ${mR}), 總計至多 10 項`)
    }

    let hw = Math.sqrt(3) / 2 * R_HEX // 六邊形半寬
    let rowH = 1.5 * R_HEX * SPREAD // 鏈一列之垂直距
    let step = Math.sqrt(3) / 2 * R_HEX * SPREAD // 鏈一步之水平位移

    // 固定 10 位置之環形佈局: 左右各 5 槽, 槽位幾何恆定不隨項數變形, 項數只改變佔用哪些槽
    //   槽 dy=(槽序-2)*rowH(槽序 0..4); 槽 x 偏移為對稱弧 [內,中,外,中,內](槽 2 離中心最遠), 兩欄鏡像包覆圓心
    let oSlot = [0, -step, -2 * step, -step, 0]
    let dySlot = (s) => (s - 2) * rowH

    // 欄軸距中心以徑向淨距對全部 5 槽求解(佔用與否皆計): 每槽形心與圓心距離 >= R0
    let R0 = (R_CENTER + 22) + GAP + 1.12 * R_HEX // 圓側含光暈細線圈(+22), 形側取線框之頂點距近似
    let axisOff = Math.max(...oSlot) + hw // 保底: 形不跨越中心縱軸
    for (let s = 0; s < 5; s++) {
        let need = R0 * R0 - dySlot(s) * dySlot(s)
        if (need > 0) {
            axisOff = Math.max(axisOff, oSlot[s] + Math.sqrt(need))
        }
    }

    let ext = axisOff + 2 * step // 最外槽(槽 2)形心距中心
    let W = 2 * (ext + hw + NOTE_GAP + NOTE_W) + 2 * PAD
    let H = (dySlot(4) - dySlot(0)) + 2 * R_HEX + 2 * PAD + 40 // 全 5 槽縱向範圍+形高+留白(40: 細線框外擴裕度)
    let rBg = ext + R_HEX // 最底層底色暈之半徑(涵蓋形群後淡出)
    let rBgVis = 0.85 * rBg // 光暈可見半徑: 外緣近透明區不保留, 裁切與畫布保底皆用此值
    W = Math.max(W, 2 * rBgVis + 2 * PAD) // 畫布保底涵蓋光暈可見圓
    H = Math.max(H, 2 * rBgVis + 2 * PAD)
    let cx = W / 2
    let cy = H / 2

    let sPad = 16 // svg 內縮邊(容納線框偏移與描邊)
    let sw = hw * 2 + sPad * 2
    let sh = R_HEX * 2 + sPad * 2

    let wiresHtml = []
    let wireDefs = []
    let shadowsHtml = []
    let hexsHtml = []
    let sidesHtml = []
    let slotsL = FILLORDER_L.slice(0, mL).sort((a, b) => a - b) // 左欄啟用槽, 由上而下供項目依序入座
    let slotsR = FILLORDER_R.slice(0, mR).sort((a, b) => a - b)
    let placed = [...seqL.map((s, r) => ({ ...s, bLeft: true, slot: slotsL[r] })), ...seqR.map((s, r) => ({ ...s, bLeft: false, slot: slotsR[r] }))]
    for (let { it, numN, bLeft, slot } of placed) {
        let y = cy + dySlot(slot)
        let x = bLeft ? cx - axisOff + oSlot[slot] : cx + axisOff - oSlot[slot] // 右欄鏡像

        // 兩層結構: 細線框六邊形(白卡之同心放大版, 相鄰框彼此交錯)全部先繪於最底層, 白色立體卡繪於其上
        let hcx = sw / 2
        let hcy = sh / 2
        let pos = `left: ${(x - sw / 2).toFixed(1)}px; top: ${(y - sh / 2).toFixed(1)}px; width: ${sw}px; height: ${sh}px;`
        // 線框同心放大 1.185=2*SPREAD-0.955: 鄰形框緣恰落在本卡「面與浮凸交界」(0.955r)處; 色彩為上淡下濃之二色垂直漸變
        let wc = WIRETHEME[bLeft ? 0 : 1]
        wireDefs.push(`<linearGradient id="wg${numN}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wc[0]}"/><stop offset="1" stop-color="${wc[1]}"/></linearGradient>`)
        wiresHtml.push(`<polygon points="${hexPoints(x, y, R_HEX * 1.185)}" stroke="url(#wg${numN})"/>`)
        let icon = it.icon ? `<div class="hico">${iconInner(it.icon)}</div>` : ''
        // 陰影: 光源右上、投影斜向左下; 兩層同形多邊形(近影窄深, 遠拖尾寬淡), 全部集中於白卡之下, 不落到相鄰卡白面
        shadowsHtml.push(`<svg class="hsh1" style="${pos}" width="${sw}" height="${sh}"><polygon points="${hexPoints(hcx, hcy, R_HEX * 0.99)}" fill="#3a4a57"/></svg>`)
        shadowsHtml.push(`<svg class="hsh2" style="${pos}" width="${sw}" height="${sh}"><polygon points="${hexPoints(hcx, hcy, R_HEX * 0.97)}" fill="#3a4a57"/></svg>`)
        hexsHtml.push(`<div class="hx" style="${pos}">
      <svg class="hex" width="${sw}" height="${sh}">
        <polygon points="${hexPoints(hcx, hcy, R_HEX)}" fill="url(#hxRim)" />
        <polygon points="${hexPoints(hcx, hcy, R_HEX * 0.955)}" fill="url(#hxFace)" />
      </svg>${icon}
    </div>`) // face 純同心縮小: 六邊側壁等寬, 明暗立體感由 rim 對角漸層呈現

        // 外側文字: 錨點取各形自身之左/右邊界再退 NOTE_GAP, 隨鋸齒逐形參差; 內容一律靠左, 左欄以塊右緣貼形
        let side = bLeft
            ? `right: ${(W - (x - hw - NOTE_GAP)).toFixed(1)}px; text-align: left;`
            : `left: ${(x + hw + NOTE_GAP).toFixed(1)}px; text-align: left;`
        let nts = (it.notes || []).map((t) => `<div class="nt"><span class="ntb">•</span>${esc(t)}</div>`).join('')
        sidesHtml.push(`<div class="side" style="${side} top: ${y.toFixed(1)}px; --c: ${wc[1]};">
      <div class="ttl">${escBr(it.label)}</div>${nts}
    </div>`) // 標題取線框漸變之下色, 文字與框線色系同步
    }

    let haloHtml = `<svg class="halo" width="${W}" height="${H}">
      <circle cx="${cx}" cy="${cy}" r="${R_CENTER + 22}" fill="none" stroke="${HALO}" stroke-width="1.5"/>
    </svg>`

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "微軟正黑體", "Microsoft JhengHei", sans-serif; background: ${BG}; }
  .wrap { position: relative; width: ${W}px; height: ${H}px; background: ${BG}; overflow: hidden; }
  /*最底層底色暈: 圓心同中心圓, 淺藍灰放射漸變至透明*/
  .bgt { position: absolute; left: 0; top: 0; width: 100%; height: 100%;
    background: radial-gradient(circle ${Math.round(rBg)}px at ${cx}px ${cy}px, rgba(232,238,243,0.95) 0%, rgba(232,238,243,0.5) 55%, rgba(232,238,243,0) 100%); }
  .halo { position: absolute; left: 0; top: 0; }
  /*中心圓徽章四層: 色環(上亮下深漸層+落地陰影) → 凸起白環 → 白環內孔之內陷陰影 → 最內小圓承載標題*/
  .center { position: absolute; left: ${cx - R_CENTER}px; top: ${cy - R_CENTER}px; width: ${R_CENTER * 2}px; height: ${R_CENTER * 2}px;
    border-radius: 50%; background: linear-gradient(180deg, ${CENTER.ringA} 0%, ${CENTER.ringB} 100%);
    box-shadow: -8px 16px 30px rgba(28,43,54,.30); /*落地陰影(偏左下, 與六邊形投影方向一致)*/
    display: flex; align-items: center; justify-content: center; }
  .cring { width: ${R_CENTER * 2 - 44}px; height: ${R_CENTER * 2 - 44}px; border-radius: 50%; /*同心置中, 色環均勻寬 22px*/
    background: linear-gradient(45deg, #ffffff 0%, #edeff1 55%, #c7cdd2 100%); /*凸起白環: 左下近白、右上漸灰之對角漸層*/
    box-shadow: 0 0 18px 5px rgba(28,43,54,.55), -6px 10px 20px rgba(28,43,54,.30); /*全周環繞貼合影+左下方向影*/
    display: flex; align-items: center; justify-content: center; }
  .cface { width: ${R_CENTER * 2 - 44 - 32}px; height: ${R_CENTER * 2 - 44 - 32}px; border-radius: 50%; /*白環均勻厚 16px*/
    background: linear-gradient(180deg, #f5f5f6 0%, #d6d7d9 100%); /*最內小圓: 上亮下灰*/
    box-shadow: inset 0 10px 20px rgba(28,43,54,.22), inset 0 0 6px rgba(28,43,54,.12), inset 0 -2px 6px rgba(255,255,255,.7); /*內陷陰影: 上緣較深+全周淡暈*/
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ctit { color: ${CENTER.text}; font-size: 36px; font-weight: 700; letter-spacing: 3px; line-height: 1.5; }
  /*繪製順序三層全域分離: 全部細線框 z0 → 全部陰影 z1 → 全部白卡 z2; 任何形之陰影必在所有白面之下*/
  .wires { position: absolute; left: 0; top: 0; z-index: 0; }
  .wires polygon { fill: none; stroke-width: 1.8; opacity: 0.85; }
  /*斜向左下投影(光源右上): 近影窄深+遠拖尾寬淡兩層合成, 右上緣無影*/
  .hsh1 { position: absolute; z-index: 1; filter: blur(7px); transform: translate(-9px, 11px); opacity: 0.40; }
  .hsh2 { position: absolute; z-index: 1; filter: blur(16px); transform: translate(-22px, 24px); opacity: 0.20; }
  .hx { position: absolute; z-index: 2; }
  .hex { position: absolute; left: 0; top: 0; }
  .hico { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: ${HEX.icon}; }
  .hico svg { width: ${Math.round(R_HEX * 0.82)}px; height: ${Math.round(R_HEX * 0.82)}px; display: block; } /*icon 隨形等比*/
  .side { position: absolute; z-index: 3; transform: translateY(-50%); width: max-content; max-width: ${NOTE_W}px; }
  .ttl { color: var(--c); font-size: 24px; font-weight: 700; letter-spacing: 1px; line-height: 1.4; margin-bottom: 2px; white-space: nowrap; }
  .nt { color: ${INK.desc}; font-size: 21px; line-height: 1.45; white-space: nowrap; } /*文字塊總高須小於同欄形距, 相鄰塊方不相連*/
  .ntb { margin-right: 9px; opacity: 0.75; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="bgt"></div>
    <div class="bgtProbe" style="position: absolute; left: ${(cx - rBgVis).toFixed(1)}px; top: ${(cy - rBgVis).toFixed(1)}px; width: ${Math.round(rBgVis * 2)}px; height: ${Math.round(rBgVis * 2)}px;"></div>
    ${haloHtml}
    <svg width="0" height="0" style="position:absolute;">
      <defs>
        <linearGradient id="hxRim" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#eef1f3"/><stop offset="0.8" stop-color="#ccd4da"/><stop offset="1" stop-color="${HEX.rimB}"/></linearGradient>

        <linearGradient id="hxFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${HEX.faceA}"/><stop offset="1" stop-color="${HEX.faceB}"/></linearGradient>
      </defs>
    </svg>
    <svg class="wires" width="${W}" height="${H}">
      <defs>${wireDefs.join('')}</defs>
${wiresHtml.join('\n')}
    </svg>
${shadowsHtml.join('\n')}
${hexsHtml.join('\n')}
${sidesHtml.join('\n')}
    <div class="center"><div class="cring"><div class="cface"><div class="ctit">${escBr(inp.center.title)}</div></div></div></div>
  </div>
</body>
</html>`
}

async function gen(inp) {
    return await renderTrimmed(buildHtml(inp), SELECTOR)
}

export { gen, buildHtml, SELECTOR }
