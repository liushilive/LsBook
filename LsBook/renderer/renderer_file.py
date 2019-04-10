import mistune


class FileRenderer(mistune.Renderer):
    def __init__(self):
        super().__init__()
        self.toc_tree = []
        self.count = {
            "h1": 0,
            "h2": 0,
            "h3": 0
        }
        self._id = 0
        self._img_id = 0

    def header(self, text, level, raw=None):
        """Rendering header/heading tags like ``<h1>`` ``<h2>``.

        :param text: rendered text content for the header.
        :param level: a number for the header level, for example: 1.
        :param raw: raw text content of the header.
        """
        self._id += 1
        _id = f"anchor_{self._id}"
        if level == 1:
            _level = ''
            self.count["h1"] += 1
            self.count["h2"] = 0
            self.count["h3"] = 0
            self.toc_tree.append({
                "name": text,
                "level": _level,
                "url": _id,
                "children": []
            })
        elif level == 2:
            if len(self.toc_tree) > 0:
                self.count['h2'] += 1
                self.count['h3'] = 0
                _level = f"{self.count['h2']}. "
                self.toc_tree[-1]["children"].append({
                    "name": text,
                    "level": _level,
                    "url": _id,
                    "children": []
                })
                text = f"{_level}{text}"
        elif level == 3:
            if len(self.toc_tree) > 0 and len(self.toc_tree[-1]["children"]) > 0:
                self.count['h3'] += 1
                _level = f"{self.count['h2']}.{self.count['h3']}. "
                self.toc_tree[-1]["children"][-1]["children"].append({
                    "name": text,
                    "level": _level,
                    "url": _id,
                    "children": []
                })
                text = f"{_level}{text}"

        return f'<h{level} id="{_id}">' \
            f'<a name="{_id}" class="anchor-navigation-ex-anchor" href="#{_id}">' \
            f'<i class="fa fa-link" aria-hidden="true"></i>' \
            f'</a>' \
            f'{text}' \
            f'</h{level}>'

    def spoiler_in_line(self, body):
        """鼠标扫过显示"""
        body = mistune.escape(body, quote=True, smart_amp=False)
        return f'<span class="spoiler">{body}</span>'

    def katex_in_line(self, body):
        """行内数学公式"""
        return f'\({body}\)'

    def katex_in_block(self, body):
        """行内数学公式"""
        return f'\[{body}\]'

    def block_code(self, code, lang=None):
        """Rendering block level code. ``pre > code``.

        :param code: text content of the code block.
        :param lang: language of the given code.
        """
        # mermaid
        if lang and lang.lower() == "mermaid":
            return f'\n<div class="mermaid">\n{code}\n</div>\n'

        # code
        code = code.rstrip('\n')
        if not lang:
            code = mistune.escape(code, smart_amp=False)
            return f'\n<pre class="line-numbers"><code>{code}\n</code></pre>\n'
        code = mistune.escape(code, quote=True, smart_amp=False)
        return f'<pre class="line-numbers"><code class="lang-{lang}">{code}\n</code></pre>\n'

    def codespan(self, text):
        """Rendering inline `code` text.

        :param text: text content for inline code.
        """
        text = mistune.escape(text.rstrip(), smart_amp=False)
        return f' <code class="language-markup">{text}</code> '

    # todo 完善图片
    def image(self, src, title, text):
        """Rendering a image with title and text.

        :param src: source link of the image.
        :param title: title text of the image.
        :param text: alt text of the image.
        """
        src = mistune.escape_link(src)
        text = mistune.escape(text, quote=True)
        self._img_id += 1
        _img_id = self._img_id

        figure = f'<figure id="fig{_img_id}">' \
            f'<a href="{src}" data-lightbox="{_img_id}">' \
            f'<img src="{src}" alt="{text}" title="{title if title else text}">' \
            f'</a>' \
            f'<figcaption>图：{text}</figcaption>' \
            f'</figure>'

        return figure
