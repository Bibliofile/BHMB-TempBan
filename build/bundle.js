(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('@bhmb/bot')) :
	typeof define === 'function' && define.amd ? define(['@bhmb/bot'], factory) :
	(factory(global['@bhmb/bot']));
}(this, (function (bot) { 'use strict';

var html = "<div class=\"container is-fluid\">\n  <h3 class=\"title\">Info</h3>\n  <p>All staff can use this command to temporarily ban players. If the bot is taken offline before the player is due to be unbanned,\n    they will be unbanned when the bot is next launched. Staff cannot be banned using this command. Warning: If you uninstall\n    this extension, players banned with /TEMP-BAN on another server will not be unbanned.</p>\n  <p>The following commands have been added:</p>\n  <h3 class=\"title\">Commands</h3>\n  <ul style=\"margin-left: 20px;\">\n    <li>/TEMP-BAN player_name_or_ip - Bans the player for X minutes (defined below).</li>\n    <li>/TEMP-BAN-number player_name_or_ip - Bans the player to the blacklist for number minutes. If /TEMP-BAN-10 player is used,\n      player will be banned for 10 minutes and then unbanned.</li>\n    <li>/CLEAR-TEMP-BLACKLIST - (admin only) Clears the temporary banlist and unbans everyone who is temporarily banned.</li>\n  </ul>\n  <h3 class=\"title\">Options</h3>\n  <p>Default ban time (minutes):\n    <input class=\"input\" type=\"number\" min=\"1\" max=\"999\" value=\"10\" />\n  </p>\n</div>\n";

bot.MessageBot.registerExtension('bibliofile/tempban', (ex, world) => {
    const defaultConfig = { time: 10, bans: {} };
    const getConfig = () => ex.storage.get('config', defaultConfig);
    function ban(name, time = getConfig().time) {
        name = name.toLocaleUpperCase();
        ex.bot.send('/ban ' + name);
        ex.storage.with('config', defaultConfig, config => {
            config.bans[name] = Date.now() + 60000 * time;
        });
    }
    function banListener({ player, message }) {
        if (!player.isStaff)
            return;
        message = message.toLocaleLowerCase();
        if (!message.startsWith('/temp-ban'))
            return;
        message = message.substr('/temp-ban'.length);
        let { time } = getConfig();
        if (/^-\d+ /.test(message)) {
            const match = message.match(/^-(\d+) (.*)$/);
            time = +match[1];
            message = match[2];
        }
        else if (message.startsWith(' ')) {
            message = message.substr(1);
        }
        else {
            return;
        }
        const target = world.getPlayer(message);
        if (target.isStaff)
            return;
        ban(target.name, time);
    }
    world.onMessage.sub(banListener);
    world.addCommand('clear-temp-blacklist', player => {
        if (!player.isAdmin)
            return;
        ex.storage.with('config', defaultConfig, config => {
            Object.keys(config.bans).forEach(name => {
                ex.bot.send('/unban {{NAME}}', { name });
            });
            config.bans = {};
        });
    });
    let timeout;
    function unbanChecker() {
        const now = Date.now();
        ex.storage.with('config', defaultConfig, config => {
            Object.keys(config.bans).forEach(name => {
                if (config.bans[name] < now) {
                    ex.bot.send('/unban {{NAME}}', { name });
                    delete config.bans[name];
                }
            });
        });
        timeout = setTimeout(unbanChecker, 30000);
    }
    unbanChecker();
    ex.remove = () => {
        clearTimeout(timeout);
        world.onMessage.unsub(banListener);
        world.removeCommand('clear-temp-blacklist');
    };
    // Browser only
    const ui = ex.bot.getExports('ui');
    if (!ui)
        return;
    const tab = ui.addTab('Temporary Bans');
    tab.innerHTML = html;
    tab.addEventListener('input', function () {
        ex.storage.with('config', defaultConfig, config => {
            config.time = +tab.querySelector('input').value;
        });
    });
    ex.remove = (orig => () => {
        orig();
        ui.removeTab(tab);
    })(ex.remove);
});

})));
//# sourceMappingURL=bundle.js.map
