import mistune


def parse_file(file):
    """解析文件"""
    with open(file, encoding="utf-8") as f:
        markdown = mistune.Markdown()
        page = markdown(f.read())
        return page
