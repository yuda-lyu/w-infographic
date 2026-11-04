/* global d3 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { gboxHtml, leadHtml, nodeBoxCss, LINE } from '../nodeBox.mjs'

// p2: d3-org-chart(MIT), 節點內容為任意 HTML(foreignObject), 自動 fit 進固定畫布, 複雜數據首選; CDN 載入, 需網路
//   CDN: d3@7.9.0 + d3-flextree@2.1.2 + d3-org-chart@3.1.1(jsdelivr)
//   opt: { nodeWidth 子節點盒寬(預設 196), width/height 畫布尺寸(預設 1300x640), compact 緊湊佈局(預設 false, 葉節點收摺省寬) }
//   引擎須事先給定各節點固定高, 由 estH 依內容估算; 成品裁去畫布留白後四邊補回等寬白邊

const ROOT_W = 280 // 根節點盒寬(標題不換行所需)
const TRIM_PX = 24 // 裁去畫布留白後四邊補回之白邊(成品像素)

// estH: 依 nodeBox 之實際字級與間距估算節點高(px)
function estH(n, isRoot, w) {
    if (isRoot) {
        return n.subtitle ? 78 : 58
    }
    let innerT = w - 20 - (n.icon ? 31 : 0)
    let tLines = Math.max(1, Math.ceil((String(n.title).length * 19) / innerT))
    let h = 17.5 + tLines * 25 // 色帶: 上下 padding 16 + 邊框 1.5 + 每行 25
    if (n.items && n.items.length > 0) {
        let lineChars = Math.floor((w - 28 - 13) / 13.5) // 色點縮排 13 再折行
        let lines = 0
        for (let t of n.items) {
            lines += Math.max(1, Math.ceil(String(t).length / lineChars))
        }
        h += 10 + lines * 21.6
    }
    if (n.desc) {
        let lineChars = Math.floor((w - 28) / 13.5)
        h += 10 + Math.ceil(String(n.desc).length / lineChars) * 21.6
    }
    h += 13.5 // 底 padding 12 + 邊框
    return Math.ceil(h) + 4
}

// flatten: 層級樹攤平為引擎之 [{id, parentId, html, w, h}]
function flatten(tree, w) {
    let rows = []
    let seq = 0
    let walk = (n, parentId, isRoot) => {
        let id = `n${seq++}`
        rows.push({ id, parentId, html: isRoot ? leadHtml(n) : gboxHtml(n), w: isRoot ? ROOT_W : w, h: estH(n, isRoot, w) })
        for (let c of (n.children || [])) {
            walk(c, id, false)
        }
    }
    walk(tree, null, true)
    return rows
}

function buildHtml(inp, opt) {
    let { nodeWidth, width, height, compact } = opt
    let rows = flatten(inp.tree, nodeWidth)

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-flextree@2.1.2/build/d3-flextree.js"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-org-chart@3.1.1/build/d3-org-chart.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "微軟正黑體", "Microsoft JhengHei", sans-serif; background: #ffffff; }
  #chart { width: ${width}px; height: ${height}px; background: #ffffff; }
${nodeBoxCss(nodeWidth)}
  .node-foreign-object-div { white-space: normal; } /*引擎容器預設 nowrap 會繼承進盒內使說明無法斷行, 重置之*/
  .lead { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; } /*根盒撐滿 foreignObject*/
</style>
</head>
<body>
<div id="chart"></div>
<script>
  const rows = ${JSON.stringify(rows).replace(/</g, '\\u003c')}
  const chart = new d3.OrgChart()
    .container('#chart')
    .data(rows)
    .nodeWidth((d) => d.data.w)
    .nodeHeight((d) => d.data.h)
    .childrenMargin(() => 44)
    .siblingsMargin(() => 24)
    .neighbourMargin(() => 24)
    .compact(${compact})
    .duration(0)
    .buttonContent(() => '') //全展開呈現, 不畫收合鈕
    .nodeContent((d) => d.data.html)
    .linkUpdate(function() { d3.select(this).attr('stroke', '${LINE}').attr('stroke-width', 1.5) })
    .render()
  chart.expandAll().fit()
  window.__done = true
</script>
</body>
</html>`
}

// waitReady: 確認 CDN 繪圖庫已載入再等引擎繪製完成(最長 timeout 毫秒); 任一繪圖庫未載入(離線、DNS 失敗、被阻擋、CDN 回應錯誤)即拋明確錯誤, 不等逾時、不產出空白圖
//   注意 page.waitForFunction 之參數為 (pageFunction, arg, options), 逾時須置於第三參數; 置於第二參數會被當成 arg 而不生效(預設 30 秒)
async function waitReady(page, timeout = 15000) {
    let miss = await page.evaluate(() => {
        let r = []
        if (typeof d3 === 'undefined') {
            return ['d3', 'd3-flextree', 'd3-org-chart']
        }
        if (typeof d3.flextree !== 'function') {
            r.push('d3-flextree')
        }
        if (typeof d3.OrgChart !== 'function') {
            r.push('d3-org-chart')
        }
        return r
    })
    if (miss.length > 0) {
        throw new Error(`hierarchy p2 無法載入繪圖庫 ${miss.join('、')}(由 cdn.jsdelivr.net 載入), 請確認可連線至 jsDelivr`)
    }
    await page.waitForFunction('window.__done === true', null, { timeout })
}

// gen: hooks.onPage(page) 為測試用接縫, 於頁面建立後、載入 html 前呼叫(供注入網路失敗等情境), 一般呼叫不給
async function gen(inp, opt, hooks = {}) {
    let html = buildHtml(inp, opt)
    let browser = await chromium.launch()
    let buf
    try {
        let page = await browser.newPage({ deviceScaleFactor: 2 }) // 2x 提高清晰度
        if (typeof hooks.onPage === 'function') {
            await hooks.onPage(page)
        }
        await page.setContent(html, { waitUntil: 'networkidle' }) // 等 CDN 資源載畢
        await page.evaluate(() => document.fonts.ready)
        await waitReady(page)
        await page.waitForTimeout(250) // fit() 後緩衝一拍再截圖
        buf = await page.locator('#chart').screenshot()
    }
    finally {
        await browser.close()
    }
    let core = await sharp(buf).trim().toBuffer()
    return await sharp(core).extend({ top: TRIM_PX, bottom: TRIM_PX, left: TRIM_PX, right: TRIM_PX, background: '#ffffff' }).png().toBuffer()
}

export { gen, buildHtml, waitReady }
