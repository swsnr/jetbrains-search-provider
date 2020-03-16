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

const Gio = imports.gi.Gio;
const St = imports.gi.St;

const Main = imports.ui.main;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const Self = imports.misc.extensionUtils.getCurrentExtension()!;

/**
 * Log a message from this extension, with prefix.
 *
 * @param message The message to log
 */
const l = (message: string): void => log(`${Self.metadata.name}: ${message}`);

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
const findIDEA = (): imports.gi.Gio.DesktopAppInfo | null => {
  const candidates = [
    // Arch Linux AUR package
    "jetbrains-idea.desktop",
    // Snap installation
    "intellij-idea-ultimate_intellij-idea-ultimate.desktop",
    // Flatpak installation
    "com.jetbrains.IntelliJ-IDEA-Ultimate.desktop"
  ];
  for (const desktopId of candidates) {
    const app = Gio.DesktopAppInfo.new(desktopId);
    if (app) {
      l(`Found IntelliJ IDEA at ${desktopId}`);
      return app;
    }
  }
  return null;
};

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

type ProjectMap = Map<string, Project>;

/**
 * Lookup projects by their identifiers.
 *
 * @param projects Known projects
 * @param identifiers Identifiers to look for
 * @returns All projects from `projects` with any of the given `identifiers`.
 */
const lookupProjects = (
  projects: ProjectMap,
  identifiers: ReadonlyArray<string>
): Project[] => identifiers.map(projects.get).filter((p): p is Project => !!p);

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

/**
 * Launch IDEA or show an error notification on failure.
 *
 * @param idea Desktop App Info for IDEA
 * @param files Files to launch IDEA with
 */
const launchIDEAInShell = (
  idea: imports.gi.Gio.DesktopAppInfo,
  files?: imports.gi.Gio.File[]
): void => {
  try {
    idea.launch(files || [], null);
  } catch (err) {
    imports.ui.main.notifyError("Failed to launch IntelliJ IDEA", err.message);
  }
};

/**
 * Create result meta info for a project.
 *
 * @param idea The IDEA app info
 * @returns A function with creates result metadata for a given project.
 */
const resultMetaForProject = (idea: imports.gi.Gio.DesktopAppInfo) => (
  project: Project
): ResultMeta => ({
  id: project.id,
  name: project.name,
  description: project.path,
  createIcon: (size): imports.gi.St.Icon | null => {
    const gicon = idea.get_icon();
    if (gicon) {
      return new St.Icon({
        gicon,
        // eslint-disable-next-line @typescript-eslint/camelcase
        icon_size: size
      });
    } else {
      return null;
    }
  }
});

/**
 * Create a search provider for IDEA projects.
 *
 * The project exposes the given projects for search.  On activation it uses the
 * given IDEA app to open projects.
 *
 * On search provider activation, that is, when the user clicks on the search
 * provider icon to resume search in the app, it merely opens IDEA without any
 * projects, since IDEA doesn't provide an interface start a recent projects
 * search within IDEA.
 *
 * @param projects The project to search in
 * @param idea The IntelliJ IDEA application info
 */
const createProvider = (
  projects: ProjectMap,
  idea: imports.gi.Gio.DesktopAppInfo
): SearchProvider => ({
  id: Self.uuid,
  isRemoteProvider: false,
  canLaunchSearch: true,
  appInfo: idea,
  getInitialResultSet: (terms, callback): void =>
    callback(findMatchingIds(Object.values(projects), terms)),
  getSubsearchResultSet: (current, terms, callback): void =>
    callback(findMatchingIds(lookupProjects(projects, current), terms)),
  getResultMetas: (ids, callback): void =>
    callback(lookupProjects(projects, ids).map(resultMetaForProject(idea))),
  launchSearch: (): void => launchIDEAInShell(idea),
  activateResult: (id: string): void => {
    const project = projects.get(id);
    if (project) {
      launchIDEAInShell(idea, [Gio.File.new_for_path(project.abspath)]);
    }
  },
  filterResults: (results, max): string[] => results.slice(0, max)
});

/**
 * Find all recent projects.
 *
 * @param extensionDirectory The directory of this extension
 * @returns A promise with all recent IDEA projects.
 */
const recentProjects = (
  extensionDirectory: imports.gi.Gio.File
): Promise<ProjectMap> => {
  const helper = extensionDirectory.get_child("find-projects.py").get_path();
  if (!helper) {
    return Promise.reject(new Error("Helper find-projects.py doesn't exist!"));
  } else {
    l(`Running Python helper ${helper} to discover IntelliJ IDEA projects`);
    return execCommand(["python3", helper]).then(
      output => new Map(Object.entries(JSON.parse(output)))
    );
  }
};

type RegisteredProvider = "unregistered" | "registering" | SearchProvider;

/**
 * Initialize this extension immediately after loading.
 *
 * Doesn't do anything for this extension.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
function init(): ExtensionState {
  // eslint-disable-next-line immutable/no-let
  let registeredProvider: RegisteredProvider = "unregistered";

  return {
    enable: (): void => {
      if (registeredProvider === "unregistered") {
        l(`enabling version ${Self.metadata.version}`);
        const idea = findIDEA();
        if (idea) {
          registeredProvider = "registering";
          recentProjects(Self.dir).then(
            projects => {
              if (registeredProvider === "registering") {
                // If the user hasn't disabled the extension meanwhile create the
                // search provider and registered it, both in our global variable
                // and for gnome shell.
                registeredProvider = createProvider(projects, idea);
                Main.overview.viewSelector._searchResults._registerProvider(
                  registeredProvider
                );
              }
            },
            error => {
              // If the the user hasn't disabled the extension meanwhile show an
              // error message.
              if (registeredProvider === "registering") {
                Main.notifyError(
                  "Failed to find recent projects",
                  error.message
                );
              }
            }
          );
        } else {
          Main.notifyError(
            "IntelliJ IDEA not found",
            "Consider reporting on https://github.com/lunaryorn/gnome-intellij-idea-search-provider/issues/2"
          );
        }
      }
    },
    disable: (): void => {
      if (typeof registeredProvider !== "string") {
        // Remove the provider if it was registered
        l(`Disabling ${Self.metadata.version}`);
        Main.overview.viewSelector._searchResults._unregisterProvider(
          registeredProvider
        );
      }
      // In any case mark the provider as unregistered, so that we can register it
      // again when the user reenables the extension.
      registeredProvider = "unregistered";
    }
  };
}
