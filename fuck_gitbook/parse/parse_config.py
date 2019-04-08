import json
import logging
import os

from fuck_gitbook.models.book import Book
from fuck_gitbook.utils.error import file_not_found_error, error


def is_config_exist(book: Book):
    """验证配置文件是否存在，并读取配置文件内容"""
    book_config = os.path.join(book.book_path, "book.json")
    if not os.path.isfile(book_config):
        file_not_found_error(book_config)
    else:
        with open(book_config, encoding="utf-8") as f:
            js = json.load(f)
            book.config = js

    if not os.path.isfile(os.path.join(book.assets_path, f"../i18n/{book.config.get('language')}.json")):
        logging.error(f"语言 {book.config.get('language')} 错误，使用默认语言：zh-cn")
        book.config['language'] = "zh-cn"

    with open(os.path.join(book.assets_path, f"../i18n/{book.config.get('language')}.json"), encoding="utf-8") as f:
        js = json.load(f)
        book.i18n = js
