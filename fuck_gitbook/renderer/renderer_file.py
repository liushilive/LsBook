import mistune


class FileRenderer(mistune.Renderer):
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
        # todo 代码渲染
        # mermaid
        if lang and lang.lower() == "mermaid":
            return f'\n<div class="mermaid">\n{code}\n</div>\n'

        # code
        code = code.rstrip('\n')
        if not lang:
            code = mistune.escape(code, smart_amp=False)
            return '\n<pre class="line-numbers"><code>%s\n</code></pre>\n' % code
        code = mistune.escape(code, quote=True, smart_amp=False)
        return '<pre class="line-numbers"><code class="lang-%s">%s\n</code></pre>\n' % (lang, code)
