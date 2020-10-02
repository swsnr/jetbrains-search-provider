// Copyright (C) Sebastian Wiesner <sebastian@swsnr.de>

// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

import ByteArray = imports.byteArray;
import Gtk = imports.gi.Gtk;

import ExtensionUtils = imports.misc.extensionUtils;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const Self = ExtensionUtils.getCurrentExtension()!;

// eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
function init(): void {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildPrefsWidget(): imports.gi.Gtk.Widget {
  // gnome-extensions pack adds the prefs.ui file to the top-level directory
  const ui = Self.dir.get_child("prefs.ui").get_path();
  if (!ui) {
    throw new Error(`Fatal error, failed to find prefs.ui file!`);
  }

  const buildable = Gtk.Builder.new_from_file(ui);

  const version = buildable.get_object<Gtk.Label>("about_version");
  version.set_text(`Version ${Self.metadata.version}`);

  const license = ByteArray.toString(
    Self.dir.get_child("COPYING").load_contents(null)[1]
  );
  const license_buffer = buildable.get_object<Gtk.TextBuffer>(
    "about_license_buffer"
  );
  license_buffer.set_text(license, -1);

  const widget = buildable.get_object<Gtk.Widget>("prefs_widget");
  widget.show_all();
  return widget;
}
