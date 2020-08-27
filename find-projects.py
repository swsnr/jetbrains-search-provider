#!/usr/bin/env python3
# Copyright (C) Sebastian Wiesner <sebastian@swsnr.de>

# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License along
# with this program; if not, write to the Free Software Foundation, Inc.,
# 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.


import sys
import os
import xml.etree.ElementTree as etree
import json
import re
from collections import namedtuple
from pathlib import Path
from traceback import format_exc


ProductInfo = namedtuple('ProductInfo', 'key config_glob')


PRODUCTS = [
    ProductInfo(key='idea', config_glob='IntelliJIdea*'),
    ProductInfo(key='idea-ce', config_glob='IdeaIC*'),
    ProductInfo(key='webstorm', config_glob='WebStorm*'),
    ProductInfo(key='clion', config_glob='CLion*'),
    ProductInfo(key='goland', config_glob='GoLand*'),
    ProductInfo(key='pycharm', config_glob='PyCharm*'),
    ProductInfo(key='phpstorm', config_glob='PhpStorm*'),
    ProductInfo(key='rider', config_glob='Rider*'),
]


def product_version(config_dir):
    version = re.search(r'\d{4}\.\d{1,2}', config_dir.name)
    if version:
        year, revision = version.group(0).split('.')
        return (int(year), int(revision))
    else:
        raise ValueError(f'Not a valid IDEA config directory: {config_dir}')


def find_config_directories(product: ProductInfo):
    """
    Find all config directories for the given product.
    """
    config_home = os.environb.get(b'XDG_CONFIG_HOME', b'')
    if config_home:
        config_home = Path(config_home)
    else:
        config_home = Path.home() / '.config'
    yield from (config_home / 'JetBrains').glob(product.config_glob)


def find_latest_recent_projects_file(product: ProductInfo):
    """
    Find the recent projects file of the most recent version of the given product.
    """
    config_dir = max(find_config_directories(product),
                     key=product_version, default=None)
    if config_dir:
    	if product.key == 'rider':
        	return config_dir / 'options' / 'recentSolutions.xml'
    	else:
	    	return config_dir / 'options' / 'recentProjects.xml'
    else:
        return None


def get_project(product, path):
    """
    Get the project in the given path.

    Figure out the project name, and return a dictionary with the project name,
    the readable project path, the absolute project path, and a unique ID.
    """
    project_dir = path.parent if path.expanduser().is_file() else path
    namefile = project_dir / '.idea' / '.name'
    try:
        name = namefile.read_text(encoding='utf-8').strip()
    except FileNotFoundError:
        name = path.name
    # When changing this object change the `Project` interface in extension.ts
    return {
        # Conveniently use the absolute path as ID, because it's definitely unique,
        # and prefix it with the name of this launch to avoid conflicts with IDs
        # from other providers.
        'id': f'jetbrains-search-provider-{product.key}-{path.expanduser()}',
        'name': name,
        'path': str(path),
        'abspath': str(path.expanduser())
    }


def find_recent_projects(product, recent_projects_file):
    """
    Find all recent projects listed in the given recent projects XML file.
    """
    document = etree.parse(recent_projects_file)
    paths = (Path(el.attrib['value'].replace('$USER_HOME$', '~'))
             for el in
             document.findall('.//option[@name="recentPaths"]/list/option'))
    for path in paths:
    	if Path.exists(path.expanduser()):
        	yield get_project(product, path)


def success(projects):
    return {
        'kind': 'success',
        'projects': projects
    }


def error(message, traceback):
    return {
        'kind': 'error',
        'message': message,
        'traceback': traceback
    }


def find_all_recent_projects():
    for product in PRODUCTS:
        config_file = find_latest_recent_projects_file(product)
        if config_file and Path.exists(config_file):
            yield (product.key, list(find_recent_projects(product, config_file)))
        else:
            yield (product.key, [])


def main():
    try:
        projects = list(find_all_recent_projects())
        print(json.dumps(success(projects)))
    except Exception as exc:
        print(json.dumps(error(str(exc), format_exc())))
        sys.exit(1)


if __name__ == '__main__':
    main()
