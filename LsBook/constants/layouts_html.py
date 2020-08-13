from string import Template

_html_root_map = {
    "head": "头",
    "body": "主体",
    "lang": "语言",
    "js": "js"
}

html_root_0 = Template("""<!DOCTYPE HTML>
<html lang="${lang}">
<head>${head}</head>
<body>
<div class="book match-braces">${body}</div>
${js}
</body>
</html>
""")

_html_head_map = {
    "title": "标题",
    "author": "作者",
    "base_assets_path": "本页面相对于根的资源相对路径",
    "next_relative_path": "分页：下一页路径，相对于本文件的相对路径",
    "css": "css",
    "description": "页面描述"
}
html_head_1 = Template("""
<meta charset="UTF-8">
<meta content="text/html; charset=utf-8" http-equiv="Content-Type">
<title>${title}</title>
<meta content="IE=edge" http-equiv="X-UA-Compatible"/>
<meta content="" name="description">
<meta content="${author}" name="author">
${css}
<meta content="true" name="HandheldFriendly"/>
<meta content="width=device-width, initial-scale=1, user-scalable=no" name="viewport">
<meta content="yes" name="apple-mobile-web-app-capable">
<meta content="black" name="apple-mobile-web-app-status-bar-style">
<link href="${base_assets_path}/lsbook/images/apple-touch-icon-precomposed-152.png"
      rel="apple-touch-icon-precomposed" sizes="152x152">
<link href="${base_assets_path}/lsbook/images/favicon.ico" rel="shortcut icon" type="image/x-icon">
<!--分页-->
<link href="${next_relative_path}" rel="next"/>
""")

_css_map = {
    "base_assets_path": "本页面相对于根的资源相对路径",
}
css = Template("""
<link href="${base_assets_path}/lsbook/less/website.css" rel="stylesheet">
<link href="${base_assets_path}/lsbook/katex/katex.min.css" rel="stylesheet">
<link href="${base_assets_path}/lsbook/lightbox/css/lightbox.min.css" rel="stylesheet">
""")

_js_map = {
    "base_assets_path": "本页面相对于根的资源相对路径",
}
js = Template("""
<script src="${base_assets_path}/lsbook/jquery-3.3.1.min.js"></script>
<script charset="UTF-8" src="${base_assets_path}/lsbook/jquery_mar/jquery.mark.js"></script>
<script src="${base_assets_path}/lsbook/lightbox/js/lightbox.min.js"></script>
<script src="${base_assets_path}/lsbook/lsbook.min.js"></script>
""")

_html_body_map = {
    "book_summary": "书籍目录",
    "book_body": "书籍主页",
    "basePath": "本页面相对于根的相对路径",
    "language": "语言",
    "LsBook_LINK": "LsBook_LINK",
    "SEARCH_PLACEHOLDER": "SEARCH_PLACEHOLDER",
    "github_url": "github_url",
    "js": "按需加载 js 字典",
    "previous_page_link": "上一页",
    "next_page_link": "下一页",
}
html_body_2 = Template("""<div class="book-summary">
    <div id="book-search-input" role="search">
        <input placeholder="${SEARCH_PLACEHOLDER}" type="text"/>
    </div>
    <nav role="navigation">
        <ul class="summary">
            ${book_summary}
            <li class="divider"></li>
            <li>
                <a class="lsbook-link" href="https://github.com/liushilive/lsbook" target="blank">
                    ${LsBook_LINK}
                </a>
            </li>
        </ul>
    </nav>
</div>

<div class="book-body">
    ${book_body}
</div>
<script>
    var lsbook = lsbook || [];
    lsbook.push(function () {
        lsbook.page.hasChanged({
            "config": {
                "github_url":"${github_url}",
                "language": "${language}",
                "previous_page_link": "${previous_page_link}",
                "next_page_link": "${next_page_link}"
            },
            "basePath": "${basePath}",
            "js": ${js}
        });
    });
</script>
""")

_book_summary_map = {
    "data_level": "目录级别",
    "data_path": "文件路径：相对当前文件的相对路径，无需后缀",
    "title": "标题",
    "chapter": "子目录"
}

book_summary_3_head = Template("""<li class="header">${title}</li>""")

book_summary_3_chaptere = Template("""<ul class="articles"><li class="chapter" data-level="${data_level}" data-path="${data_path}.html">
    <a href="${data_path}.html"><b>${data_level}.</b> ${title}</a>
</li></ul>
""")

book_summary_3_sub_chaptere = Template("""<ul class="articles"><li class="chapter" data-level="${data_level}" data-path="${data_path}.html">
    <a href="${data_path}.html"><b>${data_level}.</b> ${title}</a>
    ${chapter}
</li></ul>
""")

book_summary_3_chapter_active = Template("""<ul class="articles"><li class="chapter active" data-level="${data_level}" data-path="${data_path}.html">
    <a href="${data_path}.html"><b>${data_level}.</b> ${title}</a>
</li></ul>
""")

book_summary_3_sub_chapter_active = Template("""<ul class="articles"><li class="chapter active" data-level="${data_level}" data-path="${data_path}.html">
    <a href="${data_path}.html"><b>${data_level}.</b> ${title}</a>
    ${chapter}
</li></ul>
""")

_book_body_map = {
    "previous_page_link": "上一页",
    "next_page_link": "下一页",
    "basePath": "本页面相对于根的相对路径",
    "title": "页面文件名",
    "copyright": "版权声明",
    "toc": "页内目录",
    "footer": "页脚",
    "book_page": "内容",
    "SEARCH_RESULTS_TITLE": "SEARCH_RESULTS_TITLE",
    "SEARCH_NO_RESULTS_TITLE": "SEARCH_NO_RESULTS_TITLE"
}
book_body_4 = Template("""<div class="body-inner">
    <div class="book-header" role="navigation">
        <!-- Title -->
        <h1>
            <i class="fa fa-circle-o-notch fa-spin"></i>
            <a href="${basePath}">${title}</a>
        </h1>
    </div>

    <div class="page-wrapper" role="main" tabindex="-1">
        <div class="page-inner">
            <div class="search-plus" id="book-search-results">
                <div class="search-noresults">
                    <section class="normal markdown-section">
                        ${toc}
                        ${book_page}
                        ${footer}
                    </section>
                </div>
                <div class="search-results">
                    <div class="has-results">
                        <h1 class="search-results-title">${SEARCH_RESULTS_TITLE}</h1>
                        <ul class="search-results-list"></ul>
                    </div>
                    <div class="no-results">
                        <h1 class="search-results-title">${SEARCH_NO_RESULTS_TITLE}</h1>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

${previous_page_link}
${next_page_link}
""")

_previous_page_link_map = {
    "prev_title": "上一页标题",
    "prev_relative_path": "上一页相对路径：相对本页面",
}
previous_page_link_5_1 = Template("""
<a aria-label="Previous page: ${prev_title}" class="navigation navigation-prev" href="${prev_relative_path}">
    <i class="fa fa-angle-left"></i>
</a>
""")

_next_page_link_map = {
    "next_title": "下一页标题",
    "next_relative_path": "下一页相对路径：相对本页面",
}

next_page_link_5_2 = Template("""
<a aria-label="Next page: ${next_title}" class="navigation navigation-next" href="${next_relative_path}">
    <i class="fa fa-angle-right"></i>
</a>
""")
