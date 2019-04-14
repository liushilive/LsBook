import json
import os
import re
import mistune

from LsBook.models.book import Book
from LsBook.renderer.renderer_summary import SummaryRenderer
from LsBook.utils.error import file_not_found_error, error

count_sum = 0
data_level = []
iter_count = 0


def parse_summary(book: Book):
    """解析目录"""
    # 得到目录 html
    global count_sum, iter_count, data_level
    with open(book.summary_path, encoding="utf-8") as f:
        summary_dict = []
        page = f.read()
        page = re.sub(r"<!--.*?-->", "", page, flags=re.S)
        page = re.sub(r"^(?!\s*\*|#).*", "", page, flags=re.M)
        page = re.sub(r"\s*[\n|\r\n]+", r"\n\n", page)
        summary = SummaryRenderer()
        md = mistune.Markdown(renderer=summary)
        md.parse(page)
        count = 0
        for c1 in summary.toc_tree:
            if count == 0:
                c1[0] = c1[0] if c1[0] else book.i18n.get("SUMMARY")
            count += 1
            count_sum += 1
            iter_count = 0
            data_level = data_level[:iter_count]
            data_level.append(str(count))

            header_text, sub = c1

            summary_dict.append({"title": header_text, "articles": [], "data_level": f"{'.'.join(data_level)}"})

            if len(sub) == 0:
                continue
            try:
                data_json = json.loads(sub.replace("][", "],["), encoding="utf-8")
                summary_dict[-1]["articles"] = _iter_list(book, data_json)
            except Exception as e:
                error(f"解析目录异常，请检查目录结构：\n{sub}\n{e}")
    book.summary = summary_dict


def _iter_list(book, data_json):
    """迭代列表项

    :return:
    """
    global count_sum, iter_count, data_level
    sub = []
    count = 0
    iter_count += 1
    for item in data_json:
        if type(item[0]) is str:
            count_sum += 1
            count += 1
            data_level = data_level[:iter_count]
            data_level.append(str(count))
            data_level_str = '.'.join(data_level)
            book.summary_level_list = [data_level_str, item[0], item[2]]
            sub.append({"title": item[2], "ref": item[0], "articles": [], "data_level": f"{data_level_str}"})
            pass
        else:
            sub[-1]["articles"] = _iter_list(book, item)
            pass
    iter_count -= 1
    return sub


def is_summary_exist(book: Book):
    """验证目录文件是否存在

    :param book:
    :return:
    """
    book_summary = os.path.join(book.book_path, "summary.md")
    if not os.path.isfile(book_summary):
        book_summary = os.path.join(book.book_path, "SUMMARY.md")
        if not os.path.isfile(book_summary):
            book_summary = os.path.join(book.book_path, "summary.md")
            file_not_found_error(book_summary)
    else:
        book.summary_path = book_summary
