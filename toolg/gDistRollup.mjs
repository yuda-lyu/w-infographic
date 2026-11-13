import rollupFiles from 'w-package-tools/src/rollupFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'

rollupFiles({ //rollupFiles預設會clean folder
    fns: 'WInfographic.mjs',
    fdSrc,
    fdTar,
    nameDistType: 'kebabCase',
    globals: {
        '@mdi/js': '@mdi/js',
        'sharp': 'sharp',
        'w-playwright': 'w-playwright',
    },
    external: [ //Node 端執行期依賴(原生/重, 不打包進 dist); p2 之繪圖庫由 CDN 於頁面內載入, 非 import, 無須列此
        '@mdi/js',
        'sharp',
        'w-playwright', //以其 main 外部化, 不內嵌其 src(其相依 playwright-core 以精確版本由 w-playwright 持有)
    ],
})
