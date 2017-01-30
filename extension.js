/*jshint
    esversion: 6,
    browser: true,
    devel: true,
    unused: strict,
    undef: true
*/
/*global
    MessageBotExtension
*/

var biblio_tempban = MessageBotExtension('biblio_tempban');

(function(ex, ui, storage, hook) {
    ex.setAutoLaunch(true);
    ex.uninstall = function() {
        ui.removeTab(ex.tab);
        hook.remove('world.command', banListener);

        //Warn the user that we can't remove all players from the temp ban list.
        var unlifted = [];
        Object.keys(localStorage).forEach(function(key) {
            if (key.startsWith(ex.id + '_preferences') && key != ex.id + '_preferences' + window.worldId) {
                unlifted.push(storage.getObject(key, {}, false).bans);
            }
        });
        unlifted.filter(function(item) {
            return Object.keys(item.length);
        });
        var bans = unlifted.reduce(function(p, c) {
            return p + '\n' + Object.keys(c).reduce(function(p, c) {
                return p + '\n' + c.replace(/&/g, '&amp;').replace(/</g, '&lt;');
            }, '');
        }, '');

        if (bans) {
            ui.alert('Since you have used this extension on multiple servers, not all bans could be lifted. The remaining bans are:<textarea class="textarea">' + bans + '</textarea>');
        }

        storage.clearNamespace(ex.id);

    };

    ex.tab = ui.addTab('Temporary Bans');
    ex.tab.classList.add('container', 'is-fluid');
    ex.tab.innerHTML = '<h3 class="title">Info</h3><p>All staff can use this command to temporarily ban players. If the bot is taken offline before the player is due to be unbanned, they will be unbanned when the bot is next launched. Staff cannot be banned using this command.</p><p>The following commands have been added:</p><h3 class="title">Commands</h3><ul style="margin-left: 20px;"><li>/TEMP-BAN player_name_or_ip - Bans the player for X minutes (defined below).</li><li>/TEMP-BAN-number player_name_or_ip - Bans the player to the blacklist for number minutes. If /TEMP-BAN-10 player is used, player will be banned for 10 minutes and then unbanned.</li><li>/CLEAR-TEMP-BLACKLIST - (admin only) Clears the temporary banlist and unbans everyone who is temporarily banned.</li></ul><h3 class="title">Options</h3><p>Default ban time (minutes): <input class="input" type="number" min="1" max="999" value="10"/></p>';

    var config = storage.getObject(ex.id + '_preferences', {time: 10, bans: {}});
    ex.tab.querySelector('input').value = config.time;
    ex.tab.addEventListener('change', function() {
        config.time = +ex.tab.querySelector('input').value;
        save();
    });

    function save() {
        storage.set(ex.id + '_preferences', config);
    }

    hook.listen('world.command', banListener);
    function banListener(name, command, args) {
        command = command.toLocaleLowerCase();
        args = args.toLocaleUpperCase();

        if (!ex.world.isStaff(name)) {
            return;
        }

        if (command == 'temp-ban') {
            if (!ex.world.isStaff(args)) {
                ex.bot.send('/ban ' + args);
                config.bans[args] = Date.now() + 60000 * config.time;
            }
            save();
        } else if (command.startsWith('temp-ban-')) {
            var minutes = Math.abs(+command.substr(9)) || config.time;
            if (!ex.world.isStaff(args)) {
                ex.bot.send('/ban ' + args);
                config.bans[args] = Date.now() + 60000 * minutes;
            }
            save();
        } else if (command == 'clear-temp-blacklist') {
            Object.keys(config.bans).forEach(function(key) {
                ex.bot.send('/unban ' + key);
                delete config.bans[key];
            });
            save();
        }
    }

    function unbanChecker() {
        var now = Date.now();
        if (typeof biblio_tempban == 'object') {
            Object.keys(config.bans).forEach(function(key) {
                if (config.bans[key] < now) {
                    ex.bot.send('/unban ' + key);
                    delete config.bans[key];
                    save();
                }
            });
            setTimeout(unbanChecker, 30000);
        }
    }
    unbanChecker();
}(
    biblio_tempban,
    biblio_tempban.ui,
    biblio_tempban.storage,
    biblio_tempban.hook
));
