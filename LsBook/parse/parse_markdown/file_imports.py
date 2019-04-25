"""
代码引入语法分析
"""
import os
import re

from ...constants.lang import lang_dict


def process_file_import(book_path: str, page: str, base_path: str):
    """代码文件引入语法分析 @import file

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
            match = re.match(r"""^(\s*)@import\s*[\"|\'](.*)[\"|\']\s*({(.*)})*(\s*)$""", line)
            if match:
                mermaidContent_1 = match.group(1)
                mermaidContent_2 = match.group(2)
                mermaidContent_4 = match.group(4)

                lang = mermaidContent_4 or lang_dict.get(os.path.splitext(mermaidContent_2)[1][1:])[0]
                import_file = os.path.join(book_path, mermaidContent_2)
                with open(import_file, encoding="utf-8") as f:
                    code = f.read()
                if lang == 'markdown':
                    # line = code
                    tag_1 = True
                    new_code = ""
                    for line_ in re.split(r"\n|\r\n", code):
                        if line_.find("```") != -1:
                            tag_1 = not tag_1
                        else:
                            # 处理引入文件中的图片问题
                            # 对于项目内图片，重建相对路径
                            # 对于项目外图片，记录图片路径，生成书籍后，复制图片到指定目录，重建相对路径
                            if tag_1:
                                for link_0, link_1 in re.findall(r'(!\[.*?\]\((.*?)\))', line_):
                                    old_img_path = os.path.abspath(os.path.join(os.path.dirname(import_file), link_1))
                                    new_img_relpath = os.path.relpath(old_img_path, book_path)
                                    if new_img_relpath.startswith(".."):
                                        # 项目外图片
                                        new_img_relpath = os.path.join(
                                            base_path,
                                            "lsbook_import_img",
                                            os.path.split(link_1)[1]
                                        )
                                        assets_img.add(old_img_path)

                                    line_ = line_.replace(link_0, link_0.replace(link_1, new_img_relpath), 1)

                                    pass
                        new_code += line_ + "\n"
                    line = new_code
                else:
                    code = re.sub(r"(\r\n)|(\n)", '\n' + mermaidContent_1, code)
                    line = f"{mermaidContent_1}```{lang}\n{mermaidContent_1}{code}\n{mermaidContent_1}```"
        new_page += line + "\n"
    return new_page, assets_img
