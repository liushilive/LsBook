"""
代码引入语法分析
"""
import os
import re

from ...constants.lang import lang_dict
from ...utils.path import get_pure_path


def process_file_import(book_path: str, page: str, base_path: str):
    """代码文件引入语法分析 @import file

    :param base_path: 相对于跟的相对路径
    :param book_path: 书籍目录
    :param page: 页面内容
    :return: 处理后页面内容
    """
    # 记录引入文件的图片资源
    assets_img = set()
    # 按行处理
    pages = re.split(r"\n|\r\n", page)
    tag = True
    new_page = ""
    for line in pages:
        if line.find("```") != -1:
            tag = not tag
            new_page += line + "\n"
            continue
        if tag:
            resurt_ = split_import(line, book_path)
            if resurt_:
                prefix_, lang_, import_file_ = resurt_

                if lang_ == 'markdown':
                    line = md_file(assets_img, base_path, book_path, import_file_)
                else:
                    # line = read_code(prefix_, lang_, import_file_)
                    line = read_code(*resurt_)
        new_page += line + "\n"
    return new_page, assets_img


def read_code(prefix_, lang_, import_file_):
    """代码文件引入

    :param prefix_: 前缀
    :param lang_: 语言
    :param import_file_: 文件
    :return:
    """
    with open(import_file_, encoding="utf-8") as f:
        code = f.read()
    code = re.sub(r"(\r\n)|(\n)", '\n' + prefix_, code)
    line = f"{prefix_}```{lang_}\n{prefix_}{code}\n{prefix_}```"
    return line


def split_import(line, book_path):
    """分割 import 语句，判断语言

    :param line: 行内容
    :param book_path: 书籍路径
    :return:
    """
    match = re.match(r"""^(\s*)@import\s*[\"|\'](.*)[\"|\']\s*({(.*)})*(\s*)$""", line)
    if match:
        prefix_ = match.group(1)
        path_ = match.group(2)
        code_type_ = match.group(4)
        lang_ = code_type_ or lang_dict.get(os.path.splitext(path_)[1][1:])[0]
        import_file_ = get_pure_path(book_path, path_)

        return prefix_, lang_, import_file_
    else:
        return None


def md_file(assets_img, base_path, book_path, import_file):
    """md 文件引入处理

    :param assets_img: 外部图片集合
    :param base_path: 相对书籍跟路径
    :param book_path: 书籍路径
    :param import_file: 引入文件路径
    :return:
    """
    with open(import_file, encoding="utf-8") as f:
        code = f.read()
    tag_1 = True
    new_code = ""
    for line_ in re.split(r"\n|\r\n", code):
        if line_.find("```") != -1:
            tag_1 = not tag_1
        else:
            if tag_1:
                # 处理引入文件中的图片问题
                # 对于项目内图片，重建相对路径
                # 对于项目外图片，记录图片路径，生成书籍后，复制图片到指定目录，重建相对路径
                for link_0, link_1 in re.findall(r'(!\[.*?\]\((.*?)\))', line_):
                    old_img_path = os.path.abspath(get_pure_path(os.path.dirname(import_file), link_1))
                    new_img_relpath = os.path.relpath(old_img_path, book_path)
                    if new_img_relpath.startswith(".."):
                        # 项目外图片
                        new_img_relpath = get_pure_path(
                            base_path,
                            "lsbook_import_img",
                            os.path.split(link_1)[1]
                        )
                        assets_img.add(old_img_path)

                    line_ = line_.replace(link_0, link_0.replace(link_1, new_img_relpath), 1)
                # 处理引入文件中代码引入
                result_ = split_import(
                    line_,
                    os.path.abspath(get_pure_path(book_path, os.path.relpath(os.path.dirname(import_file), book_path)))
                )
                if result_:
                    # 只处理代码引入，不处理 md 引入
                    # prefix_, lang_, import_file_ = result_
                    # line_ = read_code(prefix_, lang_, import_file_)
                    line_ = read_code(*result_)

        new_code += line_ + "\n"
    line = new_code
    return line
