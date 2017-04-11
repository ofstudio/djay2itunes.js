/**
 * djay2itunes.js
 *
 * @overview Get BPMs and Keys from Algoriddim djay or djay Pro to iTunes
 * @see {@link https://github.com/ofstudio/djay2itunes.js}
 * @author Oleg Fomin <ofstudio@gmail.com>
 * @version: 0.0.5
 * 12 April 2017
 *
 */
/**
 * @external Application
 */
/**
 * @external Track
 */
/**
 * @external PropertyListFile
 */
/**
 * @external Progress
 */
function run() {

    /**
     * Application Settings
     *
     * @typedef {Object}
     * @property {Array} djayVersions - array of names, database paths and priorities to use
     * @property {Object} djay - actual djay version from djayVersions, see `checkDjayInstalled`
     * @property {String} fileAuto - plist file name with automatic calculated BPM and Keys
     * @property {String} fileManual-  plist file name with automatic calculated BPM and Keys
     * @property {String} fields - Fields to replace: 'BPM', 'Key' or 'Both'
     * @property {Boolean} replaceExisting - Replace existing iTunes tags or not
     * @property {Array} keys - names of Keys
     */
    var settings = {
        djayVersions: [
            {
                name: 'djay Pro',
                priority: 0, // Newer version - higher priority
                path: '~/Library/Containers/com.algoriddim.djay-pro-mac/Data/Library/Application Support/Algoriddim/'
            },
            {
                name: 'djay',
                priority: 1, // Legacy version - lower priority
                path: '~/Music/djay/'
            },
            {
                name: 'djay Pro',
                priority: 2, // Quick-n-dirty workaround on issue #2
                path: '/Volumes/VCA/WORK/musique/djay/'
            }
        ],
        djay: undefined,
        fileAuto: 'djay Cached Data.plist', // Database with automatic values
        fileManual: 'djay Preset Library.plist', // Database with manual values
        fields: undefined,
        replaceExisting: undefined,
        keys: [
            '8B-C', '8A-Am', '3B-Db', '3A-Bbm', '10B-D', '10A-Bm',
            '5B-Eb', '5A-Cm', '12B-E', '12A-C#m', '7B-F', '7A-Dm',
            '2B-Gb', '2A-Ebm', '9B-G', '9A-Em', '4B-Ab', '4A-Fm',
            '11B-A', '11A-F#m', '6B-Bb', '6A-Gm', '1B-B', '1A-G#m'
        ]
    };


    /**
     * Find djay version installed by database paths
     *
     * @param {Array} djayVersions - Array of djayVersions {@see settings}
     * @returns {boolean} - False if no djay database found
     * @returns {Object} - Found djay object with highest priority (lower number)
     */
    var checkDjayInstalled = function (djayVersions) {
        var result = false,
            system = new Application('System Events');
        for (var i = 0; i < djayVersions.length; i++) {
            // If path exists
            if (system.folders.byName(djayVersions[i].path).exists()) {
                // and with higher priority
                if (result === false || djayVersions[i].priority < result.priority) {
                    result = djayVersions[i];
                }
            }
        }
        return result;
    };


    /**
     * Quit application if running
     *
     * @param {String} appName - Name of application to quit
     * @param {boolean} ask - Confirm quit or not
     * @returns {boolean} - Result
     */
    var quitIfRunning = function (appName, ask) {
        var quitConfirm = false,
            system = new Application('System Events'),
            quitResult, djay;
        if (system.processes.name().indexOf(appName) > 0) {
            if (ask) {
                djay = new Application(appName);
                djay.includeStandardAdditions = true;
                quitConfirm = djay.displayDialog(
                    'We must quit ' + appName + ' before we continue',
                    {
                        buttons: ['Cancel', ('Quit ' + appName)],
                        defaultButton: ('Quit ' + appName)
                    }
                ).buttonReturned == ('Quit ' + appName);
            } else {
                quitConfirm = true;
            }
            if (quitConfirm) {
                try {
                    quitResult = djay.quit();
                }
                catch (e) {
                    return false;
                }
                return quitResult;
            } else {
                // User canceled
                return false;
            }
        }
        // Application is not running
        return true;
    };


    /**
     * UI: Ask for fields to copy
     *
     * @param {Application} app
     * @returns {string} - 'BPM', 'Key' or 'Both'
     */
    var askFields = function (app) {
        return (app.displayDialog(
            'Which fields do you want from ' + settings.djay.name + '?',
            {
                buttons: ['BPM', 'Key', 'Both'],
                defaultButton: 'Both'
            }
        ).buttonReturned);
    };


    /**
     * UI: Ask to replace existing iTunes tags or not
     *
     * @param {Application} app
     * @returns {boolean}
     */
    var askReplaceExisting = function (app) {
        return (app.displayDialog(
            'Replace existing iTunes data?',
            {
                buttons: ['No', 'Yes'],
                defaultButton: 'Yes'
            }
        ).buttonReturned === 'Yes');
    };


    /**
     * Attempts to get BPM and Key for single track
     * @param {Track} track
     * @param {PropertyListFile} plistAuto - Plist database with auto calculated values
     * @param {PropertyListFile} plistManual - Plist database with manual calculated values
     * @returns {{bpm: Number, key: Number}} - BPM value and Key index or undefined if none
     */
    var getData = function (track, plistAuto, plistManual) {

        /**
         * Some items in djay database are stored as iTunes persistent IDs
         * But some items stored as "slugs":
         * `song    artist   duration`
         * in lowercase and separated by tabs (\t)
         *
         * Because djay determines duration of the track slightly different than iTunes
         * and sometimes track duration in iTunes and in djay differs in 1 second up or down
         * we must search in 2 different slugs with ±1 second duration
         *
         * @param {Track} track
         * @returns {Array} - Returns an array of possible slugs
         */
        var trackSlugs = function (track) {
            var nameAndArtist = track.name().toLocaleLowerCase() + '\t' + track.artist().toLocaleLowerCase(),
                duration = track.duration();

            return [
                nameAndArtist + '\t' + Math.floor(duration),
                nameAndArtist + '\t' + Math.ceil(duration)
            ];
        };

        /**
         * Try to get value of BPM or Key field from plist
         * Fields for plistAuto: 'bpm', 'key'
         * Fields for plistManual: 'song.manualBpm', 'song.manualKey'
         *
         * @param {String} name - iTunes persistent ID or song "slug"
         * @param {PropertyListFile} plist
         * @param {String} field - name of field in database
         * @returns {Number} -  value or undefined if none
         */
        var getValue = function (name, plist, field) {
            var value;

            try {
                value = plist.byName(name).value()[field];
            } catch (e) {
            }

            // Math.round for BPM values
            return typeof value === 'number' ? Math.round(value) : undefined
        };


        var bpm, key,
            id = track.persistentID(),
            slugs = trackSlugs(track),
            isNumber = function (value, i, a) {
                return typeof value === 'number'
            };

        // Try to get BPM and Key values in plistAuto and plistManual
        // by persistentID() and by possible track slugs
        bpm = [
            getValue(slugs[0], plistManual, 'song.manualBpm'),
            getValue(slugs[1], plistManual, 'song.manualBpm'),
            getValue(id, plistManual, 'song.manualBpm'),
            getValue(slugs[0], plistAuto, 'bpm'),
            getValue(slugs[1], plistAuto, 'bpm'),
            getValue(id, plistAuto, 'bpm')
        ].find(isNumber);

        key = [
            getValue(slugs[0], plistManual, 'song.manualKey'),
            getValue(slugs[1], plistManual, 'song.manualKey'),
            getValue(id, plistManual, 'song.manualKey'),
            getValue(slugs[0], plistAuto, 'key'),
            getValue(slugs[1], plistAuto, 'key'),
            getValue(id, plistAuto, 'key')
        ].find(isNumber);

        return {
            bpm: bpm,
            key: key
        }
    };


    /**
     * Replace BPM tag in iTunes
     *
     * @param {Track} track
     * @param {Number} bpm
     * @param {Boolean} overwrite
     * @returns {Boolean} - true if replaced, false if no
     */
    var replaceBPM = function (track, bpm, overwrite) {
        if (bpm > 0) {
            if (track.bpm() === 0 || overwrite) {
                track.bpm = bpm;
                return true;
            }
        }
        return false;
    };


    /**
     *  Replace Key in Grouping tag in iTunes
     *
     * @param {Track} track
     * @param {String} key
     * @param {Boolean} overwrite
     * @returns {Boolean} - true if replaced, false if no
     */
    var replaceKey = function (track, key, overwrite) {
        var current = track.grouping(),
        // find any value from key in current
            exists = settings.keys.some(function (k) {
                var found = false;
                // if any value from keys exists in current, remove it nicely
                if (current.indexOf(k) >= 0) {
                    var p = current.split(k, 2);
                    // remove extra spaces if any
                    current = (p[0].trim() + ' ' + p[1].trim()).trim();
                    found = true;
                }
                return found;
            });

        // write key at the beginning of Grouping tag
        if (key.length > 0) {
            if ((exists && overwrite) || (!exists)) {
                track.grouping = key + ' ' + current;
                return true;
            }
        }
        return false;
    };


    /**
     * Main application
     *
     * 1. Check for djay installed
     * 2. Quit djay if running
     * 3. Check if any tracks are selected in iTunes
     * 4. Ask for fields to copy: 'BPM', 'Key' or 'Both'
     * 5. Ask for overwrite existing iTunes tags
     * 6. Iterate selected tracks
     * 7. Say "Done!"
     */

    var app = Application.currentApplication();
    app.includeStandardAdditions = true;
    app.activate();

    // Check for djay installed
    settings.djay = checkDjayInstalled(settings.djayVersions);
    if (!settings.djay) {
        app.displayAlert('No djay database found! Please check djay installed.');
        return false;
    }

    if (!quitIfRunning(settings.djay.name, true)) {
        app.displayAlert('Please quit djay first and try again!');
        return false;
    }

    var itunes = new Application('iTunes'),
        selection = itunes.selection();

    itunes.includeStandardAdditions = true;

    if (!selection.length > 0) {
        // If no tracks selected
        itunes.activate();
        itunes.displayAlert('Please select a few tracks in iTunes and try again!');
        return false;
    }

    var system = new Application('System Events'),
        result, plistAuto, plistManual, replacedFlag, replacedCounter;

    // Try to open database plist files
    try {
        plistAuto = system.propertyListFiles.byName(
            settings.djay.path + settings.fileAuto)
            .propertyListItems;
        plistManual = system.propertyListFiles.byName(
            settings.djay.path + settings.fileManual)
            .propertyListItems.byName('Song Entries')
            .propertyListItems;
    } catch (e) {
        app.displayAlert('Error! Can\'t open database: ' + e.message);
        return false;
    }

    // Get fields and replace existing settings
    settings.fields = askFields(app);
    settings.replaceExisting = askReplaceExisting(app);

    Progress.totalUnitCount = selection.length;
    Progress.description = 'Processing tracks';
    replacedCounter = 0;

    // Iterate selection
    for (var i = 0; i < selection.length; i++) {

        if (selection[i].class() === 'fileTrack') {

            result = getData(selection[i], plistAuto, plistManual);
            if (typeof result.key === 'number') {
                result.key = settings.keys[result.key] || '';
            } else {
                result.key = '';
            }

            //console.log('Calculated:' + selection[i].name() +
            //' | BPM: ' + result.bpm +
            //' | Key: ' + result.key);
            //console.log('Existing:' + selection[i].name() +
            //' | BPM: ' + selection[i].bpm() +
            //' | Grouping: ' + selection[i].grouping());

            // Replace BPM tag
            if (settings.fields === 'BPM' || settings.fields === 'Both') {
                replacedFlag = replaceBPM(selection[i], result.bpm, settings.replaceExisting);
            }

            // Replace Key in Grouping tag
            if (settings.fields === 'Key' || settings.fields === 'Both') {
                replacedFlag = replaceKey(selection[i], result.key, settings.replaceExisting) || replacedFlag;
            }

            replacedCounter += (replacedFlag ? 1 : 0);
            Progress.completedUnitCount = i + 1;
        }
    }

    itunes.activate();
    app.displayNotification(
        'Processed ' + replacedCounter + ' of ' + selection.length + ' selected tracks',
        {
            withTitle: 'djay2itunes',
            subtitle: 'Done!'
        }
    );
    return true;
}
