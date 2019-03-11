import logging

# region 配置参数
from fuck_gitbook.utils.argument import cmd_argument
from fuck_gitbook.utils.logger import log_init
from fuck_gitbook.utils.tools_path import process_input_output_path

args = cmd_argument()
build: bool = args.build
book: str = args.book
output: str = args.output
log_level: str = args.log

log_init(log_level)

logging.debug(f"入参：{args}")

if build:
    logging.info("开始构建")

    book, output = process_input_output_path(book, output)
