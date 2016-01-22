// Import the page-mod API
var pageMod = require('sdk/page-mod');
// Import the self API
var self = require('sdk/self');
// Import simple-storage API
var sstorage = require('sdk/simple-storage');
pageMod.PageMod({
  include: ['*.thegeekcrusade-serveur.com'],
  contentScriptFile: [
    self.data.url('lib/jquery-2.1.3.min.js'),
    self.data.url('tgarmory.js')
  ],
  contentScriptOptions: {
    'css/tgarmory.css': self.data.url('css/tgarmory.css')
  },
  contentScriptWhen: 'ready',
  onAttach: function(worker) {
    worker.port.on('storageGet', function(key) {
      worker.port.emit('storageGet' + key, sstorage.storage[key]);
    });
    worker.port.on('storageSet', function(obj) {
      sstorage.storage[obj.key] = obj.val;
    });
  }
});
