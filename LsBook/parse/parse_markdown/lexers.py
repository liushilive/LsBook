import re

from mistune import BlockLexer, InlineLexer, Markdown


class Inline_Lexer(InlineLexer):
    """内联词法"""

    def __init__(self, renderer, rules=None, **kwargs):
        super(Inline_Lexer, self).__init__(renderer, rules, **kwargs)

        self.rules.text = re.compile(r'^[\s\S]+?(?=[\\<!\[_*`~{$]|https?://| {2,}\n|$)')
        # 处理顺序由下往上
        # 处理 s 词法
        self.rules.spoiler = re.compile(
            r'{%s%}(.*?){%ends%}'
        )
        self.default_rules.insert(2, "spoiler")

        # 处理 公式 $ $$
        self.rules.katex = re.compile(
            r'^\$(.*?)\$',
            flags=re.S
        )
        self.default_rules.insert(1, "katex")

        self.rules.katex_s = re.compile(
            r'^\$\$(.*?)\$\$',
            flags=re.S
        )
        self.default_rules.insert(0, "katex_s")
        pass

    def output_spoiler(self, m):
        body = m.group(1)
        return self.renderer.spoiler_in_line(body)

    def output_katex(self, m):
        body = m.group(1)
        return self.renderer.katex_in_line(body)

    def output_katex_s(self, m):
        body = m.group(1)
        return self.renderer.katex_in_line(body)


class Block_Lexer(BlockLexer):
    """块级词法"""

    def __init__(self, *args, **kwargs):
        super(Block_Lexer, self).__init__(*args, **kwargs)
        self.rules.katex_in_block = re.compile(r'^\n*\$\$(.*?)\$\$\n', flags=re.S)
        self.default_rules.insert(0, 'katex_in_block')
        self.list_rules = list(self.list_rules).insert(0, 'katex_in_block')

    def parse_katex_in_block(self, m):
        self.tokens.append({
            'type': 'katex_in_block',
            'text': m.group(1)
        })


class CustomMarkdown(Markdown):
    def output_katex_in_block(self):
        return self.renderer.katex_in_block(self.token['text'])
