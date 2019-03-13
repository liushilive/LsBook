import mistune


class SummaryRenderer(mistune.Renderer):
    def __init__(self):
        super().__init__()
        self.toc_tree = []

    def link(self, link, title, text):
        """Rendering a given link with content and title.

        :param link: href link for ``<a>`` tag.
        :param title: title content for `title` attribute.
        :param text: text content for description.
        """
        link = mistune.escape_link(link)
        return f'["{link}","{title}","{text}"]'

    def paragraph(self, text):
        """Rendering paragraph tags. Like ``<p>``."""
        return text.strip(' ')

    def header(self, text, level, raw=None):
        """Rendering header/heading tags like ``<h1>`` ``<h2>``.

        :param text: rendered text content for the header.
        :param level: a number for the header level, for example: 1.
        :param raw: raw text content of the header.
        """
        self.toc_tree.append([text, []])
        return f'{{"header":["{text}"]}}'

    def list(self, body, ordered=True):
        """Rendering list tags like ``<ul>`` and ``<ol>``.

        :param body: body contents of the list.
        :param ordered: whether this list is ordered or not.
        """
        body = f'[{body}]'
        if len(self.toc_tree) == 0:
            self.toc_tree.append(["目录", []])

        self.toc_tree[-1][1] = body
        return f"{body}"

    def list_item(self, text):
        """Rendering list item snippet. Like ``<li>``."""
        return text

    def newline(self):
        """Rendering newline element."""
        return ''
