import subprocess
import os

def run():
	os.chdir("..")
	subprocess.call(["7z", "a", "-tzip", os.path.join("build", "tgarmory.zip"), "lib", "css", "images", "*.js", "*.json"])
	os.chdir("tools")