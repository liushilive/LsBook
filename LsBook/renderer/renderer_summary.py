import logging
import os
import time

import mistune

from LsBook.constants.layouts_html import book_summary_3_head, book_summary_3_chapter_active, \
    book_summary_3_chaptere, book_summary_3_sub_chapter_active, book_summary_3_sub_chaptere
from LsBook.models.book import Book
from LsBook.utils.path import get_pure_path, get_filename_not_ext


class SummaryRenderer(mistune.Renderer):
    def __init__(self):
        super().__init__()
        self.toc_tree = []

    def link(self, link, title, text):
        """Rendering a given link with content and title.

        :param link: href link for ``<a>`` tag.
        :param title: title content for `title` attribute.
        :param text: text content for description.
        """
        link = mistune.escape_link(link)
        return f'["{link}","{title}","{text}"]'

    def paragraph(self, text):
        """Rendering paragraph tags. Like ``<p>``."""
        return text.strip(' ')

    def header(self, text, level, raw=None):
        """Rendering header/heading tags like ``<h1>`` ``<h2>``.

        :param text: rendered text content for the header.
        :param level: a number for the header level, for example: 1.
        :param raw: raw text content of the header.
        """
        self.toc_tree.append([text, []])
        return f'{{"header":["{text}"]}}'

    def list(self, body, ordered=True):
        """Rendering list tags like ``<ul>`` and ``<ol>``.

        :param body: body contents of the list.
        :param ordered: whether this list is ordered or not.
        """
        body = f'[{body}]'
        if len(self.toc_tree) == 0:
            self.toc_tree.append(["", []])

        self.toc_tree[-1][1] = body
        return f"{body}"

    def list_item(self, text):
        """Rendering list item snippet. Like ``<li>``."""
        return text.replace("\\", r"/")

    def newline(self):
        """Rendering newline element."""
        return ''


def renderer_summary(book: Book):
    """生成目录结构

    对每个页面独立生成目录"""
    P_list = []
    start = time.time()

    current_count = 0
    for current_level, current_ref, current_title in book.summary_level_list:
        ret = book.pool.submit(_read_summary, book.book_output, book.summary,
                               current_level, current_ref, current_count, book.summary_level_list)
        logging.debug(f"对每个页面独立生成目录：{current_level, current_title, current_ref}")
        current_count += 1
        P_list.append(ret)

    for ret in P_list:
        book.summary_classify_list.update(ret.result())

    end = time.time()
    logging.info(f"生成 {current_count} 个目录结构，耗时：{end - start}s")
    pass


def _read_summary(book_output, book_summary, current_level, current_ref, current_count, summary_level_list):
    summary = ""
    summary_classify_list = {current_level: {
        "title": "",
        "level": current_level,
        "prev_title": "",
        "prev_relative_path": "",
        "next_title": "",
        "next_relative_path": "",
        "summary": summary
    }}
    for item in book_summary:
        title = item.get("title", "")
        articles = item.get("articles", "")
        # data_level = item.get("data_level")
        summary += book_summary_3_head.substitute(title=title)
        if len(articles) == 0:
            continue

        summary += _iter_summary(book_output, summary_classify_list, articles, current_level, current_ref,
                                 current_count, summary_level_list)
    summary_classify_list[current_level]["summary"] = summary
    return summary_classify_list


def _iter_summary(book_output, summary_classify_list, old_articles,
                  current_level, current_ref, current_count, summary_level_list: list):
    summary_sub = ""
    for item in old_articles:
        title = item.get("title", "")
        ref = item.get("ref", "")
        articles = item.get("articles", "")
        data_level = item.get("data_level", "")

        tmp_dict = {
            'title': title,
            'data_level': data_level,
            'data_path': get_relpath(book_output, ref, current_ref),
        }
        if len(articles) == 0:
            summary_sub += data_level == current_level \
                           and book_summary_3_chapter_active.substitute(tmp_dict) \
                           or book_summary_3_chaptere.substitute(tmp_dict)
        else:
            tmp_dict['chapter'] = _iter_summary(book_output, summary_classify_list,
                                                articles, current_level, current_ref, current_count, summary_level_list)
            summary_sub += data_level == current_level \
                           and book_summary_3_sub_chapter_active.substitute(tmp_dict) \
                           or book_summary_3_sub_chaptere.substitute(tmp_dict)

        if data_level == current_level:
            summary_classify_list[current_level]["title"] = title
            summary_classify_list[current_level]["href"] = ref
            summary_classify_list[current_level]["basePath"] = get_relative_path(book_output, ref)
            if current_count > 0:
                summary_classify_list[current_level]["prev_title"] = summary_level_list[current_count - 1][2]
                summary_classify_list[current_level]["prev_relative_path"] = get_relpath(
                    book_output, summary_level_list[current_count - 1][1], current_ref
                ) + ".html"
            if current_count < len(summary_level_list) - 1:
                summary_classify_list[current_level]["next_title"] = summary_level_list[current_count + 1][2]
                summary_classify_list[current_level]["next_relative_path"] = get_relpath(
                    book_output, summary_level_list[current_count + 1][1], current_ref
                ) + ".html"
    return summary_sub


def get_relpath(book_output, ref: str, current_ref: str):
    """转换为相对路径"""
    _ref = ref
    if os.path.basename(_ref).lower() == "readme.md":
        if os.path.dirname(ref):
            _ref = os.path.join(os.path.relpath(os.path.dirname(ref)), "index.md")
        else:
            _ref = "index.md"
    return get_pure_path(get_filename_not_ext(
        os.path.relpath(
            os.path.join(book_output, _ref),
            os.path.dirname(os.path.join(book_output, current_ref))
        )
    ))


def get_relative_path(book_output, ref: str):
    """转换本页面相对于根的相对路径"""
    return get_pure_path(os.path.relpath(book_output, os.path.dirname(os.path.join(book_output, ref))))
