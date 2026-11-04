import { chromium } from 'playwright'

const TRIM_PAD = 24 // 成品四邊統一留白 px(自視覺邊界起算)

// measure: 於頁面內量測內容之視覺聯集邊界 = getBoundingClientRect ∪ box-shadow ∪ filter(blur/drop-shadow)之逐向外擴
function measure(selector) {
    // parseShadow: 解析 computed 陰影("rgba(..) Xpx Ypx Bpx Spx")為四向外擴量(blur+spread 為暈染半徑, offset 平移之)
    let parseShadow = (s) => {
        if (!s || s === 'none') {
            return { l: 0, r: 0, t: 0, b: 0 }
        }
        let v = (s.match(/(-?[\d.]+)px/g) || []).map(parseFloat)
        let ox = v[0] || 0
        let oy = v[1] || 0
        let e = (v[2] || 0) + (v[3] || 0)
        return { l: Math.max(0, e - ox), r: Math.max(0, e + ox), t: Math.max(0, e - oy), b: Math.max(0, e + oy) }
    }
    // parseFilter: 解析 computed filter; drop-shadow 同陰影語法取各向最大, blur(σ=N)視覺延伸約 1.5N
    let parseFilter = (s) => {
        let r = { l: 0, r: 0, t: 0, b: 0 }
        if (!s || s === 'none') {
            return r
        }
        for (let seg of s.split('drop-shadow').slice(1)) {
            let sh = parseShadow(seg)
            r.l = Math.max(r.l, sh.l)
            r.r = Math.max(r.r, sh.r)
            r.t = Math.max(r.t, sh.t)
            r.b = Math.max(r.b, sh.b)
        }
        let mb = s.match(/blur\((-?[\d.]+)px\)/)
        if (mb) {
            let e = 1.5 * parseFloat(mb[1])
            r.l = Math.max(r.l, e)
            r.r = Math.max(r.r, e)
            r.t = Math.max(r.t, e)
            r.b = Math.max(r.b, e)
        }
        return r
    }
    let x1 = Infinity
    let y1 = Infinity
    let x2 = -Infinity
    let y2 = -Infinity
    document.querySelectorAll(selector).forEach((el) => {
        let r = el.getBoundingClientRect()
        let cs = getComputedStyle(el)
        let sh = parseShadow(cs.boxShadow)
        let fl = parseFilter(cs.filter)
        x1 = Math.min(x1, r.left - sh.l - fl.l)
        y1 = Math.min(y1, r.top - sh.t - fl.t)
        x2 = Math.max(x2, r.right + sh.r + fl.r)
        y2 = Math.max(y2, r.bottom + sh.b + fl.b)
    })
    let w = document.querySelector('.wrap').getBoundingClientRect()
    return { x1, y1, x2, y2, W: w.width, H: w.height }
}

// renderTrimmed: 渲染 html 並依 selector 內容之視覺邊界裁切後回傳 PNG Buffer, 成品四邊留白寬度一致(畫布須為 .wrap 且自 0,0 起)
async function renderTrimmed(html, selector) {
    let browser = await chromium.launch()
    try {
        let page = await browser.newPage({ deviceScaleFactor: 2 }) // 2x 提高清晰度
        await page.setContent(html, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready) // 確保字型載入後再截圖
        let bb = await page.evaluate(measure, selector)
        let cx1 = Math.max(0, bb.x1 - TRIM_PAD)
        let cy1 = Math.max(0, bb.y1 - TRIM_PAD)
        let cx2 = Math.min(bb.W, bb.x2 + TRIM_PAD)
        let cy2 = Math.min(bb.H, bb.y2 + TRIM_PAD)
        await page.setViewportSize({ width: Math.ceil(bb.W), height: Math.ceil(bb.H) }) // viewport 涵蓋全畫布, clip 方不被視窗截斷
        return await page.screenshot({ clip: { x: cx1, y: cy1, width: cx2 - cx1, height: cy2 - cy1 } })
    }
    finally {
        await browser.close()
    }
}

export { renderTrimmed, measure, TRIM_PAD }
