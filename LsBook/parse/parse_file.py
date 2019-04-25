import os
import re

from ..parse.parse_markdown.file_imports import process_file_import
from ..parse.parse_markdown.lexers import Block_Lexer, CustomMarkdown, Inline_Lexer
from ..renderer.renderer_file import FileRenderer


def parse_file(file, base_path):
    """解析文件"""
    with open(file, encoding="utf-8") as f:
        page = f.read()
    dirname = os.path.dirname(file)

    # 处理引入文件
    page, assets_img = process_file_import(dirname, page, base_path)

    renderer = FileRenderer()
    inline = Inline_Lexer(renderer)
    block = Block_Lexer()
    markdown = CustomMarkdown(
        renderer=renderer,
        inline=inline,
        block=block
    )

    page = markdown(page)

    return (page, renderer.toc_tree, renderer.tag_katex, renderer.tag_mermaid,
            renderer.tag_prism, renderer.tag_lightbox, assets_img)


def sectionx(page, count=0):
    """隐藏答案框

    :param page:
    :return:
    """
    r = re.search(r"<!--sec([\s\S]+?)ces-->([\s\S]+?)<!--endsec-->", page, re.S)
    if r:
        title = ""
        show = False
        for i in r.group(1).split():
            if "title" in i:
                title = i.split("=")[1].strip("'").strip('"')
            elif "show" in i:
                show = i.split("=")[1].lower() == 'true'

        html = f'<sec data-title="{title}"><div class="panel panel-default"><div class="panel-heading"><b>{title}' \
            f'<a class="pull-right section atTitle btn btn-default {"sec-show" if show else ""}" target="sectionx{count}">' \
            f'<span class="fa {"fa-angle-up" if show else "fa-angle-down"}" /></a></b></div>' \
            f'<div class="panel-collapse {"in" if show else "collapse"}" id="sectionx{count}">' \
            f'<div class="panel-body">{r.group(2)}</div></div></div></sec>'

        page = page.replace(r.group(0), html)
        return sectionx(page, count + 1)
    else:
        return page
