import argparse
import io

class ParsedArgs(argparse.Namespace):
	files: list[io.TextIOWrapper]
	regions: bool
	output: str

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

	args: ParsedArgs = parser.parse_args()

	if len(args.files) == 0:
		print("no files provided")
		return 1

	with open(args.output, "w+", encoding="utf-8", newline="\n") as out:
		for i, f in enumerate(args.files):
			if i:
				out.write("\n\n---\n\n")
			if args.regions:
				out.write("#region\n")
			out.write(f.read().strip())
			if args.regions:
				out.write("\n#endregion")
		out.write("\n")

	return 0

if __name__ == "__main__":
	raise SystemExit(main())
