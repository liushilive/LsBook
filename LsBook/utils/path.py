import logging
import os
from pathlib import Path

from ..models.book import Book
from ..utils.error import dir_not_found_error


def process_input_output_path(book: Book):
    """处理输入输出路径

    :param book: 书籍路径
    :return: book, output
    """

    book.book_path = get_abspath(book.book_path)
    logging.info(f"书籍目录：{book.book_path}")

    if not os.path.isdir(book.book_path):
        dir_not_found_error(book.book_path)

    book.book_output = get_abspath(book.book_path, book.book_output)
    logging.info(f"输出目录：{book.book_output}")

    book.assets_path = get_abspath(os.path.split(os.path.dirname(__file__))[0], *book.assets_path)
    logging.debug(f"资源路径：{book.assets_path}")

    book.assets_path_out = get_abspath(book.book_output, book.assets_path_out)
    logging.debug(f"资源输出路径：{book.assets_path_out}")


def get_filename_not_ext(filename) -> str:
    """去除文件扩展名"""
    return os.path.splitext(filename)[0]


def set_extension(filename, ext):
    """更改文件的扩展名

    :param filename: 文件名称
    :param ext: 扩展名
    :return:
    """
    return get_filename_not_ext(filename) + ext


def get_pure_path(path, *paths):
    """获取路径，分隔符为 / """
    return Path(os.path.join(path, *paths)).as_posix()


def get_abspath(path, *paths):
    """获取绝对路径"""
    return os.path.abspath(get_pure_path(path, *paths))
