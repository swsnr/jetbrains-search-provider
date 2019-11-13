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


import xml.etree.ElementTree as etree
import json
from pathlib import Path


def find_latest_recent_projects_file():
    """
    Find the `recentProjects.xml` file of the most recent IDEA version.
    """
    candidates = sorted(
        Path.home().glob('.IntelliJIdea*'),
        key=lambda p: p.name,
        reverse=True)
    if candidates:
        return candidates[0] / 'config' / 'options' / 'recentProjects.xml'
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
    projects = (get_project(directory) for directory in paths if
                directory.expanduser().is_dir())
    return dict((project['id'], project) for project in projects)


def main():
    print(json.dumps(find_recent_projects(find_latest_recent_projects_file())))


if __name__ == '__main__':
    main()
