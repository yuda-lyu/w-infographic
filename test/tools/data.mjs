// 測試用數據: 虛構之一般性內容, 與任何實際專案無關

const rawIcon = (c) => `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="${c}"/></svg>`

const circlesInp = {
    center: { title: '產品\n開發' },
    items: [
        { label: '需求', icon: rawIcon('#3f6fb0'), cls: '#3f6fb0', notes: ['訪談與分析', '規格撰寫'] },
        { label: '設計', icon: 'mdi:pencil-ruler', cls: '#5560b5', notes: ['架構設計', '介面設計'] },
        { label: '實作', icon: 'mdi:code-tags', cls: 'teal', notes: ['程式開發', '程式審查'] },
        { label: '測試', icon: 'mdi:test-tube', notes: ['單元測試', '整合測試'] },
    ],
}

const hexagonInp = {
    center: { title: '客戶\n服務' },
    items: [
        { label: '諮詢', icon: 'mdi:message-text', notes: ['電話諮詢', '線上諮詢'] },
        { label: '報價', icon: rawIcon('#2b7f8a'), notes: ['需求確認', '報價單'] },
        { label: '簽約', icon: 'mdi:file-sign', notes: ['合約審閱'] },
        { label: '交付', icon: 'mdi:truck', notes: ['到貨通知', '安裝'] },
        { label: '驗收', icon: 'mdi:check-decagram', notes: ['驗收單'] },
        { label: '維護', icon: 'mdi:wrench', notes: ['定期保養', '故障排除'] },
    ],
}

const hexagonRightInp = {
    center: { title: '客戶\n服務' },
    items: [
        { label: '諮詢', icon: 'mdi:message-text', notes: ['電話諮詢'], side: 'right' },
        { label: '報價', icon: 'mdi:calculator', notes: ['報價單'], side: 'right' },
        { label: '簽約', icon: 'mdi:file-sign', notes: ['合約審閱'], side: 'right' },
    ],
}

const treeBandInp = {
    tree: {
        title: '總經理',
        subtitle: '營運總部',
        children: [
            {
                title: '研發部',
                desc: '產品設計與開發。',
                cls: 'blue',
                children: [
                    { title: '前端組', desc: '頁面開發。', cls: 'teal' },
                    { title: '後端組', items: ['服務開發', '資料存取'], desc: '含維運。', cls: 'teal' },
                ],
            },
            { title: '業務部', desc: '客戶開發與維繫。', cls: 'green' },
            { title: '行政部', cls: 'orange' },
        ],
    },
}

const treeCardInp = {
    tree: {
        title: '品質構面',
        subtitle: '四項',
        icon: 'mdi:check-decagram',
        children: [
            { title: '功能性', desc: '功能完整且正確。', cls: 'blue', icon: 'mdi:puzzle' },
            { title: '可靠性', desc: '長時間運作仍穩定，且異常時可自行恢復服務。', cls: 'green', icon: 'mdi:shield-check' },
            { title: '易用性', desc: '操作直覺。', cls: 'orange', icon: 'mdi:gesture-tap' },
            { title: '維護性', desc: '易於修改。', cls: 'purple', icon: 'mdi:wrench' },
        ],
    },
}

const treeP2Inp = {
    tree: {
        title: '門市營運',
        icon: 'mdi:store',
        children: [
            { title: '商品管理', items: ['進貨', '上架', '盤點'], cls: 'blue', icon: 'mdi:package-variant' },
            { title: '顧客服務', items: ['諮詢', '退換貨'], cls: 'green', icon: 'mdi:account-voice' },
            { title: '收銀作業', items: ['結帳', '發票', '對帳'], cls: 'teal', icon: 'mdi:cash-register' },
            { title: '環境維護', items: ['清潔', '設備巡檢'], cls: 'orange', icon: 'mdi:broom' },
            { title: '人員排班', items: ['班表', '請假', '支援'], cls: 'purple', icon: 'mdi:calendar-clock' },
            { title: '安全管理', desc: '門禁與監視設備之日常檢查與異常回報。', cls: 'red', icon: 'mdi:shield-alert' },
            { title: '營運報表', items: ['日報', '月報'], cls: 'gray', icon: 'mdi:chart-bar' },
        ],
    },
}

export { rawIcon, circlesInp, hexagonInp, hexagonRightInp, treeBandInp, treeCardInp, treeP2Inp }
