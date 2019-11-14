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

"use strict";

const Gio = imports.gi.Gio;
const St = imports.gi.St;

/**
 * Spawn command.
 *
 * Taken from <https://github.com/andyholmes/andyholmes.github.io/blob/master/articles/asynchronous-programming-in-gjs.md#spawning-processes>
 */
const execCommand = (argv: ReadonlyArray<string>): Promise<string> =>
  new Promise((resolve, reject) => {
    // There is also a reusable Gio.SubprocessLauncher class available
    const proc = new Gio.Subprocess({
      argv: argv,
      // There are also other types of flags for merging stdout/stderr,
      // redirecting to /dev/null or inheriting the parent's pipes
      flags: Gio.SubprocessFlags.STDOUT_PIPE
    });

    // Classes that implement GInitable must be initialized before use, but
    // an alternative in this case is to use Gio.Subprocess.new(argv, flags)
    //
    // If the class implements GAsyncInitable then Class.new_async() could
    // also be used and awaited in a Promise.
    proc.init(null);

    // communicate_utf8() returns a string, communicate() returns a
    // a GLib.Bytes and there are "headless" functions available as well
    proc.communicate_utf8_async(null, null, (proc, res) => {
      try {
        resolve(proc.communicate_utf8_finish(res)[1]);
      } catch (e) {
        reject(e);
      }
    });
  });

/**
 * Find the IDEA App.
 *
 * Currently only supports IDEA Ultimate installed from Snap Store.
 */
const findIDEA = (): imports.gi.Gio.DesktopAppInfo | null =>
  Gio.DesktopAppInfo.new(
    "intellij-idea-ultimate_intellij-idea-ultimate.desktop"
  );

interface Project {
  /**
   * The project identifier.
   */
  readonly id: string;

  /**
   * The project name.
   */
  readonly name: string;

  /**
   * The readable path, e.g. ~ instead of /home/…
   */
  readonly path: string;

  /**
   * The absolute path to the project.
   */
  readonly abspath: string;
}

/**
 * A map of project IDs to projects.
 */
interface ProjectMap {
  readonly [key: string]: Project;
}

/**
 * Whether the project matches all terms.
 *
 * Check whether the project matches all terms, by checking each term against
 * the project name and the readable project path.
 *
 * @param {Project} project A project
 * @param {[string]} terms A list of search terms
 * @returns true if the project matches, false otherwise.
 */
const projectMatchesAllTerms = (
  project: Project,
  terms: ReadonlyArray<string>
): boolean =>
  terms.every(
    term => project.name.includes(term) || project.path.includes(term)
  );

/**
 * Find all projects from the given list of projects which match the terms.
 *
 * @param {[Project]} projects A list of project
 * @param {[string]} terms A list of search terms
 * @returns A list of IDs of all projects out of `projects` which match `terms`.
 */
const findMatchingIds = (
  projects: ReadonlyArray<Project>,
  terms: ReadonlyArray<string>
): string[] =>
  projects.filter(p => projectMatchesAllTerms(p, terms)).map(p => p.id);

class IDEAProvider implements SearchProvider {
  private projects: ProjectMap;
  public readonly appInfo: imports.gi.Gio.DesktopAppInfo;

  constructor(
    extensionDirectory: imports.gi.Gio.File,
    ideaApp: imports.gi.Gio.DesktopAppInfo
  ) {
    this.appInfo = ideaApp;
    this.projects = {};
    const helper = extensionDirectory.get_child("find-projects.py").get_path();
    if (!helper) {
      throw new Error("Helper find-projects.py doesn't exist!");
    }
    log(`Running Python helper ${helper} to discover IntelliJ IDEA projects`);
    execCommand(["python3", helper]).then(
      output => {
        this.projects = JSON.parse(output);
        log(`Found projects: ${Object.keys(this.projects)}`);
      },
      error =>
        imports.ui.main.notifyError(
          "Failed to find intellij projects",
          `Couldn't run helper ${helper}: ${error.message}`
        )
    );
  }

  getInitialResultSet(
    terms: ReadonlyArray<string>,
    callback: (ids: string[]) => void
  ): void {
    callback(findMatchingIds(Object.values(this.projects), terms));
  }

  getSubsearchResultSet(
    currentResultIDs: ReadonlyArray<string>,
    terms: string[],
    callback: (ids: string[]) => void
  ): void {
    callback(findMatchingIds(this.getProjects(currentResultIDs), terms));
  }

  getResultMetas(
    identifiers: ReadonlyArray<string>,
    callback: (metas: ResultMeta[]) => void
  ): void {
    callback(
      this.getProjects(identifiers).map(project => ({
        // The ID of the project as given
        id: project.id,
        // The project name
        name: project.name,
        // Use the human-readable path as description
        description: project.path,
        // Use the IDEA icon for each search result
        createIcon: (size): imports.gi.St.Icon | undefined => {
          const gicon = this.appInfo.get_icon();
          if (gicon) {
            return new St.Icon({
              gicon,
              // eslint-disable-next-line @typescript-eslint/camelcase
              icon_size: size
            });
          } else {
            return undefined;
          }
        }
      }))
    );
  }

  activateResult(identifier: string): void {
    const project = this.getProject(identifier);
    if (project) {
      this.launchIDEA([Gio.File.new_for_path(project.abspath)]);
    }
  }

  /**
   * Click on the provider icon.
   *
   * This function receives a list of terms like `getInitialResultSet`; the
   * IDEA is to launch the underlying application and continue searching in
   * the application using the given terms.
   *
   * However IDEA doesn't let us open a search dialog for recent projects from
   * the outside, let alone specify search terms, so we just launch IDEA
   * without any further arguments (just like the desktop launcher would do).
   *
   * Not exactly useful, but better than nothing.
   */
  launchSearch(): void {
    this.launchIDEA();
  }

  /**
   * This method is an undocumented requirement by GNOME Shell.
   */
  filterResults(results: ReadonlyArray<string>, max: number): string[] {
    return results.slice(0, max);
  }

  /**
   * Launch IDEA with the given files.
   *
   * Catch all errors that occur and display a notification dialog for errors.
   *
   * @param files
   */
  private launchIDEA(files?: imports.gi.Gio.File[]): void {
    try {
      this.appInfo.launch(files || [], null);
    } catch (err) {
      imports.ui.main.notifyError(
        "Failed to launch IntelliJ IDEA",
        err.message
      );
    }
  }

  /**
   * Get all projects with the given identifiers.
   *
   * Ignore unknown identifiers.
   */
  private getProjects(identifiers: ReadonlyArray<string>): Project[] {
    return identifiers
      .filter(id => Object.prototype.hasOwnProperty.call(this.projects, id))
      .map(id => this.projects[id]);
  }

  /**
   * Get the project with the given ID or null.
   *
   * @param identifier
   */
  private getProject(identifier: string): Project | null {
    return Object.prototype.hasOwnProperty.call(this.projects, identifier)
      ? this.projects[identifier]
      : null;
  }
}

/**
 * Get the current extension.
 */
const currentExtension = (): ExtensionObject => {
  const ext = imports.misc.extensionUtils.getCurrentExtension();
  if (!ext) {
    throw new Error("Can't figure out current extension");
  }
  return ext;
};

/**
 * The registered provider if any.
 *
 * Only used for correctly deregistering, and to prevent registering it twice.
 */
let registeredProvider: IDEAProvider | null = null;

/**
 * Initialize this extension immediately after loading.
 *
 * Doesn't do anything for this extension.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
function init(): void {}

/**
 * Enable this extension.
 *
 * Registers the search provider if not already registered.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function enable(): void {
  if (!registeredProvider) {
    const me = currentExtension();
    log(`enabling ${me.metadata.name} version ${me.metadata.version}`);
    const main = imports.ui.main;
    const idea = findIDEA();
    if (idea) {
      registeredProvider = new IDEAProvider(me.dir, idea);
      (main.overview as any).viewSelector._searchResults._registerProvider(
        registeredProvider
      );
    } else {
      main.notifyError(
        "IntelliJ IDEA not found",
        "Consider reporting on https://github.com/lunaryorn/gnome-intellij-idea-search-provider/issues/2"
      );
    }
  }
}

/**
 * Disable this extension.
 *
 * Unregisters the search provider if registered.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function disable(): void {
  if (registeredProvider) {
    const me = currentExtension();
    log(`disabling ${me.metadata.name} version ${me.metadata.version}`);
    const main = imports.ui.main;
    (main.overview as any).viewSelector._searchResults._unregisterProvider(
      registeredProvider
    );
    registeredProvider = null;
  }
}
