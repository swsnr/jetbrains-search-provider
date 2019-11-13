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

'use strict';

const Gio = imports.gi.Gio;
const St = imports.gi.St;

/**
 * Spawn command.
 *
 * Taken from <https://github.com/andyholmes/andyholmes.github.io/blob/master/articles/asynchronous-programming-in-gjs.md#spawning-processes>
 */
async function execCommand(argv) {
    try {
        // There is also a reusable Gio.SubprocessLauncher class available
        let proc = new Gio.Subprocess({
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

        let stdout = await new Promise((resolve, reject) => {
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

        return stdout;
    } catch (e) {
        logError(e);
    }
}

/**
 * Find the IDEA App.
 *
 * Currently only supports IDEA Ultimate installed from Snap Store.
 */
const findIDEA = () => {
    return Gio.DesktopAppInfo.new('intellij-idea-ultimate_intellij-idea-ultimate.desktop')
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
const projectMatchesAllTerms = (project, terms) =>
    terms.every((term) => project.name.includes(term) || project.path.includes(term));

/**
 * Find all projects from the given list of projects which match the terms.
 *
 * @param {[Project]} projects A list of project
 * @param {[string]} terms A list of search terms
 * @returns A list of IDs of all projects out of `projects` which match `terms`.
 */
const findMatchingIds = (projects, terms) => projects
    .filter((p) => projectMatchesAllTerms(p, terms))
    .map((p) => p.id);

class IDEAProvider {
    /**
     * Create a new IDEA search provider.
     *
     * @param {string} path The extension path
     */
    constructor(path) {
        this.appInfo = findIDEA();
        this.projects = null;
        const directory = Gio.File.new_for_path(path);
        const helper = directory.get_child('find-projects.py').get_path();
        log(`Running Python helper ${helper} to discover IntelliJ IDEA projects`);
        execCommand(['python3', helper]).then(
            (output) => {
                this.projects = JSON.parse(output);
                log(`Found projects: ${Object.keys(this.projects)}`);
            },
            (error) => imports.ui.main.notifyError(
                'Failed to find intellij projects',
                `Couldn't run helper ${helper}: ${error.message}`
            )
        );
    }

    /**
     * Get the initial results.
     *
     * Check all projects against the given terms, and report the results through
     * `callback`.
     *
     * @param {[string]} terms A list of terms
     * @param {*} callback
     */
    getInitialResultSet(terms, callback) {
        callback(findMatchingIds(Object.values(this.projects), terms));
    }

    /**
     * Narrow down an existing result with the given `terms`.
     *
     * Check all projects identified by the IDs in `currentResults` against
     * `terms`, and report resulting IDs through `callback`.
     *
     * @param {[string]} currentResults A list of IDs of currently matched projects
     * @param {[string]} terms A list of search terms
     * @param {*} callback
     */
    getSubsearchResultSet(currentResults, terms, callback) {
        callback(findMatchingIds(
            currentResults.map((id) => this.projects[id]),
            terms
        ));
    }

    /**
     * Get meta information for all given results.
     *
     * @param {[string]} identifiers A list of matching project IDs
     * @param {*} callback
     */
    getResultMetas(identifiers, callback) {
        callback(identifiers.map((id) => ({
            // The ID of the project as given
            id,
            // The project name
            name: this.projects[id].name,
            // Use the human-readable path as description
            description: this.projects[id].path,
            // Use the IDEA icon for each search result
            createIcon: (size) => new St.Icon({
                gicon: this.appInfo.get_icon(),
                icon_size: size,
            }),
        })));
    }

    /**
     * Click on a single result.
     *
     * Launches IDEA with the project denoted by the given identifier.
     */
    activateResult(identifier) {
        this.launchIDEA([Gio.File.new_for_path(this.projects[identifier].abspath)]);
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
    launchSearch() {
        this.launchIDEA();
    }

    /**
     * Launch IDEA with the given files.
     *
     * Catch all errors that occur and display a notification dialog for errors.
     *
     * @param {[Gio.File]} files
     */
    launchIDEA(files) {
        try {
            this.appInfo.launch(files || [], null);
        } catch (err) {
            imports.ui.main.notifyError('Failed to launch IntelliJ IDEA', err.message);
        }
    }

    /**
     * This method is an undocumented requirement by GNOME Shell.
     */
    filterResults(results, max) {
        return results.slice(0, max);
    }
}

/**
 * Get the current extension.
 */
const currentExtension = () => {
    return imports.misc.extensionUtils.getCurrentExtension();
}

/**
 * The registered provider if any.
 *
 * Only used for correctly deregistering, and to prevent registering it twice.
 */
let registeredProvider = null;

/**
 * Initialize this extension immediately after loading.
 *
 * Doesn't do anything for this extension.
 */
// eslint-disable-next-line no-unused-vars
function init() { }

/**
 * Enable this extension.
 *
 * Registers the search provider if not already registered.
 */
// eslint-disable-next-line no-unused-vars
function enable() {
    if (!registeredProvider) {
        const me = currentExtension();
        log(`enabling ${me.metadata.name} version ${me.metadata.version}`);
        registeredProvider = new IDEAProvider(me.path);
        const main = imports.ui.main;
        main.overview.viewSelector._searchResults._registerProvider(registeredProvider)
    }
}

/**
 * Disable this extension.
 *
 * Unregisters the search provider if registered.
 */
// eslint-disable-next-line no-unused-vars
function disable() {
    if (registeredProvider) {
        const me = currentExtension();
        log(`disabling ${me.metadata.name} version ${me.metadata.version}`);
        const main = imports.ui.main;
        main.overview.viewSelector._searchResults._unregisterProvider(registeredProvider);
        registeredProvider = null;
    }
}