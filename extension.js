/*jshint
    esversion: 6,
    browser: true,
    devel: true,
    unused: strict,
    undef: true,
    maxcomplexity: 10
*/
/*global
    MessageBot
*/

MessageBot.registerExtension('bibliofile/tempban', function(ex, world) {
    function getConfig() {
        return world.storage.getObject('biblio_tempban_preferences', {time: 10, bans: {}});
    }

    function ban(name, time) {
        name = name.toLocaleUpperCase();

        ex.bot.send('/ban ' + name);

        var config = getConfig();

        if (!time) time = config.time;
        config.bans[name] = Date.now() + 60000 * time;
        world.storage.set('biblio_tempban_preferences', config);
    }

    function unban(name) {
        name = name.toLocaleUpperCase();
        ex.bot.send('/unban ' + name);

        var config = getConfig();
        delete config.bans[name];
        world.storage.set('biblio_tempban_preferences', config);
    }

    function banListener(info) {
        var command = info.command.toLocaleLowerCase();
        var args = info.args.toLocaleUpperCase();

        if (!info.player.isStaff()) {
            return;
        }

        if (command == 'temp-ban') {
            if (!world.getPlayer(args).isStaff()) {
                ban(args);
            }
        } else if (command.startsWith('temp-ban-')) {
            var minutes = Math.abs(+command.substr(9));
            if (!world.getPlayer(args).isStaff()) {
                ban(args, minutes);
            }
        } else if (command == 'clear-temp-blacklist') {
            Object.keys(getConfig().bans).forEach(unban);
        }
    }
    world.onCommand.sub(banListener);

    var timeout;
    function unbanChecker() {
        var now = Date.now();
        var config = getConfig();

        Object.keys(config.bans).forEach(function(name) {
            if (config.bans[name] < now) {
                unban(name);
            }
        });
        timeout = setTimeout(unbanChecker, 30000);
    }
    unbanChecker();

    ex.uninstall = function() {
        clearTimeout(timeout);
        world.onCommand.unsub(banListener);
        world.storage.clearNamespace('biblio_tempban_preferences');
    };

    // Browser only
    if (ex.isNode || !ex.bot.getExports('ui')) return;

    var ui = ex.bot.getExports('ui');
    var tab = ui.addTab('Temporary Bans');
    tab.innerHTML = '<div class="container is-fluid"><h3 class="title">Info</h3><p>All staff can use this command to temporarily ban players. If the bot is taken offline before the player is due to be unbanned, they will be unbanned when the bot is next launched. Staff cannot be banned using this command. Warning: If you uninstall this extension, players banned with /TEMP-BAN on another server will not be unbanned.</p><p>The following commands have been added:</p><h3 class="title">Commands</h3><ul style="margin-left: 20px;"><li>/TEMP-BAN player_name_or_ip - Bans the player for X minutes (defined below).</li><li>/TEMP-BAN-number player_name_or_ip - Bans the player to the blacklist for number minutes. If /TEMP-BAN-10 player is used, player will be banned for 10 minutes and then unbanned.</li><li>/CLEAR-TEMP-BLACKLIST - (admin only) Clears the temporary banlist and unbans everyone who is temporarily banned.</li></ul><h3 class="title">Options</h3><p>Default ban time (minutes): <input class="input" type="number" min="1" max="999" value="10"/></p></div>';

    tab.addEventListener('input', function() {
        var config = getConfig();
        config.time = +tab.querySelector('input').value;
        world.storage.set('biblio_tempban_preferences', config);
    });

    ex.uninstall = (function(orig) {
        return function() {
            orig();
            ui.removeTab(tab);
        };
    }(ex.uninstall));
});
