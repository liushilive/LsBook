# fuck_gitbook

无法忍受 `gitbook` 龟速的生成速度，决定自己写一个用于书写自己的书籍生成器。

## 处理流程

1. preparePages
    列出并准备所有页面
1. prepareAssets
    列出书中所有的资产
1. config
    读取配置文件
1. init
    在解析书籍之前调用，然后生成输出和页面，只运行一次
1. generateAssets
    生成资源
1. parseBook
    解析书籍
1. page:before
    在页面上运行模板引擎之前调用
1. blocks
    代码块处理
1. page
    在输出和索引页面之前调用
1. generateBook
    生成书籍
1. finish:before
    在生成页面之后调用，在复制资源之前，覆盖，只运行一次
1. finish
    只运行一次
    