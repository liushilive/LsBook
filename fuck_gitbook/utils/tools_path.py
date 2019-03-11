import logging
import os
import shutil


def process_input_output_path(book: str, output: str):
    """处理输入输出路径

    :param book: 书籍路径
    :param output: 输出路径
    :return: book, output
    """
    if book != ".":
        if not os.path.isdir(book):
            logging.error("书籍目录不存在")
            exit(-1)
    logging.info(f"书籍目录：{os.path.abspath(book)}")

    if output == "_book":
        output = os.path.join(book, output)
    logging.info(f"输出目录：{os.path.abspath(output)}")

    if os.path.isdir(output):
        logging.debug("清理输出目录")
        shutil.rmtree(output)
        pass

    logging.debug("创建输出目录")
    os.makedirs(output)

    return book, output
