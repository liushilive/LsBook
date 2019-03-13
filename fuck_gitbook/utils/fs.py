import logging
import os
import shutil


def rmdir(file_path: str):
    """删除目录

    :param file_path:
    :return:
    """
    logging.debug(f"删除目录：{file_path}")
    if os.path.isdir(file_path):
        shutil.rmtree(file_path)


def mkdir(file_path: str):
    """创建目录

    :param file_path:
    :return:
    """
    logging.debug(f"创建目录：{file_path}")
    os.makedirs(file_path)


def copy_dir():
    pass


def is_file_exist(root: str, filename):
    """验证文件是否存在

    :param root:
    :param filename:
    :return:
    """
    path = os.path.join(root, filename)
    if os.path.isfile(path):
        return True
    else:
        return False
