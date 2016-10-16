/*jshint
    esversion: 6,
    browser:    true,
    devel:        true,
    unused:        true,
    undef: true
*/
/*global
    MessageBotExtension
*/

var biblio_tempban = MessageBotExtension('biblio_tempban');
biblio_tempban.setAutoLaunch(true);

biblio_tempban.addSettingsTab('Temporary Bans');
biblio_tempban.settingsTab.innerHTML = '<h3>Info</h3><p>All staff can use this command to temporarily ban players. If the bot is taken offline before the player is due to be unbanned, they will be unbanned when the bot is next launched. Staff cannot be banned using this command.</p><p>The following commands have been added:</p><h3>Commands</h3><ul style="margin-left: 20px;"><li>/TEMP-BAN player_name_or_ip - Bans the player for X minutes (defined below).</li><li>/TEMP-BAN-number player_name_or_ip - Bans the player to the blacklist for number minutes. If /TEMP-BAN-10 player is used, player will be banned for 10 minutes and then unbanned.</li><li>/CLEAR-TEMP-BANLIST - (admin only) Clears the temporary banlist and unbans everyone who is temporarily banned.</li></ul><h3>Options</h3><p>Default ban time (minutes): <input type="number" min="1" max="999" value="10"/><br><input type="checkbox"/> Safe mode (Reduces the chance of an impersonator, probably unneccessary.)</p>';

(function() {
    var config = localStorage.getItem('biblio_tempban_preferences' + window.worldId);
    config = (config === null) ? {time: 10, strict: false, bans: {}} : JSON.parse(config);
    this.strictMode = config.strict;
    this.banTime = config.time;
    this.bans = config.bans;
    this.settingsTab.querySelector('input[type="number"]').value = this.banTime;
    this.settingsTab.querySelector('input[type="checkbox"]').checked = this.strictMode;
}.bind(biblio_tempban)());

biblio_tempban.saveToBrowser = function() {
    localStorage.setItem('biblio_tempban_preferences' + window.worldId, JSON.stringify({time: this.banTime, strict: this.strictMode, bans: this.bans}));
};
biblio_tempban.doSave = function() {
    var banTime = parseInt(this.settingsTab.querySelector('input[type="number"]').value);
    this.strictMode = this.settingsTab.querySelector('input[type="checkbox"]').checked;
    this.banTime = (isNaN(banTime)) ? 10 : banTime;
    this.saveToBrowser();
};
biblio_tempban.uninstall = function() {
    biblio_tempban.removeServerListener('checkTempBan');
    biblio_tempban.removeBeforeSendListener('checkTempBan');
    Object.keys(localStorage).forEach(function(key) {
        if (key.indexOf('biblio_tempban_preferences') === 0) {
            localStorage.removeItem(key);
        }
    });
};

biblio_tempban.unbanChecker = function() {
    if (typeof biblio_tempban == 'object') {
        Object.keys(biblio_tempban.bans).forEach(function(key) {
            if (biblio_tempban.bans[key] < Date.now()) {
                biblio_tempban.bot.core.send('/unban ' + key);
                delete biblio_tempban.bans[key];
                biblio_tempban.saveToBrowser();
            }
        });
        setTimeout(biblio_tempban.unbanChecker, 30000);
    }
};


biblio_tempban.checkTempBan = function(data) {
    function strictCheck() {
        return (this.strictMode) ? data.safe : true;
    }
    //console.log(data);
    if (this.bot.checkGroup('Staff', data.name) && strictCheck()) {
        if (data.message.toLocaleUpperCase().indexOf('/TEMP-BAN') === 0) {
            var minStr = data.message.substring(9, data.message.indexOf(' '));

            var minutes = (minStr.length > 0) ? Math.abs(parseInt(minStr)) : this.banTime;
            var name = data.message.substring(10 + minStr.length);
            if (!this.bot.checkGroup('Staff', name)) {
                this.bans[name] = Date.now() + 60000 * minutes;
                this.bot.core.send('/ban ' + name);
                this.saveToBrowser();
            }
        } else if (data.message.toLocaleUpperCase().indexOf('/CLEAR-TEMP-BLACKLIST') === 0 && strictCheck()) {
            if (this.bot.checkGroup('Admin', data.name) || data.name == 'SERVER') {
                Object.keys(this.bans).forEach(function(key) {
                    this.bot.core.send('/unban ' + key);
                }.bind(this));
                this.bans = {};
                this.saveToBrowser();
            }
        }
    }
};

biblio_tempban.checkTempBanServer = function(message) {
    if (message.toLocaleUpperCase().indexOf('/TEMP-BAN') === 0) {
        var minStr = message.substring(9, message.indexOf(' '));

        var minutes = (minStr.length > 0) ? Math.abs(parseInt(minStr)) : this.banTime;
        var name = message.substring(10 + minStr.length);

        if (!this.bot.checkGroup('Staff', name)) {
            this.bans[name] = Date.now() + 60000 * minutes;
            this.bot.core.send('/ban ' + name);
            this.saveToBrowser();
        }
    } else if (message.toLocaleUpperCase().indexOf('/CLEAR-TEMP-BLACKLIST') === 0) {
        Object.keys(this.bans).forEach(function(key) {
            this.bot.core.send('/unban ' + key);
        }.bind(this));
        this.bans = {};
        this.saveToBrowser();
    } else {
        return message;
    }
    return false;
};

biblio_tempban.settingsTab.addEventListener('change', biblio_tempban.doSave.bind(biblio_tempban), false);
biblio_tempban.addTriggerListener('checkTempBan', biblio_tempban.checkTempBan.bind(biblio_tempban));
biblio_tempban.addBeforeSendListener('checkTempBan', biblio_tempban.checkTempBanServer.bind(biblio_tempban));
biblio_tempban.unbanChecker();
