import os
import sys
import glob
import distutils.dir_util
import distutils.file_util
import json

sdkDir = "addon-sdk-1.17"
firefoxDir = "ff_tgarmory"
chromeDir = "tgarmory"

def run():
	print("Update data")
	print(os.getcwd())

	copyDirs = ["lib", "css", "images"]
	for cDir in copyDirs :
		distutils.dir_util.copy_tree(cDir, os.path.join("..", firefoxDir, "data", cDir))
	distutils.file_util.copy_file("tgarmory.js", os.path.join("..", firefoxDir, "data"))

	print("Update version")
	with open(os.path.join("manifest.json"), 'r') as content_file:
		manifest = json.load(content_file)
	with open(os.path.join("..", firefoxDir, "package.json"), 'r') as content_file:
		package = json.load(content_file)
	package["version"] = manifest["version"]
	with open(os.path.join("..", firefoxDir, "package.json"), 'w') as content_file:
		json.dump(package, content_file, indent=2)

	print("Update main.js")
	mainPrefix = '\n'.join([
		'// Import the page-mod API',
		'var pageMod = require("sdk/page-mod");',
		'// Import the self API',
		'var self = require("sdk/self");',
		'pageMod.PageMod({',
		'  include: ["*.thegeekcrusade-serveur.com"],',
		'  contentScriptFile: [',])
	mainMid = '\n'.join([
		'',
		'  ],',
		'  contentScriptOptions: {'])
	mainSuffix = '\n'.join([
		'',
		'  },',
		'});'])

	main = mainPrefix
	for js in manifest["content_scripts"][0]["js"] :
		main += "\n    self.data.url(\"%s\")," % js
	main = main.rstrip(",") + mainMid
	if "css" in manifest["content_scripts"][0]:
		for css in manifest["content_scripts"][0]["css"] :
			main += "\n    \"%s\": self.data.url(\"%s\")," % (css, css)
		main = main.rstrip(",")
	if "web_accessible_resources" in manifest:
		for res in manifest["web_accessible_resources"] :
			main += "\n    \"%s\": self.data.url(\"%s\")," % (res, res)
		main = main.rstrip(",")
	main = main + mainSuffix

	with open(os.path.join("..", firefoxDir, "lib", "main.js"), 'w') as content_file:
		content_file.write(main)

	print("Firefox SDK")
	os.chdir(os.path.join("..", sdkDir))
	sdkRoot = os.getcwd()
	sys.path.append(os.path.join(sdkRoot, "python-lib"))
	os.environ["CUDDLEFISH_ROOT"] = sdkRoot

	from jetpack_sdk_env import welcome
	welcome()

	print("Export .xpi")
	import cuddlefish

	os.chdir(os.path.join("..", firefoxDir))
	#try :
	#	cuddlefish.run(["--force-mobile", "--update-url", "https://thetabx.net/addon/tga/checkfirefoxupdate/%APP_OS%/%CURRENT_APP_VERSION%/%ITEM_VERSION%/", "xpi"])
	#except SystemExit:
	#	print("Copy mobile .xpi")
	#	distutils.file_util.copy_file("gksimproved.xpi", os.path.join("..", chromeDir, "build", "gksimproved.mobile.xpi"))

	try :
		cuddlefish.run(["--update-url", "https://thetabx.net/addon/tga/firefox/%APP_OS%/%CURRENT_APP_VERSION%/%ITEM_VERSION%/", "xpi"])
	except SystemExit:
		print("Copy .xpi")
		distutils.file_util.copy_file("tgarmory.xpi", os.path.join("..", chromeDir, "build"))

	os.chdir(os.path.join("..", chromeDir))
	print("Done")