import os

from LsBook.parse.parse_markdown.file_imports import process_file_import
from LsBook.parse.parse_markdown.lexers import Inline_Lexer, Block_Lexer, CustomMarkdown
from LsBook.renderer.renderer_file import FileRenderer


def parse_file(file):
    """解析文件"""
    with open(file, encoding="utf-8") as f:
        page = f.read()
    dirname = os.path.dirname(file)

    # 处理引入文件
    page = process_file_import(dirname, page)

    renderer = FileRenderer()
    inline = Inline_Lexer(renderer)
    block = Block_Lexer()
    markdown = CustomMarkdown(
        renderer=renderer,
        inline=inline,
        block=block
    )

    page = markdown(page)

    return page, renderer.toc_tree
