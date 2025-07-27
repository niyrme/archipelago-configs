set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
	just --list

bundle PRESET="-l" SYNC="--sync":
	bun run src {{PRESET}} {{SYNC}}
