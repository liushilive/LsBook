import logging
import os

from fuck_gitbook.utils.error import dir_not_found_error
from ..models.book import Book


def process_input_output_path(book: Book):
    """处理输入输出路径

    :param book: 书籍路径
    :param output: 输出路径
    :return: book, output
    """
    if book.book_path != ".":
        if not os.path.isdir(book.book_path):
            dir_not_found_error(book.book_path)

    book.book_path = os.path.abspath(book.book_path)
    logging.info(f"书籍目录：{book.book_path}")

    if book.book_output == "_book":
        book.book_output = os.path.join(book.book_path, book.book_output)
    logging.info(f"输出目录：{book.book_output}")


def set_extension(filename, ext):
    """更改文件的扩展名

    :param filename: 文件名称
    :param ext: 扩展名
    :return:
    """
    # 提取文件名
    # 修改扩展名
    pass
