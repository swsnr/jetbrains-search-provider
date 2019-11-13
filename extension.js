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

// eslint-disable-next-line no-unused-vars
function init() { }

const findIDEA = () => {
    return Gio.DesktopAppInfo.new('intellij-idea-ultimate_intellij-idea-ultimate.desktop')
}

class IDEAProvider {
    constructor() {
        this.appInfo = findIDEA();
    }

    getInitialResultSet(terms, callback) {
        callback(['foo']);
    }

    getSubsearchResultSet(currentResults, terms, callback) {
        callback(['foo']);
    }

    getResultMetas(identifiers, callback) {
        callback([{
            id: 'foo',
            name: 'Foo',
            description: 'Testing',
            createIcon: (size) => new St.Icon({
                gicon: this.appInfo.get_icon(),
                icon_size: size,
            }),
        }]);
    }

    activateResult(identifier) {
        log(`Activating ${identifier}`);
        this.launchIDEA(['/home/wiesner/gsoc/enmap/masterprocessor']);
    }

    launchSearch(terms) {
        this.launchIDEA();
    }

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

const currentExtension = () => {
    return imports.misc.extensionUtils.getCurrentExtension();
}

let registeredProvider = null;

// eslint-disable-next-line no-unused-vars
function enable() {
    if (!registeredProvider) {
        const me = currentExtension();
        log(`enabling ${me.metadata.name} version ${me.metadata.version}`);
        registeredProvider = new IDEAProvider();
        const main = imports.ui.main;
        main.overview.viewSelector._searchResults._registerProvider(registeredProvider)
    }
}

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