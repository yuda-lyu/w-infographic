import { gboxHtml, gboxCardHtml, leadHtml, nodeBoxCss, cardBoxCss, LINE } from '../nodeBox.mjs'
import { renderTrimmed } from '../../common/render.mjs'

// p1: 純 HTML/CSS 階層樹, 以 CSS 偽元素繪連接線、flex 置中排列, 不需網路
//   兄弟節點一律水平展開, 總寬隨葉節點數線性成長; 葉節點多時改用 p2
//   opt: { boxStyle: 'band'(預設, 色帶標題盒)或 'card'(卡片盒, 兄弟等高, 連接線加粗) }

const SELECTOR = '.lead, .gbox, .gcard'

function buildHtml(inp, boxStyle) {
    let bCard = boxStyle === 'card'
    let nodeWidth = bCard ? 212 : 196
    let lineW = bCard ? '2px' : '1.5px' // 卡片版式連接線加粗並用柔灰藍, 與細邊框卡片之視覺份量匹配
    let lineC = bCard ? '#c3ccd3' : LINE
    let boxCss = bCard ? cardBoxCss(nodeWidth) : nodeBoxCss(nodeWidth)
    let treeUl = '.tree ul:not(.gitems)' // 樹骨架之 ul、li, 不含節點盒內之條列子項
    let treeLi = `${treeUl} > li`

    // renderNodes: 遞迴組出子節點清單(li 巢狀 ul)
    let renderNodes = (nodes) => nodes.map((n, i) => {
        let sub = (n.children && n.children.length > 0) ? `\n<ul>\n${renderNodes(n.children)}\n</ul>` : ''
        return `<li>${bCard ? gboxCardHtml(n, i) : gboxHtml(n)}${sub}</li>`
    }).join('\n')

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "微軟正黑體", "Microsoft JhengHei", sans-serif; background: #ffffff; }
  .wrap { display: inline-block; padding: 34px 50px; background: #ffffff; }
  ${treeUl} { position: relative; padding-top: 26px; display: flex; justify-content: center; }
  .tree > ul:not(.gitems) { padding-top: 0; }
  ${treeLi} { list-style: none; text-align: center; position: relative; padding: 26px 12px 0; display: flex; flex-direction: column; align-items: center; }
  ${treeLi}::before, ${treeLi}::after { content: ''; position: absolute; top: 0; right: 50%; border-top: ${lineW} solid ${lineC}; width: 50%; height: 26px; }
  ${treeLi}::after { right: auto; left: 50%; border-left: ${lineW} solid ${lineC}; }
  ${treeLi}:only-child::before, ${treeLi}:only-child::after { display: none; }
  ${treeLi}:only-child { padding-top: 0; }
  ${treeLi}:first-child::before, ${treeLi}:last-child::after { border: 0 none; }
  ${treeLi}:last-child::before { border-right: ${lineW} solid ${lineC}; }
  .tree ul ul:not(.gitems)::before { content: ''; position: absolute; top: 0; left: 50%; border-left: ${lineW} solid ${lineC}; width: 0; height: 26px; }
${boxCss}
</style>
</head>
<body>
  <div class="wrap">
    <div class="tree">
      <ul>
        <li>
          ${leadHtml(inp.tree)}
          <ul>
${renderNodes(inp.tree.children || [])}
          </ul>
        </li>
      </ul>
    </div>
  </div>
</body>
</html>`
}

async function gen(inp, opt) {
    return await renderTrimmed(buildHtml(inp, opt.boxStyle), SELECTOR)
}

export { gen, buildHtml, SELECTOR }
