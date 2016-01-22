/*global $:false*/
"use strict";
//$.ajax({dataType:'script',cache:true,url:'https://static.thetabx.net/js/wow/tt.js'});
var cache = {},
	API_URL = "https://api.thetabx.net/tgc/3/",
	CSS_URL = "https://static.thetabx.net/css/wow/wowheadlike.css",
	ttDisp = {showing: false, hovering : false, tt: false, x: 0, y: 0};

function showTooltip (data) {
	ttDisp.tt.html(data).show(10, tooltipMove);
	tooltipMove();
}
function hideTooltip () {
	ttDisp.hovering = false;
	ttDisp.showing = false;
	ttDisp.tt.hide().html("");
}
function appendTooltips () {
	$(document).on("mouseenter mouseleave", "a[href*=spell\\=], a[href*=item\\=], a[href*=npc\\=]", function(e) {
		if(e.type == "mouseenter") {
			var objMatch = $(this).attr("href").match(/(item|spell|npc)=(\d+)/);
			if(!objMatch) { return; }
			var prefix = objMatch[1].substr(0, 1),
				objId = objMatch[2],
				hash = prefix + objId,
				obj = cache[hash];
			ttDisp.hovering = hash;
			if(obj && obj.cache) {
				ttDisp.showing = obj.hash;
				showTooltip(obj.cache);
			}
			else {
				if(!obj) {
					obj = {id: objId, hash: hash, url: {}};
					obj.url[objMatch[1]] = objId;
					obj.url.tooltip = 1;
					cache[obj.hash] = obj;
				}
				$.ajax({
					url: API_URL,
					type: "GET",
					data: obj.url,
					cache: true,
					success: function (data) {
						obj.cache = data;
						if(ttDisp.hovering == obj.hash) {
							ttDisp.showing = obj.hash;
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

$(document).ready(function () {
	ttDisp.tt = $("<div>", {id: "w_tooltip", style: "position: absolute; z-index:2000;"}).hide();
	$("body").prepend(ttDisp.tt);
	$(document).mousemove(tooltipMove);
	appendTooltips();
	if($("head link[href='" + CSS_URL + "']").length) { return; }
	$("head").append($("<link>", {rel: "stylesheet", type: "text/css", href: CSS_URL}));
});