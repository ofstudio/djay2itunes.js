/**
 * djay2itunes.js
 * 
 * @overview Get BPMs and Keys from Algoriddim djay or djay Pro to iTunes
 * @see {@link https://github.com/ofstudio/djay2itunes.js}
 * @author Oleg Fomin <ofstudio@gmail.com>
 * @version: 0.0.2
 * 28 December 2014
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


;(function () {

    /**
     * Application Settings
     * 
     * @typedef {Object}
     * @property {Array} djay_versions - array of names, database paths and priorities to use
     * @property {Object} djay - actual djay version from djay_versions, see `check_djay_installed`
     * @property {String} file_auto - plist file name with automatic calculated BPM and Keys
     * @property {String} file_manual-  plist file name with automatic calculated BPM and Keys
     * @property {String} fields - Fields to replace: 'BPM', 'Key' or 'Both'
     * @property {Boolean} replace_existing - Replace existing iTunes tags or not 
     * @property {Array} keys - names of Keys
     */
    var settings = {
        djay_versions: [
            {
                name: 'djay Pro',
                priority: 0, // Newer version - higher priority
                path: '~/Library/Containers/com.algoriddim.djay-pro-mac/Data/Library/Application Support/Algoriddim/'
            },
            {
                name: 'djay',
                priority: 1, // Legacy version - lower priority
                path: '~/Music/djay/'
            }
        ],
        djay: undefined,
        file_auto: 'djay Cached Data.plist', // Database with automatic values
        file_manual: 'djay Preset Library.plist', // Database with manual values
        fields: undefined,
        replace_existing: undefined,
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
     * @param {Array} djay_versions - Array of djay objects
     * @returns {boolean} - False if no djay database found
     * @returns {Object} - Found djay objects with highest priority (lower priority number)
     */
    var check_djay_installed = function (djay_versions) {
        var result = false,
            system = new Application('System Events');
        for (var i = 0; i < djay_versions.length; i++) {
            // If path exists
            if (system.folders.byName(djay_versions[i].path).exists()) {
                // and with higher priority
                if (result === false || djay_versions[i].priority < result.priority) {
                    result = djay_versions[i];
                }
            }
        }
        return result;
    };
    
    
    /**
     * Quit application if running
     * 
     * @param {String} app_name - Name of application to quit
     * @param {boolean} ask - Confirm quit or not
     * @returns {boolean} - Result
     */
    var quit_if_running = function (app_name, ask) {
        var quit_confirm = false,
            system = new Application('System Events'),
            quit_result, djay;
        if (system.processes.name().indexOf(app_name) > 0) {
            if (ask) {
                djay = new Application(app_name);
                djay.includeStandardAdditions = true;
                quit_confirm = djay.displayDialog(
                    'We must quit ' + app_name + ' before we continue',
                    {
                        buttons: ['Cancel', ('Quit ' + app_name)],
                        defaultButton: ('Quit ' + app_name)
                    }
                ).buttonReturned == ('Quit ' + app_name);
            } else {
                quit_confirm = true;
            }
            if (quit_confirm) {
                try {
                    quit_result = djay.quit();
                } catch (e) {
                    return false;
                }
                return quit_result;
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
     * @param {Application} itunes
     * @returns {string} - 'BPM', 'Key' or 'Both'
     */
    var ask_fields = function (itunes) {
        return (itunes.displayDialog(
            'Which fields do you want?',
            {
                buttons: ['BPM', 'Key', 'Both'],
                defaultButton: 'Both'
            }
        ).buttonReturned);
    };


    /**
     * UI: Ask to replace existing iTunes tags or not
     * 
     * @param {Application} itunes
     * @returns {boolean}
     */
    var ask_replace_existing = function (itunes) {
        return (itunes.displayDialog(
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
     * @param {PropertyListFile} plist_auto - Plist database with auto calculated values
     * @param {PropertyListFile} plist_manual - Plist database with manual calculated values
     * @returns {{bpm: Number, key: Number}} - BPM value and Key index
     * @returns {{bpm: Number, key: boolean}} - bpm: 0 and/or key: false if not found
     */
    var get_data = function (track, plist_auto, plist_manual) {

        /**
         * Some items in djay database are stored as iTunes persistent IDs
         * But some items stored as "slugs":
         * `song    artist   duration` 
         * in lowercase and separated by tabs (\t)
         * 
         * @param {Track} track
         * @returns {string} - Returns slug for song
         */
        var track_slug = function (track) {
            return track.name().toLocaleLowerCase() + '\t' +
                track.artist().toLocaleLowerCase() + '\t' +
                Math.floor(track.duration()); 
                // Not sure that `floor` is always right but in some cases `round` is wrong
        };

        /**
         * Try to get BPM and Key from plist  with auto calculated values
         * 
         * @param {String} name - iTunes persistent ID or song "slug"
         * @param {PropertyListFile} plist
         * @returns {{bpm: Number, key: Number}} - BPM value and Key index
         * @returns {{bpm: Number, key: boolean}} - bpm: 0 and/or key: false if not found
         */
        var get_auto = function (name, plist) {
            var bpm = 0, key = false;
            try {
                bpm = plist.byName(name).value()['bpm'];
                key = plist.byName(name).value()['key'];
            } catch (e) {
            }
            return {bpm: Math.round(bpm), key: key};
        };

        /**
         * Try to get BPM and Key from plist with manual calculated values
         *
         * @param {String} name - iTunes persistent ID or song "slug"
         * @param {PropertyListFile} plist
         * @returns {{bpm: Number, key: Number}} - BPM value and Key index
         * @returns {{bpm: Number, key: boolean}} - bpm: 0 and/or key: false if not found
         */
        var get_manual = function (name, plist) {
            var bpm = 0, key = false;
            try {
                bpm = plist.byName(name).value()['song.manualBpm'];
                key = plist.byName(name).value()['song.manualKey'];
            } catch (e) {
            }
            return {bpm: Math.round(bpm), key: key};
        };

        var r = {
            file_auto: {
                byID: {bpm: false, key: false},
                bySlug: {bpm: false, key: false}
            },
            file_manual: {
                byID: {bpm: false, key: false},
                bySlug: {bpm: false, key: false}
            }
        };

        // Try to find by slug and persistent ID in plist_auto and plist_manual
        r.file_auto.byID = get_auto(track.persistentID(), plist_auto);
        r.file_auto.bySlug = get_auto(track_slug(track), plist_auto);
        r.file_manual.byID = get_manual(track.persistentID(), plist_manual);
        r.file_manual.bySlug = get_manual(track_slug(track), plist_manual);

        // Return most appropriate value
        return {
            bpm: r.file_manual.bySlug.bpm || r.file_manual.byID.bpm || r.file_auto.bySlug.bpm || r.file_auto.byID.bpm,
            key: r.file_manual.bySlug.key || r.file_manual.byID.key || r.file_auto.bySlug.key || r.file_auto.byID.key
        };
    };


    /**
     * Replace BPM tag in iTunes
     * 
     * @param {Track} track
     * @param {Number} bpm
     * @param {Boolean} overwrite
     */
    var replace_bpm = function (track, bpm, overwrite) {
        if (bpm > 0) {
            if (track.bpm() === 0 || overwrite) {
                track.bpm = bpm;
            }
        }
    };

    
    /**
     *  Replace Key in Grouping tag in iTunes
     *  
     * @param {Track} track
     * @param {String} key
     * @param {Array} keys
     * @param {Boolean} overwrite
     */
    var replace_key = function (track, key, keys, overwrite) {
        var current = track.grouping(),
            // find any value from key in current
            exists = keys.some(function (k) {
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
            }
        }
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

    // Check for djay installed
    settings.djay = check_djay_installed(settings.djay_versions);
    
    if (settings.djay) {
        if (quit_if_running(settings.djay.name, true)) {
            
            var itunes = new Application('iTunes'),
                selection = itunes.selection();
            
            itunes.includeStandardAdditions = true;
            itunes.activate();

            // if tracks selected
            if (selection.length > 0) {
                // Get fields and replace settings
                settings.fields = ask_fields(itunes);
                settings.replace_existing = ask_replace_existing(itunes);

                var system = new Application('System Events'),
                    result, plist_auto, plist_manual;

                // Try to open database plist files
                try {
                    plist_auto = system.propertyListFiles.byName(
                        settings.djay.path + settings.file_auto)
                        .propertyListItems;
                    plist_manual = system.propertyListFiles.byName(
                        settings.djay.path + settings.file_manual)
                        .propertyListItems.byName('Song Entries')
                        .propertyListItems;
                } catch (e) {
                    app.displayDialog('Error! Can\'t open database: ' + e.message);
                }

                // Iterate selection
                for (var i = 0; i < selection.length; i++) {
                    if (selection[i].class() === 'fileTrack') {
                        result = {bpm: false, key: false};
                        result = get_data(selection[i], plist_auto, plist_manual);
                        if (result.key) {
                            result.key = settings.keys[result.key];
                        } else {
                            result.key = '';
                        }

                        //console.log(
                        //    'Calculated :' + selection[i].name() +
                        //    ' | BPM: ' + result.bpm +
                        //    ' | Key: ' + result.key
                        //);
                        //
                        //console.log(
                        //    'Exists :' + selection[i].name() +
                        //    ' | BPM: ' + selection[i].bpm() +
                        //    ' | Grouping: ' + selection[i].grouping()
                        //);
                        
                        // Replace BPM tag
                        if (settings.fields === 'BPM' || settings.fields === 'Both') {
                            replace_bpm(selection[i], result.bpm, settings.replace_existing);
                        }
                        
                        // Replace Key in Grouping tag
                        if (settings.fields === 'Key' || settings.fields === 'Both') {
                            replace_key(selection[i], result.key, settings.keys, settings.replace_existing);
                        }

                        itunes.displayDialog(
                            'Done!',
                            { buttons: ['Thanks!'] }
                        );


                    } // End of is fileTrack
                } // End of Iterate selection

            } else {
                // If no tracks selected
                itunes.displayDialog(
                    'Please select a few tracks in iTunes and try again!',
                    { buttons: ['OK'] }
                );
            }
        } else {
            // If djay doesn't quit
            app.displayDialog(
                'Please quit djay first and try again!',
                { buttons: ['OK'] }
            );
        }
    } else {
        // If no djay database found
        app.displayDialog(
            'No djay database found! Please check djay installed.',
            { buttons: ['OK'] }
        );
    }
})();
