import os

from ..mistletoe_renderers import html_renderer
from ..parse.parse_markdown.file_imports import process_file_import


def parse_file(file, base_path):
    """解析文件"""
    with open(file, encoding="utf-8") as f:
        page = f.read()

    dirname = os.path.dirname(file)
    # 处理引入文件
    page, assets_img = process_file_import(dirname, page, base_path)

    renderer, page_html = html_renderer(page)

    return (page_html, renderer.toc_tree, renderer.tag_katex, renderer.tag_mermaid,
            renderer.tag_prism, renderer.tag_lightbox, assets_img)
