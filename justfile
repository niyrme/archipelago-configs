set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
	just --list

bundle PRESET="-l":
	bun run src {{PRESET}}
