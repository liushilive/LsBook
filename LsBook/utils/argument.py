import argparse
import sys


def cmd_argument():
    """处理控制台输入参数

    :return:
    """
    if len(sys.argv) == 1:
        sys.argv.append("--help")

    parser = argparse.ArgumentParser(description='编译Markdown书籍为Html')

    parser.add_argument('-b', dest='build', action='store_true', default=False, help='编译书籍')
    parser.add_argument('--log', dest='log', choices={"debug", "info", "warn", "error", "disabled"}, default="info",
                        help="最小日志级别显示（默认值为 info; 可选值：debug, info, warn, error, disabled）")
    parser.add_argument(dest='book', metavar='book', nargs="?", default=".", help="书籍路径，默认当前目录")
    parser.add_argument(dest='output', metavar='output', nargs="?", default="_book", help="输出路径默认为书籍路径下 _book")

    args = parser.parse_args()
    return args
