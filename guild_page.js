/*global $:false, buildFrame:false, getData:false, dateToString:false, staticUrl:false*/
"use strict";

function buildGuildPage () {
	var html = $("<div>", {class: "guild_page"}).append(
		$("<h1>", {text: "Guilde"}),
		$(buildFrame("armory_frame", "")),
		$("<table>", { class: "armory_table armory_guild_loots" }).append(
			$("<thead>").append(
				$("<tr>").append($("<td>", {colspan: 3, text: "Derniers loots", class: "head_col"})),
				$("<tr>").append(
					$("<td>", {class: "large_col", text: "Item"}),
					$("<td>", {class: "small_col", text: "Joueur"}),
					$("<td>", {class: "small_col", text: "Date"})
				)
			),
			$("<tbody>")
		),
		$("<table>", { class: "armory_table armory_guild_downs" }).append(
			$("<thead>").append(
				$("<tr>").append($("<td>", {colspan: 2, text: "Downs récents", class: "head_col"})),
				$("<tr>").append(
					$("<td>", {class: "med_col", text: "Boss"}),
					$("<td>", {class: "med_col", text: "Date"})
				)
			),
			$("<tbody>")
		),
		$("<div>", {class: "clearfloat"}),
		$("<table>", { class: "armory_table armory_guild_chars" }).append(
			$("<thead>").append(
				$("<tr>").append($("<td>", {colspan: 6, text: "Membres", class: "head_col"})),
				$("<tr>").append(
					$("<td>", {class: "med_col", text: "Nom"}),
					$("<td>", {class: "small_col", text: "Niveau"}),
					$("<td>", {class: "small_col", text: "Race"}),
					$("<td>", {class: "small_col", text: "Classe"}),
					$("<td>", {class: "small_col", text: "Spec"}),
					$("<td>", {class: "hmed_col", text: "Dernière déconnexion"})
				)
			),
			$("<tbody>")
		)
	);
	$("table:nth(5) tr:nth(1) td").html(html);
}

function fillGuildPage (guild) {
	var detailsHtml = [],
		membersHtml = [],
		lootsHtml = [],
		bossHtml = [],
		members = {},
		UPDATES_LIMIT = 12,
		TIME_TRESHOLD = 60 * 24 * 60 * 60 * 1000,
		date_treshold = new Date();
	date_treshold.setTime(date_treshold.getTime() - TIME_TRESHOLD);

	// Headers
	$(".guild_page h1").text(" " + guild.name);
	if(guild.side) {
		$(".guild_page h1").addClass(guild.side == 1 ? "logo_h" : "logo_a");
	}

	// Frame contents
	if(guild.desc) { detailsHtml.push(guild.desc); }
	if(guild.url) { detailsHtml.push("<a href=\"" + guild.url + "\">" + guild.url + "</a>"); }
	if(guild.displayedMembersCount) { detailsHtml.push((detailsHtml.length ? "<br />" : "") + guild.displayedMembersCount + " membres"); }
	if(guild.progressText) { detailsHtml.push("<a href=\"/index.php?box=pve\">Progression : " + guild.progressText + "</a>"); }
	if(guild.creationTimestamp) { detailsHtml.push("Guilde créée le " + dateToString(new Date(guild.creationTimestamp * 1000))); }
	if(!detailsHtml.length) {
		detailsHtml.push("Cette guilde n'est actuellement pas présente dans le <a href=\"/index.php?box=pve\">classement PVE</a>.<br /><br />Les informations de guilde ainsi que les derniers downs ne seront donc pas affichés.");
	}
	$(".armory_frame .tga_frame_content").html(detailsHtml.join("<br />"));


	// Members
	for(var i in guild.members) {
		var member = guild.members[i];
		members[member.charId] = member.name;
		if(new Date(member.lastAct * 1000) < date_treshold) { continue; }
		membersHtml.push($("<tr>").append(
			$("<td>", {class: "med_col"}).append($("<a>", {href: "/index.php?box=armory&character=" + member.charId, text: member.name})),
			$("<td>", {class: "small_col", text: member.level}),
			$("<td>", {class: "small_col"}).append($("<img>", {src: "img/race-" + member.race + ".gif"})),
			$("<td>", {class: "small_col"}).append($("<img>", {src: "img/class-" + member.class + ".gif"})),
			$("<td>", {class: "small_col"}).append(member.spec !== null ? $("<img>", {src: staticUrl + "images/wow/armory/spec/small/" + member.class + "-" + member.spec + ".jpg"}) : ""),
			$("<td>", {class: "hmed_col centered", text: member.lastAct > 0 ? dateToString(new Date(member.lastAct * 1000), true) : ""})
		));
	}
	membersHtml.push($("<tr>").append($("<td>", {colspan: 6, class: "armoryfooter", text: membersHtml.length + " personnages affichés (personnages actifs 60 derniers jours)"})));
	$(".armory_guild_chars tbody").append(membersHtml);

	// Loots
	for(var i in guild.gearUpdates) {
		var loot = guild.gearUpdates[i];
		lootsHtml.push($("<tr>").append(
			$("<td>", {class: "large_col"}).append($("<a>", {href: "/index.php?box=armory&item=" + loot.itemId}).append($("<img>", {src: staticUrl + "images/wow/icons/small/" + loot.icon.toLowerCase() + ".jpg", width: 18, height: 18}), " " + loot.name)),
			$("<td>", {class: "small_col"}).append($("<a>", {href: "/index.php?box=armory&character=" + loot.char, text: members[loot.char]})),
			$("<td>", {class: "small_col", text: dateToString(new Date(loot.timestamp * 1000))})
		));
		if (lootsHtml.length >= UPDATES_LIMIT) { break; }
	}
	$(".armory_guild_loots tbody").append(lootsHtml);

	// Bosses
	for(var i in guild.recentDowns) {
		var boss = guild.recentDowns[i];
		bossHtml.push($("<tr>").append(
			$("<td>", {class: "med_col", text: boss.name}),
			$("<td>", {class: "med_col centered", text: dateToString(new Date(boss.timestamp * 1000), true)})
		));
		if (bossHtml.length >= UPDATES_LIMIT) { break; }
	}
	$(".armory_guild_downs tbody").append(bossHtml);
}

function createGuildPage (guildId) {
	buildGuildPage();
	getData({data: {guild: guildId}}, function(ajaxData) {
		if(ajaxData && ajaxData.status == "success") {
			fillGuildPage(ajaxData.data);
		}
	});
}