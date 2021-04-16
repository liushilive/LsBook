"""
HTML renderer for mistletoe.
"""

import html
import re

from .base_renderer import BaseRenderer
from .block_token import SecBlock
from ..constants.code_extensions import Extensions

postfix = list(map(lambda x: x.upper(), [
    "sh", "ISO", "RAR", "zip", "7z", "exe", "pdf", "xls", "txt",
    "doc", "docx", "xlsx", "ppt", "mpp", "mpt", "xps", "xlsb", "csv", "xml"
]))


class HTMLRenderer(BaseRenderer):
    """
    HTML renderer class.

    See mistletoe.base_renderer module for more info.
    """

    def __init__(self, *extras):
        """
        Args:
            extras (list): allows subclasses to add even more custom tokens.
        """
        self._suppress_p_tag_stack = [False]
        super().__init__(*extras)
        # html.entities.html5 includes entitydefs not ending with ';',
        # CommonMark seems to hate them, so...
        self._stdlib_charref = html._charref
        _charref = re.compile(r'&(#[0-9]+;'
                              r'|#[xX][0-9a-fA-F]+;'
                              r'|[^\t\n\f <&#;]{1,32};)')
        html._charref = _charref
        self.toc_tree = []
        self.count = {
            "h1": 0,
            "h2": 0,
            "h3": 0,
            "h4": 0,
            "h5": 0,
            "h6": 0,
        }
        self._id = 0
        self._img_id = 0
        self.tag_katex = False
        self.tag_mermaid = False
        self.tag_prism = False
        self.tag_lightbox = False

    def __exit__(self, *args):
        super().__exit__(*args)
        html._charref = self._stdlib_charref

    def render_to_plain(self, token):
        if hasattr(token, 'children'):
            inner = [self.render_to_plain(child) for child in token.children]
            return ''.join(inner)
        return self.escape_html(token.content)

    def render_strong(self, token):
        template = '<strong>{}</strong>'
        return template.format(self.render_inner(token))

    def render_emphasis(self, token):
        template = '<em>{}</em>'
        return template.format(self.render_inner(token))

    def render_inline_code(self, token):
        self.tag_prism = True
        template = '<code class="language-vim">{}</code>'
        inner = html.escape(token.children[0].content)
        return template.format(inner)

    def render_strikethrough(self, token):
        template = '<del>{}</del>'
        return template.format(self.render_inner(token))

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

    def render_link(self, token):
        target = token.target

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
            target = token.target

        if self.if_blank(target):
            template = '<a target=_Blank href="{target}">{inner}</a>'
        else:
            template = '<a href="{target}">{inner}</a>'
        inner = self.render_inner(token)
        return template.format(target=target, inner=inner)

    def render_escape_sequence(self, token):
        return self.render_inner(token)

    def render_raw_text(self, token):
        return self.escape_html(token.content)

    @staticmethod
    def render_html_span(token):
        return token.content

    def render_heading(self, token):
        template = """\
<h{level} id="{_id}">
    <a class="anchor-navigation-ex-anchor" href="#{_id}" name="{_id}">
        <i aria-hidden="true" class="fa fa-link"></i>
    </a>{inner}
</h{level}>"""
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

    def render_quote(self, token):
        elements = ['<blockquote>']
        self._suppress_p_tag_stack.append(False)
        elements.extend([self.render(child) for child in token.children])
        self._suppress_p_tag_stack.pop()
        elements.append('</blockquote>')
        return '\n'.join(elements)

    def render_paragraph(self, token):
        if self._suppress_p_tag_stack[-1]:
            return '{}'.format(self.render_inner(token))
        return '<p>{}</p>'.format(self.render_inner(token))

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

    def render_list(self, token):
        template = '<{tag}{attr}>\n{inner}\n</{tag}>'
        if token.start is not None:
            tag = 'ol'
            attr = ' start="{}"'.format(token.start) if token.start != 1 else ''
        else:
            tag = 'ul'
            attr = ''
        self._suppress_p_tag_stack.append(not token.loose)
        inner = '\n'.join([self.render(child) for child in token.children])
        self._suppress_p_tag_stack.pop()
        return template.format(tag=tag, attr=attr, inner=inner)

    def render_list_item(self, token):
        if len(token.children) == 0:
            return '<li></li>'
        inner = '\n'.join([self.render(child) for child in token.children])
        inner_template = '\n{}\n'
        if self._suppress_p_tag_stack[-1]:
            if token.children[0].__class__.__name__ == 'Paragraph':
                inner_template = inner_template[1:]
            if token.children[-1].__class__.__name__ == 'Paragraph':
                inner_template = inner_template[:-1]
        return '<li>{}</li>'.format(inner_template.format(inner))

    def render_table(self, token):
        # This is actually gross and I wonder if there's a better way to do it.
        #
        # The primary difficulty seems to be passing down alignment options to
        # reach individual cells.
        template = '<table>\n{inner}</table>'
        if hasattr(token, 'header'):
            head_template = '<thead>\n{inner}</thead>\n'
            head_inner = self.render_table_row(token.header, is_header=True)
            head_rendered = head_template.format(inner=head_inner)
        else:
            head_rendered = ''
        body_template = '<tbody>\n{inner}</tbody>\n'
        body_inner = self.render_inner(token)
        body_rendered = body_template.format(inner=body_inner)
        return template.format(inner=head_rendered + body_rendered)

    def render_table_row(self, token, is_header=False):
        template = '<tr>\n{inner}</tr>\n'
        inner = ''.join([self.render_table_cell(child, is_header)
                         for child in token.children])
        return template.format(inner=inner)

    def render_table_cell(self, token, in_header=False):
        template = '<{tag}{attr}>{inner}</{tag}>\n'
        tag = 'th' if in_header else 'td'
        if token.align == 0:
            align = 'center'
        elif token.align == 1:
            align = 'right'
        else:
            align = 'left'
        attr = ' align="{}"'.format(align)
        inner = self.render_inner(token)
        return template.format(tag=tag, attr=attr, inner=inner)

    @staticmethod
    def render_thematic_break(token):
        return '<hr />'

    @staticmethod
    def render_line_break(token):
        return '\n' if token.soft else '<br />\n'

    @staticmethod
    def render_html_block(token):
        return token.content

    def render_document(self, token):
        SecBlock.init()
        self.footnotes.update(token.footnotes)
        inner = '\n'.join([self.render(child) for child in token.children])
        return '{}\n'.format(inner) if inner else ''

    @staticmethod
    def escape_html(raw):
        return html.escape(html.unescape(raw)).replace('&#x27;', "'")

    def render_sec_block(self, token):
        inner = ''.join([self.render(child) for child in token.children])
        return f'<sec data-title="{token.title}"><div class="panel panel-default"><div class="panel-heading"><b>{token.title}<a class="pull-right section atTitle btn btn-default {"sec-show" if token.show else ""}" target="sectionx{token.count}"><span class="fa {"fa-angle-up" if token.show else "fa-angle-down"}" /></a></b></div><div class="panel-collapse {"in" if token.show else "collapse"}" id="sectionx{token.count}"><div class="panel-body">{inner}</div></div></div></sec>'

    def render_math(self, token):
        self.tag_katex = True
        return rf'\({token.content}\)'

    def render_math_block(self, token):
        self.tag_katex = True
        return rf"\[{token.content}\]"

    def render_spoiler(self, token):
        """鼠标扫过显示"""
        # return f'<span class="spoiler">{token.content}</span>'
        return f'<span class="spoiler"><span class="spoiler_span">{"".join(map(self.render, token.children))}</span></span>'

    @staticmethod
    def if_blank(target):
        if re.match(r'^https?:/{2}\w.+$', target):
            return True
        _postfix = re.match(r'.*\.(\w*)$', target)
        if _postfix and _postfix.group(1).upper() in postfix:
            return True
        return False
