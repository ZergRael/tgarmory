/*global $:false, i:true, self:false, createGuildPage:false*/
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

// Format url into params hash
function parseUrl (url) {
	var u = { p: {} },
		urlMatch = url.match(/(https?:\/\/[^\/]+)?(\/?[^\?]*)(\?.*)?/);
	if(!urlMatch) { return false; }
	u.host = urlMatch[1] || window.location.origin;
	u.path = urlMatch[2];
	u.search = urlMatch[3];

	if(!u.search) { return u; }
	var params = u.search.substring(1).split("&");
	for(var i in params) {
		var kv = params[i].split("=");
		if(kv.length != 2) { continue; }
		u.p[kv[0]] = kv[1];
	}
	return u;
}

// Probably not necessary to encapsulate, looks nicer
function getData (o, cb) {
	$.ajax({
		url: apiUrl + (o.url || ""),
		type: "GET",
		data: o.data || {},
		cache: true,
		success: cb
	});
}

// Storage
function _save (key, obj) {
	localStorage.setItem("tga_" + key, JSON.stringify(obj));
}
function _load (key) {
	return JSON.parse(localStorage.getItem("tga_" + key));
}

// On start functions, mostly css additions and corrections
function preInit () {
	if(isFirefox) { // Firefox does not automatically insert extension css
		$("head").append("<link rel='stylesheet' type='text/css' href='" + _extUrl("css/tgarmory.css") + "' />");
	}
	$("head").append("<link rel='stylesheet' type='text/css' href='http://static.thetabx.net/css/wow/wowheadlike.css' />");
	$("#curseur").css("width", "auto");
}

// Insert script into DOM - Escape sandboxing
function insertScript (id, f, removeAfterUse) {
	document.body.appendChild(
		$("<script>", { id: id, type: "text/javascript" }).text("(" + f.toString() + ")()").get(0)
	);
	if(removeAfterUse) {
		$("#" + id).remove();
	}
}

// Custom tooltip management
function showTooltip (data) {
	ttDisp.tt.html(data).show(10, tooltipMove);
	tooltipMove();
}
function hideTooltip () {
	ttDisp.showing = false;
	ttDisp.hovering = false;
	ttDisp.tt.hide().html("");
}
// Build tooltip frame
function prepTooltips () {
	ttDisp.tt = $("<div>", {id: "w_tooltip", style: "position: absolute; z-index:2000;"}).hide();
	$("body").prepend(ttDisp.tt);
	$(document).mousemove(tooltipMove);
}
// Move tooltip on mousemove
function tooltipMove(e) {
	if(e && e.pageX) {
		ttDisp.x = e.pageX + 11;
		ttDisp.y = e.pageY + 15;
	}
	if(ttDisp.showing) {
		var windowScrollTop = (document.body.scrollTop || document.documentElement.scrollTop),
			ttHeight = ttDisp.tt.height();
		if(ttDisp.y + ttHeight + 4 > windowScrollTop + window.innerHeight) {
			ttDisp.y = (windowScrollTop + window.innerHeight) - ttHeight - 4;
		}
	}
	if(ttDisp.hovering) {
		ttDisp.tt.offset({left: ttDisp.x, top: ttDisp.y});
	}
}

// Extract tooltips, reformat them to nicer wowhead like tooltips
function refactorItemTooltips () {
	var enchantItemRegex = /<span style=\\"color:#0C0;\\">(?!Equipé|Utilisé|Chance)([^<]+)/,
		slot = 0
	$("td[onmouseover], td[style^='width:32px;;']").each(function () {
		var $this = $(this);
		// Fix the horizontal and vertical padding on bottom tr
		if(slot == 16) {
			$this.css("padding-left", "5px");
			if(!isFirefox) {
				$this.parents("table:first").first().css("top", "-25px");
			}
		}
		// Extract tooltip
		if($this.attr("onmouseover")) {
			var item = {
				id: Number($this.children("a").first().attr("href").match(/\d+/)[0]),
				slot: slot,
				mouseover: $this.attr("onmouseover")
			};
			item.hash = "i" + item.id + "_" + item.slot;
			item.url = {item: item.id, tooltip: 1};

			if(item.mouseover) {
				var enchMatch = enchantItemRegex.exec(item.mouseover);
				// Extract enchant string and sand it to incorporate enchant in tooltip
				if(enchMatch) {
					item.url.slot = slot;
					item.url.enchstr = encodeURIComponent($.trim(enchMatch[1]));
				}
				// Keep original tooltip for ctrl comparison
				item.originalTooltip = item.mouseover.substring(8, item.mouseover.length - 3).replace(/\\"/g, "\"");
				$this.removeAttr("onmouseover").removeAttr("onmouseout").children("a").attr("data_slot", slot);
			}
			cache[item.hash] = item;
		}
		slot++;
	}).parent().each(function() {
		// Rewrite tr html to force inline onmouseover erase, removeAttr is not enough
		$(this).html($(this).html());
	});
	$(document).on("keydown keyup", function(e) {
		// CTRL key
		if(e.which != 17) { return; }
		// Toggle between new and original tooltip
		if(e.type == "keydown") {
			if(ttDisp.showing && !ttDisp.isOriginalTooltip && cache[ttDisp.showing].originalTooltip) {
				ttDisp.isOriginalTooltip = true;
				showTooltip(cache[ttDisp.showing].originalTooltip);
			}
		}
		else if(e.type == "keyup") {
			ttDisp.isOriginalTooltip = false;
			if(ttDisp.showing) {
				showTooltip(cache[ttDisp.showing].cache);
			}
		}
	});
}
// Generic tooltip display
function appendTooltips () {
	$(document).on("mouseenter mouseleave", "a[href*=spell\\=], a[href*=item\\=]"/*, a[href*=npc\\=], a[href*=char\\=]"*/, function(e) {
		if(e.type == "mouseenter") {
			var objMatch = $(this).attr("href").match(/(item|spell|npc|char)=(\d+)/);
			if(!objMatch) { return; }
			var prefix = objMatch[1].substr(0, 1),
				objId = objMatch[2],
				slot = $(this).attr("data_slot"),
				hash = prefix + objId + (slot ? "_" + slot : ""),
				obj = cache[hash];
			ttDisp.hovering = hash;
			if(obj && obj.cache) {
				ttDisp.showing = obj.hash;
				if(ttDisp.isOriginalTooltip && obj.originalTooltip) {
					showTooltip(obj.originalTooltip);
				}
				else {
					showTooltip(obj.cache);
				}
			}
			else {
				if(!obj) {
					obj = {id: objId, hash: hash, url: {}};
					obj.url[objMatch[1]] = objId;
					obj.url.tooltip = 1;
					cache[obj.hash] = obj;
				}
				getData({data: obj.url}, function (data) {
					obj.cache = data;
					if(ttDisp.hovering == obj.hash) {
						ttDisp.showing = obj.hash;
						if(ttDisp.isOriginalTooltip && obj.originalTooltip) {
							showTooltip(obj.originalTooltip);
						}
						else {
							showTooltip(obj.cache);
						}
					}
				});
			}
		}
		else {
			hideTooltip();
		}
	});
}

function gemsTooltips (gear) {
	var slots = ["head", "neck", "shoulder", "back", "chest", "shirt", "tabard", "wrist", "hands", "waist", "legs", "feet", "finger1", "finger2", "trinket1", "trinket2", "mainHand", "offHand", "ranged"];
	for(var slot in gear) {
		if(!gear[slot]) { continue; }
		var numSlot = slots.indexOf(slot),
			itemHash = "i" + gear[slot].itemId + "_" + numSlot;
		if(cache[itemHash] && cache[itemHash].slot == numSlot && gear[slot].gems && gear[slot].gems.length) {
			cache[itemHash].cache = null;
			cache[itemHash].url.gems = gear[slot].gems.join(":");
		}
	}
}

// Add character avatar if missing
function fixAvatar () {
	var $avatar = $("td[style^='height:82']");
	if($avatar) {
		var avatarId = $avatar.attr("style").match(/(\d+)-(\d+)-(\d+)/);
		if(avatarId && avatarId[2] > 9) {
			$avatar.attr("style", $avatar.attr("style").replace(/img\/armory_icons\/avatars\/\d+-\d+-\d+\.gif/, "http://static.thetabx.net/images/wow/armory/avatars/" + avatarId[1] + "-" + avatarId[2] + "-" + avatarId[3] + ".gif"));
		}
	}
}

// Try to correct talent trees
function fixTalents () { // (talents) {
	var level = Number($("span[style^='color:#fcd20c;']").text().match(/\d+/)),
		talents = {total: 0, perTree: [0,0,0], perRow: [[], [], []], trees: [[], [], []]};
	if(!level || level < 70) { return; }
	var $trees = $("table.cursor>tbody>tr>td>center>table:nth-child(3n+2)");

	// Discover trees and fix internal errors
	$trees.each(function(treeN) {
		if ($(this).find("tr").length === 0) { return; }
		$(this).find("tr").each(function(rowN) {
			if ($(this).find("td").length === 0) { return; }
			var rowPoints = 0;
			$(this).find("td.cursor").each(function() {
				var actualPoints = $(this).find("strong").first().text().match(/(\d)\/(\d)/);
				var p = Number(actualPoints[1]), mP = Number(actualPoints[2]);
				rowPoints += p;
				if(!talents.trees[treeN][rowN]) { talents.trees[treeN][rowN] = []; }
				talents.trees[treeN][rowN].push({p: p, mP: mP, node: $(this).find("strong").first()});
			});
			if (rowPoints > 0 && rowN > 0 && (1.0 * talents.perTree[treeN] / rowN) < 5.0) {
				var fixedTree = false;
				for(var row = rowN - 1; row >= 0; row--) {
					for(var i = 0; i < talents.trees[treeN][row].length; i++) {
						var t = talents.trees[treeN][row][i];
						if(t.mP == 1 && t.p === 0) {
							t.p = 1;
							t.node.text(t.p + "/" + t.mP);
							talents.total += t.p;
							talents.perTree[treeN] += t.p;
							talents.perRow[treeN][row] += t.p;
							fixedTree = true;
							break;
						}
					}
					if(fixedTree) {break;}
				}
			}
			talents.total += rowPoints;
			talents.perTree[treeN] += rowPoints;
			talents.perRow[treeN].push(rowPoints);
		});
	});

	// Try to add 41st talent point. If there's more than 1 point missing, we can't just assume the 41st is really missing.
	if(talents.total == level - 10) {
		for(var treeN = 0; treeN < talents.trees.length; treeN++) {
			if(talents.perTree[treeN] >= 40) {
				talents.total += 1;
				talents.perTree[treeN] += 1;
				talents.perRow[treeN][talents.perRow[treeN].length - 1] += 1;
				var talent = talents.trees[treeN][talents.trees[treeN].length - 1][0];
				talent.p = 1;
				talent.node.text("1/1");
				break;
			}
		}
	}

	// If talents seems ok, let's correct colors
	if(talents.total == level - 9) {
		for(var treeN = 0; treeN < talents.trees.length; treeN++) {
			for(var rowN = 0; rowN < talents.trees[treeN].length; rowN++) {
				for(var colN = 0; colN < talents.trees[treeN][rowN].length; colN++) {
					if(talents.trees[treeN][rowN][colN].p === 0) {
						talents.trees[treeN][rowN][colN].node.css("color", "#999");
					}
					else {
						talents.trees[treeN][rowN][colN].node.css("color", "#FC0");
					}
				}
			}
		}
	}

	// Finish with column bottom text correction
	$("table.cursor>tbody>tr>td>center>table:nth-child(3n)").each(function(treeN) {
		$(this).find("span").first().text(talents.perTree[treeN]);
	});
}

// Not beautiful, still needed. sprintf, where are you ?
function dateToString (date, full) {
	return (date.getDate() < 10 ? "0" : "") + date.getDate() + "/" + (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1) + "/" + date.getFullYear() + (full ? " " + (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() : "");
}

// Create a table with proper borders
function buildFrame (className, content) {
	return "<table class='tga_frame " + className + "'><tbody><tr><td class='tga_frame_content'>" + content + "</td><th style='background-position: top right;'></th></tr><tr><th style='background-position: bottom left;'></th><th style='background-position: bottom right;'></th></tr></tbody></table>";
}

// Buttload of updates on character
function appendUpdates (data) {
	var htmlContent = "",
		// Missing enchant locales
		slotTranslate = {head: "Tête", shoulder: "Épaules", back: "Dos", chest: "Torse", wrist: "Poignets", hands: "Mains", legs: "Jambes", feet: "Pieds", mainHand: "Arme", offHand: "Main gauche", ranged: "À distance"},
		// Specs locales
		specs = {
			1: ["Armes", "Fureur", "Protection"],
			2: ["Sacré", "Protection", "Vindicte"],
			3: ["Maîtrise des bêtes", "Précision", "Survie"],
			4: ["Assassinat", "Combat", "Finesse"],
			5: ["Discipline", "Sacré", "Ombre"],
			7: ["Elémentaire", "Amélioration", "Restauration"],
			8: ["Arcane", "Feu", "Givre"],
			9: ["Affliction", "Démonologie", "Destruction"],
			11: ["Equilibre", "Combat farouche", "Restauration"]
		};
	htmlContent += "<div class='tga_guildupdates'>";
	if(data.guildUpdates.length > 0) {
		var lastGuild = false;
		for(var iGuild = 0; iGuild < data.guildUpdates.length; iGuild++) {
			var elGuild = data.guildUpdates[iGuild];
			if(elGuild.state == "joined") {
				if(lastGuild) {
					// Append name to last left guild and break;
					lastGuild.guildName = elGuild.guildName;
				}
				else {
					lastGuild = elGuild;
				}
				break;
			}
			if(elGuild.state == "left") {
				// Api sends only left event without guildName
				// Keep track of data until we find last joined guild
				lastGuild = elGuild;
			}
		}
		if(lastGuild && lastGuild.timestamp) {
			htmlContent += "A " + (lastGuild.state == "left" ? "quitté" : "rejoint") + " &lt;" + lastGuild.guildName + "&gt; le " + dateToString(new Date(lastGuild.timestamp * 1000)); // Firefox doesn't understand ruby Date.to_string, let's fallback on timestamp * 1000
		}
		else {
			htmlContent += "Pas de changement de guilde récent";
		}
	}
	else {
		htmlContent += "Pas de changement de guilde récent";
	}
	htmlContent += "</div><br />";
	// Average item level, no more
	if(data.averageItemLevel) {
		htmlContent += "<div class='tga_averageilvl'>Niveau d'objet moyen : " + data.averageItemLevel + "</div><br />";
	}
	htmlContent += "<div class='tga_missingenchants'>";
	// Missing enchants with proper locales
	if(data.missingEnchants && data.missingEnchants.length > 0) {
		var missingEnchants = [];
		for(var iEnch = 0; iEnch < data.missingEnchants.length; iEnch++) {
			var elEnch = data.missingEnchants[iEnch];
			missingEnchants.push("<a href='index.php?box=armory&item=" + data.items[elEnch].itemId + "'>" + slotTranslate[elEnch] + "</a>");
		}
		htmlContent += "Enchantements manquants :<br />" + missingEnchants.join(", ");
	}
	else {
		htmlContent += "Pas d'enchantements manquants";
	}
	htmlContent += "</div><br /><div class='tga_gems'>";
	// Gems sockets. &nbsp; is required for the last span to display ?!
	if(data.gems && data.gems.sumSockets > 0) {
		htmlContent += "Châsses : ";
		for(var color in data.gems.sockets) {
			htmlContent += data.gems.sockets[color] + " <span class='socket-" + color + "'></span>";
		}
		htmlContent += "&nbsp;";
	}
	else {
		htmlContent += "Pas de châsses de gemmes";
	}
	htmlContent += "</div><br />";
	// Spec summary with proper locale
	if(data.talents.text) {
		htmlContent += "<div class='tga_spec'><a href='" + data.talents.url + "'>Spécialisation (" + data.talents.text + ")</a>";
		if(data.talents.dominantTree !== null) {
			htmlContent += " orientée <i>" + specs[data.class][data.talents.dominantTree] + "</i>";
		}
		htmlContent += "</div><br />";
	}
	// Honor
	if(data.honor) {
		var spanSide = data.side == 2 ? "honorally_currency" : "honorhorde_currency";
		htmlContent += "<div class='tga_honor'>JcJ : " + data.honor.todayKills + " / <span class='" + spanSide + "'>" + data.honor.todayHonor + "</span> - Hier : " + data.honor.yesterdayKills + " / <span class='" + spanSide + "'>" + data.honor.yesterdayHonor + "</span>" + " - A vie : " + data.honor.totalKills + "</div>";
	}

	// append() in case block has data (never seen it)
	$("table[style^='width:344px;height:190px;background-image:url(img/armory_stats.jpg)'] td:last").first().append(htmlContent).css({"text-align": "left", "padding": "12px", "padding-left": "15px", "vertical-align": "top", "line-height": "1.1em"});
}

// Last gear pieces equipped list
function appendGearUpdates (gearUpdates) {
	var htmlContent = "<span class='tga_header'>Derniers loots (niveau d'objet supérieur à 114) :</span><br />";
	if(gearUpdates.length > 0) {
		htmlContent += gearUpdates.map(function(el, index) {
			if(index < 6) { // Hard limit to 6 items. Should be enough for most cases
				return "<a href='index.php?box=armory&item=" + el.itemId + "'><img src='" + staticUrl + "images/wow/icons/small/" + el.icon.toLowerCase() + ".jpg' width='18' height='18' /> " + el.name + "</a> (" + dateToString(new Date(el.timestamp * 1000)) + ")<br />";
			}
		}).join("");
	}
	else {
		htmlContent += "Pas de loots récents<br />";
	}
	// replace <br />, less waste of room
	$("table.cursor").parent().children("br").first().replaceWith("<div id='gear_updates' class='tga_block'>" + buildFrame("gear_updates", htmlContent) + "</div>");
}

// team.members to html table row
function teamToMembersHtml (team) {
	return $.map(team.members, function(e) { return "<tr><td><a href='http://thegeekcrusade-serveur.com/index.php?box=armory&character=" + e.id + "'>" + e.name + "</a></td><td class='arena_rating'>" + e.rating + "</td><td><span class='arena_wins'>" + e.wins + "</span> - <span class='arena_loses'>" + e.loses + "</span></td><td><span class='arena_percent'>(" + e.percent + "%)</span></td></tr>"; }).join("");
}

// Arena teams if available
function appendArena (data) {
	if(data.length === 0) { return; }
	var brackets = [2, 3, 5], htmlContent = "", displayedTeams = 0;
	for(var i = 0; i < brackets.length; i++) {
		var team = data[brackets[i]];
		if(!team) { continue; }
		displayedTeams++;
		htmlContent += "<div class='tga_bracket'>" + buildFrame("arena_teams", "<div class='arena_bracket'><a href='http://thegeekcrusade-serveur.com/index.php?box=pvp&type=" + brackets[i] + "'>" + brackets[i] + "v" + brackets[i] + "</a></div>" + team.name + " <a class='arena_position' href='http://thegeekcrusade-serveur.com/index.php?box=armory&team=" + team.id + "'>#" + team.position + "</a><br /><table><tbody><tr><td>Equipe</td><td class='arena_rating team_rating'>" + team.rating + "</td><td><span class='arena_wins'>" + team.wins + "</span> - <span class='arena_loses'>" + team.loses + "</span></td></tr>" + teamToMembersHtml(team) + "</tbody></table>") + "</div>";
	}
	if(htmlContent.length > 0) {
		$("table.cursor").parent().children("br").first().replaceWith("<div id='arena_teams' class='tga_block'>" + htmlContent + "</div>");
	}
	// If there's only one bracket to display, try to inline it with the gearUpdates frame
	if(displayedTeams == 1) {
		$(".tga_block").css("display", "inline-block");
	}
}

function buildGuildLinks () {
	var $guilds = $("span[style='color:#fff; font-size:11px;'], td[style='padding-top:8px;padding-bottom:6px; font-size:9px; padding-left:4px;text-align:center'], p[style='font:0.9em Arial, sans-serif ; line-height:1em;color:;margin:0px; padding:0px;'], td[style=' width:200px;height:50px;font-size:22px; color:#b4e718;padding-top:26px;  vertical-align:top; font-family:frizquadratatt;'] strong, td[style='width:300px;'][align='center'].armory_search_header_td"),
		guilds = {};

	if($guilds.length === 0) { return; }

	$guilds.each(function() {
		var bName = $(this).text().trim();
		if(bName === "") { return; }
		var name = bName.indexOf("<") == -1 ? bName : bName.substring(1, bName.length - 1);
		if(invalidGuilds.indexOf(name) != -1) { return; }
		if(guilds[name]) {
			guilds[name].nodes.push($(this));
		}
		else {
			guilds[name] = {bName: bName, nodes: [$(this)]};
		}
	});

	var savedGuilds = _load("guilds") || {},
		fetchTheses = [];

	for(var name in guilds) {
		if(!savedGuilds[name]) {
			guilds[name].fetch = true;
			fetchTheses.push(name);
		}
		else {
			guilds[name].id = savedGuilds[name];
		}
	}

	if(fetchTheses.length) {
		getData({url: "search/guild", data: {q: fetchTheses}}, function(data) {
			if (data.status == "success" && data.data.count > 0) {
				for(var i in data.data.results) {
					var g = data.data.results[i];
					if(guilds[g.name]) {
						guilds[g.name].id = g.id;
						savedGuilds[g.name] = g.id;
					}
				}
				_save("guilds", savedGuilds);
			}
			addGuildLinks(guilds);
		});
	}
	else {
		addGuildLinks(guilds);
	}
}

function addGuildLinks (guilds) {
	for(var name in guilds) {
		if(guilds[name].id) {
			for(var n in guilds[name].nodes) {
				guilds[name].nodes[n].wrapInner("<a href=\"/index.php?box=armory&guild=" + guilds[name].id + "\">");
			}
		}
	}
}

function updateDB () {
	var dbVer = _load("dbversion");
	if (!dbVer) {
		_save("dbversion", DB_VERSION);
	}
}

(function () {
	if(window.location.host != "thegeekcrusade-serveur.com") { return; }

	var u = parseUrl(window.location.href);
	if(!u || u.path == "/db/") { return; }

	preInit();
	updateDB();
	prepTooltips();
	if(u.p.box && u.p.box == "armory") {
		if(u.p.character) {
			if(u.p.character.length === 0 || isNaN(u.p.character)) { return; } // Char armory check
			if($("table").length < 10) { return; } // Probably error page

			getData({data: {"char": u.p.character}}, function(ajaxData) {
				if(ajaxData.status == "success") {
					appendUpdates(ajaxData.data);
					appendGearUpdates(ajaxData.data.gearUpdates);
					appendArena(ajaxData.data.arena);
					fixTalents(ajaxData.data.talents);
					gemsTooltips(ajaxData.data.items);
				}
			});
			fixAvatar();
			refactorItemTooltips();
		}
		else if(u.p.guild) {
			if(u.p.guild.length === 0 || isNaN(u.p.guild)) { return; } // Guild armory check
			if($("table").length > 10) { return; } // Probably real page

			createGuildPage(u.p.guild);
		}
	}
	appendTooltips();
	if(u.p.box && u.p.box == "shopITE") { return; }
	buildGuildLinks();
})();