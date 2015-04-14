/*global $:false, self:false*/
"use strict";

// Strandard storage API
var _extUrl; // Trick for strict mode
if(typeof safari != "undefined") { // Safari
	_extUrl = function (str) { return safari.extension.baseURI + str; }
}
else if(typeof chrome == "undefined") { // Firefox
	var isFirefox = true;
	_extUrl = function (str) { return self.options[str]; }
}
else { // Chrome
	_extUrl = function (str) { return chrome.extension.getURL(str); }
}

var cache = {},
	staticUrl = "http://static.thetabx.net/",
	apiUrl = "http://api.thetabx.net/tgc/3/",
	DB_VERSION = 1,
	ttDisp = {showing: false, hovering: false, isOriginalTooltip: false, tt: false, x: 0, y: 0},
	invalidGuilds = ["Assistant communautaire", "Community Manager", "MVP", "Maître de jeu", "Administrateur", "Pas-de-Personnage"];

