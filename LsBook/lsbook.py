import json
import logging
import os
from concurrent.futures.process import ProcessPoolExecutor
from threading import Thread
from urllib import request

from LsBook.utils.fs import copytree, rmdir
from . import __version__
from .models.book import Book
from .output.generateBook import generateBook
from .utils.argument import cmd_argument
from .utils.logger import log_init
from .utils.path import get_pure_path

msg = None


def query_version():
    try:
        global msg
        r = request.urlopen('https://pypi.org/pypi/lsbook/json', timeout=2)
        version = json.loads(r.read().decode('utf-8')).get("info").get("version")
        for x, y in zip(version.split("."), __version__.split(".")):
            if int(x) < int(y):
                break
            elif int(x) == int(y):
                continue
            msg = f"\n当前版本：{__version__}\t已发布最新版本：{version}\n请使用命令\t'pip install -U lsbook'\t升级"
    except:
        pass


def main(debug=False):
    th = Thread(target=query_version)
    if not debug:
        th.start()

    args = cmd_argument()
    build: bool = args.build
    book_path: str = args.book
    book_output: str = args.output
    log_level: str = args.log
    base_assets = args.base_assets
    assets = args.assets
    log_init(log_level)

    logging.debug(f"入参：{args}")

    try:
        if build:
            logging.info("开始生成书籍")
            if debug:
                pool = ProcessPoolExecutor(1)
            else:
                pool = ProcessPoolExecutor()
            book = Book(book_path, book_output, pool, base_assets)

            # 生成书籍
            generateBook(book)
        elif assets:
            out = get_pure_path(assets, "lsbook")
            logging.info(f"释放资源：{out}")
            rmdir(out)
            copytree(get_pure_path(os.path.dirname(__file__), "assets", "lsbook"), out)
            logging.info(f"释放资源完毕")
        else:
            logging.warning("lsbook 查看帮助")
    finally:
        if not debug:
            th.join()
            if msg:
                logging.warning(msg)


if __name__ == '__main__':
    main()
