# Jetbrains search provider

A Gnome shell extension to add recent projects from JetBrains IDEs to search.

**Note:** This extension is not affiliated with or endorsed by JetBrains.

Supports:

- IDEA Ultimate
- IDEA Community Edition
- Webstorm

## Requirements

- Gnome shell 3.36 or newer
- Python 3.6 or newer (as `python3` in `$PATH`)

## Installation

Install via [Gnome Extensions][gexts].

Alternatively download the latest `.shell-extension.zip` from [Releases] and run

```console
$ gnome-extensions install jetbrains-search-provider@swsnr.de.shell-extension.zip
```

**Note:** Version numbers from Gnome Extensions and Releases differ, because
uploading to Gnome Extensions renumbers releases. If you switch between
installation methods, remove and reinstall.

[gexts]: https://extensions.gnome.org/extension/3115/jetbrains-search-provider/
[releases]: https://github.com/lunaryorn/jetbrains-search-provider/releases

## Limitations

- I do not know how to parse XML in GJS, so finding recent projects relies on a
  Python helper which parses `recentProjects.xml` and outputs relevant parts as
  JSON.

## Credits

I'd like to thank [gnome-shell-web-search-provider][1] and [vscode-search-provider][2]
for inspiration and their source code which demonstrates how to use the—apparently
entirely internal and undocumented—Gnome shell API for search providers.

Stand on the shoulders of giants and you can even write Javascript for Gnome.

[1]: https://github.com/mrakow/gnome-shell-web-search-provider
[2]: https://github.com/jomik/vscode-search-provider

## License

Copyright Sebastian Wiesner <sebastian@swsnr.de>

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
