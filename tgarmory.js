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

// Format url into params hash
function parseUrl () {
	if(window.location.host != "thegeekcrusade-serveur.com") { return false; }
	var search = window.location.search;
	if(search.length === 0 || search[0] != "?") { return {}; }
	var params = search.substring(1).split("&");
	var keyValues = {};
	for(var i in params) {
		var kv = params[i].split("=");
		if(kv.length != 2) { continue; }
		keyValues[kv[0]] = kv[1];
	}
	return keyValues;
}

// Probably not necessary to encapsulate, looks nicer
function getData (obj, cb) {
	$.ajax({
		url: apiUrl,
		type: "GET",
		data: obj,
		success: cb
	});
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
		items = {},
		hovering = false,
		showing = false,
		isOriginalTooltip = false;
	// Yes, that's ugly
	$("td[onmouseover], td[style^='width:32px;;']").parent().each(function () {
		// Still ugly, I know
		$(this).children().each(function () {
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
					mouseover: $this.attr("onmouseover")
				};
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
					$this.removeAttr("onmouseover").removeAttr("onmouseout");
				}
				items[item.id] = item;
			}
			slot++;
		});
		// Rewrite tr html to force inline onmouseover erase, removeAttr is not enough
		$(this).html($(this).html());
	});
	// Display better tooltips on every item link. $(document).on() because some item links may come later
	$(document).on("mouseenter", "a[href^='index.php?box=armory&item']", function() {
		var itemId = Number($(this).attr("href").match(/\d+/)[0]),
			item = items[itemId];
		hovering = itemId;
		if(item && item.cache) {
			// Show cached item tooltip if available
			showing = item.id;
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
				item = {id: itemId, url: {item: itemId, tooltip: 1}};
				items[itemId] = item;
			}
			// Allow #curseur to follow mouse even before data is ready
			// Else, tooltip may be stuck on last hovered item
			prepTooltip();
			getData(item.url, function (data) {
				item.cache = data;
				if(hovering == itemId) {
					if(isOriginalTooltip && item.originalTooltip) {
						showTooltip(item.originalTooltip);
					}
					else {
						showTooltip(data);
					}
					showing = itemId;
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
			if(showing && !isOriginalTooltip && items[showing].originalTooltip) {
				isOriginalTooltip = true;
				showTooltip(items[showing].originalTooltip);
			}
		}
		else if(e.type == "keyup") {
			isOriginalTooltip = false;
			if(showing) {
				showTooltip(items[showing].cache);
			}
		}
	});
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

// Add last talent point if needed (level = 70, points = 60)
function fixTalents () {
	var level = Number($("span[style^='color:#fcd20c;']").text().match(/\d+/)),
		trees = [],
		totalPoints = 0,
		glitchedTree = false;
	if(!level || level < 70) { return; }
	$("table.cursor>tbody>tr>td").each(function(i) {
		var $tds = $(this).find("td.cursor"),
			points = Number($tds.last().find("span").first().text());
		totalPoints += points;
		trees[i] = {points: points, tds: $tds};
	});
	if(totalPoints == 61) { return; }
	for(var iTree = 0; iTree < trees.length; iTree++) {
		if(trees[iTree].points >= 40) {
			glitchedTree = iTree;
			break;
		}
	}
	if(glitchedTree === false) { return; }
	var $td = trees[glitchedTree].tds.eq(trees[glitchedTree].tds.length - 2);
	$td.find("a:first").first().css("color", "#FC0");
	$td.find("strong").first().text("1/1");
	trees[glitchedTree].tds.last().find("span").text(trees[glitchedTree].points + 1);
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
		slotTranslate = {head: "Tête", shoulder: "Épaules", back: "Dos", chest: "Torse", wrist: "Poignets", hands: "Mains", legs: "Jambes", feet: "Pieds", mainHand: "Arme", offHand: "Main gauche"},
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
	htmlContent += "</div><br /><div class='tga_averageilvl'>";
	// Average item level, no more
	if(data.averageItemLevel) {
		htmlContent += "Niveau d'objet moyen : " + data.averageItemLevel;
	}
	htmlContent += "</div><br /><div class='tga_missingenchants'>";
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
	htmlContent += "</div><br /><div class='tga_spec'>";
	// Spec summary with proper locale
	if(data.talents.text) {
		htmlContent += "<a href='" + data.talents.url + "'>Spécialisation (" + data.talents.text + ")</a>";
		if(data.talents.dominantTree !== null) {
			htmlContent += " orientée <i>" + specs[data.class][data.talents.dominantTree] + "</i>";
		}
	}
	htmlContent += "</div>";

	// append() in case block has data (never seen it)
	$("table[style^='width:344px;height:190px;background-image:url(img/armory_stats.jpg)'] td:last").first().append(htmlContent).css({"text-align": "left", "padding": "18px", "vertical-align": "top"});
}

// Last gear pieces equipped list
function appendGearUpdates (data) {
	var htmlContent = "<span class='tga_header'>Derniers loots (niveau d'objet supérieur à 114) :</span><br />",
		gearUpdates = data.gearUpdates;
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
	if(data.arena.length === 0) { return; }
	var brackets = [2, 3, 5], htmlContent = "", displayedTeams = 0;
	for(var i = 0; i < brackets.length; i++) {
		var team = data.arena[brackets[i]];
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

var staticUrl = "http://static.thetabx.net/",
	apiUrl = "http://betapi.thetabx.net/tgc/3/";
(function () {
	var u = parseUrl();
	if(!u) { return; } // TGC check
	if(!u.box || u.box != "armory") { return; } // Armory check
	if(!u.character || u.character.length === 0 || isNaN(u.character)) { return; } // Char armory check
	if($("table").length < 10) { return; } // Probably error page

	getData({"char": u.character}, function(ajaxData) {
		if(ajaxData.status == "success") {
			appendUpdates(ajaxData.data);
			appendGearUpdates(ajaxData.data);
			appendArena(ajaxData.data);
		}
	});
	preInit();
	fixTalents();
	fixAvatar();
	refactorItemTooltips();
})();