import logging
import time

from ..models.book import Book
from ..parse.parse_config import is_config_exist
from ..parse.parse_summary import is_summary_exist, parse_summary
from ..renderer.renderer_html import renderer_html
from ..utils.fs import copytree, rmdir, copy, is_file_exist
from ..utils.path import process_input_output_path, get_pure_path


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

    logging.debug("验证配置文件并处理")
    is_config_exist(book)

    logging.info("解析目录")
    parse_summary(book)

    # logging.info("验证 readme")
    # readme_exist(book)

    logging.info("复制资源到输出目录")
    rmdir(book.book_output)
    copytree(book.book_path, book.book_output, "_book", "SUMMARY.md", "book.json", *book.config.get("ignore", ()))
    if not book.base_assets:
        rmdir(book.assets_path_out)
        copytree(book.assets_path, book.assets_path_out)

    # 读取自定义 js
    if is_file_exist(book.book_path, "book.js"):
        with open(get_pure_path(book.book_path, "book.js"), encoding="utf-8") as f:
            book.book_js = f.read()

    logging.info("生成所有页面")
    assets_img = renderer_html(book)

    logging.info("复制外部图片资源到输出目录")
    img_import_path = get_pure_path(book.book_output, "lsbook_import_img")
    rmdir(img_import_path)
    while len(assets_img):
        copy(assets_img.pop(), img_import_path)

    logging.info("完成生成")
    end = time.time()
    logging.info(f'共计成功生成 {len(book.summary_classify_list)} 个页面完毕，耗时：{end - start}s !')
