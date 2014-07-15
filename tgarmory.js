/*global $:false, i:true, self:false*/
"use strict";

// Hacks to simulate chrome APIs
if(typeof chrome == "undefined") {
	var isFirefox = true,
		chrome = {
			extension: {
				getURL: function(str) {
					return self.options[str];
				}
			}
	};
}

var cache = {},
	staticUrl = "http://static.thetabx.net/",
	apiUrl = "http://api.thetabx.net/tgc/3/";

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
function getData (obj, cb) {
	if(typeof obj == "string") {
		$.ajax({
			url: apiUrl + obj,
			type: "GET",
			cache: true,
			success: cb
		});
	}
	else {
		$.ajax({
			url: apiUrl,
			type: "GET",
			data: obj,
			cache: true,
			success: cb
		});
	}
}

// On start functions, mostly css additions and corrections
function preInit () {
	if(isFirefox) { // Firefox does not automatically insert extension css
		$("head").append("<link rel='stylesheet' type='text/css' href='" + chrome.extension.getURL("css/tgarmory.css") + "' />");
	}
	$("head").append("<link rel='stylesheet' type='text/css' href='http://static.thetabx.net/css/wow/wowheadlike.css' />");
	$("#curseur").css("width", "auto");
}

// Insert script into DOM - Escape sandboxing
function insertScript (id, f, removeAfterUse) {
	document.body.appendChild(
		$("<script>", { id: id, type: "text/javascript" }).text("(" + f.toString() + ")(jQuery)").get(0)
	);
	if(removeAfterUse) {
		$("#" + id).remove();
	}
}

// Let's use native system to display tooltips, hackier than ever but doesn't break anything else
// We can't use native montre() since tooltips comes with a children(visibility:none)
function prepTooltip () {
	insertScript("forceI", function() { i = true; }, true);
}
function showTooltip (text) {
	insertScript("forceI", function() { i = true; }, true);
	$("#curseur").html(text).css("visibility", "visible").children().show();
}
function hideTooltip () {
	insertScript("forceI", function() { i = false; }, true);
	$("#curseur").css("visibility", "hidden").children().hide();
}
// Extract tooltips, reformat them to nicer wowhead like tooltips
function refactorItemTooltips () {
	var enchantItemRegex = /<span style=\\"color:#0C0;\\">(?!Equipé|Utilisé|Chance)([^<]+)/,
		slot = 0,
		hovering = false,
		showing = false,
		isOriginalTooltip = false;
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
	// Display better tooltips on every item link. $(document).on() because some item links may come later
	$(document).on("mouseenter", "a[href^='index.php?box=armory&item']", function() {
		var itemId = Number($(this).attr("href").match(/\d+/)[0]),
			slot = $(this).attr("data_slot"),
			hash = "i" + itemId + (slot ? "_" + slot : ""),
			item = cache[hash];
		hovering = hash;
		if(item && item.cache) {
			// Show cached item tooltip if available
			showing = item.hash;
			if(isOriginalTooltip && item.originalTooltip) {
				showTooltip(item.originalTooltip);
			}
			else {
				showTooltip(item.cache);
			}
		}
		else {
			if(!item) {
				// It's an item we haven't parsed, just build it
				item = {id: itemId, hash: hash, url: {item: itemId, tooltip: 1}};
				cache[item.hash] = item;
			}
			// Allow #curseur to follow mouse even before data is ready
			// Else, tooltip may be stuck on last hovered item
			prepTooltip();
			getData(item.url, function (data) {
				item.cache = data;
				if(hovering == item.hash) {
					if(isOriginalTooltip && item.originalTooltip) {
						showTooltip(item.originalTooltip);
					}
					else {
						showTooltip(data);
					}
					showing = item.hash;
				}
			});
		}
	}).on("mouseleave", "a[href^='index.php?box=armory&item']", function() {
		showing = false;
		hovering = false;
		hideTooltip();
	}).on("keydown keyup", function(e) {
		// CTRL key
		if(e.which != 17) { return; }
		// Toggle between new and original tooltip
		if(e.type == "keydown") {
			if(showing && !isOriginalTooltip && cache[showing].originalTooltip) {
				isOriginalTooltip = true;
				showTooltip(cache[showing].originalTooltip);
			}
		}
		else if(e.type == "keyup") {
			isOriginalTooltip = false;
			if(showing) {
				showTooltip(cache[showing].cache);
			}
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
	return "<table class='tga_frame " + className + "'><tbody><tr><td>" + content + "</td><th style='background-position: top right;'></th></tr><tr><th style='background-position: bottom left;'></th><th style='background-position: bottom right;'></th></tr></tbody></table>";
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
		htmlContent += buildFrame("arena_teams", "<div class='arena_bracket'><a href='http://thegeekcrusade-serveur.com/index.php?box=pvp&type=" + brackets[i] + "'>" + brackets[i] + "v" + brackets[i] + "</a></div>" + team.name + " <a class='arena_position' href='http://thegeekcrusade-serveur.com/index.php?box=armory&team=" + team.id + "'>#" + team.position + "</a><br /><table><tbody><tr><td>Equipe</td><td class='arena_rating team_rating'>" + team.rating + "</td><td><span class='arena_wins'>" + team.wins + "</span> - <span class='arena_loses'>" + team.loses + "</span></td></tr>" + teamToMembersHtml(team) + "</tbody></table>");
	}
	if(htmlContent.length > 0) {
		$("table.cursor").parent().children("br").first().replaceWith("<div id='arena_teams' class='tga_block'>" + htmlContent + "</div>");
	}
	// If there's only one bracket to display, try to inline it with the gearUpdates frame
	if(displayedTeams == 1) {
		$(".tga_block").css("display", "inline-block");
		$(".arena_teams").css("display", "block");
	}
}

function appendTooltips () {
	var showing = false,
		hovering = false;
	$(document).on("mouseenter mouseleave", "a[href*=spell\\=], a[href*=item\\=]", function(e) {
		if(e.type == "mouseenter") {
			var objMatch = $(this).attr("href").match(/(item|spell)=(\d+)/);
			if(!objMatch || !objMatch[1] || !objMatch[2]) { return; }
			var objId = objMatch[2],
				prefix = false;
			switch(objMatch[1]) {
				case "item": prefix = "i";
					break;
				case "spell": prefix = "s";
					break;
			}
			if(!prefix) { return; }

			var hash = prefix + objId,
				obj = cache[hash];
			hovering = hash;
			if(obj && obj.cache) {
				showing = obj.hash;
				showTooltip(obj.cache);
			}
			else {
				if(!obj) {
					obj = {id: objId, hash: hash, url: {}};
					obj.url[objMatch[1]] = objId;
					obj.url.tooltip = 1;
					cache[obj.hash] = obj;
				}
				prepTooltip();
				getData(obj.url, function (data) {
					obj.cache = data;
					if(hovering == obj.hash) {
						showTooltip(obj.cache);
						showing = obj.hash;
					}
				});
			}
		}
		else {
			showing = false;
			hovering = false;
			hideTooltip();
		}
	});
}

(function () {
	if(window.location.host != "thegeekcrusade-serveur.com") { return; }

	var u = parseUrl(window.location.href);
	if(!u) { return; }

	preInit();
	if(u.p.box && u.p.box == "armory") {
		if(u.p.character) {
			if(u.p.character.length === 0 || isNaN(u.p.character)) { return; } // Char armory check
			if($("table").length < 10) { return; } // Probably error page

			getData({"char": u.p.character}, function(ajaxData) {
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

			buildGuildPage(u.p.guild);
		}
	}
	else {
		appendTooltips();
	}
})();