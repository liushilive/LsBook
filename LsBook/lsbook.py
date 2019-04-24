import json
import logging
from concurrent.futures.process import ProcessPoolExecutor

from urllib import request

from .models.book import Book
from .output.generateBook import generateBook
from .utils.argument import cmd_argument
from .utils.logger import log_init
from . import __version__


def main():
    msg = None
    try:
        r = request.urlopen('https://pypi.org/pypi/lsbook/json', timeout=2)
        version = json.loads(r.read().decode('utf-8')).get("info").get("version")
        for x, y in zip(version.split("."), __version__.split(".")):
            if int(x) > int(y):
                msg = f"\n当前版本：{__version__}\t已发布最新版本：{version}\t请使用命令\t'pip install -U lsbook'\t升级"
                break
    except:
        pass

    args = cmd_argument()
    build: bool = args.build
    book_path: str = args.book
    book_output: str = args.output
    log_level: str = args.log

    log_init(log_level)

    logging.debug(f"入参：{args}")

    try:
        if build:
            logging.info("开始生成书籍")
            pool = ProcessPoolExecutor()
            book = Book(book_path, book_output, pool)

            # 生成书籍
            generateBook(book)
        else:
            logging.warning("lsbook 查看帮助")
    finally:
        if msg:
            logging.warning(msg)


if __name__ == '__main__':
    main()
