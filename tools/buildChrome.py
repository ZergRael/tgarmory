import subprocess
import os

def run():
	subprocess.call(["7z", "a", "-tzip", os.path.join("build", "tgarmory.zip"), "lib", "css", "images", "tgarmory.js", "manifest.json"])