/*global $:false, i:true, self:false*/
"use strict";

function buildGuildContent (guild) {
	return guild.name;
}

function buildGuildPage (guildId) {
	var html = "nope";
	getData({guild: guildId}, function(ajaxData) {
		if(ajaxData && ajaxData.status == "success") {
			html = buildGuildContent(ajaxData.data);
		}
		$("table:nth(5) tr:nth(1) td").html(html);
	});
}