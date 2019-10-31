import logging
import os
import shutil

from ..utils.path import get_pure_path


def rmdir(file_path: str):
    """删除目录

    :param file_path:
    :return:
    """
    if os.path.isdir(file_path):
        logging.debug(f"清理目录：{file_path}")
        shutil.rmtree(file_path)


def mkdir(file_path: str):
    """创建目录

    :param file_path:
    :return:
    """
    logging.debug(f"创建目录：{file_path}")
    os.makedirs(file_path)


def copytree(src, dst, *ignore):
    """复制目录"""
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(*ignore))


def copy(src, dst):
    """复制文件到文件夹"""
    if not os.path.isdir(dst):
        mkdir(dst)
    shutil.copy(src, dst)


def is_file_exist(root: str, filename):
    """验证文件是否存在

    :param root:
    :param filename:
    :return:
    """
    path = get_pure_path(root, filename)
    if os.path.isfile(path):
        return True
    else:
        return False
