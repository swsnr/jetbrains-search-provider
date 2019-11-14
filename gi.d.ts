// Copyright 2019 Sebastian Wiesner <sebastian@swsnr.de>

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
      class Subprocess {
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
      class DesktopAppInfo extends AppInfo {
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
      class Icon {
        constructor(props: { gicon: Gio.Icon; icon_size: number });
      }
    }
  }
}
