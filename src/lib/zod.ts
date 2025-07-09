import * as z from "zod/v4-mini";

export function prettyZodError<E extends z.core.$ZodError>(error: E) {
	function printError(err: z.core.$ZodFormattedError<unknown>, depth: number = 1) {
		const indent = "\t".repeat(depth);
		for (const e of err._errors) {
			Bun.stderr.write(`${indent}${e.trim()}\n`);
		}
		for (const key in err) {
			if (key === "_errors") continue;
			Bun.stderr.write(`${indent}${key.trim()}\n`);
			printError(err[key], depth + 1);
		}
	}

	Bun.stderr.write("Errors:\n");
	printError(z.formatError(error));
}
