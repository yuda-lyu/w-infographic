# w-infographic
A package for infographic.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-infographic.svg?style=flat)](https://npmjs.org/package/w-infographic) 
[![license](https://img.shields.io/npm/l/w-infographic.svg?style=flat)](https://npmjs.org/package/w-infographic) 
[![npm download](https://img.shields.io/npm/dt/w-infographic.svg)](https://npmjs.org/package/w-infographic) 
[![npm download](https://img.shields.io/npm/dm/w-infographic.svg)](https://npmjs.org/package/w-infographic) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-infographic.svg)](https://www.jsdelivr.com/package/npm/w-infographic)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-infographic/w-infographic.html).

## Installation

### Using npm(ES6 module):
```alias
npm i w-infographic
```

## Example

```js
import fs from 'fs'
import WInfographic from 'w-infographic'

// 圓形放射圖(circles)與六邊形資訊圖(hexagon)輸入相同
let inp = {
    center: { title: '產品\n開發' },
    items: [
        { label: '需求', icon: 'mdi:clipboard-text', notes: ['訪談與分析', '規格撰寫'] },
        { label: '設計', icon: 'mdi:pencil-ruler', notes: ['架構設計', '介面設計'] },
        { label: '實作', icon: 'mdi:code-tags', notes: ['程式開發', '程式審查'] },
        { label: '測試', icon: 'mdi:test-tube', notes: ['單元測試', '整合測試'] },
    ],
}
fs.writeFileSync('circles.png', await WInfographic(inp, { type: 'circles', startAngle: -45 }))
fs.writeFileSync('hexagon.png', await WInfographic(inp, { type: 'hexagon' }))

// 層級樹(hierarchy): p1 為純 HTML/CSS, p2 為 d3-org-chart
let tree = {
    tree: {
        title: '總經理',
        subtitle: '營運總部',
        children: [
            { title: '研發部', desc: '產品設計與開發。', cls: 'blue', children: [{ title: '前端組', cls: 'teal' }, { title: '後端組', cls: 'teal' }] },
            { title: '業務部', items: ['客戶開發', '客戶維繫'], cls: 'green', icon: 'mdi:handshake' },
        ],
    },
}
fs.writeFileSync('tree-band.png', await WInfographic(tree, { type: 'hierarchy' }))
fs.writeFileSync('tree-card.png', await WInfographic(tree, { type: 'hierarchy', boxStyle: 'card' }))
fs.writeFileSync('tree-p2.png', await WInfographic(tree, { type: 'hierarchy', mode: 'p2', compact: true, nodeWidth: 226, width: 680, height: 880 }))
```

## Notes

- 產出 PNG Buffer,以 Playwright 之 Chromium 渲染,解析度為 2 倍。圖內不畫圖名。
- 圖內字型固定為微軟正黑體,須於 Windows 或已安裝該字型之環境產製。
- hierarchy 之 p2 由 jsDelivr CDN 載入繪圖庫(版本精確鎖定),產製時須可連線;其餘不需網路。
- icon 為 `'<svg'` 開頭之 raw SVG(原樣內嵌,內容由呼叫端負責)或 `'mdi:名稱'`(@mdi/js,kebab-case)。
- 節點與項目之色票鍵為 blue、green、teal、orange、purple、red、gray;circles 另可給 `#rrggbb`。hexagon 之配色固定為左右欄兩主色系。
- circles 與 hexagon 每項之 notes、hierarchy 節點之 items 須為陣列(可省略),非陣列即拋錯;hexagon 每側至多 5 項,總計至多 10 項。
- 必要之輸入不合即拋錯:opt.type 與 inp 之必要欄位(center.title、items 與其 label、tree 各節點 title、children 須為陣列)。opt 其餘鍵為非預期之輸入時視為未給、改用預設(例如 startAngle 非有效數字或絕對值超過 360000、nodeWidth/width/height 非正整數)。
- hierarchy 之 p2 無法連線載入繪圖庫時,拋出指出缺哪個庫之明確錯誤,不會產出空白圖。
- hierarchy 之節點欄位:色帶版式(`band`,p2 亦同)支援 title、icon、items、desc、cls;卡片版式(`card`)只顯示 title、icon、desc、cls,不顯示 items。
- 流程圖請用 w-flowchart,甘特圖請用 w-ganttchart。
