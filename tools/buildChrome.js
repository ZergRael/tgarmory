var exec = require('child_process').exec;
var path = require('path');

function build() {
  console.log('Build chrome');
  var cmd = [
    '7z',
    'a',
    '-tzip',
    path.join('..', 'build', 'tgarmory.zip'),
    path.join('..', 'lib'),
    path.join('..', 'css'),
    path.join('..', 'images'),
    path.join('..', '*.js'),
    path.join('..', '*.json'),
  ];

  exec(cmd.join(' '), function(error, stdout, stderr) {
    console.log(stdout);
  });
}

exports.build = build;
