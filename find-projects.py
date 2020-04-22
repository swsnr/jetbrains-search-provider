#!/usr/bin/env python3
# Copyright 2019 Sebastian Wiesner <sebastian@swsnr.de>
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may not
# use this file except in compliance with the License. You may obtain a copy of
# the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations under
# the License.


import os
import xml.etree.ElementTree as etree
import json
import re
from pathlib import Path


def idea_version(config_dir):
    version = re.search(r'\d{4}\.\d{1,2}', config_dir.name)
    if version:
        year, revision = version.group(0).split('.')
        return (int(year), int(revision))
    else:
        raise ValueError(f'Not a valid IDEA config directory: {config_dir}')


def find_idea_directories():
    """
    Find all available IDEA configuration directories together with their version.
    """
    config_home = os.environb.get(b'XDG_CONFIG_HOME', b'')
    if config_home:
        config_home = Path(config_home)
    else:
        config_home = Path.home() / '.config'
    yield from (config_home / 'JetBrains').glob('IntelliJIdea*')
    yield from Path.home().glob('.IntelliJIdea*')


def find_latest_recent_projects_file():
    """
    Find the `recentProjects.xml` file of the most recent IDEA version.
    """
    config_dir = max(find_idea_directories(), key=idea_version, default=None)
    if config_dir:
        year, _ = idea_version(config_dir)
        if 2020 <= year:
            return config_dir / 'options' / 'recentProjects.xml'
        else:
            return config_dir / 'config' / 'options' / 'recentProjects.xml'
    else:
        return None


def get_project(directory):
    """
    Get the project in the given directory.

    Figure out the project name, and return a dictionary with the project name,
    the readable project path, the absolute project path, and a unique ID.
    """
    namefile = directory.expanduser() / '.idea' / '.name'
    try:
        name = namefile.read_text(encoding='utf-8').strip()
    except FileNotFoundError:
        name = directory.name
    # When changing this object change the `Project` interface in extension.ts
    return {
        # Conveniently use the absolute path as ID, because it's definitely unique,
        # and prefix it with the name of this launch to avoid conflicts with IDs
        # from other providers.
        'id': 'intellij-idea-search-provider-{0}'.format(directory.expanduser()),
        'name': name,
        'path': str(directory),
        'abspath': str(directory.expanduser())
    }


def find_recent_projects(recent_projects_file):
    """
    Find all recent projects listed in the given recent projects XML file.
    """
    document = etree.parse(recent_projects_file)
    paths = (Path(el.attrib['value'].replace('$USER_HOME$', '~'))
             for el in
             document.findall('.//option[@name="recentPaths"]/list/option'))
    return list(get_project(directory) for directory in paths if
                directory.expanduser().is_dir())


def success(projects):
    return {
        'kind': 'success',
        'projects': projects
    }


def error(message):
    return {
        'kind': 'error',
        'message': message
    }


def main():
    config_file = find_latest_recent_projects_file()
    if config_file:
        output = success(find_recent_projects(config_file))
    else:
        output = error('No IDEA configuration directory found')
    print(json.dumps(output))


if __name__ == '__main__':
    main()
