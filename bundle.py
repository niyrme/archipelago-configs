import argparse
import io

def main() -> int:
	parser = argparse.ArgumentParser()
	parser.add_argument(
		"files",
		type=argparse.FileType("r", encoding="utf-8"),
		nargs="+",
	)
	parser.add_argument(
		"-R",
		"--regions",
		default=False,
		help="add region and endregion comments for editor folding",
		action="store_true"
	)
	parser.add_argument(
		"-o",
		"--output",
		"--output-filename",
		type=str,
		default="combined.yaml"
	)

	args = parser.parse_args()

	if len(args.files) == 0:
		print("no files provided")
		return 1

	files: list[io.TextIOWrapper] = args.files

	region = "#region\n" if args.regions else ""
	endregion = "\n#endregion" if args.regions else ""

	with open(args.output, "w+", encoding="utf-8", newline="\n") as out:
		out.write("\n\n---\n\n".join(f"{region}{f.read().strip()}{endregion}" for f in files) + "\n")

	return 0

if __name__ == "__main__":
	raise SystemExit(main())
