import json
import logging
import os

from ..utils.path import get_abs_path
from ..models.book import Book
from ..utils.error import file_not_found_error


def is_config_exist(book: Book):
    """验证配置文件是否存在，并读取配置文件内容"""
    book_config = get_abs_path(book.book_path, "book.json")
    if not os.path.isfile(book_config):
        file_not_found_error(book_config, "配置文件必不可缺：请确认文件名称：book.json")
    else:
        with open(book_config, encoding="utf-8") as f:
            _json = json.load(f)
            book.config = _json

    if not os.path.isfile(get_abs_path(book.assets_path, f"../i18n/{book.config.get('language')}.json")):
        logging.error(f"语言配置错误，使用默认语言：zh-cn")
        book.config['language'] = "zh-cn"

    with open(get_abs_path(book.assets_path, f"../i18n/en.json"), encoding="utf-8") as f:
        _json = json.load(f)
        book.i18n = _json

    with open(get_abs_path(book.assets_path, f"../i18n/{book.config.get('language', 'zh-cn')}.json"),
              encoding="utf-8") as f:
        _json = json.load(f)
        book.i18n.update(_json)
