from .block_token import Document
from .html_renderer import HTMLRenderer
from .summary_renderer import SummaryRenderer


def html_renderer(page: str):
    with HTMLRenderer() as renderer:
        page_html = renderer.render(Document(page))
    return renderer, page_html


def summary_renderer(page: str):
    with SummaryRenderer() as renderer:
        renderer.render(Document(page))

    return renderer
