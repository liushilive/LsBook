import json
import logging
import os

from LsBook.utils.path import get_abspath
from ..models.book import Book
from ..utils.error import file_not_found_error


def is_config_exist(book: Book):
    """验证配置文件是否存在，并读取配置文件内容"""
    book_config = get_abspath(book.book_path, "book.json")
    if not os.path.isfile(book_config):
        file_not_found_error(book_config, "配置文件必不可缺：请确认文件名称：book.json")
    else:
        with open(book_config, encoding="utf-8") as f:
            js = json.load(f)
            book.config = js

    if not os.path.isfile(get_abspath(book.assets_path, f"../i18n/{book.config.get('language', 'zh-cn')}.json")):
        logging.error(f"语言 {book.config.get('language', 'zh-cn')} 错误，使用默认语言：zh-cn")
        book.config['language'] = "zh-cn"

    with open(get_abspath(book.assets_path, f"../i18n/en.json"), encoding="utf-8") as f:
        js = json.load(f)
        book.i18n = js

    with open(get_abspath(book.assets_path, f"../i18n/{book.config.get('language', 'zh-cn')}.json"),
              encoding="utf-8") as f:
        js = json.load(f)
        book.i18n.update(js)
