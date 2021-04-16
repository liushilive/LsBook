# LsBook

无法忍受 [gitbook](https://www.gitbook.com/) 龟速的生成速度，决定自己写一个用于书写自己的书籍生成器。

一切参照 [gitbook](https://www.gitbook.com/)，只为加快网站的生成速度。

只支持 md 语法：[CommonMark 规格](https://spec.commonmark.org/)

项目示例：<https://github.com/liushilive/github_software_testing_dictionary>

## 部署

部署 python，安装 `lsbook`

```cmd
pip install lsbook
```

使用

```cmd
lsbook -b --log debug <book> <output>
```

## 编辑 book.json

```json
{
  "author": "作者",
  "title": "书籍标题",
  "language": "zh-cn",
  // ar bn ca cs de el en es fa fi fr he it ja ko nl no pl pt ro ru sv tr uk ui zh-cn zh-hans zh-tw
  "github_url": "主页地址",
  "ignore": [
    ".git",
    ".svn",
    "要排除的文件与文件夹"
  ]
}
```

## 数学公式使用

> 支持 [KaTeX](https://khan.github.io/KaTeX/docs/supported.html) 已支持的全部符号。

* 内联数学公式：

      $$\int_{-\infty}^\infty g(x) dx$$

      $$\fcolorbox{red}{aqua}{A}$$

      $$\textcolor{#228B22}{F=ma}$$

* 块级数学公式：

      $$
      \def\arraystretch{1.5}
      \begin{array}{c|c:c}
        a & b & c \\ \hline
        d & e & f \\
        \hdashline
        g & h & i
      \end{array}
      $$

## 流程图使用

* 支持 [mermaid](https://mermaidjs.github.io/) 以支持的流程图。

      ```mermaid
      graph TD;
        A-->B;
        A-->C;
        B-->D;
        C-->D;
      ```

## 代码高亮支持

> 采用 [prism](https://prismjs.com/) 支持所有官方支持语言。

## 鼠标悬浮可见

> 用法：把要隐藏文本内容放在 `{%s%}` 和 `{%ends%}` 之间。

    {%s%}Hello World.{%ends%}

## 点击隐藏或显示片段

> 可以使用标签定义一个新的片段：（默认隐藏），不支持嵌套

```html
<!--sec title="点我隐藏答案" show=true ces-->
B
<!--endsec-->

<!--sec title="点我看分析" show=false ces-->
CPU
<!--endsec-->

<!--sec title="点我看分析" ces-->
C
<!--endsec-->
```

> 本标签包含以下参数：

* title：标题
* show：是否初始隐藏

## 导入外部代码文件

`@import "你的代码文件" {语言}`

`@import "你的代码文件"`

> 如果没有指明相关语言，将默认根据文件后缀推断语言。

如果文件为 `markdown`，将直接引入文件中内容。文件中图片会导入到当前项目中。

## 自定义 js

书籍目录下创建 `book.js` 文件保存自定义 js 内容。

内容将在页面加载后运行。
