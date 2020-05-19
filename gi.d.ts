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

/* eslint-disable @typescript-eslint/camelcase */

declare namespace imports {
  namespace gi {
    namespace Gio {
      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file
       */
      class File {
        private constructor();

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#function-new_for_path
         */
        static new_for_path(path: string): File;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-get_child
         */
        get_child(name: string): File;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-get_path
         */
        get_path(): string | null;
      }

      class Cancellable {}

      type SubprocessFlags = number;

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocessflags
       */
      namespace SubprocessFlags {
        const STDOUT_PIPE: SubprocessFlags;
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.asyncresult
       */
      class AsyncResult {
        private constructor();
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocess
       */
      export class Subprocess {
        constructor(args: {
          argv: ReadonlyArray<string>;
          flags: SubprocessFlags;
        });

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.initable#method-init
         */
        init(cancellable: Cancellable | null): boolean;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocess#method-communicate_utf8_async
         */
        communicate_utf8_async(
          input: string | null,
          cancellable: Cancellable | null,
          callback: (process: Subprocess, result: AsyncResult) => void
        ): void;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocess#method-communicate_utf8_finish
         */
        communicate_utf8_finish(result: AsyncResult): [boolean, string, string];
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.applaunchcontext
       */
      class AppLaunchContext {
        private constructor();
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.icon
       */
      class Icon {
        private constructor();
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo
       */
      class AppInfo {
        protected constructor();

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo#method-get_name
         */
        get_name(): string;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo#method-get_icon
         */
        get_icon(): Icon | null;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo#method-launch
         */
        launch(files: File[], context: AppLaunchContext | null): boolean;
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.desktopappinfo
       */
      export class DesktopAppInfo extends AppInfo {
        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.desktopappinfo#constructor-new
         */
        static new(desktop_id: string): DesktopAppInfo | null;
      }
    }

    /**
     * Shell toolkit.
     */
    namespace St {
      export class Icon {
        constructor(props: { gicon: Gio.Icon; icon_size: number });
      }
    }
  }
}
