//$.ajax({dataType:'script',cache:true,url:'http://static.thetabx.net/js/wow/tt.js'});
var cache = {},
	STATIC_URL = "http://static.thetabx.net/",
	API_URL = "http://api.thetabx.net/tgc/3/",
	CSS_URL = "http://static.thetabx.net/css/wow/wowheadlike.css",
	ttDisp = {hovering : false, showing: false, tt: false, x: 0, y: 0};

function showTooltip (data) {
	ttDisp.tt.html(data).show().trigger("mousemove");
}
function hideTooltip () {
	ttDisp.hovering = false;
	ttDisp.showing = false;
	ttDisp.tt.hide().html("");
}
function appendTooltips () {
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
						if(hovering == obj.hash) {
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

$(document).ready(function () {
	ttDisp.tt = $("<div>", {id: "w_tooltip", style: "position: absolute; z-index:2000;"}).hide();
	$("body").prepend($tt);
	$(document).mousemove(function(e) {
		if(e.pageX) {
			ttDisp.x = e.pageX + 11;
			ttDisp.y = e.pageY + 15;
		}
		if(ttDisp.showing) {
			var windowScrollTop = (document.body.scrollTop || document.documentElement.scrollTop),
				ttHeight = $tt.height();
			if(ttDisp.y + ttHeight + 4 > windowScrollTop + window.innerHeight) {
				ttDisp.y = (windowScrollTop + window.innerHeight) - ttHeight - 4;
			}
		}
		if(hovering) {
			ttDisp.tt.offset({left: ttDisp.x, top: ttDisp.y});
		}
	});
	appendTooltips();
	if($("head link[href='" + CSS_URL + "']").length) { return; }
	$("head").append($("<link>", {rel: "stylesheet", type: "text/css", href: CSS_URL}));
});