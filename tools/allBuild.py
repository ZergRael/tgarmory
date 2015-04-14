import os
import buildFirefox
import buildChrome

os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

filenames = [
	'header.js', 
	'guild_page.js', 
	'core.js'
]
with open('tgarmory.js', 'w') as outfile:
    for fname in filenames:
        with open(fname) as infile:
            outfile.write(infile.read())

buildFirefox.run()
buildChrome.run()