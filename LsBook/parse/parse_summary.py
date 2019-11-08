import logging
import os
import re
import time
from xml.etree import ElementTree

import mistletoe

from ..models.book import Book
from ..renderer.summary_renderer import SummaryRenderer, renderer_summary
from ..utils.error import file_not_found_error
from ..utils.path import get_abspath

count_sum = 0
data_level = []
iter_count = 0
_head_count = 0
_tree_summary = ElementTree.Element("ul")
_tree_summary.set("class", "summary")


def parse_summary(book: Book):
    """解析目录"""
    # 得到目录 html
    global count_sum, iter_count, data_level
    with open(book.summary_path, encoding="utf-8") as f:
        page = f.read()
    page = re.sub(r"<!--.*?-->", "", page, flags=re.S)
    page_su = re.sub(r"^(?!\s*\*|#).*", "", page, flags=re.M)
    # 生成目录结构
    with SummaryRenderer() as renderer:
        renderer.render(mistletoe.Document(page_su))

    summary_classify_list = []
    P_list = []
    start = time.time()
    for _index, _item in renderer.summary.items():
        # 根据目录结构为每个页面生成目录
        # 计算相对路径
        # summary_classify = renderer_summary(book, _item, _index, page)
        P_list.append(book.pool.submit(renderer_summary, book.book_output, _item, _index, page, renderer.summary))

    for ret in P_list:
        summary_classify_list.append(ret.result())

    end = time.time()
    logging.info(f"生成 {len(summary_classify_list)} 个目录结构，耗时：{end - start}s")
    book._summary_classify_list = summary_classify_list


def is_summary_exist(book: Book):
    """验证目录文件是否存在

    :param book:
    :return:
    """
    book_summary = get_abspath(book.book_path, "SUMMARY.md")
    if not os.path.isfile(book_summary):
        file_not_found_error(book_summary, "必须存在目录，请检查文件名称是否准确：SUMMARY.md")

    book.summary_path = book_summary
