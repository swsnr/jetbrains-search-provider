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

/**
 * Log the given `message` to journalctl.
 */
declare function log(message: string): void;

/**
 * Log the given error message to journalctl.
 */
declare function logError(message: string): void;

/**
 * Meta information about a result.
 */
declare interface ResultMeta {
  /**
   * The ID of the result.
   */
  readonly id: string;

  /**
   * The name of the result.
   */
  readonly name: string;

  /**
   * The result description.
   */
  readonly description: string;

  /**
   * Create an icon for the given size.
   */
  readonly createIcon: (size: number) => imports.gi.St.Icon | null;
}

/**
 * A search provider.
 */
declare interface SearchProvider {
  /**
   * The unique ID of this provider
   */
  readonly id: string;

  /**
   * Whether this is a "remote" provider.
   *
   * Should be `false` for all search provider extensions.
   */
  readonly isRemoteProvider: boolean;

  /**
   * Whether this provider can launch a search in the application.
   *
   * Set to `true` to activate the "launchSearch" function.
   */
  readonly canLaunchSearch: boolean;

  /**
   * The App providing these search results.
   */
  readonly appInfo: imports.gi.Gio.AppInfo;

  /**
   * Get the initial results.
   *
   * @param terms A list of search terms
   * @param callback The callback to report matching IDs
   */
  getInitialResultSet(
    terms: ReadonlyArray<string>,
    callback: (ids: string[]) => void
  ): void;

  /**
   * Narrow down search results.
   *
   * Re-evaluate the current results against the given terms, and return the
   * matching subset.
   *
   * This function must only report results already in `currentResultIDs`.
   *
   * @param currentResultIDs IDs of currently matching results
   * @param terms A list of search terms
   * @param callback The callback to report matching IDs
   */
  getSubsearchResultSet(
    currentResultIDs: ReadonlyArray<string>,
    terms: string[],
    callback: (ids: string[]) => void
  ): void;

  /**
   * Get mata information for the given results.
   *
   * @param ids The result IDs whose meta information to get
   * @param callback The callback to report result metas with
   */
  getResultMetas(
    ids: ReadonlyArray<string>,
    callback: (metas: ResultMeta[]) => void
  ): void;

  /**
   * Activate the given result, by launching it in the corresponding app.
   *
   * Called when the user clicks on a search result.
   *
   * @param identifier The ID of the result to activate
   */
  activateResult(identifier: string): void;

  /**
   * Continue search in the search provider app.
   *
   * Called when the user clicks on the search provider.
   *
   * Likely ignored if `canLaunchSearch` is `false`.
   *
   * @param terms The terms
   */
  launchSearch(terms: string[]): void;

  /**
   * This method is an undocumented requirement by GNOME Shell.
   *
   * @param results The results
   * @param max The maximum number of results tu return.
   */
  filterResults(
    results: ReadonlyArray<string>,
    max: number
  ): ReadonlyArray<string>;
}

declare interface ExtensionMeta {
  readonly uuid: string;
  readonly name: string;
  readonly version: number | string;
  readonly description: string;
  readonly url: string;
}

declare interface ExtensionObject {
  readonly metadata: ExtensionMeta;
  readonly uuid: string;
  readonly dir: imports.gi.Gio.File;
  readonly path: string;
}

declare interface ExtensionState {
  enable(): void;

  disable(): void;
}

declare namespace imports {
  namespace ui {
    namespace main {
      function notifyError(msg: string, details: string): void;

      namespace overview {
        namespace viewSelector {
          namespace _searchResults {
            function _registerProvider(provider: SearchProvider): void;
            function _unregisterProvider(provider: SearchProvider): void;
          }
        }
      }
    }
  }

  namespace misc {
    namespace extensionUtils {
      function getCurrentExtension(): ExtensionObject | null;
    }
  }
}
