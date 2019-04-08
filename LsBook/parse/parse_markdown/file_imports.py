"""
代码引入语法分析
"""
import os
import re
from LsBook.constants.lang import lang_dict


def process_file_import(book_path, page: str):
    """代码文件引入语法分析 @import file

    :param book_path: 书籍目录
    :param page: 页面内容
    :return: 处理后页面内容
    """
    # 定义规则
    regex = r"""^(\s*)@import\s*[\"|\'](.*)[\"|\']\s*({(.*)})*(\s*)$"""
    # 按行处理
    pages = re.split(r"\n|\r\n", page)
    tag = True
    new_page = ""
    for line in pages:
        if line.find("```") != -1:
            tag = not tag
            new_page += line + "\n"
            continue
        match = re.match(regex, line)
        if tag and match:
            mermaidContent_1 = match.group(1)
            mermaidContent_2 = match.group(2)
            mermaidContent_4 = match.group(4)

            lang = mermaidContent_4 or lang_dict.get(os.path.splitext(mermaidContent_2)[1][1:])[0]

            with open(os.path.join(book_path, mermaidContent_2), encoding="utf-8") as f:
                code = f.read()

            code = re.sub(r"(\r\n)|(\n)", '\n' + mermaidContent_1, code)
            line = f"{mermaidContent_1}```{lang}\n{mermaidContent_1}{code}\n{mermaidContent_1}```"
        new_page += line + "\n"
    return new_page
