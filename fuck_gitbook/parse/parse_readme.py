import logging
import os

from fuck_gitbook.models.book import Book
from fuck_gitbook.utils.error import file_not_found_error


def parse_readme(book: Book):
    is_readme_exist(book)
    pass


def is_readme_exist(book: Book):
    """验证readme文件是否存在

    :param book:
    :return:
    """
    book_summary = os.path.join(book.book_path, "readme.md")
    if not os.path.isfile(book_summary):
        file_not_found_error(book_summary)
    else:
        book.summary_path = book_summary
