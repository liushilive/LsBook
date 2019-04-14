import logging


def file_not_found_error(filename, msg=""):
    """抛出找不到文件异常"""
    logging.error(f"找不到文件：{filename}\n{msg}")
    exit(-1)


def dir_not_found_error(path, msg=""):
    """抛出找不到目录异常"""
    logging.error(f"找不到目录：{path}\n{msg}")
    exit(-1)


def error(msg):
    """抛出通用异常信息"""
    logging.error(msg)
    exit(-1)
