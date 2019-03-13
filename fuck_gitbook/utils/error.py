def file_not_found_error(filename):
    """抛出找不到文件异常"""
    raise FileNotFoundError(f"找不到文件：{filename}")


def dir_not_found_error(dir):
    """抛出找不到目录异常"""
    raise FileNotFoundError(f"找不到目录：{dir}")
