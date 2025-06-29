set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

[doc("1 main + 2 sides")]
default: (bundle "default")

bundle PRESET:
	bun run src {{PRESET}}
