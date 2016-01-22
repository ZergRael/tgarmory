// Import the page-mod API
var pageMod = require("sdk/page-mod");
// Import the self API
var self = require("sdk/self");
pageMod.PageMod({
  include: ["*.thegeekcrusade-serveur.com"],
  contentScriptFile: [
    self.data.url("lib/jquery-2.1.3.min.js"),
    self.data.url("tgarmory.js")
  ],
  contentScriptOptions: {
    "css/tgarmory.css": self.data.url("css/tgarmory.css")
  },
});