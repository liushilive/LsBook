import logging
from concurrent.futures.process import ProcessPoolExecutor

from .models.book import Book
from .output.generateBook import generateBook
from .utils.argument import cmd_argument
from .utils.logger import log_init


def main():
    args = cmd_argument()
    build: bool = args.build
    book_path: str = args.book
    book_output: str = args.output
    log_level: str = args.log

    log_init(log_level)

    logging.debug(f"入参：{args}")

    if build:
        logging.info("开始生成书籍")
        pool = ProcessPoolExecutor()
        book = Book(book_path, book_output, pool)

        # 生成书籍
        generateBook(book)
    logging.warning("lsbook 查看帮助")


if __name__ == '__main__':
    main()
