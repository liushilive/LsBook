import html
import os
import re
from itertools import chain

import mistletoe
import mistletoe.block_token as block_token
import mistletoe.span_token as span_token
from mistletoe.html_renderer import HTMLRenderer

from ..constants.code_extensions import Extensions
from ..parse.parse_markdown.file_imports import process_file_import

postfix = list(map(lambda x: x.upper(), [
    "sh", "ISO", "RAR", "zip", "7z", "exe", "pdf", "xls", "txt",
    "doc", "docx", "xlsx", "ppt", "mpp", "mpt", "xps", "xlsb", "csv", "xml"
]))


def parse_file(file, base_path):
    """解析文件"""
    with open(file, encoding="utf-8") as f:
        page = f.read()

    dirname = os.path.dirname(file)
    # 处理引入文件
    page, assets_img = process_file_import(dirname, page, base_path)

    with HtmlRenderer() as renderer:
        page_html = renderer.render(mistletoe.Document(page))

    return (page_html, renderer.toc_tree, renderer.tag_katex, renderer.tag_mermaid,
            renderer.tag_prism, renderer.tag_lightbox, assets_img)


class SecBlock(block_token.BlockToken):
    """read"""
    show = False
    title = ""
    count = 0
    pattern_start = re.compile(r'^[\t ]*<!--sec([\s\S]+?)ces-->[^\S]')
    pattern_end = re.compile(r'^[\t ]*<!--endsec-->[^\S]')

    def __init__(self, token):
        lines, count, title, show = token
        self.content = ''.join(lines).strip()
        self.count = count
        self.title = title
        self.show = show
        super().__init__(lines, block_token.tokenize)

    @classmethod
    def init(cls):
        """每个文档重置参数"""
        cls.show = False
        cls.title = ""
        cls.count = 0

    @classmethod
    def start(cls, line):
        match_obj = cls.pattern_start.match(line)
        if match_obj is None:
            return False
        cls.title = ""
        cls.show = False
        for item in match_obj.group(1).split():
            cls.title = item.split("=")[1].strip("'").strip('"') if "title" in item else cls.title
            cls.show = item.split("=")[1].lower() == 'true' if "show" in item else cls.show
        return True

    @classmethod
    def read(cls, lines):
        line_buffer = []
        next(lines)
        for line in lines:
            line_buffer.append(line)
            if cls.pattern_end.match(line):
                line_buffer.pop()
                break
        cls.count += 1
        return line_buffer, cls.count, cls.title, cls.show


class MathBlock(block_token.BlockToken):
    pattern_start = re.compile(r'^[ \t]*\${1,2}[^$][ \t\n]*$')
    pattern_end = re.compile(r'^[ \t]*\${1,2}[^$\S]')

    def __init__(self, lines):
        self.content = ''.join(lines)

    @classmethod
    def start(cls, line):
        return cls.pattern_start.match(line)

    @classmethod
    def read(cls, lines):
        line_buffer = []
        next(lines)
        for line in lines:
            line_buffer.append(line)
            if cls.pattern_end.match(line):
                line_buffer.pop()
                break
        return line_buffer


class Math(span_token.SpanToken):
    pattern = re.compile(r'(\${1,2})([^$\n]+?)\1')
    parse_inner = False
    parse_group = 2


class Spoiler(span_token.SpanToken):
    pattern = re.compile(r'{%s%}(.*?){%ends%}')
    parse_inner = False
    parse_group = 1


class HtmlRenderer(HTMLRenderer):
    def __init__(self, *extras):
        super().__init__(*chain((SecBlock, Math, Spoiler, MathBlock), extras))
        self.toc_tree = []
        self.count = {
            "h1": 0,
            "h2": 0,
            "h3": 0
        }
        self._id = 0
        self._img_id = 0
        self.tag_katex = False
        self.tag_mermaid = False
        self.tag_prism = False
        self.tag_lightbox = False

    def render_sec_block(self, token):
        inner = ''.join([self.render(child) for child in token.children])
        return f'<sec data-title="{token.title}"><div class="panel panel-default"><div class="panel-heading"><b>{token.title}<a class="pull-right section atTitle btn btn-default {"sec-show" if token.show else ""}" target="sectionx{token.count}"><span class="fa {"fa-angle-up" if token.show else "fa-angle-down"}" /></a></b></div><div class="panel-collapse {"in" if token.show else "collapse"}" id="sectionx{token.count}"><div class="panel-body">{inner}</div></div></div></sec>'

    def render_math(self, token):
        self.tag_katex = True
        return rf'\({token.content}\)'

    def render_math_block(self, token):
        self.tag_katex = True
        return rf"\[{token.content}\]"

    @staticmethod
    def render_spoiler(token):
        """鼠标扫过显示"""
        return f'<span class="spoiler">{token.content}</span>'

    def render_heading(self, token):
        template = """<h{level} id="{_id}"><a class="anchor-navigation-ex-anchor" href="#{_id}" name="{_id}"><i aria-hidden="true" class="fa fa-link"></i></a>{inner}</h{level}>"""
        inner = self.render_inner(token)

        self._id += 1
        _id = f"anchor_{self._id}"
        if token.level == 1:
            _level = ''
            self.count["h1"] += 1
            self.count["h2"] = 0
            self.count["h3"] = 0
            self.count["h4"] = 0
            self.count["h5"] = 0
            self.count["h6"] = 0
            self.toc_tree.append({
                "name": inner,
                "level": _level,
                "url": _id,
                "children": []
            })
        elif token.level == 2:
            if len(self.toc_tree) > 0:
                self.count['h2'] += 1
                self.count['h3'] = 0
                self.count["h4"] = 0
                self.count["h5"] = 0
                self.count["h6"] = 0
                _level = f"{self.count['h2']}. "
                self.toc_tree[-1]["children"].append({
                    "name": inner,
                    "level": _level,
                    "url": _id,
                    "children": []
                })
                inner = f"{_level}{inner}"
        elif token.level == 3:
            if len(self.toc_tree) > 0 and len(self.toc_tree[-1]["children"]) > 0:
                self.count['h3'] += 1
                self.count["h4"] = 0
                self.count["h5"] = 0
                self.count["h6"] = 0
                _level = f"{self.count['h2']}.{self.count['h3']}. "
                self.toc_tree[-1]["children"][-1]["children"].append({
                    "name": inner,
                    "level": _level,
                    "url": _id,
                    "children": []
                })
                inner = f"{_level}{inner}"
        elif token.level == 4:
            self.count["h4"] += 1
            self.count["h5"] = 0
            self.count["h6"] = 0
            inner = f"{self.count['h2']}.{self.count['h3']}.{self.count['h4']}. {inner}"
        elif token.level == 5:
            self.count["h5"] += 1
            self.count["h6"] = 0
            inner = f"{self.count['h2']}.{self.count['h3']}.{self.count['h4']}.{self.count['h5']}. {inner}"
        elif token.level == 6:
            self.count["h6"] += 1
            inner = f"{self.count['h2']}.{self.count['h3']}.{self.count['h4']}.{self.count['h5']}.{self.count['h6']}. {inner}"

        return template.format(level=token.level, inner=inner, _id=_id)

    def render_inline_code(self, token):
        self.tag_prism = True
        template = '<code class="language-vim">{}</code>'
        inner = html.escape(token.children[0].content)
        return template.format(inner)

    def render_block_code(self, token):
        language = token.language.lower() if token.language else "vim"
        inner = html.escape(token.children[0].content)
        # mermaid
        if language == "mermaid":
            self.tag_mermaid = True
            return f'<div class="mermaid">{inner}</div>'
        # code
        self.tag_prism = True

        language = Extensions.get(language, language)
        return f'<pre class="line-numbers"><code class="lang-{language} rainbow-braces">{inner}</code></pre>'

    def render_image(self, token):
        self.tag_lightbox = True
        self._img_id += 1
        template = '<a data-lightbox="{img_id}" href="{src}"><img src="{src}" alt="{alt}"{title} /></a>'
        alt = self.render_to_plain(token)
        if token.title:
            title = f' title="{self.escape_html(token.title)}"'
        else:
            title = f' title="{alt}"'
        return template.format(img_id=self._img_id, src=token.src, alt=alt, title=title)

    def render_document(self, token):
        SecBlock.init()
        return super().render_document(token)

    @staticmethod
    def if_blank(target):
        if re.match(r'^https?:/{2}\w.+$', target):
            return True
        _postfix = re.match(r'.*\.(\w*)$', target)
        if _postfix and _postfix.group(1).upper() in postfix:
            return True
        return False

    def render_link(self, token):
        target = self.escape_url(token.target)

        if self.if_blank(target):
            template = '<a target=_Blank href="{target}"{title}>{inner}</a>'
        else:
            template = '<a href="{target}"{title}>{inner}</a>'

        if token.title:
            title = ' title="{}"'.format(self.escape_html(token.title))
        else:
            title = ''
        inner = self.render_inner(token)
        return template.format(target=target, title=title, inner=inner)

    def render_auto_link(self, token):
        if token.mailto:
            target = 'mailto:{}'.format(token.target)
        else:
            target = self.escape_url(token.target)

        if self.if_blank(target):
            template = '<a target=_Blank href="{target}">{inner}</a>'
        else:
            template = '<a href="{target}">{inner}</a>'
        inner = self.render_inner(token)
        return template.format(target=target, inner=inner)
