import os

from ..models.book import Book
from ..utils.error import error, file_not_found_error
from ..utils.path import get_pure_path


def readme_exist(book: Book):
    """验证readme文件

    :param book:
    :return:
    """
    readme = get_pure_path(book.book_path, "readme.md")
    if not os.path.isfile(readme):
        readme = get_pure_path(book.book_path, "README.md")
        if not os.path.isfile(readme):
            file_not_found_error(readme, "书籍目录必须存在 readme.md")

    if len(book.summary[0]['articles']) != 0 and book.summary[0]['articles'][0].get("ref", "").lower() != "readme.md":
        error("目录一个链接必须为 readme.md")
