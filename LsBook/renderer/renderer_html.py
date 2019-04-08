import logging
import os
import re
import json
from concurrent.futures.process import ProcessPoolExecutor

from LsBook.parse.parse_file import parse_file
from LsBook.utils.path import set_extension, get_pure_path

from LsBook.constants.layouts_html import html_root_0, html_head_1, html_body_2, book_body_4, \
    previous_page_link_5_1, next_page_link_5_2
from LsBook.models.book import Book


def renderer_html(book: Book):
    # author = book.config.get("author")
    # book_title = book.config.get("title")
    # for item in book.summary_classify_list.values():
    #     title = item.get("title")
    #     level = item.get("level")
    #     prev_title = item.get("prev_title")
    #     prev_relative_path = item.get("prev_relative_path")
    #     next_title = item.get("next_title")
    #     next_relative_path = item.get("next_relative_path")
    #     book_summary = item.get("summary")
    #     href = item.get("href")
    #     basePath = item.get("basePath")
    #
    #     L = _render_html(book_title, title, author, basePath, book_summary,
    #                      prev_title, prev_relative_path, next_title, next_relative_path,
    #                      href, book.book_path, book.book_output
    #                      )
    #
    #     logging.debug(f"生成页面：{level, title, href}")
    # ------------------------------------------------------------------------
    search_plus_index = {}
    P_list = []
    with ProcessPoolExecutor() as pool:
        # config
        author = book.config.get("author", "")
        book_title = book.config.get("title", "")
        language = book.config.get("language", "")
        github_url = book.config.get("github_url", "")

        for item in book.summary_classify_list.values():
            title = item.get("title", "")
            level = item.get("level", "")
            prev_title = item.get("prev_title", "")
            prev_relative_path = item.get("prev_relative_path", "")
            next_title = item.get("next_title", "")
            next_relative_path = item.get("next_relative_path", "")
            book_summary = item.get("summary", "")
            href = item.get("href", "")
            basePath = item.get("basePath", "")

            P_list.append(
                pool.submit(_render_html, book_title, title, author, basePath, book_summary,
                            prev_title, prev_relative_path, next_title, next_relative_path,
                            href, book.book_path, book.book_output, language, book.i18n, github_url
                            )
            )
            logging.debug(f"生成页面：{level, title, href}")

    for ret in P_list:
        search_plus_index.update(ret.result())
    # 写入索引
    with open(os.path.join(book.book_output, "search_plus_index.json"), 'w', encoding="utf-8") as f:
        f.write(json.dumps(search_plus_index, ensure_ascii=False))


def _render_html(book_title, title, author, basePath, book_summary,
                 prev_title, prev_relative_path, next_title, next_relative_path, href, book_path, book_output,
                 language, i18n, github_url):
    """生产HTML，返回索引"""
    # 解析页面
    book_page = parse_file(os.path.join(book_path, href))

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
        book_title=book_title,
        basePath=basePath,
        toc="",  # todo 插件完善
        footer="",
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
        GITBOOK_LINK=i18n.get("GITBOOK_LINK"),
        github_url=github_url,
        SEARCH_PLACEHOLDER=i18n.get("SEARCH_PLACEHOLDER")
    )

    # 组装头
    head = html_head_1.substitute(
        title=book_title,
        author=author,
        basePath=basePath,
        next_relative_path=next_relative_path
    )

    # 组装整体
    page = html_root_0.substitute(
        head=head,
        body=body,
        lang=language,
        basePath=basePath,
    )

    out_path = os.path.join(book_output, href)

    if os.path.basename(href).lower() == "readme.md":
        out_path = os.path.join(os.path.dirname(out_path), "index.html")
    else:
        out_path = set_extension(out_path, ".html")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(page)

    body = re.sub(r"(<([^>]+)>)", "", book_page)
    body = re.sub(r"[\n ]+", "", body)

    url = get_pure_path(os.path.relpath(out_path, book_output))

    return {
        url: {
            "url": url,
            "title": title,
            "keywords": "",
            "body": body
        }
    }
