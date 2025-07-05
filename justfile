set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
	just --list

bundle PRESET="default":
	bun run src {{PRESET}}
