var fs = require('fs-extra');
var path = require('path');
var exec = require('child_process').exec;

function cleanUp() {
  console.log('Firefox : Cleanups');
  fs.removeSync(path.join('..', 'firefox'));
  fs.mkdirsSync(path.join('..', 'firefox'));
}

function copyFiles() {
  console.log('Firefox : Copy files');
  var copyDirs = ['images', 'lib', 'css'];
  copyDirs.forEach(function(d) {
    fs.copySync(path.join('..', d), path.join('..', 'firefox', d));
  });
  var filesReg = new RegExp(/\.(js|json)?$/);
  var copyFiles = fs.readdirSync(path.join('..')).filter(function(f) {
    return filesReg.test(f);
  });
  copyFiles.forEach(function(f) {
    fs.copySync(path.join('..', f), path.join('..', 'firefox', f));
  });
}

function updateManifest() {
  console.log('Firefox : Update manifest');
  var manifest = fs.readJsonSync(path.join('..', 'firefox', 'manifest.json'));
  manifest.applications = {
    gecko: {
      id: 'tgarmory@thetabx.net',
      strict_min_version: '48.0',
      update_url: 'https://thetabx.net/addon/tgarmory/firefox/%APP_OS%/%CURRENT_APP_VERSION%/%ITEM_VERSION%/',
    }
  };
  fs.writeJsonSync(path.join('..', 'firefox', 'manifest.json'), manifest);
}

function doBuild(cb) {
  console.log('Firefox : Build');
  process.chdir(path.join('..', 'firefox'));
  var firefoxCreds = fs.readJsonSync(path.join('..', 'tools', 'firefox.creds'));
  var cmd = ['web-ext', 'sign', '--api-key', firefoxCreds.user, '--api-secret',
    firefoxCreds.secret
  ];
  exec(cmd.join(' '), function(error, stdout, stderr) {
    if (stdout) {
      console.log(stdout);
    }
    if (error) {
      console.error(error);
      return;
    }
    if (stderr) {
      console.error(stderr);
      return;
    }
    console.log('Success');
    if (cb) {
      cb();
    }
  });
}

var xpiReg = new RegExp(/\.xpi?$/);
function moveXpi(cb) {
  console.log('Firefox : Move');
  var artifactDir = 'web-ext-artifacts';
  var xpis = fs.readdirSync(artifactDir).filter(function(f) {
    return xpiReg.test(f);
  });
  xpis.forEach(function(xpi) {
    fs.move(path.join(artifactDir, xpi), path.join('..', 'build', 'tgarmory.xpi'), {
      clobber: true
    }, function(e) {
      if (e) {
        console.error(e);
      } else {
        cb();
      }
    });
  });
}

function build(cb) {
  console.log('Build firefox');
  cleanUp();
  copyFiles();
  updateManifest();
  doBuild(function() {
    moveXpi(cb);
  });
}

exports.build = build;
