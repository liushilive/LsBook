import json
import os

from fuck_gitbook.models.book import Book
from fuck_gitbook.utils.error import file_not_found_error


def is_config_exist(book: Book):
    """验证配置文件是否存在，并读取配置文件内容"""
    book_config = os.path.join(book.book_path, "book.json")
    if not os.path.isfile(book_config):
        file_not_found_error(book_config)
    else:
        with open(book_config, encoding="utf-8") as f:
            js = json.load(f)
            book.config = js
