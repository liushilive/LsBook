import json
import logging
import os
import re
import time

from .html_renderer import parse_file
from ..constants.layouts_html import book_body_4, css, html_body_2, html_head_1, html_root_0, js, next_page_link_5_2, \
    previous_page_link_5_1
from ..models.book import Book
from ..utils.path import get_pure_path, set_extension


def renderer_html(book: Book):
    search_plus_index = {}
    assets_img = set()
    P_list = []
    # config
    author = book.config.get("author", "")
    book_title = book.config.get("title", "")
    language = book.config.get("language", "")
    github_url = book.config.get("github_url", "")

    for item in book.summary_classify_list:
        title = item.get("title", "")
        level = item.get("level", "")
        prev_title = item.get("prev_title", "")
        prev_relative_path = item.get("prev_relative_path", "")
        next_title = item.get("next_title", "")
        next_relative_path = item.get("next_relative_path", "")
        book_summary = item.get("summary", "")
        href = item.get("href", "")
        basePath = item.get("basePath", "")

        # dict_, assets_img_ = _render_html(book_title, title, author, basePath, book_summary,
        #                                   prev_title, prev_relative_path, next_title, next_relative_path,
        #                                   href, book.book_path, book.book_output, language, book.i18n, github_url,
        #                                   book.base_assets, book.book_js)
        #
        # search_plus_index.update(dict_)
        # assets_img.update(assets_img_)

        P_list.append(
            book.pool.submit(
                _render_html, book_title, title, author, basePath, book_summary,
                prev_title, prev_relative_path, next_title, next_relative_path,
                href, book.book_path, book.book_output, language, book.i18n, github_url,
                book.base_assets, book.book_js
            )
        )
        logging.debug(f"生成页面：{level, title, href}")

    for ret in P_list:
        dict_, assets_img_ = ret.result()
        search_plus_index.update(dict_)
        assets_img.update(assets_img_)

    # 写入索引
    with open(get_pure_path(book.book_output, "search_plus_index.json"), 'w', encoding="utf-8") as f:
        f.write(json.dumps(search_plus_index, ensure_ascii=False))

    return assets_img


def _render_html(book_title, title, author, basePath, book_summary,
                 prev_title, prev_relative_path, next_title, next_relative_path, href, book_path, book_output,
                 language, i18n, github_url, base_assets, book_js):
    """生产HTML，返回索引"""
    # 解析页面
    base_assets_path = get_pure_path(*(basePath, base_assets) if base_assets else basePath)  # 资源路径

    book_page, toc_tree, tag_katex, tag_mermaid, tag_prism, tag_lightbox, assets_img = parse_file(
        get_pure_path(book_path, href),
        basePath
    )

    # 组装页内导航
    toc = ""
    if len(toc_tree) > 0:
        toc = "<div id='anchor-navigation-ex-navbar'><i class='fa fa-anchor'></i><ul><li>" \
              "<span class='title-icon fa fa-hand-o-right'></span><a aria-label class='on-toolbar-action' href='' " \
              f"""onclick="$('.fa.fa-align-justify').parent()[0].click();">{i18n.get('SUMMARY_TOGGLE')}</a></li>"""

        for h1Toc in toc_tree:
            toc += "<li><span class='title-icon fa fa-hand-o-right'></span>" \
                   "<a href='#" + h1Toc["url"] + "'><b>" + h1Toc["level"] + "</b>" + h1Toc["name"] + "</a></li>"
            if len(h1Toc["children"]) > 0:
                toc += "<ul>"
                for h2Toc in h1Toc["children"]:
                    toc += "<li><span class='title-icon fa fa-hand-o-right'></span>" \
                           "<a href='#" + h2Toc["url"] + "'><b>" + h2Toc["level"] + "</b>" + h2Toc["name"] + "</a></li>"
                    if len(h2Toc["children"]) > 0:
                        toc += "<ul>"
                        for h3Toc in h2Toc["children"]:
                            toc += "<li><span class='title-icon fa fa-hand-o-right'></span><a href='#" + h3Toc[
                                "url"] + "'><b>" + h3Toc["level"] + "</b>" + h3Toc["name"] + "</a></li>"
                        toc += "</ul>"
                toc += "</ul>"

        toc += "</ul></div><a href='#" + toc_tree[0]['url'] \
               + "' id='anchorNavigationExGoTop'><i class='fa fa-arrow-up'></i></a>"
    footer = f"""<footer class="page-footer"><span class="copyright">© {time.localtime().tm_year} {author}. 
All rights reserved.</span><span class="footer-modification">
<span id="busuanzi_container_site_uv" style="display:none">本站访客数 <span id="busuanzi_value_site_uv">
</span> 人次</span></span></footer>
<script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
<script>
{book_js}
</script>"""

    # js
    _js = {}
    if tag_katex:
        _js["katex"] = [get_pure_path(f"{base_assets_path}/lsbook/katex/katex.min.js"),
                        get_pure_path(f"{base_assets_path}/lsbook/katex/contrib/auto-render.min.js")]
    if tag_lightbox:
        pass
    if tag_mermaid:
        _js["mermaid"] = [get_pure_path(f"{base_assets_path}/lsbook/mermaid/mermaid.min.js")]
    if tag_prism:
        _js["prism"] = [get_pure_path(f"{base_assets_path}/lsbook/prismjs/clipboard.min.js"),
                        get_pure_path(f"{base_assets_path}/lsbook/prismjs/prism.js")]

    # 上下页
    previous_page_link = prev_relative_path != "" and previous_page_link_5_1.substitute(
        prev_title=prev_title,
        prev_relative_path=prev_relative_path
    ) or ""
    next_page_link = next_relative_path != "" and next_page_link_5_2.substitute(
        next_title=next_title,
        next_relative_path=next_relative_path,
    ) or ""

    # 组装正文
    book_body = book_body_4.substitute(
        previous_page_link=previous_page_link,
        next_page_link=next_page_link,
        title=title,
        basePath=basePath,
        toc=toc,
        footer=footer,
        book_page=book_page,
        SEARCH_RESULTS_TITLE=i18n.get("SEARCH_RESULTS_TITLE"),
        SEARCH_NO_RESULTS_TITLE=i18n.get("SEARCH_NO_RESULTS_TITLE")
    )

    # 组装身体
    body = html_body_2.substitute(
        book_summary=book_summary,
        book_body=book_body,
        basePath=basePath,
        language=language,
        LsBook_LINK=i18n.get("LsBook_LINK"),
        github_url=github_url,
        SEARCH_PLACEHOLDER=i18n.get("SEARCH_PLACEHOLDER"),
        js=_js,
        previous_page_link=prev_relative_path,
        next_page_link=next_relative_path
    )

    # 组装头
    head = html_head_1.substitute(
        title=f"{book_title} - {title}",
        author=author,
        base_assets_path=base_assets_path,
        next_relative_path=next_relative_path,
        css=css.substitute(base_assets_path=base_assets_path),
        description=title
    )

    # 组装整体
    page = html_root_0.substitute(
        head=head,
        body=body,
        lang=language,
        js=js.substitute(base_assets_path=base_assets_path)
    )

    out_path = get_pure_path(book_output, href)

    if os.path.basename(href).lower() == "readme.md":
        out_path = get_pure_path(os.path.dirname(out_path), "index.html")
    else:
        out_path = set_extension(out_path, ".html")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(page)

    body = re.sub(r"(<([^>]+)>)", "", book_page)
    body = re.sub(r"[\n ]+", "", body)

    url = get_pure_path(os.path.relpath(out_path, book_output))

    return {url: {
        "url": url,
        "title": title,
        "keywords": "",
        "body": body,
    }}, assets_img
