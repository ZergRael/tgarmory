import subprocess
import os

def run():
	os.chdir("..")
	subprocess.call([os.path.join("C:", "Program Files", "7-Zip", "7z"), "a", "-tzip", os.path.join("build", "tgarmory.zip"), "lib", "css", "images", "*.js", "*.json"])
	os.chdir("tools")