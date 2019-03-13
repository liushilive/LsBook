#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys

if sys.version_info < (3, 7):
    print(u"The minimum support Python 3.7\n支持最低版本 3.7")
    exit(1)

from setuptools import find_packages
from setuptools import setup

try:
    from pypandoc import convert_file

    __read_md = convert_file('README.md', 'rst')
except ImportError:
    print(u"warning: pypandoc module not found, could not convert Markdown to RST\n警告：pypandoc模块没有找到，不能将Markdown转换为RST")
    __read_md = open('README.md', 'r', encoding="utf-8").read()

__version = "0.1.1"
__author = "刘士"

setup(
    name='fuck_gitbook',
    version=__version,
    description="markdown 静态网页生成器",
    long_description=__read_md,
    author=__author,
    author_email='liushilive@outlook.com',
    url='https://github.com/liushilive/fuck_gitbook',
    project_urls={
        '样板': 'https://liushilive.github.io',
    },
    packages=find_packages(),
    include_package_data=True,
    license="MIT",
    zip_safe=True,
    keywords='gitbook md',
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Natural Language :: Chinese (Simplified)',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: Implementation :: CPython',
        'Programming Language :: Python :: Implementation :: PyPy'
    ],
    install_requires=['mistune'],
    entry_points={
        'console_scripts': [
            'lsbook = fuck_gitbook.lsbook:main',
        ]
    }
)