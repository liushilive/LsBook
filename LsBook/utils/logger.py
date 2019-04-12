# region 日志配置
import logging


def log_init(log_level: str):
    """日志初始化

    :param log_level: 日志级别
    :return:
    """

    logging.basicConfig(level=log_level.upper(), format="%(asctime)s %(levelname)s:%(message)s")
