import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { measure, TRIM_PAD } from '../../src/common/render.mjs'

// 測試共用層: 像素比對(反鋸齒容差, 補強層)、於真瀏覽器載入 buildHtml 之頁面供語意斷言

const __dir = path.dirname(fileURLToPath(import.meta.url))
const DIR_PICS = path.resolve(__dir, '../pics')
const MAX_DIFF = 100 // 容許之反鋸齒雜訊像素上限
const UPDATE = process.env.UPDATE_BASELINE === '1' // 僅產製標準圖時設定

const isPng = (buf) => Buffer.isBuffer(buf) && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47

// pixelDiff: 回傳兩 PNG 之差異像素數; 尺寸不同回傳 Infinity
function pixelDiff(a, b, diffPng) {
    let pa = PNG.sync.read(a)
    let pb = PNG.sync.read(b)
    if (pa.width !== pb.width || pa.height !== pb.height) {
        return Infinity
    }
    return pixelmatch(pa.data, pb.data, diffPng ? diffPng.data : null, pa.width, pa.height, { includeAA: false, threshold: 0.1 })
}

// assertBaseline: 與 test/pics/<name>.png 比對; 不符時三聯組證據落 ./testPending/(不覆蓋、不自動刪)
function assertBaseline(buf, name) {
    let fp = path.resolve(DIR_PICS, `${name}.png`)
    if (UPDATE) {
        fs.mkdirSync(DIR_PICS, { recursive: true })
        fs.writeFileSync(fp, buf)
        return
    }
    assert.ok(fs.existsSync(fp), `缺標準圖 ${name}.png`)
    let base = fs.readFileSync(fp)
    let pb = PNG.sync.read(base)
    let pc = PNG.sync.read(buf)
    let same = pb.width === pc.width && pb.height === pc.height
    let diffPng = same ? new PNG({ width: pb.width, height: pb.height }) : null
    let n = same ? pixelDiff(base, buf, diffPng) : Infinity
    if (n > MAX_DIFF) {
        let dir = path.resolve('testPending')
        let ts = Date.now()
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, `${name}-${ts}-capture.png`), buf)
        fs.writeFileSync(path.join(dir, `${name}-${ts}-baseline.png`), base)
        if (diffPng) {
            fs.writeFileSync(path.join(dir, `${name}-${ts}-diff.png`), PNG.sync.write(diffPng))
        }
        assert.fail(`${name} 與標準圖不符: ${same ? `${n} 像素差` : `尺寸 ${pb.width}x${pb.height} 變為 ${pc.width}x${pc.height}`}, 證據於 ${dir}`)
    }
}

// withPage: 於真瀏覽器載入 html 後執行 fn(page)
async function withPage(html, fn, opt = {}) {
    let browser = await chromium.launch()
    try {
        let page = await browser.newPage({ viewport: { width: 4000, height: 3000 } })
        await page.setContent(html, { waitUntil: opt.waitUntil || 'load' })
        await page.evaluate(() => document.fonts.ready)
        if (opt.ready) {
            await opt.ready(page)
        }
        return await fn(page)
    }
    finally {
        await browser.close()
    }
}

// requestsOf: 於真瀏覽器載入 html(等載入完成與字型就緒), 回傳頁面發出之網路請求網址(不含 data:、about:、blob:)
async function requestsOf(html) {
    let browser = await chromium.launch()
    try {
        let page = await browser.newPage()
        let urls = []
        page.on('request', (r) => {
            urls.push(r.url())
        })
        await page.setContent(html, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        return urls.filter((u) => !/^(data|about|blob):/.test(u))
    }
    finally {
        await browser.close()
    }
}

// rectsOf: 回傳 selector 各元素之矩形(含中心點)與文字
async function rectsOf(page, selector) {
    return await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => {
        let r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, width: r.width, height: r.height, text: el.textContent }
    }), selector)
}

// assertTrimmed: 成品尺寸須等於視覺邊界(含陰影與濾鏡外擴)四邊各加 TRIM_PAD, 再乘 2 倍解析度(允許四捨五入誤差)
async function assertTrimmed(buf, html, selector) {
    let bb = await withPage(html, async (page) => await page.evaluate(measure, selector))
    let p = PNG.sync.read(buf)
    let w = 2 * (Math.min(bb.W, bb.x2 + TRIM_PAD) - Math.max(0, bb.x1 - TRIM_PAD))
    let h = 2 * (Math.min(bb.H, bb.y2 + TRIM_PAD) - Math.max(0, bb.y1 - TRIM_PAD))
    assert.ok(Math.abs(p.width - w) <= 2, `寬 ${p.width}, 應為 ${w}`)
    assert.ok(Math.abs(p.height - h) <= 2, `高 ${p.height}, 應為 ${h}`)
}

// inkMargins: 回傳 PNG 內非白(含非透明)區域距四邊之像素數
function inkMargins(buf) {
    let p = PNG.sync.read(buf)
    let x1 = p.width
    let y1 = p.height
    let x2 = -1
    let y2 = -1
    for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
            let i = (y * p.width + x) * 4
            let ink = p.data[i + 3] > 0 && (p.data[i] < 245 || p.data[i + 1] < 245 || p.data[i + 2] < 245)
            if (ink) {
                x1 = Math.min(x1, x)
                y1 = Math.min(y1, y)
                x2 = Math.max(x2, x)
                y2 = Math.max(y2, y)
            }
        }
    }
    return { left: x1, top: y1, right: p.width - 1 - x2, bottom: p.height - 1 - y2, width: p.width, height: p.height }
}

export { isPng, pixelDiff, assertBaseline, assertTrimmed, withPage, requestsOf, rectsOf, inkMargins, MAX_DIFF }
