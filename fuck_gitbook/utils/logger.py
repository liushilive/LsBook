# region 日志配置
import logging


def log_init(log_level: str):
    """日志初始化

    :param log_level: 日志级别
    :return:
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.getLevelName(log_level.upper()))
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s：%(message)s")
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
