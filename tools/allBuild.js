process.chdir(__dirname);

var chrome = require('./buildChrome.js');
chrome.build();
var firefox = require('./buildFirefox.js');
firefox.build();

