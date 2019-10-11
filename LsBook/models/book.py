from concurrent.futures.process import ProcessPoolExecutor


class Book(object):
    def __init__(self, book_path, book_output, pool: ProcessPoolExecutor, base_assets):
        self._book_path = book_path
        self._book_output = book_output
        self._summary_path = "SUMMARY.md"
        self._summary_json = {}
        self._summary_classify_list = []
        self._config = {}
        self._assets_path = ["assets", "lsbook"]
        self._assets_path_out = "lsbook"
        self._i18n = {}
        self.pool = pool
        self._base_assets = base_assets
        self._book_js = ""

    @property
    def book_path(self):
        """书籍路径"""
        return self._book_path

    @book_path.setter
    def book_path(self, book_path):
        """设置书籍路径"""
        self._book_path = book_path

    @property
    def book_output(self):
        """书籍输出路径"""
        return self._book_output

    @book_output.setter
    def book_output(self, output):
        """设置书籍输出路径"""
        self._book_output = output

    @property
    def summary_path(self):
        """目录路径"""
        return self._summary_path

    @summary_path.setter
    def summary_path(self, path):
        """目录路径"""
        self._summary_path = path

    @property
    def summary(self):
        """目录结构"""
        return self._summary_json

    @summary.setter
    def summary(self, summary_json):
        """目录结构"""
        self._summary_json = summary_json

    @property
    def config(self):
        """配置"""
        return self._config

    @config.setter
    def config(self, json):
        """配置"""
        self._config = json

    @property
    def assets_path(self):
        """资源路径"""
        return self._assets_path

    @assets_path.setter
    def assets_path(self, path):
        """资源路径"""
        self._assets_path = path

    @property
    def assets_path_out(self):
        """资源输出路径"""
        return self._assets_path_out

    @assets_path_out.setter
    def assets_path_out(self, path):
        """资源输出路径"""
        self._assets_path_out = path

    @property
    def summary_classify_list(self):
        """目录分类后结构"""
        return self._summary_classify_list

    @property
    def i18n(self):
        """语言字符"""
        return self._i18n

    @i18n.setter
    def i18n(self, lang):
        """语言字符"""
        self._i18n = lang

    @property
    def book_js(self):
        """自定义 js"""
        return self._book_js

    @book_js.setter
    def book_js(self, book_js):
        """自定义 js"""
        self._book_js = book_js

    @property
    def base_assets(self):
        return self._base_assets
