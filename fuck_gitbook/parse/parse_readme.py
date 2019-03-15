import os

from ..models.book import Book
from ..utils.error import file_not_found_error, error


def readme_exist(book: Book):
    """验证readme文件

    :param book:
    :return:
    """
    readme = os.path.join(book.book_path, "readme.md")
    if not os.path.isfile(readme):
        file_not_found_error(readme, "书籍目录必须存在 readme.md")
    if len(book.summary[0]['articles']) != 0 and book.summary[0]['articles'][0].get("ref").lower() != "readme.md":
        error("目录一个链接必须为 readme.md")
