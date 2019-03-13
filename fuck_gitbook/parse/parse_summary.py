import json
import os

import mistune

from fuck_gitbook.models.book import Book
from fuck_gitbook.renderer.renderer_summary import SummaryRenderer
from fuck_gitbook.utils.error import file_not_found_error


def parse_summary(book: Book):
    """解析目录

    :return:
    """
    # 得到目录 html
    with open(book.summary_path, encoding="utf-8") as f:
        summary_dict = []
        summary = SummaryRenderer()
        md = mistune.Markdown(renderer=summary)
        md.parse(f.read())
        for c1 in summary.toc_tree:
            header_text, sub = c1
            summary_dict.append({"title": header_text, "articles": []})
            if len(sub) == 0:
                continue
            data_json = json.loads(sub.replace("][", "],["), encoding="utf-8")
            summary_dict[-1]["articles"] = _iter_list(data_json)

    book.summary = summary_dict


def _iter_list(data_json):
    """迭代列表项

    :return:
    """
    sub = []
    for item in data_json:
        if type(item[0]) is str:
            sub.append({"title": item[2], "ref": item[0], "articles": []})
            pass
        else:
            sub[-1]["articles"].append(_iter_list(item))
            pass
    return sub


def is_summary_exist(book: Book):
    """验证目录文件是否存在

    :param book:
    :return:
    """
    book_summary = os.path.join(book.book_path, "summary.md")
    if not os.path.isfile(book_summary):
        file_not_found_error(book)
    else:
        book.summary_path = book_summary
