# Gnome shell search provider for Intellij IDEA projects

A Gnome shell extension to find recent IntelliJ IDEA projects in search.

## Requirements

- Gnome shell 3.36 or newer
- Python 3.6 or newer (as `python3` in `$PATH`)

## Installation

Install via [Gnome Extensions][gexts].

Alternatively download the latest `.shell-extension.zip` from [Releases] and run

```console
$ gnome-extensions install intellij-idea-search-provider@swsnr.de.shell-extension.zip
```

**Note:** Version numbers from Gnome Extensions and Releases differ, because
uploading to Gnome Extensions renumbers releases. If you switch between
installation methods, remove and reinstall.

[gexts]: https://extensions.gnome.org/extension/2341/intellij-idea-search-provider/
[releases]: https://github.com/lunaryorn/gnome-intellij-idea-search-provider/releases

## Limitations

- I do not know how to parse XML in GJS, so finding recent IntelliJ projects
  relies on a Python helper which parses `recentProjects.xml` and outputs
  relevant parts as JSON (see [GH-1]).
- I use Ultimate, so this extension only supports IDEA Ultimate, installed with
  `snap`, `flatpak` or from AUR. Pull requests for Community and Toolbox
  welcome, see [GH-2].

[gh-1]: https://github.com/lunaryorn/gnome-intellij-idea-search-provider/issues/1
[gh-2]: https://github.com/lunaryorn/gnome-intellij-idea-search-provider/issues/2

## Credits

I'd like to thank [gnome-shell-web-search-provider][1] and [vscode-search-provider][2]
for inspiration and their source code which demonstrates how to use the—apparently
entirely internal and undocumented—Gnome shell API for search providers.

Stand on the shoulders of giants and you can even write Javascript for Gnome.

[1]: https://github.com/mrakow/gnome-shell-web-search-provider
[2]: https://github.com/jomik/vscode-search-provider

## License

Copyright 2019 Sebastian Wiesner <sebastian@swsnr.de>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
