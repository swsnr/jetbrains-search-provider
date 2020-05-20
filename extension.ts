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

import Gio = imports.gi.Gio;
import St = imports.gi.St;

import Main = imports.ui.main;
import ExtensionUtils = imports.misc.extensionUtils;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const Self = ExtensionUtils.getCurrentExtension()!;

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
      flags: Gio.SubprocessFlags.STDOUT_PIPE,
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

interface ProductInfo {
  /**
   * The product key.
   */
  readonly key: string;

  /**
   * Desktop file names this product is available as.
   */
  readonly desktopNames: ReadonlyArray<string>;
}

/**
 * Known products.
 *
 * Keys need to be the same as in find-projects.py
 */
const PRODUCTS: Map<string, ProductInfo> = new Map<string, ProductInfo>(
  [
    {
      key: "idea",
      desktopNames: [
        // Arch Linux AUR package and toolbox installation
        "jetbrains-idea.desktop",
        // Snap installation
        "intellij-idea-ultimate_intellij-idea-ultimate.desktop",
        // Flatpak installation
        "com.jetbrains.IntelliJ-IDEA-Ultimate.desktop",
      ],
    },
    {
      key: "idea-ce",
      desktopNames: [
        // Toolbox installation
        "jetbrains-idea-ce.desktop",
        // Arch Linux package,
        "idea.desktop",
      ],
    },
    {
      key: "webstorm",
      desktopNames: [
        // Toolbox installation
        "jetbrains-webstorm.desktop",
      ],
    },
    {
      key: "clion",
      desktopNames: [
        // Toolbox installation
        "jetbrains-clion.desktop",
      ],
    },
  ].map((product) => [product.key, product])
);

/**
 * Find an app by desktop names.
 */
const findApp = (
  desktopNames: ReadonlyArray<string>
): Gio.DesktopAppInfo | null => {
  for (const desktopId of desktopNames) {
    const app = Gio.DesktopAppInfo.new(desktopId);
    if (app) {
      l(`Found IntelliJ IDEA at ${desktopId}`);
      return app;
    }
  }
  return null;
};

/**
 * An project.
 */
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

type ProductProjects = Map<string, ProjectMap>;

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
): Project[] =>
  identifiers
    .map((id) => projects.get(id))
    .filter((p): p is Project => p !== undefined);

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
    (term) => project.name.includes(term) || project.path.includes(term)
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
  projects.filter((p) => projectMatchesAllTerms(p, terms)).map((p) => p.id);

/**
 * Launch IDEA or show an error notification on failure.
 *
 * @param idea Desktop App Info for IDEA
 * @param files Files to launch IDEA with
 */
const launchAppInShell = (
  idea: Gio.DesktopAppInfo,
  files?: Gio.File[]
): void => {
  try {
    idea.launch(files || [], null);
  } catch (err) {
    Main.notifyError(`Failed to launch app ${idea.get_name()}`, err.message);
  }
};

/**
 * Create result meta info for a project.
 *
 * @param idea The IDEA app info
 * @returns A function with creates result metadata for a given project.
 */
const resultMetaForProject = (idea: Gio.DesktopAppInfo) => (
  project: Project
): ResultMeta => ({
  id: project.id,
  name: project.name,
  description: project.path,
  createIcon: (size): St.Icon | null => {
    const gicon = idea.get_icon();
    if (gicon) {
      return new St.Icon({
        gicon,
        // eslint-disable-next-line @typescript-eslint/camelcase
        icon_size: size,
      });
    } else {
      return null;
    }
  },
});

/**
 * Create a search provider for the given projects.
 *
 * The project exposes the given projects for search.  On activation it uses the
 * given app to open projects.
 *
 * On search provider activation, that is, when the user clicks on the search
 * provider icon to resume search in the app, it merely opens the app without any
 * projects, since JetBrains products dont provide an interface start a recent
 * projects search within the app.
 *
 * @param product The product to create a search provider for.
 * @param app The application info for the product.
 * @param projects The recent projects of the product.
 */
const createProvider = (
  product: ProductInfo,
  app: Gio.DesktopAppInfo,
  projects: ProjectMap
): SearchProvider => ({
  id: `${Self.uuid}-${product.key}`,
  isRemoteProvider: false,
  canLaunchSearch: true,
  appInfo: app,
  getInitialResultSet: (terms, callback): void =>
    callback(findMatchingIds([...projects.values()], terms)),
  getSubsearchResultSet: (current, terms, callback): void =>
    callback(findMatchingIds(lookupProjects(projects, current), terms)),
  getResultMetas: (ids, callback): void =>
    callback(lookupProjects(projects, ids).map(resultMetaForProject(app))),
  launchSearch: (): void => launchAppInShell(app),
  activateResult: (id: string): void => {
    const project = projects.get(id);
    if (project) {
      launchAppInShell(app, [Gio.File.new_for_path(project.abspath)]);
    }
  },
  filterResults: (results, max): string[] => results.slice(0, max),
});

/**
 * A project returned by the helper.
 *
 * Defined separately from the Project type to have a clear boundary of
 * serialization, and allow us to freely change the Project type while retaining
 * a stable interface for serialization.
 */
interface ProjectFromHelper {
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

interface HelperSuccessResult {
  readonly kind: "success";
  /**
   * Discovered projects
   */
  readonly projects: ReadonlyArray<[string, ReadonlyArray<ProjectFromHelper>]>;
}

interface HelperErrorResult {
  readonly kind: "error";

  /**
   * A human readable error message.
   */
  readonly message: string;

  /**
   * The traceback, for logging.
   */
  readonly traceback: string;
}

/**
 * The output of our helper;  keep in sync with what the helper really prints
 */
type HelperResult = HelperSuccessResult | HelperErrorResult;

/**
 * Run the recent projects helper.
 *
 * @param extensionDirectory The directory of this extension
 * @returns The output of our Python helper
 */
const runRecentProjectsHelper = (
  extensionDirectory: Gio.File
): Promise<unknown> => {
  const helper = extensionDirectory.get_child("find-projects.py").get_path();
  if (!helper) {
    return Promise.reject(new Error("Helper find-projects.py doesn't exist!"));
  } else {
    l(`Running Python helper ${helper} to discover JetBrains projects`);
    return execCommand(["python3", helper]).then((output) =>
      JSON.parse(output)
    );
  }
};

class RecentProjectsError extends Error {
  constructor(message: string) {
    super(`Failed to get recent projects: ${message}`);
    // eslint-disable-next-line immutable/no-this, immutable/no-mutation
    this.name = "RecentProjectsError";
  }
}

/**
 * Whether o is a helper result.
 *
 * Unsafe because it doesn't full test the entire shape.
 *
 * @param o The object to test
 */
const unsafeIsHelperResult = (o: unknown): o is HelperResult => {
  if (!o || typeof o !== "object") {
    return false;
  }

  const kind = (o as { kind?: unknown }).kind;
  if (!kind || typeof kind !== "string") {
    return false;
  }
  const message = (o as { message?: unknown }).message;
  const projects = (o as { projects?: unknown }).projects;

  switch (kind) {
    case "success":
      return Array.isArray(projects);
    case "error":
      return typeof message === "string";
    default:
      return false;
  }
};

/**
 * Get all recent IDEA projects.
 *
 * @param extensionDirectory The directory of this extension
 * @returns A promise with all recent IDEA projects.
 */
const recentProjects = (
  extensionDirectory: Gio.File
): Promise<ProductProjects> =>
  runRecentProjectsHelper(extensionDirectory).then((output) => {
    if (!unsafeIsHelperResult(output)) {
      throw new RecentProjectsError(
        `Received invalid output from helper: ${JSON.stringify(output)}`
      );
    }
    switch (output.kind) {
      case "error":
        l(`Helper failed: ${output.traceback}`);
        throw new RecentProjectsError(output.message);
      case "success":
        return new Map(
          output.projects.map(([key, projects]) => [
            key,
            new Map(projects.map((p) => [p.id, p])),
          ])
        );
    }
  });

type RegisteredProvider =
  | "unregistered"
  | "registering"
  | ReadonlyArray<SearchProvider>;

/**
 * Initialize this extension immediately after loading.
 *
 * Doesn't do anything for this extension.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
function init(): ExtensionState {
  // eslint-disable-next-line immutable/no-let
  let registeredProviders: RegisteredProvider = "unregistered";

  return {
    enable: (): void => {
      if (registeredProviders === "unregistered") {
        l(`enabling version ${Self.metadata.version}`);
        registeredProviders = "registering";
        recentProjects(Self.dir)
          .then((productProjects) => {
            if (registeredProviders !== "registering") {
              // Registration was aborted, so let's not continue
              return;
            }

            const providers: SearchProvider[] = [];

            productProjects.forEach((projects, key) => {
              const product = PRODUCTS.get(key);
              if (!product) {
                l(
                  `No product found for key ${key}: Report to <https://github.com/lunaryorn/jetbrains-search-provider>`
                );
                return;
              }

              const app = findApp(product.desktopNames);
              if (!app) {
                l(
                  `JetBrains app ${key} not found; report to <https://github.com/lunaryorn/jetbrains-search-provider>`
                );
                return;
              }
              providers.push(createProvider(product, app, projects));
            });

            providers.forEach((provider) => {
              Main.overview.viewSelector._searchResults._registerProvider(
                provider
              );
            });
          })
          .catch((error) => {
            // If the the user hasn't disabled the extension meanwhile show an
            // error message.
            if (registeredProviders === "registering") {
              Main.notifyError("Failed to find recent projects", error.message);
            }
          });
      }
    },
    disable: (): void => {
      if (typeof registeredProviders !== "string") {
        // Remove the provider if it was registered
        l(`Disabling ${Self.metadata.version}`);
        registeredProviders.forEach((provider) => {
          Main.overview.viewSelector._searchResults._unregisterProvider(
            provider
          );
        });
      }
      // In any case mark the provider as unregistered, so that we can register it
      // again when the user reenables the extension.
      registeredProviders = "unregistered";
    },
  };
}
