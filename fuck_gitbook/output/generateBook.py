import logging
import time

from fuck_gitbook.parse.parse_readme import parse_readme, readme_exist
from ..models.book import Book
from ..parse.parse_config import is_config_exist
from ..parse.parse_summary import is_summary_exist, parse_summary
from ..utils.fs import copytree
from ..utils.path import process_input_output_path


def generateBook(book: Book):
    """
    使用生成器生成一本书

    :return:
    """
    start = time.time()
    logging.debug("处理输入输出路径")
    process_input_output_path(book)

    logging.debug("验证书籍目录是否存在")
    is_summary_exist(book)
    logging.debug("验证配置文件是否存在")

    logging.info("处理配置文件")
    is_config_exist(book)

    logging.info("解析目录")
    parse_summary(book)

    logging.info("解析 readme")
    readme_exist(book)

    logging.info("复制资源到输出目录")
    copytree(book.book_path, book.book_output, "_book", "SUMMARY.md", "book.json")

    logging.info("解析 readme")
    parse_readme(book)

    logging.info("生成所有页面")

    logging.info("完成生成")
    end = time.time()
    logging.info(f'成功生成完毕，耗时：{end - start}s !')
