process.chdir(__dirname);
var path = require('path');
var fs = require('fs-extra');

function toggleDebug(debug) {
  var data = fs.readFileSync(path.join('..', 'tgarmory.js'), 'utf-8');
  if (debug) {
    data = data.replace(/DEBUG = [^;]+/, 'DEBUG = true');
  } else {
    data = data.replace(/DEBUG = [^;]+/, 'DEBUG = false');
  }
  fs.writeFileSync(path.join('..', 'tgarmory.js'), data, 'utf-8');
}

console.log('Disable debug mode');
toggleDebug(false);
var chrome = require('./buildChrome.js');
chrome.build();
var firefox = require('./buildFirefox.js');
firefox.build(function() {
  console.log('Enable debug mode');
  toggleDebug(true);
});

