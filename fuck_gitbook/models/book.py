class Book(object):
    def __init__(self, book_path, book_output):
        self._book_path = book_path
        self._book_output = book_output
        self._summary_path = "./summary_path.md"
        self._summary_json = {}
        self._config = {}

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
        return self._summary_path

    @summary_path.setter
    def summary_path(self, path):
        self._summary_path = path

    @property
    def summary(self):
        return self._summary_json

    @summary.setter
    def summary(self, summary_json):
        self._summary_json = summary_json

    @property
    def config(self):
        return self._config

    @config.setter
    def config(self, json):
        self._config = json
